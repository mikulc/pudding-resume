package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/gin-gonic/gin"
	"log"
	"net/http"
	"strings"
	"time"
)

type AtsAnalysisRequest struct {
	ResumeData     json.RawMessage `json:"resume_data" binding:"required"`
	JobDescription string          `json:"job_description" binding:"required"`
	Language       string          `json:"language,omitempty"`
	// Optional AI config for unauthenticated users (guest mode)
	ApiUrl string `json:"api_url,omitempty"`
	ApiKey string `json:"api_key,omitempty"`
	Model  string `json:"model,omitempty"`
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

const atsSystemPromptEn = `You are an ATS resume analysis assistant. Compare the provided structured resume JSON with the job description.

Return only valid JSON with exactly this shape:
{
  "score": 0,
  "summary": "",
  "matched_keywords": [],
  "missing_keywords": [],
  "format_issues": [{"severity":"high|medium|low","title":"","description":"","target_section":"personal|summary|education|skills|work|projects|honors|custom"}],
  "content_suggestions": [{"severity":"high|medium|low","title":"","description":"","target_section":"personal|summary|education|skills|work|projects|honors|custom","rewrite_hint":""}],
  "recommended_layouts": []
}

Scoring guidance:
- 0-39: weak match or serious parse risks.
- 40-59: partial match with important gaps.
- 60-79: reasonable match with improvements needed.
- 80-100: strong match and ATS-friendly.

Rules:
- Do not invent skills, experience, employers, education, or metrics.
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
  "format_issues": [{"severity":"high|medium|low","title":"","description":"","target_section":"personal|summary|education|skills|work|projects|honors|custom"}],
  "content_suggestions": [{"severity":"high|medium|low","title":"","description":"","target_section":"personal|summary|education|skills|work|projects|honors|custom","rewrite_hint":""}],
  "recommended_layouts": []
}

Scoring guidance:
- 0-39: 岗位匹配较弱或存在明显 ATS 解析风险。
- 40-59: 有一定匹配，但关键要求缺口明显。
- 60-79: 基本匹配，但仍需要补充关键词或优化表达。
- 80-100: 匹配度较高，且整体较适合 ATS 解析。

Rules:
- 不要编造技能、经历、公司、学历或指标。
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

	cfg, err := extractAIConfig(c, req.ApiUrl, req.ApiKey, req.Model)
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
