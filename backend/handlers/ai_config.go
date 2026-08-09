package handlers

import (
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"log"
	"pudding-resume-backend/database"
	"pudding-resume-backend/middleware"
	"pudding-resume-backend/models"
	"strings"
)

type AiServiceRequest struct {
	Prompt string `json:"prompt" binding:"required"`
	// Optional AI config for unauthenticated users (guest mode)
	ApiUrl string `json:"api_url,omitempty"`
	ApiKey string `json:"api_key,omitempty"`
	Model  string `json:"model,omitempty"`
}

type AiServiceResponse struct {
	ResumeData json.RawMessage `json:"resume_data"`
}

type TranslateResumeRequest struct {
	ResumeData json.RawMessage `json:"resume_data" binding:"required"`
	// Optional AI config for unauthenticated users (guest mode)
	ApiUrl string `json:"api_url,omitempty"`
	ApiKey string `json:"api_key,omitempty"`
	Model  string `json:"model,omitempty"`
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
	ApiURL       string
	ApiKey       string
	Model        string
	SystemPrompt string
	Provider     string
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

func extractAIConfig(c *gin.Context, reqApiUrl, reqApiKey, reqModel string) (resolvedAIConfig, error) {
	userID := middleware.GetUserID(c)
	reqApiUrl = strings.TrimSpace(reqApiUrl)
	reqApiKey = strings.TrimSpace(reqApiKey)
	reqModel = strings.TrimSpace(reqModel)

	// Prefer the latest request configuration so local debounced saves cannot be
	// overwritten by an older cloud value.
	if reqApiUrl != "" || reqApiKey != "" || reqModel != "" {
		if err := validateCustomAIConfig(reqApiUrl, reqApiKey, reqModel, true); err != nil {
			return resolvedAIConfig{}, err
		}
		return resolvedAIConfig{
			ApiURL:       reqApiUrl,
			ApiKey:       reqApiKey,
			Model:        reqModel,
			SystemPrompt: getSystemPromptForUser(userID),
			Provider:     detectAIProvider(reqApiUrl, reqModel),
		}, nil
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
		Provider:     detectAIProvider(reqApiUrl, reqModel),
	}, nil
}

// AiService handles POST /api/ai/service (AuthOptional)
