package handlers

import (
	"encoding/json"
	"strings"
	"unicode"
)

func redactResumeContent(content []byte) json.RawMessage {
	var data map[string]any
	if err := json.Unmarshal(content, &data); err != nil {
		return json.RawMessage(content)
	}

	personalInfo, ok := data["personalInfo"].(map[string]any)
	if !ok {
		return json.RawMessage(content)
	}

	if value, ok := personalInfo["fullName"].(string); ok {
		personalInfo["fullName"] = maskName(value)
	}
	if value, ok := personalInfo["phone"].(string); ok {
		personalInfo["phone"] = maskPhone(value)
	}
	if value, ok := personalInfo["email"].(string); ok {
		personalInfo["email"] = maskEmail(value)
	}
	if _, ok := personalInfo["photoUrl"]; ok {
		personalInfo["photoUrl"] = ""
	}
	if value, ok := personalInfo["location"].(string); ok {
		personalInfo["location"] = maskGeneric(value)
	}
	if customFields, ok := personalInfo["customFields"].(map[string]any); ok {
		for key, rawValue := range customFields {
			if value, ok := rawValue.(string); ok {
				customFields[key] = maskGeneric(value)
			}
		}
	}

	redacted, err := json.Marshal(data)
	if err != nil {
		return json.RawMessage(content)
	}
	return json.RawMessage(redacted)
}

func maskName(value string) string {
	runes := []rune(strings.TrimSpace(value))
	if len(runes) == 0 {
		return value
	}
	if len(runes) == 1 {
		return "*"
	}
	return string(runes[0]) + strings.Repeat("*", len(runes)-1)
}

func maskPhone(value string) string {
	digitCount := 0
	for _, r := range value {
		if unicode.IsDigit(r) {
			digitCount++
		}
	}
	if digitCount == 0 {
		return maskGeneric(value)
	}
	keepLeading := 3
	keepTrailing := 2
	if digitCount <= 5 {
		keepLeading = 1
		keepTrailing = 0
	}

	seen := 0
	var b strings.Builder
	for _, r := range value {
		if !unicode.IsDigit(r) {
			b.WriteRune(r)
			continue
		}
		seen++
		if seen <= keepLeading || seen > digitCount-keepTrailing {
			b.WriteRune(r)
		} else {
			b.WriteRune('*')
		}
	}
	return b.String()
}

func maskEmail(value string) string {
	parts := strings.SplitN(strings.TrimSpace(value), "@", 2)
	if len(parts) != 2 || parts[0] == "" {
		return maskGeneric(value)
	}
	local := []rune(parts[0])
	if len(local) == 0 {
		return "***@***"
	}
	return string(local[0]) + "***@***"
}

func maskGeneric(value string) string {
	runes := []rune(strings.TrimSpace(value))
	if len(runes) == 0 {
		return value
	}
	if len(runes) == 1 {
		return "*"
	}
	if len(runes) == 2 {
		return string(runes[0]) + "*"
	}
	return string(runes[0]) + strings.Repeat("*", len(runes)-2) + string(runes[len(runes)-1])
}
