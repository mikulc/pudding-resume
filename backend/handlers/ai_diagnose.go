package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"net/http"
	"strings"
	"time"
)

type DiagnoseRequest struct {
	Content  string `json:"content" binding:"required"`
	Language string `json:"language,omitempty"` // "zh-CN" or "en-US"
	// Optional AI config for unauthenticated users (guest mode)
	ApiUrl string `json:"api_url,omitempty"`
	ApiKey string `json:"api_key,omitempty"`
	Model  string `json:"model,omitempty"`
}

type DiagnoseItem struct {
	ID            string `json:"id"`
	OriginalText  string `json:"original_text"`
	Suggestion    string `json:"suggestion"`
	Replacement   string `json:"replacement,omitempty"`
	Severity      string `json:"severity"`   // high | medium | low
	IssueType     string `json:"issue_type"` // overclaim | vague | no_metric | empty_word | weak
	SectionModule string `json:"section_module"`
}

type DiagnoseResponse struct {
	Items []DiagnoseItem `json:"items"`
}

func isEnglishLanguage(language string) bool {
	normalized := strings.ToLower(strings.TrimSpace(language))
	return strings.HasPrefix(normalized, "en")
}

func diagnoseInvalidContentMessage(language string) string {
	if isEnglishLanguage(language) {
		return "Please provide valid resume content"
	}
	return "请提供有效的简历内容"
}

func diagnoseContentTooShortMessage(language string) string {
	if isEnglishLanguage(language) {
		return "The resume content is too short to diagnose"
	}
	return "简历内容过短，无法进行诊断"
}

func diagnoseAIErrorMessage(language string, err error) string {
	if isEnglishLanguage(language) {
		return fmt.Sprintf("AI diagnosis failed: %v", err)
	}
	return fmt.Sprintf("AI 诊断失败: %v", err)
}

func diagnoseParseErrorMessage(language string, err error) string {
	if isEnglishLanguage(language) {
		return fmt.Sprintf("Failed to parse AI diagnosis result: %v", err)
	}
	return fmt.Sprintf("解析 AI 诊断结果失败: %v", err)
}

const diagnoseSystemPromptZh = `你是一位专业的简历优化顾问。请分析用户提供的简历文本，找出以下类型的表达问题：

1. **overclaim（夸大表达）**：如"精通""专家""顶尖""大师"等绝对化词汇，容易显得不可信
2. **vague（空泛描述）**：如"负责""参与""协助"等没有体现具体贡献的描述
3. **no_metric（缺少成果/数据）**：描述缺少量化指标，如提升百分比、完成数量、优化效果等
4. **empty_word（空洞词）**：如"吃苦耐劳""抗压能力强""具备良好的沟通能力"等没有具体场景支撑的泛化评价
5. **weak（表达偏弱）**：如"熟悉""了解"等显得信心不足、缺乏说服力的描述

对每个发现的问题，请提供：
- original_text: 原文片段（尽量短，1-15个字）
- suggestion: 为什么这是个问题，以及如何改进的建议
- replacement: 必填，推荐替换的文本
- severity: high（必须修改）/ medium（建议修改）/ low（可选优化）
- issue_type: 上述 5 种类型之一
- section_module: 推测这个文本属于简历的哪个模块（如 skills/experience/projects/summary/education）

请严格以 JSON 数组格式返回，形如：
[{"original_text":"精通 JavaScript","suggestion":"精通表述偏绝对，建议改为掌握程度+具体场景","replacement":"熟练掌握 JavaScript，能独立完成前端架构设计","severity":"high","issue_type":"overclaim","section_module":"skills"}]

注意：
- 如果简历中没有明显问题，返回空数组 []
- 只检测确实存在问题的表达，正常描述不需要强行标记
- 最多返回 8 条最重要的问题，避免输出过长
- suggestion 控制在 40 个汉字以内
- replacement 必须非空，并且可以直接替换 original_text
- replacement 建议应具体且可操作
- 如果无法在不编造事实的前提下给出 replacement，请不要返回该问题`

