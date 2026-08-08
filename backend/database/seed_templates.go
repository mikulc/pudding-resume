package database

import (
	"encoding/json"
	"log"

	"gorm.io/datatypes"
	"gorm.io/gorm"

	"pudding-resume-backend/models"
)

// seedTemplateLibraries creates independently selectable industry/position
// templates. Their content is stored as a snapshot and their visual appearance
// is provided by a referenced theme.
func seedTemplateLibraries() {
	type templateSeed struct {
		Name       string
		Industry   string
		JobTarget  string
		LayoutID   string
		Categories []string
		Highlights []string
		SortOrder  int
	}

	seeds := []templateSeed{
		{
			Name:       "互联网通用简历",
			Industry:   "互联网",
			JobTarget:  "互联网产品与技术岗位",
			LayoutID:   "skyveil",
			Categories: []string{"互联网通用", "社招"},
			Highlights: []string{"经历完整", "重点突出", "适合多数互联网岗位"},
			SortOrder:  1,
		},
		{
			Name:       "前端开发工程师简历",
			Industry:   "互联网",
			JobTarget:  "前端开发工程师",
			LayoutID:   "cyanblu",
			Categories: []string{"前端开发", "社招"},
			Highlights: []string{"项目导向", "技术栈清晰", "突出业务成果"},
			SortOrder:  2,
		},
		{
			Name:       "后端开发工程师简历",
			Industry:   "互联网",
			JobTarget:  "后端开发工程师",
			LayoutID:   "ordrin",
			Categories: []string{"后端开发", "社招"},
			Highlights: []string{"ATS 友好", "高信息密度", "强调系统能力"},
			SortOrder:  3,
		},
		{
			Name:       "Golang 工程师简历",
			Industry:   "互联网",
			JobTarget:  "Golang 开发工程师",
			LayoutID:   "left-sidebar-two-column",
			Categories: []string{"后端开发", "Golang", "社招"},
			Highlights: []string{"工程经历", "性能与架构", "技能侧栏"},
			SortOrder:  4,
		},
		{
			Name:       "Java 工程师简历",
			Industry:   "互联网",
			JobTarget:  "Java 开发工程师",
			LayoutID:   "classic-horizontal",
			Categories: []string{"后端开发", "Java", "社招"},
			Highlights: []string{"经典单栏", "项目职责清楚", "技术关键词充分"},
			SortOrder:  5,
		},
		{
			Name:       "C++ 工程师简历",
			Industry:   "软件与系统",
			JobTarget:  "C++ 开发工程师",
			LayoutID:   "monochrome-rings",
			Categories: []string{"后端开发", "C++", "社招"},
			Highlights: []string{"工程能力", "性能成果", "黑白专业风格"},
			SortOrder:  6,
		},
		{
			Name:       "应届生校招简历",
			Industry:   "通用",
			JobTarget:  "应届生求职",
			LayoutID:   "centerline",
			Categories: []string{"校招", "实习"},
			Highlights: []string{"教育经历优先", "项目与校园经历", "简洁单页"},
			SortOrder:  7,
		},
		{
			Name:       "实习生求职简历",
			Industry:   "通用",
			JobTarget:  "实习生",
			LayoutID:   "teal-ribbon-wave",
			Categories: []string{"校招", "实习", "互联网通用"},
			Highlights: []string{"突出潜力", "项目展示", "清新视觉"},
			SortOrder:  8,
		},
	}

	for _, seed := range seeds {
		var theme models.ThemeLibrary
		if err := DB.Where("layout_id = ?", seed.LayoutID).First(&theme).Error; err != nil {
			log.Printf("Warning: failed to find default theme %s for template %s: %v", seed.LayoutID, seed.Name, err)
			continue
		}

		content := templateContentForJobTarget(seed.JobTarget)
		values := map[string]any{
			"industry":         seed.Industry,
			"categories":       marshalJSON(seed.Categories),
			"highlights":       marshalJSON(seed.Highlights),
			"content":          content,
			"default_theme_id": theme.ID,
			"status":           "published",
			"version":          1,
			"sort_order":       seed.SortOrder,
		}

		var existing models.TemplateLibrary
		err := DB.Where("name = ?", seed.Name).First(&existing).Error
		if err == nil {
			if err := DB.Model(&existing).Updates(values).Error; err != nil {
				log.Printf("Warning: failed to update template %s: %v", seed.Name, err)
			}
			continue
		}
		if err != gorm.ErrRecordNotFound {
			log.Printf("Warning: failed to check template %s: %v", seed.Name, err)
			continue
		}

		entry := models.TemplateLibrary{
			ID:             models.NewUUID(),
			Name:           seed.Name,
			Industry:       seed.Industry,
			Categories:     marshalJSON(seed.Categories),
			Highlights:     marshalJSON(seed.Highlights),
			Content:        content,
			DefaultThemeID: theme.ID,
			Status:         "published",
			Version:        1,
			SortOrder:      seed.SortOrder,
		}
		if err := DB.Create(&entry).Error; err != nil {
			log.Printf("Warning: failed to seed template %s: %v", seed.Name, err)
		}
	}
}

func templateContentForJobTarget(jobTarget string) datatypes.JSON {
	var document map[string]any
	if err := json.Unmarshal(DefaultDemoContentJSON(), &document); err != nil {
		return DefaultDemoContentJSON()
	}
	personalInfo, ok := document["personalInfo"].(map[string]any)
	if !ok {
		return DefaultDemoContentJSON()
	}
	personalInfo["jobTarget"] = jobTarget
	content, err := json.Marshal(document)
	if err != nil {
		return DefaultDemoContentJSON()
	}
	return datatypes.JSON(content)
}
