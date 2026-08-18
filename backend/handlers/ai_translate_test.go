package handlers

import (
	"encoding/json"
	"reflect"
	"testing"
)

const canonicalResumeFixture = `{
	"personalInfo":{"fullName":"张三","phone":"13800000000","email":"zhang@example.com","photoUrl":"https://example.com/photo.jpg","jobSearchStatus":"在职，考虑机会","targetRole":"后端工程师","preferredLocation":"上海","customFields":[{"id":"custom-1","label":"微信","value":"开发者"}],"fieldConfig":{"order":["fullName","custom-1"],"hidden":["photo"],"labelOverrides":{"targetRole":"目标岗位"},"iconOverrides":{"custom-1":"chat"}}},
	"summary":"五年后端开发经验",
	"education":[{"id":"edu-1","school":"复旦大学","major":"计算机科学","degree":"本科","startDate":"2015-09","endDate":"2019-06","details":"优秀毕业生"}],
	"workExperience":[{"id":"work-1","company":"示例科技","location":"上海","position":"高级工程师","startDate":"2022-01","endDate":"present","description":"负责核心平台"}],
	"projects":[{"id":"project-1","name":"简历系统","role":"负责人","startDate":"2023-01","endDate":"2024-01","link":"https://example.com/project","description":"提升导出性能"}],
	"skills":"Go、PostgreSQL",
	"honors":[{"id":"honor-1","name":"年度最佳员工","date":"2023-12"}],
	"customSections":[{"id":"custom-section-1","name":"开源经历","content":"维护社区项目"}],
	"sectionConfig":{"order":["personal","work","custom-section-1"],"titleOverrides":{"work":"职业经历","custom-section-1":"社区贡献"},"hidden":["honors"]}
}`

func TestBuildResumeTranslationProjectionMatchesCanonicalResumeShape(t *testing.T) {
	projection, err := buildResumeTranslationProjection(json.RawMessage(canonicalResumeFixture))
	if err != nil {
		t.Fatalf("build projection: %v", err)
	}

	var got map[string]any
	if err := json.Unmarshal(projection, &got); err != nil {
		t.Fatalf("decode projection: %v", err)
	}
	personal := got["personalInfo"].(map[string]any)
	for _, immutable := range []string{"fullName", "phone", "email", "photoUrl"} {
		if _, ok := personal[immutable]; ok {
			t.Fatalf("projection must not include immutable personal field %q", immutable)
		}
	}
	if _, ok := personal["targetRole"]; !ok {
		t.Fatal("projection should include targetRole")
	}
	fieldConfig := personal["fieldConfig"].(map[string]any)
	if !reflect.DeepEqual(fieldConfig, map[string]any{"labelOverrides": map[string]any{"targetRole": "目标岗位"}}) {
		t.Fatalf("projection should only include translatable field config: %#v", fieldConfig)
	}
	sectionConfig := got["sectionConfig"].(map[string]any)
	if _, ok := sectionConfig["order"]; ok {
		t.Fatal("projection must not include section order")
	}
	if _, ok := sectionConfig["titleOverrides"]; !ok {
		t.Fatal("projection should include section title overrides")
	}
	work := got["workExperience"].([]any)[0].(map[string]any)
	if _, ok := work["description"]; !ok {
		t.Fatal("projection should include canonical work description")
	}
	if _, ok := work["id"]; ok {
		t.Fatal("projection must not include entry IDs")
	}
}

func TestMergeResumeTranslationPreservesStructureAndConfiguration(t *testing.T) {
	original := json.RawMessage(canonicalResumeFixture)
	projection, err := buildResumeTranslationProjection(original)
	if err != nil {
		t.Fatalf("build projection: %v", err)
	}
	translated := json.RawMessage(`{
		"personalInfo":{"jobSearchStatus":"Open to opportunities","targetRole":"Backend Engineer","preferredLocation":"Shanghai","customFields":[{"label":"WeChat","value":"Developer"}],"fieldConfig":{"labelOverrides":{"targetRole":"Target Role"}}},
		"summary":"Five years of backend development experience",
		"education":[{"school":"Fudan University","major":"Computer Science","degree":"Bachelor's Degree","details":"Outstanding Graduate"}],
		"workExperience":[{"company":"Example Technology","location":"Shanghai","position":"Senior Engineer","description":"Owned the core platform"}],
		"projects":[{"name":"Resume System","role":"Lead","description":"Improved export performance"}],
		"skills":"Go, PostgreSQL",
		"honors":[{"name":"Employee of the Year"}],
		"customSections":[{"name":"Open Source Experience","content":"Maintained community projects"}],
		"sectionConfig":{"titleOverrides":{"work":"Professional Experience","custom-section-1":"Community Contributions"}}
	}`)

	merged, err := mergeResumeTranslation(original, projection, translated)
	if err != nil {
		t.Fatalf("merge translation: %v", err)
	}
	var got map[string]any
	if err := json.Unmarshal(merged, &got); err != nil {
		t.Fatalf("decode merged resume: %v", err)
	}
	personal := got["personalInfo"].(map[string]any)
	if personal["fullName"] != "张三" || personal["targetRole"] != "Backend Engineer" {
		t.Fatalf("unexpected personal info: %#v", personal)
	}
	custom := personal["customFields"].([]any)[0].(map[string]any)
	if custom["id"] != "custom-1" || custom["label"] != "WeChat" {
		t.Fatalf("custom field identity changed: %#v", custom)
	}
	config := personal["fieldConfig"].(map[string]any)
	if !reflect.DeepEqual(config["order"], []any{"fullName", "custom-1"}) || !reflect.DeepEqual(config["hidden"], []any{"photo"}) {
		t.Fatalf("personal field configuration changed: %#v", config)
	}
	work := got["workExperience"].([]any)[0].(map[string]any)
	if work["id"] != "work-1" || work["startDate"] != "2022-01" || work["description"] != "Owned the core platform" {
		t.Fatalf("work identity/date changed: %#v", work)
	}
	sectionConfig := got["sectionConfig"].(map[string]any)
	if !reflect.DeepEqual(sectionConfig["order"], []any{"personal", "work", "custom-section-1"}) || !reflect.DeepEqual(sectionConfig["hidden"], []any{"honors"}) {
		t.Fatalf("section configuration changed: %#v", sectionConfig)
	}
}

func TestMergeResumeTranslationRejectsShapeDrift(t *testing.T) {
	original := json.RawMessage(`{"workExperience":[{"id":"work-1","description":"负责平台"}]}`)
	projection, err := buildResumeTranslationProjection(original)
	if err != nil {
		t.Fatalf("build projection: %v", err)
	}
	if _, err := mergeResumeTranslation(original, projection, json.RawMessage(`{"workExperience":[]}`)); err == nil {
		t.Fatal("expected changed array length to be rejected")
	}
	if _, err := mergeResumeTranslation(original, projection, json.RawMessage(`{"workExperience":[{"description":"Owned platform","id":"changed"}]}`)); err == nil {
		t.Fatal("expected added translation field to be rejected")
	}
}
