package handlers

import (
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"
)

func TestFetchModelList(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/models" {
			t.Errorf("path = %q", r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer secret" {
			t.Errorf("authorization = %q", r.Header.Get("Authorization"))
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":[{"id":"model-a"},{"id":""},{"id":"model-b"}]}`))
	}))
	defer server.Close()

	models, err := fetchModelList(server.URL+"/v1", "secret")
	if err != nil {
		t.Fatalf("fetchModelList returned an error: %v", err)
	}
	if !reflect.DeepEqual(models, []string{"model-a", "model-b"}) {
		t.Fatalf("models = %#v", models)
	}
}

func TestFetchModelListRejectsUnsupportedScheme(t *testing.T) {
	if _, err := fetchModelList("file:///tmp/provider", "secret"); err == nil {
		t.Fatal("expected unsupported URL scheme to be rejected")
	}
}

func TestStripJSONCodeBlock(t *testing.T) {
	got := stripJSONCodeBlock("```json\n{\"ok\":true}\n```")
	if got != `{"ok":true}` {
		t.Fatalf("stripped content = %q", got)
	}
}
