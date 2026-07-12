package handlers

import "testing"

func TestParseAIUsageOpenAICompatible(t *testing.T) {
	raw := []byte(`{
		"choices": [{"message": {"content": "ok"}}],
		"usage": {
			"prompt_tokens": 12,
			"completion_tokens": 8,
			"total_tokens": 20,
			"completion_tokens_details": {"reasoning_tokens": 3},
			"prompt_cache_hit_tokens": 5,
			"prompt_cache_miss_tokens": 7
		}
	}`)

	usage := parseAIUsage(raw)
	if usage.Status != "known" {
		t.Fatalf("expected known status, got %q", usage.Status)
	}
	if usage.PromptTokens != 12 || usage.CompletionTokens != 8 || usage.TotalTokens != 20 {
		t.Fatalf("unexpected token totals: %+v", usage)
	}
	if usage.ReasoningTokens != 3 || usage.CacheHitTokens != 5 || usage.CacheMissTokens != 7 {
		t.Fatalf("unexpected detail tokens: %+v", usage)
	}
}

func TestParseAIUsageOpenAIPromptDetailsCachedTokens(t *testing.T) {
	raw := []byte(`{
		"usage": {
			"prompt_tokens": 10,
			"completion_tokens": 4,
			"total_tokens": 14,
			"prompt_tokens_details": {"cached_tokens": 6}
		}
	}`)

	usage := parseAIUsage(raw)
	if usage.CacheHitTokens != 6 {
		t.Fatalf("expected cached prompt tokens from prompt_tokens_details, got %+v", usage)
	}
}

func TestParseAIUsageGemini(t *testing.T) {
	raw := []byte(`{
		"candidates": [],
		"usageMetadata": {
			"promptTokenCount": 11,
			"candidatesTokenCount": 9,
			"totalTokenCount": 25,
			"thoughtsTokenCount": 5,
			"cachedContentTokenCount": 4
		}
	}`)

	usage := parseAIUsage(raw)
	if usage.Status != "known" {
		t.Fatalf("expected known status, got %q", usage.Status)
	}
	if usage.PromptTokens != 11 || usage.CompletionTokens != 9 || usage.TotalTokens != 25 {
		t.Fatalf("unexpected Gemini totals: %+v", usage)
	}
	if usage.ReasoningTokens != 5 || usage.CacheHitTokens != 4 {
		t.Fatalf("unexpected Gemini detail tokens: %+v", usage)
	}
}

func TestParseAIUsageUnknownWhenMissing(t *testing.T) {
	usage := parseAIUsage([]byte(`{"choices":[{"message":{"content":"ok"}}]}`))
	if usage.Status != "unknown" {
		t.Fatalf("expected unknown status, got %q", usage.Status)
	}
	if usage.TotalTokens != 0 {
		t.Fatalf("expected zero tokens for unknown usage, got %+v", usage)
	}
}
