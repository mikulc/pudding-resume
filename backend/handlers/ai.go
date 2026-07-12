package handlers

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"pudding-resume-backend/database"
	"pudding-resume-backend/middleware"
	"pudding-resume-backend/models"
)

// --- Request / Response types ---

type AiServiceRequest struct {
	Prompt string `json:"prompt" binding:"required"`
	// Optional AI config for unauthenticated users (guest mode)
	ApiUrl        string `json:"api_url,omitempty"`
	ApiKey        string `json:"api_key,omitempty"`
	Model         string `json:"model,omitempty"`
	ModelSource   string `json:"model_source,omitempty"` // "custom" or "public"
	PublicModelID string `json:"public_model_id,omitempty"`
}

type AiServiceResponse struct {
	ResumeData json.RawMessage `json:"resume_data"`
}

type TranslateResumeRequest struct {
	ResumeData json.RawMessage `json:"resume_data" binding:"required"`
	// Optional AI config for unauthenticated users (guest mode)
	ApiUrl        string `json:"api_url,omitempty"`
	ApiKey        string `json:"api_key,omitempty"`
	Model         string `json:"model,omitempty"`
	ModelSource   string `json:"model_source,omitempty"` // "custom" or "public"
	PublicModelID string `json:"public_model_id,omitempty"`
}

type translateResumeStreamEvent struct {
	Type          string          `json:"type"`
	Stage         string          `json:"stage,omitempty"`
	Message       string          `json:"message,omitempty"`
	Progress      int             `json:"progress,omitempty"`
	ReceivedChars int             `json:"received_chars,omitempty"`
	ResumeData    json.RawMessage `json:"resume_data,omitempty"`
}

type resolvedAIConfig struct {
	ApiURL        string
	ApiKey        string
	Model         string
	SystemPrompt  string
	ModelSource   string
	PublicModelID string
	Provider      string
}

const defaultSystemPrompt = "你是一位专业的简历撰写顾问。请根据用户提供的信息，生成一份结构完整、内容详实的 JSON 格式简历数据。"

const translateResumeSystemPrompt = `你是专业英文简历优化助手。请将下面的中文简历 JSON 翻译成英文简历 JSON。
要求：
- 必须保持原 JSON 结构完全一致。
- 不要新增字段、删除字段或修改字段名。
- 只翻译用户可见的自然语言文本。
- 不要修改姓名，除非原 JSON 中已有独立英文名字段。
- 不要修改 ID、日期、手机号、邮箱、URL、图片地址、布尔值、数字、排序字段、配置字段。
- 技术名词如 Golang、Gin、GORM、PostgreSQL、JWT、React、Vite、TailwindCSS 等保持英文原样。
- 翻译风格应符合英文技术简历，专业、简洁、动作导向。
- 工作经历和项目经历的条目尽量改写为英文简历常用 bullet 风格。
- 不要编造经历、指标或结果。
- 如果字段为空，保持为空；如果字段本来就是英文，可保持或轻微润色。
- 最终只返回合法 JSON，不要使用 Markdown 代码块，不要输出解释。`

func validateCustomAIConfig(apiUrl, apiKey, model string, requireModel bool) error {
	if strings.TrimSpace(apiUrl) == "" {
		return fmt.Errorf("请先配置 API 地址")
	}
	if strings.TrimSpace(apiKey) == "" {
		return fmt.Errorf("请先配置 API Key")
	}
	if requireModel && strings.TrimSpace(model) == "" {
		return fmt.Errorf("请先配置模型名称")
	}
	return nil
}

func getSystemPromptForUser(userID string) string {
	if userID == "" {
		return defaultSystemPrompt
	}

	var aifc models.AIServiceConfig
	if err := database.DB.Where("user_id = ?", userID).First(&aifc).Error; err == nil && strings.TrimSpace(aifc.Prompt) != "" {
		return aifc.Prompt
	}
	return defaultSystemPrompt
}

func resolvePublicAIModel(publicModelID string) (string, string, string, error) {
	publicModelID = strings.TrimSpace(publicModelID)
	if publicModelID == "" {
		return "", "", "", fmt.Errorf("请先选择公共模型")
	}

	var pool models.AIModelPool
	if err := database.DB.Where("id = ? AND is_active = true", publicModelID).First(&pool).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", "", "", fmt.Errorf("所选公共模型不可用，请重新选择或切换至自定义模型")
		}
		return "", "", "", fmt.Errorf("服务器内部错误")
	}

	return pool.ApiUrl, pool.ApiKey, pool.Model, nil
}

