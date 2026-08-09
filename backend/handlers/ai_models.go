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
	ApiUrl string `json:"api_url,omitempty"`
	ApiKey string `json:"api_key,omitempty"`
}

// ListAiModels proxies the configured OpenAI-compatible /models endpoint.
func ListAiModels(c *gin.Context) {
	userID := middleware.GetUserID(c)
	var req ListAiModelsRequest
	_ = c.ShouldBindJSON(&req)
	req.ApiUrl = strings.TrimSpace(req.ApiUrl)
	req.ApiKey = strings.TrimSpace(req.ApiKey)

	apiURL := req.ApiUrl
	apiKey := req.ApiKey
	if apiURL == "" && userID != "" {
		var config models.AIServiceConfig
		if err := database.DB.Where("user_id = ?", userID).First(&config).Error; err != nil {
			respondError(c, http.StatusInternalServerError, "服务器内部错误")
			return
		}
		apiURL = config.ApiUrl
	}

	if err := validateCustomAIConfig(apiURL, apiKey, "", false); err != nil {
		respondError(c, http.StatusBadRequest, err.Error())
		return
	}
	models, err := fetchModelList(apiURL, apiKey)
	if err != nil {
		respondError(c, http.StatusInternalServerError, fmt.Sprintf("获取模型列表失败: %v", err))
		return
	}
	c.JSON(http.StatusOK, ListAiModelsResponse{Models: models})
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
