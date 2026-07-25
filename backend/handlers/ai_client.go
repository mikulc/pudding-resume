package handlers

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

func callAiApi(apiBaseURL, apiKey, model, systemPrompt, userMessage string, timeoutSeconds int) (aiAPIResult, error) {
	return callAiApiWithMaxTokens(apiBaseURL, apiKey, model, systemPrompt, userMessage, timeoutSeconds, 4096)
}

func callAiApiWithMaxTokens(apiBaseURL, apiKey, model, systemPrompt, userMessage string, timeoutSeconds int, maxTokens int) (aiAPIResult, error) {
	if timeoutSeconds <= 0 {
		timeoutSeconds = 30
	}
	if maxTokens <= 0 {
		maxTokens = 4096
	}

	// 确保 API URL 以 /chat/completions 结尾
	endpoint := strings.TrimRight(apiBaseURL, "/")
	if !strings.HasSuffix(endpoint, "/chat/completions") {
		endpoint += "/chat/completions"
	}

	// 验证 URL
	parsedURL, err := url.Parse(endpoint)
	if err != nil {
		return aiAPIResult{}, fmt.Errorf("API 地址格式无效: %w", err)
	}
	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return aiAPIResult{}, fmt.Errorf("API 地址需以 http:// 或 https:// 开头")
	}

	// 构造请求体
	messages := []map[string]string{
		{"role": "system", "content": systemPrompt},
		{"role": "user", "content": userMessage},
	}

	reqBody := map[string]any{
		"model":       model,
		"messages":    messages,
		"temperature": 0.3, // 较低温度以获得稳定输出
		"max_tokens":  maxTokens,
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return aiAPIResult{}, fmt.Errorf("构造请求失败: %w", err)
	}

	// 创建 HTTP 请求
	httpReq, err := http.NewRequest("POST", endpoint, bytes.NewReader(bodyBytes))
	if err != nil {
		return aiAPIResult{}, fmt.Errorf("创建请求失败: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	if apiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	}

	// 发送请求（可配置超时）
	client := &http.Client{Timeout: time.Duration(timeoutSeconds) * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return aiAPIResult{}, fmt.Errorf("请求 AI API 失败: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return aiAPIResult{}, fmt.Errorf("读取 AI API 响应失败: %w", err)
	}
	usage := parseAIUsage(respBody)

	if resp.StatusCode != http.StatusOK {
		// 截取前 200 字符的错误响应
		errPreview := string(respBody)
		if len(errPreview) > 200 {
			errPreview = errPreview[:200] + "..."
		}
		return aiAPIResult{Usage: usage}, fmt.Errorf("AI API 返回错误 (状态码 %d): %s", resp.StatusCode, errPreview)
	}

	// 解析 OpenAI-compatible 响应格式
	var aiResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.Unmarshal(respBody, &aiResp); err != nil {
		return aiAPIResult{Usage: usage}, fmt.Errorf("解析 AI API 响应失败: %w", err)
	}

	if len(aiResp.Choices) == 0 {
		return aiAPIResult{Usage: usage}, fmt.Errorf("AI API 未返回任何内容")
	}

	content := strings.TrimSpace(aiResp.Choices[0].Message.Content)

	// 处理可能的 markdown 代码块包裹
	content = stripJSONCodeBlock(content)

	return aiAPIResult{Content: []byte(content), Usage: usage}, nil
}

// streamingChunkCallback 每收到 AI 返回的一个文本片段时调用，
// accumulated 是从开始到当前的完整累积文本。
type streamingChunkCallback func(accumulated string)

// callAiApiStream 以流式方式调用 OpenAI-compatible Chat Completions API。
// ctx 用于取消（例如客户端断开连接时）；timeoutSeconds 为上游 HTTP 请求超时秒数。
// 每收到一个文本片段时调用 onChunk。返回最终累积的完整内容、token 用量和可能的错误。
func callAiApiStream(ctx context.Context, apiBaseURL, apiKey, model, systemPrompt, userMessage string, timeoutSeconds int, onChunk streamingChunkCallback) (aiAPIResult, error) {
	return callAiApiStreamWithMaxTokens(ctx, apiBaseURL, apiKey, model, systemPrompt, userMessage, timeoutSeconds, 8192, onChunk)
}

func callAiApiStreamWithMaxTokens(ctx context.Context, apiBaseURL, apiKey, model, systemPrompt, userMessage string, timeoutSeconds int, maxTokens int, onChunk streamingChunkCallback) (aiAPIResult, error) {
	if timeoutSeconds <= 0 {
		timeoutSeconds = 30
	}
	if maxTokens <= 0 {
		maxTokens = 4096
	}

	endpoint := strings.TrimRight(apiBaseURL, "/")
	if !strings.HasSuffix(endpoint, "/chat/completions") {
		endpoint += "/chat/completions"
	}

	parsedURL, err := url.Parse(endpoint)
	if err != nil {
		return aiAPIResult{}, fmt.Errorf("API 地址格式无效: %w", err)
	}
	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return aiAPIResult{}, fmt.Errorf("API 地址需以 http:// 或 https:// 开头")
	}

	messages := []map[string]string{
		{"role": "system", "content": systemPrompt},
		{"role": "user", "content": userMessage},
	}

	reqBody := map[string]any{
		"model":       model,
		"messages":    messages,
		"temperature": 0.3,
		"max_tokens":  maxTokens,
		"stream":      true,
		"stream_options": map[string]any{
			"include_usage": true,
		},
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return aiAPIResult{}, fmt.Errorf("构造请求失败: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(bodyBytes))
	if err != nil {
		return aiAPIResult{}, fmt.Errorf("创建请求失败: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "text/event-stream")
	if apiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	}

	// streaming 可能很长，用 context 控制取消；同时设置一个较宽松的超时防止上游永远挂起
	client := &http.Client{Timeout: 10 * time.Minute}
	resp, err := client.Do(httpReq)
	if err != nil {
		return aiAPIResult{}, fmt.Errorf("请求 AI API 失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		errPreview := string(respBody)
		if len(errPreview) > 200 {
			errPreview = errPreview[:200] + "..."
		}
		return aiAPIResult{}, fmt.Errorf("AI API 返回错误 (状态码 %d): %s", resp.StatusCode, errPreview)
	}

	var accumulated strings.Builder
	var usage AIUsage

	scanner := bufio.NewScanner(resp.Body)
	// 增大 buffer 以应对较大的 chunk 行
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	for scanner.Scan() {
		// 检查 context 是否已取消（客户端断开或超时）
		select {
		case <-ctx.Done():
			return aiAPIResult{Usage: usage}, fmt.Errorf("请求被取消: %w", ctx.Err())
		default:
		}

		line := scanner.Text()

		// 跳过空行和注释行
		if line == "" || strings.HasPrefix(line, ":") {
			continue
		}

		if !strings.HasPrefix(line, "data: ") {
			continue
		}

		data := strings.TrimPrefix(line, "data: ")

		// 流结束标记
		if data == "[DONE]" {
			break
		}

		var chunk struct {
			Choices []struct {
				Delta struct {
					Content string `json:"content"`
				} `json:"delta"`
			} `json:"choices"`
		}

		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			continue // 跳过无法解析的行
		}

		// 收集 token 用量（最后一个 chunk 通常包含 usage）
		// 使用 parseAIUsage 解析以确保正确处理嵌套字段（reasoning_tokens、cached_tokens 等）
		if strings.Contains(data, `"usage"`) {
			if detailedUsage := parseAIUsage([]byte(data)); detailedUsage.Status == "known" {
				usage = detailedUsage
			}
		}

		if len(chunk.Choices) > 0 && chunk.Choices[0].Delta.Content != "" {
			accumulated.WriteString(chunk.Choices[0].Delta.Content)
			onChunk(accumulated.String())
		}
	}

	if err := scanner.Err(); err != nil {
		return aiAPIResult{Usage: usage}, fmt.Errorf("读取流式响应失败: %w", err)
	}

	content := strings.TrimSpace(accumulated.String())
	content = stripJSONCodeBlock(content)

	return aiAPIResult{Content: []byte(content), Usage: usage}, nil
}

// --- 简历诊断相关类型 ---
