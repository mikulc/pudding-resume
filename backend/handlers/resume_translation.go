package handlers

import (
	"encoding/json"
	"fmt"
)

type translationProjectionRule struct {
	fields    map[string]translationProjectionRule
	arrayItem *translationProjectionRule
	stringMap bool
	string    bool
}

func stringRule() translationProjectionRule {
	return translationProjectionRule{string: true}
}

func stringMapRule() translationProjectionRule {
	return translationProjectionRule{stringMap: true}
}

func objectRule(fields map[string]translationProjectionRule) translationProjectionRule {
	return translationProjectionRule{fields: fields}
}

func arrayRule(item translationProjectionRule) translationProjectionRule {
	return translationProjectionRule{arrayItem: &item}
}

var resumeTranslationRule = objectRule(map[string]translationProjectionRule{
	"personalInfo": objectRule(map[string]translationProjectionRule{
		"jobSearchStatus":   stringRule(),
		"targetRole":        stringRule(),
		"preferredLocation": stringRule(),
		"customFields": arrayRule(objectRule(map[string]translationProjectionRule{
			"label": stringRule(),
			"value": stringRule(),
		})),
		"fieldConfig": objectRule(map[string]translationProjectionRule{
			"labelOverrides": stringMapRule(),
		}),
	}),
	"summary": stringRule(),
	"education": arrayRule(objectRule(map[string]translationProjectionRule{
		"school":  stringRule(),
		"major":   stringRule(),
		"degree":  stringRule(),
		"details": stringRule(),
	})),
	"workExperience": arrayRule(objectRule(map[string]translationProjectionRule{
		"company":     stringRule(),
		"location":    stringRule(),
		"position":    stringRule(),
		"description": stringRule(),
	})),
	"projects": arrayRule(objectRule(map[string]translationProjectionRule{
		"name":        stringRule(),
		"role":        stringRule(),
		"description": stringRule(),
	})),
	"skills": stringRule(),
	"honors": arrayRule(objectRule(map[string]translationProjectionRule{
		"name": stringRule(),
	})),
	"customSections": arrayRule(objectRule(map[string]translationProjectionRule{
		"name":    stringRule(),
		"content": stringRule(),
	})),
	"sectionConfig": objectRule(map[string]translationProjectionRule{
		"titleOverrides": stringMapRule(),
	}),
})

// buildResumeTranslationProjection extracts only user-visible natural-language
// fields from the canonical resume. Identity, dates, links, ordering and other
// configuration never leave the trusted structure-preserving merge boundary.
func buildResumeTranslationProjection(resume json.RawMessage) (json.RawMessage, error) {
	var original any
	if err := json.Unmarshal(resume, &original); err != nil {
		return nil, fmt.Errorf("decode resume: %w", err)
	}
	projection, ok := projectTranslationValue(original, resumeTranslationRule)
	if !ok {
		return nil, fmt.Errorf("resume must be a JSON object")
	}
	encoded, err := json.Marshal(projection)
	if err != nil {
		return nil, fmt.Errorf("encode translation projection: %w", err)
	}
	return encoded, nil
}

func projectTranslationValue(value any, rule translationProjectionRule) (any, bool) {
	if rule.string {
		text, ok := value.(string)
		return text, ok
	}
	if rule.stringMap {
		input, ok := value.(map[string]any)
		if !ok {
			return nil, false
		}
		output := make(map[string]any, len(input))
		for key, item := range input {
			if text, ok := item.(string); ok {
				output[key] = text
			}
		}
		return output, true
	}
	if rule.arrayItem != nil {
		input, ok := value.([]any)
		if !ok {
			return nil, false
		}
		output := make([]any, 0, len(input))
		for _, item := range input {
			projected, ok := projectTranslationValue(item, *rule.arrayItem)
			if !ok {
				projected = map[string]any{}
			}
			output = append(output, projected)
		}
		return output, true
	}

	input, ok := value.(map[string]any)
	if !ok {
		return nil, false
	}
	output := make(map[string]any)
	for key, childRule := range rule.fields {
		item, exists := input[key]
		if !exists {
			continue
		}
		projected, ok := projectTranslationValue(item, childRule)
		if ok {
			output[key] = projected
		}
	}
	return output, true
}

