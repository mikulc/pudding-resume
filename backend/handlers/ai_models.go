package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
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
				database.DB.Model(&pools[i]).Updates(map[string]any{
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