// extractAIConfig 统一获取 AI 配置（自定义请求配置优先；否则已认证用户从 DB 读，未认证用户从请求参数读）。
// 返回 apiUrl, apiKey, model, systemPrompt, error。
func extractAIConfig(c *gin.Context, reqApiUrl, reqApiKey, reqModel, reqModelSource, reqPublicModelID string) (resolvedAIConfig, error) {
	userID := middleware.GetUserID(c)
	reqApiUrl = strings.TrimSpace(reqApiUrl)
	reqApiKey = strings.TrimSpace(reqApiKey)
	reqModel = strings.TrimSpace(reqModel)
	reqModelSource = strings.TrimSpace(reqModelSource)
	reqPublicModelID = strings.TrimSpace(reqPublicModelID)

	if reqModelSource == "public" {
		if userID == "" {
			return resolvedAIConfig{}, fmt.Errorf("公共模型需要登录后使用，请在设置中切换为自定义模型并填入您的 API Key")
		}
		apiUrl, apiKey, model, err := resolvePublicAIModel(reqPublicModelID)
		if err != nil {
			return resolvedAIConfig{}, err
		}
		return resolvedAIConfig{
			ApiURL:        apiUrl,
			ApiKey:        apiKey,
			Model:         model,
			SystemPrompt:  getSystemPromptForUser(userID),
			ModelSource:   "public",
			PublicModelID: reqPublicModelID,
			Provider:      detectAIProvider(apiUrl, model),
		}, nil
	}

	// 前端会在自定义模型模式下把当前最新配置放进请求体。即使用户已登录，
	// 也优先使用这份请求配置，避免云端 DB 旧值覆盖刚保存的本地/防抖配置。
	if reqModelSource == "custom" || (reqApiUrl != "" || reqApiKey != "" || reqModel != "") {
		if err := validateCustomAIConfig(reqApiUrl, reqApiKey, reqModel, true); err != nil {
			return resolvedAIConfig{}, err
		}
		return resolvedAIConfig{
			ApiURL:       reqApiUrl,
			ApiKey:       reqApiKey,
			Model:        reqModel,
			SystemPrompt: getSystemPromptForUser(userID),
			ModelSource:  "custom",
			Provider:     detectAIProvider(reqApiUrl, reqModel),
		}, nil
	}

	if userID != "" {
		// ── 已认证：从数据库读取 ──
		var aifc models.AIServiceConfig
		if err := database.DB.Where("user_id = ?", userID).First(&aifc).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return resolvedAIConfig{}, fmt.Errorf("请先配置 API 地址")
			}
			return resolvedAIConfig{}, fmt.Errorf("服务器内部错误")
		}

		var apiUrl, apiKey, model string
		modelSource := "custom"
		publicModelID := ""

		if aifc.ModelSource == "public" {
			modelSource = "public"
			if aifc.PublicModelID != nil {
				publicModelID = *aifc.PublicModelID
			}
			var err error
			apiUrl, apiKey, model, err = resolvePublicAIModel(publicModelID)
			if err != nil {
				return resolvedAIConfig{}, err
			}
		} else {
			if err := validateCustomAIConfig(aifc.ApiUrl, aifc.ApiKey, aifc.Model, true); err != nil {
				return resolvedAIConfig{}, err
			}
			apiUrl = aifc.ApiUrl
			apiKey = aifc.ApiKey
			model = aifc.Model
		}

		systemPrompt := aifc.Prompt
		if systemPrompt == "" {
			systemPrompt = defaultSystemPrompt
		}

		return resolvedAIConfig{
			ApiURL:        apiUrl,
			ApiKey:        apiKey,
			Model:         model,
			SystemPrompt:  systemPrompt,
			ModelSource:   modelSource,
			PublicModelID: publicModelID,
			Provider:      detectAIProvider(apiUrl, model),
		}, nil
	}

	// ── 未认证：从请求参数读取 ──
	if reqModelSource == "public" {
		return resolvedAIConfig{}, fmt.Errorf("公共模型需要登录后使用，请在设置中切换为自定义模型并填入您的 API Key")
	}

	if err := validateCustomAIConfig(reqApiUrl, reqApiKey, reqModel, true); err != nil {
		return resolvedAIConfig{}, err
	}

	log.Printf("[guest] AI call via api=%s model=%s", reqApiUrl, reqModel)

	return resolvedAIConfig{
		ApiURL:       reqApiUrl,
		ApiKey:       reqApiKey,
		Model:        reqModel,
		SystemPrompt: defaultSystemPrompt,
		ModelSource:  "custom",
		Provider:     detectAIProvider(reqApiUrl, reqModel),
	}, nil
}

