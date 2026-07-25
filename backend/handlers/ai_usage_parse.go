package handlers

import (
	"encoding/json"
	"strconv"
	"strings"
)

func detectAIProvider(apiURL, model string) string {
	value := strings.ToLower(apiURL + " " + model)
	switch {
	case strings.Contains(value, "deepseek"):
		return "deepseek"
	case strings.Contains(value, "generativelanguage.googleapis.com"), strings.Contains(value, "googleapis.com"), strings.Contains(value, "gemini"):
		return "gemini"
	case strings.Contains(value, "mimo"), strings.Contains(value, "xiaomi"), strings.Contains(value, "mi.com"):
		return "mimo"
	case strings.Contains(value, "openai"):
		return "openai"
	default:
		return "other"
	}
}

func parseAIUsage(raw []byte) AIUsage {
	var root map[string]json.RawMessage
	if err := json.Unmarshal(raw, &root); err != nil {
		return AIUsage{Status: "unknown"}
	}

	if usageRaw, ok := root["usage"]; ok {
		usage := parseOpenAICompatibleUsage(usageRaw)
		usage.Status = "known"
		return usage
	}

	if usageRaw, ok := root["usageMetadata"]; ok {
		usage := parseGeminiUsage(usageRaw)
		usage.Status = "known"
		return usage
	}

	return AIUsage{Status: "unknown"}
}

func parseOpenAICompatibleUsage(raw json.RawMessage) AIUsage {
	var usage map[string]json.RawMessage
	if err := json.Unmarshal(raw, &usage); err != nil {
		return AIUsage{Status: "unknown"}
	}

	result := AIUsage{
		PromptTokens:     jsonInt(usage["prompt_tokens"]),
		CompletionTokens: jsonInt(usage["completion_tokens"]),
		TotalTokens:      jsonInt(usage["total_tokens"]),
		CacheHitTokens:   jsonInt(usage["prompt_cache_hit_tokens"]),
		CacheMissTokens:  jsonInt(usage["prompt_cache_miss_tokens"]),
	}

	if detailsRaw, ok := usage["completion_tokens_details"]; ok {
		var details map[string]json.RawMessage
		if json.Unmarshal(detailsRaw, &details) == nil {
			result.ReasoningTokens = jsonInt(details["reasoning_tokens"])
		}
	}

	if result.CacheHitTokens == 0 {
		if detailsRaw, ok := usage["prompt_tokens_details"]; ok {
			var details map[string]json.RawMessage
			if json.Unmarshal(detailsRaw, &details) == nil {
				result.CacheHitTokens = jsonInt(details["cached_tokens"])
			}
		}
	}

	return result
}

func parseGeminiUsage(raw json.RawMessage) AIUsage {
	var usage map[string]json.RawMessage
	if err := json.Unmarshal(raw, &usage); err != nil {
		return AIUsage{Status: "unknown"}
	}

	return AIUsage{
		PromptTokens:     jsonInt(usage["promptTokenCount"]),
		CompletionTokens: jsonInt(usage["candidatesTokenCount"]),
		TotalTokens:      jsonInt(usage["totalTokenCount"]),
		ReasoningTokens:  jsonInt(usage["thoughtsTokenCount"]),
		CacheHitTokens:   jsonInt(usage["cachedContentTokenCount"]),
	}
}

func jsonInt(raw json.RawMessage) int {
	if len(raw) == 0 {
		return 0
	}
	var n int
	if err := json.Unmarshal(raw, &n); err == nil {
		return n
	}
	var f float64
	if err := json.Unmarshal(raw, &f); err == nil {
		return int(f)
	}
	var s string
	if err := json.Unmarshal(raw, &s); err == nil {
		if parsed, err := strconv.Atoi(s); err == nil {
			return parsed
		}
	}
	return 0
}
