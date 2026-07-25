package handlers

import (
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"net/http"
	"strings"
	"time"
)

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
