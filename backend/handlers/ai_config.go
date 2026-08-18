package handlers

import (
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"log"
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

const translateResumeSystemPrompt = `你是专业英文简历优化助手。输入是从当前简历结构提取出的“可翻译文本投影”，请把其中的中文翻译成英文。
要求：
- 必须逐字段返回与输入完全相同的 JSON 结构、字段名、对象键和数组长度。
- 不要新增、删除、重排或重命名任何字段或数组元素。
- 输入已经排除了姓名、ID、日期、手机号、邮箱、URL、图片地址、排序、隐藏状态和图标等不可修改数据；不要推测或补充这些字段。
- personalInfo.customFields 的 label/value、personalInfo.fieldConfig.labelOverrides 的值、sectionConfig.titleOverrides 的值都是用户可见文本，需要翻译。
- education.details、workExperience.description、projects.description 以及 customSections 的 name/content 均需要翻译。
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

func extractAIConfig(_ *gin.Context, reqApiUrl, reqApiKey, reqModel string) (resolvedAIConfig, error) {
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
			SystemPrompt: defaultSystemPrompt,
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