// AiService handles POST /api/ai/service (AuthOptional)
func AiService(c *gin.Context) {
	var req AiServiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "请提供有效的描述信息")
		return
	}

	if len(strings.TrimSpace(req.Prompt)) < 5 {
		respondError(c, http.StatusBadRequest, "描述信息过短，请至少输入 5 个字符")
		return
	}

	cfg, err := extractAIConfig(c, req.ApiUrl, req.ApiKey, req.Model, req.ModelSource, req.PublicModelID)
	if err != nil {
		respondError(c, http.StatusBadRequest, err.Error())
		return
	}

	startedAt := time.Now()
	result, err := callAiApi(cfg.ApiURL, cfg.ApiKey, cfg.Model, cfg.SystemPrompt, "请根据以下描述生成简历 JSON：\n"+req.Prompt, 30)
	recordAIUsage(c, "service", cfg, result.Usage, err == nil, err, time.Since(startedAt))
	if err != nil {
		respondError(c, http.StatusInternalServerError, fmt.Sprintf("AI 调用失败: %v", err))
		return
	}

	if !json.Valid(result.Content) {
		respondError(c, http.StatusInternalServerError, "AI 返回的数据格式无效，请重试")
		return
	}

	c.JSON(http.StatusOK, AiServiceResponse{
		ResumeData: json.RawMessage(result.Content),
	})
}

// TranslateResumeToEnglish handles POST /api/ai/translate-resume (AuthOptional).
// It translates the provided resume JSON and returns the translated JSON without saving it.
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