const diagnoseSystemPromptEn = `You are a professional resume optimization consultant. Analyze the resume text and identify only meaningful expression issues in these categories:

1. **overclaim**: absolute claims such as "expert", "master", "top-tier", or "proficient in everything" that may feel untrustworthy.
2. **vague**: generic responsibility wording that does not show concrete contribution, scope, action, or ownership.
3. **no_metric**: impact statements that lack measurable outcomes, such as percentages, counts, scale, latency, cost, or quality improvements.
4. **empty_word**: unsupported soft-skill phrases such as "hard-working", "strong stress resistance", or "good communication skills" without concrete context.
5. **weak**: wording that undersells ability, such as "familiar with" or "understand", when a stronger but factual phrase is appropriate.

For each issue, return:
- original_text: the exact source text span from the resume, as short as possible.
- suggestion: an English explanation of why this is an issue and how to improve it.
- replacement: required, an English resume-ready rewrite that can directly replace original_text.
- severity: high, medium, or low.
- issue_type: one of overclaim, vague, no_metric, empty_word, weak.
- section_module: the likely resume section, such as skills, experience, projects, summary, or education.

Return only a valid JSON array, for example:
[{"original_text":"responsible for system development","suggestion":"The phrase is vague and does not show ownership, technical scope, or impact. Add the specific work performed and the result achieved.","replacement":"Designed and implemented core system modules, improving delivery reliability and maintainability.","severity":"medium","issue_type":"vague","section_module":"experience"}]

Rules:
- If there are no clear issues, return [].
- Do not invent experience, metrics, tools, responsibilities, or outcomes.
- Keep original_text exactly as it appears in the resume so the frontend can highlight it.
- Return at most 8 of the most important issues.
- Keep each suggestion under 25 words.
- Keep each replacement concise and resume-ready.
- replacement must be non-empty.
- If you cannot provide a replacement without inventing facts, do not return that issue.
- suggestion and replacement must be written in English.
- Return JSON only. Do not use Markdown code blocks or explanations.`

func diagnoseSystemPrompt(language string) string {
	if isEnglishLanguage(language) {
		return diagnoseSystemPromptEn
	}
	return diagnoseSystemPromptZh
}

func diagnoseUserPrompt(language string, content string) string {
	if isEnglishLanguage(language) {
		return "Analyze the following resume content and return expression issues in English:\n\n" + content
	}
	return "请分析以下简历内容中的表达问题：\n\n" + content
}

func DiagnoseResume(c *gin.Context) {
	var req DiagnoseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, diagnoseInvalidContentMessage(req.Language))
		return
	}

	if len(strings.TrimSpace(req.Content)) < 10 {
		respondError(c, http.StatusBadRequest, diagnoseContentTooShortMessage(req.Language))
		return
	}

	cfg, err := extractAIConfig(c, req.ApiUrl, req.ApiKey, req.Model)
	if err != nil {
		respondError(c, http.StatusBadRequest, err.Error())
		return
	}

	// Setup SSE response
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no") // 禁用 nginx 缓冲
	c.Writer.WriteHeader(http.StatusOK)

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		respondError(c, http.StatusInternalServerError, "服务器不支持流式响应")
		return
	}

	// 发送 SSE 事件的辅助函数
	sendSSE := func(typ string, data interface{}) {
		jsonData, _ := json.Marshal(data)
		fmt.Fprintf(c.Writer, "event: %s\ndata: %s\n\n", typ, string(jsonData))
		flusher.Flush()
	}

	// 发送错误 SSE 事件的辅助函数
	sendError := func(message string) {
		sendSSE("error", map[string]string{"message": message})
	}

	startedAt := time.Now()

	// 创建可取消的 context，客户端断开时取消上游 AI 请求
	ctx, cancel := context.WithCancel(c.Request.Context())

	// 心跳 goroutine：每 15 秒发送 SSE 注释保活
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

	// 流式调用 AI
	result, err := callAiApiStream(
		ctx,
		cfg.ApiURL, cfg.ApiKey, cfg.Model,
		diagnoseSystemPrompt(req.Language),
		diagnoseUserPrompt(req.Language, req.Content),
		90,
		func(accumulated string) {
			// 每收到新的文本片段，推送进度事件
			select {
			case <-ctx.Done():
				return
			default:
			}
			sendSSE("progress", map[string]string{"text": accumulated})
		},
	)

	recordAIUsage(c, "diagnose", cfg, result.Usage, err == nil, err, time.Since(startedAt))

	if err != nil {
		if ctx.Err() != nil {
			return
		}
		sendError(diagnoseAIErrorMessage(req.Language, err))
		return
	}

	var items []DiagnoseItem
	if err := json.Unmarshal(result.Content, &items); err != nil {
		sendError(diagnoseParseErrorMessage(req.Language, err))
		return
	}

	replaceableItems := make([]DiagnoseItem, 0, len(items))
	for _, item := range items {
		if strings.TrimSpace(item.OriginalText) == "" || strings.TrimSpace(item.Replacement) == "" {
			continue
		}
		replaceableItems = append(replaceableItems, item)
	}

	// 为每项生成唯一 ID
	for i := range replaceableItems {
		replaceableItems[i].ID = fmt.Sprintf("diag-%d", time.Now().UnixNano()+int64(i))
	}

	// 发送最终结果
	sendSSE("result", DiagnoseResponse{Items: replaceableItems})
}

// --- 文本润色相关类型 ---