// mergeResumeTranslation accepts only a translation with the exact projection
// shape, then overlays its string leaves onto the original resume JSON.
func mergeResumeTranslation(original, projection, translated json.RawMessage) (json.RawMessage, error) {
	var originalValue, projectionValue, translatedValue any
	if err := json.Unmarshal(original, &originalValue); err != nil {
		return nil, fmt.Errorf("decode original resume: %w", err)
	}
	if err := json.Unmarshal(projection, &projectionValue); err != nil {
		return nil, fmt.Errorf("decode translation projection: %w", err)
	}
	if err := json.Unmarshal(translated, &translatedValue); err != nil {
		return nil, fmt.Errorf("decode translated projection: %w", err)
	}
	if err := validateTranslationShape(projectionValue, translatedValue, "resume"); err != nil {
		return nil, err
	}
	merged, err := overlayTranslation(originalValue, projectionValue, translatedValue, "resume")
	if err != nil {
		return nil, err
	}
	encoded, err := json.Marshal(merged)
	if err != nil {
		return nil, fmt.Errorf("encode translated resume: %w", err)
	}
	return encoded, nil
}

func validateTranslationShape(expected, actual any, path string) error {
	switch expectedValue := expected.(type) {
	case string:
		if _, ok := actual.(string); !ok {
			return fmt.Errorf("translation field %s must remain a string", path)
		}
	case []any:
		actualValue, ok := actual.([]any)
		if !ok || len(actualValue) != len(expectedValue) {
			return fmt.Errorf("translation array %s changed shape", path)
		}
		for index := range expectedValue {
			if err := validateTranslationShape(expectedValue[index], actualValue[index], fmt.Sprintf("%s[%d]", path, index)); err != nil {
				return err
			}
		}
	case map[string]any:
		actualValue, ok := actual.(map[string]any)
		if !ok || len(actualValue) != len(expectedValue) {
			return fmt.Errorf("translation object %s changed shape", path)
		}
		for key, expectedChild := range expectedValue {
			actualChild, exists := actualValue[key]
			if !exists {
				return fmt.Errorf("translation object %s is missing field %s", path, key)
			}
			if err := validateTranslationShape(expectedChild, actualChild, path+"."+key); err != nil {
				return err
			}
		}
	default:
		return fmt.Errorf("unsupported translation field at %s", path)
	}
	return nil
}

func overlayTranslation(original, projection, translated any, path string) (any, error) {
	switch projectionValue := projection.(type) {
	case string:
		return translated, nil
	case []any:
		originalValue, ok := original.([]any)
		if !ok || len(originalValue) != len(projectionValue) {
			return nil, fmt.Errorf("original resume array %s changed during translation", path)
		}
		translatedValue := translated.([]any)
		for index := range projectionValue {
			merged, err := overlayTranslation(originalValue[index], projectionValue[index], translatedValue[index], fmt.Sprintf("%s[%d]", path, index))
			if err != nil {
				return nil, err
			}
			originalValue[index] = merged
		}
		return originalValue, nil
	case map[string]any:
		originalValue, ok := original.(map[string]any)
		if !ok {
			return nil, fmt.Errorf("original resume object %s changed during translation", path)
		}
		translatedValue := translated.(map[string]any)
		for key, projectionChild := range projectionValue {
			originalChild, exists := originalValue[key]
			if !exists {
				return nil, fmt.Errorf("original resume object %s is missing field %s", path, key)
			}
			merged, err := overlayTranslation(originalChild, projectionChild, translatedValue[key], path+"."+key)
			if err != nil {
				return nil, err
			}
			originalValue[key] = merged
		}
		return originalValue, nil
	default:
		return nil, fmt.Errorf("unsupported translation field at %s", path)
	}
}