type DiagnoseRequest struct {
	Content  string `json:"content" binding:"required"`
	Language string `json:"language,omitempty"` // "zh-CN" or "en-US"
	// Optional AI config for unauthenticated users (guest mode)
	ApiUrl        string `json:"api_url,omitempty"`
	ApiKey        string `json:"api_key,omitempty"`
	Model         string `json:"model,omitempty"`
	ModelSource   string `json:"model_source,omitempty"` // "custom" or "public"
	PublicModelID string `json:"public_model_id,omitempty"`
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

type AtsAnalysisRequest struct {
	ResumeData     json.RawMessage `json:"resume_data" binding:"required"`
	JobDescription string          `json:"job_description" binding:"required"`
	Language       string          `json:"language,omitempty"`
	// Optional AI config for unauthenticated users (guest mode)
	ApiUrl        string `json:"api_url,omitempty"`
	ApiKey        string `json:"api_key,omitempty"`
	Model         string `json:"model,omitempty"`
	ModelSource   string `json:"model_source,omitempty"` // "custom" or "public"
	PublicModelID string `json:"public_model_id,omitempty"`
}

type AtsIssue struct {
	Severity      string `json:"severity"`
	Title         string `json:"title"`
	Description   string `json:"description"`
	TargetSection string `json:"target_section,omitempty"`
	RewriteHint   string `json:"rewrite_hint,omitempty"`
}

type AtsAnalysisResponse struct {
	Score              int        `json:"score"`
	Summary            string     `json:"summary"`
	MatchedKeywords    []string   `json:"matched_keywords"`
	MissingKeywords    []string   `json:"missing_keywords"`
	FormatIssues       []AtsIssue `json:"format_issues"`
	ContentSuggestions []AtsIssue `json:"content_suggestions"`
	RecommendedLayouts []string   `json:"recommended_layouts,omitempty"`
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

const atsSystemPromptEn = `You are an ATS resume analysis assistant. Compare the provided structured resume JSON with the job description.

Return only valid JSON with exactly this shape:
{
  "score": 0,
  "summary": "",
  "matched_keywords": [],
  "missing_keywords": [],
  "format_issues": [{"severity":"high|medium|low","title":"","description":"","target_section":"personal|summary|education|skills|work|projects|honors|certifications|portfolio|custom"}],
  "content_suggestions": [{"severity":"high|medium|low","title":"","description":"","target_section":"personal|summary|education|skills|work|projects|honors|certifications|portfolio|custom","rewrite_hint":""}],
  "recommended_layouts": []
}

Scoring guidance:
- 0-39: weak match or serious parse risks.
- 40-59: partial match with important gaps.
- 60-79: reasonable match with improvements needed.
- 80-100: strong match and ATS-friendly.

Rules:
- Do not invent skills, experience, employers, education, metrics, or certifications.
- Missing keywords must come from the job description and be relevant to the resume target.
- Use compact JSON. Do not pretty-print.
- Keep summary under 35 words.
- Keep every title under 8 words and every description/rewrite_hint under 20 words.
- Return at most 10 matched keywords, 10 missing keywords, 4 format issues, and 5 content suggestions.
- Use target_section only when the suggestion maps clearly to a resume section.
- rewrite_hint should be a concise, safe editing instruction, not a fabricated replacement.
- recommended_layouts should contain up to 3 ATS-friendly layout ids chosen from: skyveil, classic-horizontal, ordrin.
- Respond in English.`

const atsSystemPromptZh = `You are an ATS resume analysis assistant. Compare the provided structured resume JSON with the job description.

Return only valid JSON with exactly this shape:
{
  "score": 0,
  "summary": "",
  "matched_keywords": [],
  "missing_keywords": [],
  "format_issues": [{"severity":"high|medium|low","title":"","description":"","target_section":"personal|summary|education|skills|work|projects|honors|certifications|portfolio|custom"}],
  "content_suggestions": [{"severity":"high|medium|low","title":"","description":"","target_section":"personal|summary|education|skills|work|projects|honors|certifications|portfolio|custom","rewrite_hint":""}],
  "recommended_layouts": []
}

Scoring guidance:
- 0-39: 岗位匹配较弱或存在明显 ATS 解析风险。
- 40-59: 有一定匹配，但关键要求缺口明显。
- 60-79: 基本匹配，但仍需要补充关键词或优化表达。
- 80-100: 匹配度较高，且整体较适合 ATS 解析。

Rules:
- 不要编造技能、经历、公司、学历、指标或证书。
- missing_keywords 必须来自岗位 JD，且与求职目标相关。
- 使用紧凑 JSON，不要格式化缩进。
- summary 控制在 60 个汉字以内。
- title 控制在 12 个汉字以内，description/rewrite_hint 控制在 35 个汉字以内。
- matched_keywords 最多 10 个，missing_keywords 最多 10 个，format_issues 最多 4 条，content_suggestions 最多 5 条。
- 只有建议能明确对应简历模块时才填写 target_section。
- rewrite_hint 是简洁、安全的编辑提示，不要编造可直接替换的虚假经历。
- recommended_layouts 最多 3 个，从这些 ATS 友好布局中选择：skyveil, classic-horizontal, ordrin。
- 使用中文返回 summary、title 和 description。`

func atsSystemPrompt(language string) string {
	if isEnglishLanguage(language) {
		return atsSystemPromptEn
	}
	return atsSystemPromptZh
}

func normalizeAtsResponse(resp AtsAnalysisResponse) AtsAnalysisResponse {
	if resp.Score < 0 {
		resp.Score = 0
	}
	if resp.Score > 100 {
		resp.Score = 100
	}
	if resp.MatchedKeywords == nil {
		resp.MatchedKeywords = []string{}
	}
	if resp.MissingKeywords == nil {
		resp.MissingKeywords = []string{}
	}
	if resp.FormatIssues == nil {
		resp.FormatIssues = []AtsIssue{}
	}
	if resp.ContentSuggestions == nil {
		resp.ContentSuggestions = []AtsIssue{}
	}
	if resp.RecommendedLayouts == nil {
		resp.RecommendedLayouts = []string{}
	}
	if len(resp.MatchedKeywords) > 10 {
		resp.MatchedKeywords = resp.MatchedKeywords[:10]
	}
	if len(resp.MissingKeywords) > 10 {
		resp.MissingKeywords = resp.MissingKeywords[:10]
	}
	if len(resp.FormatIssues) > 4 {
		resp.FormatIssues = resp.FormatIssues[:4]
	}
	if len(resp.ContentSuggestions) > 5 {
		resp.ContentSuggestions = resp.ContentSuggestions[:5]
	}
	if len(resp.RecommendedLayouts) > 3 {
		resp.RecommendedLayouts = resp.RecommendedLayouts[:3]
	}
	return resp
}

func extractJSONObject(content []byte) ([]byte, error) {
	text := strings.TrimSpace(stripJSONCodeBlock(string(content)))
	if text == "" {
		return nil, fmt.Errorf("AI returned an empty response")
	}
	if json.Valid([]byte(text)) {
		return []byte(text), nil
	}

	start := strings.Index(text, "{")
	end := strings.LastIndex(text, "}")
	if start < 0 || end < start {
		return nil, fmt.Errorf("AI response did not contain a complete JSON object")
	}

	candidate := strings.TrimSpace(text[start : end+1])
	if !json.Valid([]byte(candidate)) {
		return nil, fmt.Errorf("AI response JSON appears incomplete or malformed")
	}
	return []byte(candidate), nil
}

func parseAtsAnalysisResult(content []byte) (AtsAnalysisResponse, error) {
	jsonContent, err := extractJSONObject(content)
	if err != nil {
		return AtsAnalysisResponse{}, err
	}

	var response AtsAnalysisResponse
	if err := json.Unmarshal(jsonContent, &response); err != nil {
		return AtsAnalysisResponse{}, err
	}
	return normalizeAtsResponse(response), nil
}

func atsAIErrorMessage(language string, err error) string {
	if errors.Is(err, context.DeadlineExceeded) || strings.Contains(err.Error(), "context deadline exceeded") {
		if isEnglishLanguage(language) {
			return "AI response timed out. Please retry later or switch to a faster model."
		}
		return "AI 响应超时，请稍后重试或切换到响应更快的模型。"
	}
	if isEnglishLanguage(language) {
		return fmt.Sprintf("ATS analysis failed: %v", err)
	}
	return fmt.Sprintf("ATS 分析失败：%v", err)
}

// AnalyzeATS handles POST /api/ai/ats-analysis (AuthOptional).
func AnalyzeATS(c *gin.Context) {
	var req AtsAnalysisRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "Please provide resume data and a job description")
		return
	}

	if !json.Valid(req.ResumeData) {
		respondError(c, http.StatusBadRequest, "Resume JSON is invalid")
		return
	}

	if len(strings.TrimSpace(req.JobDescription)) < 20 {
		respondError(c, http.StatusBadRequest, "Job description is too short")
		return
	}

	cfg, err := extractAIConfig(c, req.ApiUrl, req.ApiKey, req.Model, req.ModelSource, req.PublicModelID)
	if err != nil {
		respondError(c, http.StatusBadRequest, err.Error())
		return
	}

	var compact bytes.Buffer
	if err := json.Compact(&compact, req.ResumeData); err != nil {
		respondError(c, http.StatusBadRequest, "Resume JSON is invalid")
		return
	}

	userMessage := "Resume JSON:\n" + compact.String() + "\n\nJob description:\n" + strings.TrimSpace(req.JobDescription)
	startedAt := time.Now()
	log.Printf(
		"[ats] start provider=%s model=%s resume_chars=%d jd_chars=%d",
		cfg.Provider,
		cfg.Model,
		compact.Len(),
		len([]rune(strings.TrimSpace(req.JobDescription))),
	)

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		respondError(c, http.StatusInternalServerError, "Server does not support streaming responses")
		return
	}

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")
	c.Writer.WriteHeader(http.StatusOK)

	sendSSE := func(typ string, data interface{}) {
		jsonData, _ := json.Marshal(data)
		fmt.Fprintf(c.Writer, "event: %s\ndata: %s\n\n", typ, string(jsonData))
		flusher.Flush()
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 150*time.Second)
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
	defer func() {
		cancel()
		<-heartbeatDone
	}()

	lastProgressChars := 0
	sendSSE("progress", gin.H{
		"stage":    "request",
		"progress": 10,
	})

	result, err := callAiApiStreamWithMaxTokens(
		ctx,
		cfg.ApiURL,
		cfg.ApiKey,
		cfg.Model,
		atsSystemPrompt(req.Language),
		userMessage,
		150,
		3072,
		func(accumulated string) {
			if len(accumulated)-lastProgressChars < 120 {
				return
			}
			lastProgressChars = len(accumulated)
			sendSSE("progress", gin.H{
				"stage":          "streaming",
				"progress":       35,
				"received_chars": len(accumulated),
			})
		},
	)
	recordAIUsage(c, "ats", cfg, result.Usage, err == nil, err, time.Since(startedAt))
	if err != nil {
		log.Printf("[ats] failed provider=%s model=%s duration_ms=%d err=%v", cfg.Provider, cfg.Model, time.Since(startedAt).Milliseconds(), err)
		if ctx.Err() != nil && errors.Is(ctx.Err(), context.Canceled) {
			return
		}
		sendSSE("error", gin.H{"message": atsAIErrorMessage(req.Language, err)})
		return
	}

	response, err := parseAtsAnalysisResult(result.Content)
	if err != nil {
		log.Printf("[ats] parse_failed provider=%s model=%s duration_ms=%d content_chars=%d err=%v", cfg.Provider, cfg.Model, time.Since(startedAt).Milliseconds(), len(result.Content), err)
		sendSSE("error", gin.H{"message": fmt.Sprintf("Failed to parse ATS analysis result: %v", err)})
		return
	}

	log.Printf("[ats] complete provider=%s model=%s duration_ms=%d score=%d", cfg.Provider, cfg.Model, time.Since(startedAt).Milliseconds(), response.Score)
	sendSSE("result", gin.H{
		"stage":  "complete",
		"result": response,
	})
}

