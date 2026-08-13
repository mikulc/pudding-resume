package handlers

import (
	"encoding/json"
	"testing"
)

func TestNewDashboardResponseUsesEmptyArrays(t *testing.T) {
	payload, err := json.Marshal(newDashboardResponse())
	if err != nil {
		t.Fatalf("marshal dashboard response: %v", err)
	}

	var response map[string]any
	if err := json.Unmarshal(payload, &response); err != nil {
		t.Fatalf("unmarshal dashboard response: %v", err)
	}

	for _, field := range []string{"model_usage", "daily_new_users", "daily_tokens"} {
		items, ok := response[field].([]any)
		if !ok {
			t.Fatalf("%s should be a JSON array, got %#v", field, response[field])
		}
		if len(items) != 0 {
			t.Fatalf("%s should be empty, got %#v", field, items)
		}
	}
}
