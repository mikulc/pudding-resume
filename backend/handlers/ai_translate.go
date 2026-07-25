package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"net/http"
	"time"
)

func TranslateResumeToEnglish(c *gin.Context) {
	var req TranslateResumeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "请提供有效的简历 JSON")
		return
	}

	if !json.Valid(req.ResumeData) {
		respondError(c, http.StatusBadRequest, "简历 JSON 格式无效")
		return
	}

	var originalTopLevel map[string]json.RawMessage
	if err := json.Unmarshal(req.ResumeData, &originalTopLevel); err != nil {
		respondError(c, http.StatusBadRequest, "简历 JSON 必须是对象")
		return
	}
	if originalTopLevel == nil {
		respondError(c, http.StatusBadRequest, "简历 JSON 必须是对象")
		return
	}

	cfg, err := extractAIConfig(c, req.ApiUrl, req.ApiKey, req.Model, req.ModelSource, req.PublicModelID)
	if err != nil {
		respondError(c, http.StatusBadRequest, err.Error())
		return
	}

	var compact bytes.Buffer
	if err := json.Compact(&compact, req.ResumeData); err != nil {
		respondError(c, http.StatusBadRequest, "简历 JSON 格式无效")
		return
	}

	startedAt := time.Now()
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")
	c.Writer.WriteHeader(http.StatusOK)

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		return
	}

	sendSSE := func(eventType string, event translateResumeStreamEvent) {
		event.Type = eventType
		if event.Progress < 0 {
			event.Progress = 0
		}
		if event.Progress > 100 {
			event.Progress = 100
		}
		c.SSEvent(eventType, event)
		flusher.Flush()
	}

	sendError := func(message string) {
		sendSSE("error", translateResumeStreamEvent{
			Stage:    "error",
			Message:  message,
			Progress: 100,
		})
	}

	// 创建可取消的 context，客户端断开时取消上游 AI 请求
	ctx, cancel := context.WithCancel(c.Request.Context())

	// 心跳 goroutine：每 15 秒发送 SSE 注释保活，防止中间代理/浏览器断开空闲连接
	heartbeatDone := make(chan struct{})
	go func() {
		defer close(heartbeatDone)
		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				// SSE 注释行，不会被客户端解析为事件，仅用于保活
				fmt.Fprintf(c.Writer, ": heartbeat\n\n")
				flusher.Flush()
			}
		}
	}()

	// 清理：先取消 context（让心跳 goroutine 退出），再等待 goroutine 结束
	defer func() {
		cancel()
		<-heartbeatDone
	}()

	sendSSE("progress", translateResumeStreamEvent{
		Stage:    "request",
		Progress: 12,
	})

	lastProgress := 12
	lastReceivedChars := 0
	inputSize := compact.Len()
	result, err := callAiApiStream(
		ctx,
		cfg.ApiURL,
		cfg.ApiKey,
		cfg.Model,
		translateResumeSystemPrompt,
		"请将以下简历 JSON 翻译为英文简历 JSON：\n"+compact.String(),
		120,
		func(accumulated string) {
			receivedChars := len(accumulated)
			if receivedChars-lastReceivedChars < 160 && receivedChars > 0 {
				return
			}
			lastReceivedChars = receivedChars

			progress := 18
			if inputSize > 0 {
				progress = 18 + (receivedChars*70)/inputSize
			}
			if progress < lastProgress+1 {
				progress = lastProgress + 1
			}
			if progress > 88 {
				progress = 88
			}
			lastProgress = progress

			// 检查 context 是否已取消（客户端断开）
			select {
			case <-ctx.Done():
				return
			default:
			}

			sendSSE("progress", translateResumeStreamEvent{
				Stage:         "streaming",
				Progress:      progress,
				ReceivedChars: receivedChars,
			})
		},
	)
	recordAIUsage(c, "translate", cfg, result.Usage, err == nil, err, time.Since(startedAt))
	if err != nil {
		// 如果客户端已断开，不要再尝试写 SSE（否则会报 connection aborted）
		if ctx.Err() != nil {
			return
		}
		sendError(fmt.Sprintf("AI translate failed: %v", err))
		return
	}

	sendSSE("progress", translateResumeStreamEvent{
		Stage:    "validate",
		Progress: 92,
	})

	if !json.Valid(result.Content) {
		sendError("AI translation result is not valid JSON")
		return
	}

	var translatedTopLevel map[string]json.RawMessage
	if err := json.Unmarshal(result.Content, &translatedTopLevel); err != nil {
		sendError(fmt.Sprintf("Failed to parse AI translation result: %v", err))
		return
	}
	if translatedTopLevel == nil {
		sendError("AI translation result is not a resume JSON object")
		return
	}

	if !sameTopLevelKeys(originalTopLevel, translatedTopLevel) {
		sendError("AI translation result top-level structure does not match the original resume")
		return
	}

	sendSSE("result", translateResumeStreamEvent{
		Stage:      "complete",
		Progress:   100,
		ResumeData: json.RawMessage(result.Content),
	})
}

func sameTopLevelKeys(a, b map[string]json.RawMessage) bool {
	if len(a) != len(b) {
		return false
	}
	for key := range a {
		if _, ok := b[key]; !ok {
			return false
		}
	}
	return true
}

// callAiApi 调用 OpenAI-compatible Chat Completions API。
// timeout 为 HTTP 请求超时秒数，传 0 则使用默认 30 秒。