// DiagnoseResume handles POST /api/ai/diagnose (AuthOptional)
// Uses SSE streaming to push progress in real-time as the AI generates.
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

	cfg, err := extractAIConfig(c, req.ApiUrl, req.ApiKey, req.Model, req.ModelSource, req.PublicModelID)
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

type PolishRequest struct {
	Text          string `json:"text" binding:"required"`
	SectionModule string `json:"section_module,omitempty"`
	// Optional AI config for unauthenticated users (guest mode)
	ApiUrl        string `json:"api_url,omitempty"`
	ApiKey        string `json:"api_key,omitempty"`
	Model         string `json:"model,omitempty"`
	ModelSource   string `json:"model_source,omitempty"` // "custom" or "public"
	PublicModelID string `json:"public_model_id,omitempty"`
}

type PolishResponse struct {
	Text string `json:"text"`
}

const polishSystemPrompt = `你是一位专业的简历文案优化专家。请先判断用户提供的简历文本片段是否存在实质性表达问题，再决定是否改写。

重点识别并优化以下类型的问题：
1. overclaim（夸大表达）：如"精通""专家""顶尖""大师"等绝对化词汇，容易显得不可信
2. vague（空泛描述）：如"负责""参与""协助"等没有体现具体贡献的描述
3. no_metric（缺少成果/数据）：描述缺少量化指标，如提升百分比、完成数量、优化效果等；可以提示或保留可填写占位，但不能编造虚假数据
4. empty_word（空洞词）：如"吃苦耐劳""抗压能力强""具备良好的沟通能力"等没有具体场景支撑的泛化评价
5. weak（表达偏弱）：如"熟悉""了解"等显得信心不足、缺乏说服力的描述

改写原则：
1. 只优化确实存在问题的表达，正常描述不要强行改写
2. 用更具体的动作、贡献、结果替代空泛职责描述
3. 保留事实，不新增用户未提及的经历、技能、项目或确定性数据
4. 保持原文 Markdown 格式、列表层级和段落结构
5. 忽略纯排版差异：不要把仅添加/删除空格、调整中英文之间空格、调整标点前后空格或换行当作优化
6. 如果没有实质性优化空间，请原样返回原文

直接返回优化后的纯文本，不要返回 JSON，不要添加诊断说明、解释、前后缀或代码块标记。`

