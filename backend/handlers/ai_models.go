package handlers

import (
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"io"
	"net/http"
	"net/url"
	"pudding-resume-backend/database"
	"pudding-resume-backend/middleware"
	"pudding-resume-backend/models"
	"strings"
	"time"
)

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
