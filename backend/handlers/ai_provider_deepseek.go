package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

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