func normalizePolishMeaning(text string) string {
	return strings.Join(strings.Fields(strings.TrimSpace(text)), "")
}

// PolishText handles POST /api/ai/polish (AuthOptional)
// 对单段简历长文本进行 AI 润色优化，输入输出均为 Markdown 纯文本。
func PolishText(c *gin.Context) {
	var req PolishRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "请提供有效的文本内容")
		return
	}

	if len(strings.TrimSpace(req.Text)) < 5 {
		respondError(c, http.StatusBadRequest, "文本内容过短，请至少输入 5 个字符")
		return
	}

	// 润色场景使用专用 system prompt，忽略 extractAIConfig 返回的用户自定义 prompt
	cfg, err := extractAIConfig(c, req.ApiUrl, req.ApiKey, req.Model, req.ModelSource, req.PublicModelID)
	if err != nil {
		respondError(c, http.StatusBadRequest, err.Error())
		return
	}

	// 构造用户消息：附带模块类型上下文
	userMessage := "请优化以下简历文本：\n\n" + req.Text
	if strings.TrimSpace(req.SectionModule) != "" {
		userMessage = "[模块：" + req.SectionModule + "]\n" + userMessage
	}

	// 调用 AI（润色文本可能较长，超时设为 60 秒）
	startedAt := time.Now()
	result, err := callAiApi(cfg.ApiURL, cfg.ApiKey, cfg.Model, polishSystemPrompt, userMessage, 60)
	recordAIUsage(c, "polish", cfg, result.Usage, err == nil, err, time.Since(startedAt))
	if err != nil {
		respondError(c, http.StatusInternalServerError, fmt.Sprintf("AI 润色失败: %v", err))
		return
	}

	// AI 返回纯文本，去除可能的代码块包裹并 trim
	polishedText := strings.TrimSpace(stripJSONCodeBlock(string(result.Content)))

	if polishedText == "" {
		respondError(c, http.StatusInternalServerError, "AI 返回的内容为空，请重试")
		return
	}

	if normalizePolishMeaning(polishedText) == normalizePolishMeaning(req.Text) {
		polishedText = strings.TrimSpace(req.Text)
	}

	c.JSON(http.StatusOK, PolishResponse{Text: polishedText})
}

// ListAiModelsResponse 模型列表响应。
type ListAiModelsResponse struct {
	Models []string `json:"models"`
}

// ListAiModelsRequest 获取模型列表的可选请求体（未认证用户需传入 AI 配置）。
type ListAiModelsRequest struct {
	ApiUrl        string `json:"api_url,omitempty"`
	ApiKey        string `json:"api_key,omitempty"`
	ModelSource   string `json:"model_source,omitempty"`
	PublicModelID string `json:"public_model_id,omitempty"`
}

