package handlers

import "testing"

func TestChangelogPublishedOrDefault(t *testing.T) {
	t.Run("publishes new changelog when field is omitted", func(t *testing.T) {
		if !changelogPublishedOrDefault(nil) {
			t.Fatal("expected omitted is_published to default to true")
		}
	})

	t.Run("respects an explicit draft", func(t *testing.T) {
		value := false
		if changelogPublishedOrDefault(&value) {
			t.Fatal("expected explicit false is_published to remain false")
		}
	})
}
