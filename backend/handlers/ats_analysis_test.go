package handlers

import (
	"strings"
	"testing"
)

func TestParseAtsAnalysisResultExtractsWrappedJSONObject(t *testing.T) {
	raw := []byte(`Here is the result:
{
  "score": 88,
  "summary": "Strong match.",
  "matched_keywords": ["Go", "React"],
  "missing_keywords": null,
  "format_issues": null,
  "content_suggestions": [{"severity":"medium","title":"Add metrics","description":"Quantify project impact.","target_section":"projects"}]
}
Thanks.`)

	result, err := parseAtsAnalysisResult(raw)
	if err != nil {
		t.Fatalf("expected wrapped JSON to parse, got %v", err)
	}

	if result.Score != 88 {
		t.Fatalf("expected score 88, got %d", result.Score)
	}
	if len(result.MatchedKeywords) != 2 || len(result.MissingKeywords) != 0 {
		t.Fatalf("unexpected keywords: %+v", result)
	}
	if len(result.ContentSuggestions) != 1 {
		t.Fatalf("expected one suggestion, got %+v", result.ContentSuggestions)
	}
}

func TestParseAtsAnalysisResultReportsIncompleteJSON(t *testing.T) {
	_, err := parseAtsAnalysisResult([]byte(`{"score":75,"summary":"truncated"`))
	if err == nil {
		t.Fatal("expected an error for incomplete JSON")
	}
	if !strings.Contains(err.Error(), "complete JSON object") {
		t.Fatalf("expected clear incomplete JSON error, got %v", err)
	}
}