// ListAiModels handles POST /api/ai/models (AuthOptional)
// 代理调用用户配置的 API 的 /models 端点，返回可用模型列表。
// 支持公共模型模式：如果用户选择了公共模型，则查询公共模型的 API。
func ListAiModels(c *gin.Context) {
	userID := middleware.GetUserID(c)
	var req ListAiModelsRequest
	c.ShouldBindJSON(&req)
	req.ApiUrl = strings.TrimSpace(req.ApiUrl)
	req.ApiKey = strings.TrimSpace(req.ApiKey)
	req.ModelSource = strings.TrimSpace(req.ModelSource)
	req.PublicModelID = strings.TrimSpace(req.PublicModelID)

	if req.ModelSource == "public" {
		if userID == "" {
			respondError(c, http.StatusBadRequest, "公共模型需要登录后使用")
			return
		}
		apiUrl, apiKey, _, err := resolvePublicAIModel(req.PublicModelID)
		if err != nil {
			respondError(c, http.StatusBadRequest, err.Error())
			return
		}

		models, err := fetchModelList(apiUrl, apiKey)
		if err != nil {
			respondError(c, http.StatusInternalServerError, fmt.Sprintf("获取模型列表失败: %v", err))
			return
		}

		c.JSON(http.StatusOK, ListAiModelsResponse{Models: models})
		return
	}

	if req.ModelSource == "custom" || req.ApiUrl != "" || req.ApiKey != "" {
		if err := validateCustomAIConfig(req.ApiUrl, req.ApiKey, "", false); err != nil {
			respondError(c, http.StatusBadRequest, err.Error())
			return
		}

		models, err := fetchModelList(req.ApiUrl, req.ApiKey)
		if err != nil {
			respondError(c, http.StatusInternalServerError, fmt.Sprintf("获取模型列表失败: %v", err))
			return
		}

		c.JSON(http.StatusOK, ListAiModelsResponse{Models: models})
		return
	}

	if userID != "" {
		// ── 已认证：从数据库读取 ──
		var aifc models.AIServiceConfig
		if err := database.DB.Where("user_id = ?", userID).First(&aifc).Error; err != nil {
			respondError(c, http.StatusInternalServerError, "服务器内部错误")
			return
		}

		var apiUrl, apiKey string

		if aifc.ModelSource == "public" {
			publicModelID := ""
			if aifc.PublicModelID != nil {
				publicModelID = *aifc.PublicModelID
			}
			var err error
			apiUrl, apiKey, _, err = resolvePublicAIModel(publicModelID)
			if err != nil {
				respondError(c, http.StatusBadRequest, err.Error())
				return
			}
		} else {
			if err := validateCustomAIConfig(aifc.ApiUrl, aifc.ApiKey, "", false); err != nil {
				respondError(c, http.StatusBadRequest, err.Error())
				return
			}
			apiUrl = aifc.ApiUrl
			apiKey = aifc.ApiKey
		}

		models, err := fetchModelList(apiUrl, apiKey)
		if err != nil {
			respondError(c, http.StatusInternalServerError, fmt.Sprintf("获取模型列表失败: %v", err))
			return
		}

		c.JSON(http.StatusOK, ListAiModelsResponse{Models: models})
		return
	}

	// ── 未认证：从请求体读取 AI 配置 ──
	respondError(c, http.StatusBadRequest, "请先配置 API 地址")
}

// fetchModelList 调用 OpenAI-compatible GET /models 接口获取可用模型 ID 列表。
func fetchModelList(apiBaseURL, apiKey string) ([]string, error) {
	endpoint := strings.TrimRight(apiBaseURL, "/") + "/models"

	parsedURL, err := url.Parse(endpoint)
	if err != nil {
		return nil, fmt.Errorf("API 地址格式无效: %w", err)
	}
	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return nil, fmt.Errorf("API 地址需以 http:// 或 https:// 开头")
	}

	httpReq, err := http.NewRequest("GET", endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("创建请求失败: %w", err)
	}

	if apiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	}

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("请求模型列表失败: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		errPreview := string(respBody)
		if len(errPreview) > 200 {
			errPreview = errPreview[:200] + "..."
		}
		return nil, fmt.Errorf("API 返回错误 (状态码 %d): %s", resp.StatusCode, errPreview)
	}

	// 解析 OpenAI-compatible /models 响应格式: {"data":[{"id":"model-name",...}, ...]}
	var result struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}

	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("解析模型列表失败: %w", err)
	}

	modelIDs := make([]string, 0, len(result.Data))
	for _, item := range result.Data {
		if item.ID != "" {
			modelIDs = append(modelIDs, item.ID)
		}
	}

	return modelIDs, nil
}

// --- 公共模型查询 API ---

// PublicModelItem 用户端可见的公共模型信息（不含 API Key）
type PublicModelItem struct {
	ID               string  `json:"id"`
	Name             string  `json:"name"`
	Model            string  `json:"model"`
	Balance          float64 `json:"balance"`
	BalanceUpdatedAt string  `json:"balance_updated_at"`
	SortOrder        int     `json:"sort_order"`
}

type ListPublicModelsResponse struct {
	Models []PublicModelItem `json:"models"`
}

// ListPublicModels handles GET /api/ai/model-pools (requires auth)
// Returns all active public models for users to choose from (API key NOT exposed).
func ListPublicModels(c *gin.Context) {
	var pools []models.AIModelPool
	if err := database.DB.Where("is_active = true").Order("sort_order ASC, created_at DESC").Find(&pools).Error; err != nil {
		respondError(c, http.StatusInternalServerError, "查询公共模型列表失败")
		return
	}

	result := make([]PublicModelItem, 0, len(pools))
	for i := range pools {
		result = append(result, PublicModelItem{
			ID:               pools[i].ID,
			Name:             pools[i].Name,
			Model:            pools[i].Model,
			Balance:          pools[i].Balance,
			BalanceUpdatedAt: formatBalanceTime(pools[i].BalanceUpdatedAt),
			SortOrder:        pools[i].SortOrder,
		})
	}

	c.JSON(http.StatusOK, ListPublicModelsResponse{Models: result})
}

// RefreshPublicModelBalances handles POST /api/ai/model-pools/balances/refresh (requires auth)
// Refreshes balances for all DeepSeek models in the pool and returns updated list.
func RefreshPublicModelBalances(c *gin.Context) {
	var pools []models.AIModelPool
	if err := database.DB.Where("is_active = true").Order("sort_order ASC, created_at DESC").Find(&pools).Error; err != nil {
		respondError(c, http.StatusInternalServerError, "查询公共模型列表失败")
		return
	}

	now := time.Now()
	result := make([]PublicModelItem, 0, len(pools))
	for i := range pools {
		balance := pools[i].Balance
		balanceUpdatedAt := formatBalanceTime(pools[i].BalanceUpdatedAt)
		// Auto-refresh DeepSeek balances
		if isDeepSeekModel(pools[i].ApiUrl) {
			if fresh, err := fetchDeepSeekBalance(pools[i].ApiKey); err == nil {
				balance = fresh
				balanceUpdatedAt = now.Format("2006-01-02 15:04:05")
				database.DB.Model(&pools[i]).Updates(map[string]interface{}{
					"balance":            fresh,
					"balance_updated_at": now,
				})
			}
		}
		result = append(result, PublicModelItem{
			ID:               pools[i].ID,
			Name:             pools[i].Name,
			Model:            pools[i].Model,
			Balance:          balance,
			BalanceUpdatedAt: balanceUpdatedAt,
			SortOrder:        pools[i].SortOrder,
		})
	}

	c.JSON(http.StatusOK, ListPublicModelsResponse{Models: result})
}

// GetModelBalance handles GET /api/ai/model-pools/:id/balance (requires auth)
// Returns the current balance for a specific public model from DB.
func GetModelBalance(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		respondError(c, http.StatusBadRequest, "缺少模型ID")
		return
	}

	var pool models.AIModelPool
	if err := database.DB.Where("id = ? AND is_active = true", id).First(&pool).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			respondError(c, http.StatusNotFound, "公共模型不存在或已禁用")
		} else {
			respondError(c, http.StatusInternalServerError, "服务器内部错误")
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":                 pool.ID,
		"name":               pool.Name,
		"balance":            pool.Balance,
		"balance_updated_at": formatBalanceTime(pool.BalanceUpdatedAt),
	})
}

// isDeepSeekModel checks if the api_url belongs to DeepSeek.
func isDeepSeekModel(apiURL string) bool {
	return strings.Contains(strings.ToLower(apiURL), "deepseek.com")
}

// deepseekBalanceResponse is the JSON structure returned by DeepSeek's /user/balance API.
type deepseekBalanceResponse struct {
	IsAvailable  bool `json:"is_available"`
	BalanceInfos []struct {
		Currency        string `json:"currency"`
		TotalBalance    string `json:"total_balance"`
		GrantedBalance  string `json:"granted_balance"`
		ToppedUpBalance string `json:"topped_up_balance"`
	} `json:"balance_infos"`
}

// fetchDeepSeekBalance calls DeepSeek's balance API and returns the total balance in USD.
func fetchDeepSeekBalance(apiKey string) (float64, error) {
	req, err := http.NewRequest("GET", "https://api.deepseek.com/user/balance", nil)
	if err != nil {
		return 0, fmt.Errorf("创建请求失败: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return 0, fmt.Errorf("请求 DeepSeek 余额 API 失败: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, fmt.Errorf("读取响应失败: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("DeepSeek 返回状态码 %d: %s", resp.StatusCode, string(body))
	}

	var result deepseekBalanceResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return 0, fmt.Errorf("解析余额响应失败: %w", err)
	}

	// Sum up total_balance from all currency entries
	var total float64
	for _, info := range result.BalanceInfos {
		var val float64
		if _, err := fmt.Sscanf(info.TotalBalance, "%f", &val); err == nil {
			total += val
		}
	}

	return total, nil
}

// formatBalanceTime formats a *time.Time to a display string, returns empty string if nil.
func formatBalanceTime(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format("2006-01-02 15:04:05")
}

// stripJSONCodeBlock 移除 markdown 代码块标记（```json ... ```）。
func stripJSONCodeBlock(s string) string {
	s = strings.TrimSpace(s)

	// 移除 ```json 或 ``` 开头
	if strings.HasPrefix(s, "```") {
		// 找到第一个换行符
		idx := strings.Index(s, "\n")
		if idx != -1 {
			s = s[idx+1:]
		} else {
			// 只有 ``` 没有换行
			s = strings.TrimPrefix(s, "```json")
			s = strings.TrimPrefix(s, "```")
		}
	}

	// 移除结尾的 ```
	s = strings.TrimSuffix(s, "```")

	return strings.TrimSpace(s)
}
