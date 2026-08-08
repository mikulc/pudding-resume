package database

import (
	"encoding/json"
	"gorm.io/datatypes"
	"log"
	"pudding-resume-backend/models"
)

func seedDemoContent() {
	var count int64
	if err := DB.Model(&models.DemoContent{}).Count(&count).Error; err != nil {
		log.Printf("Warning: failed to check demo_content count: %v", err)
		return
	}
	if count > 0 {
		return // Already seeded
	}

	log.Println("Seeding demo_content with sample resume data...")

	demo := models.DemoContent{
		ID:      models.NewUUID(),
		Content: DefaultDemoContentJSON(),
	}

	if err := DB.Create(&demo).Error; err != nil {
		log.Printf("Warning: failed to seed demo content: %v", err)
		return
	}

	log.Println("Demo content seeded successfully")
}

const (
	legacyBackendDemoAvatarURL  = "/api/avatars/demo-avatar.jpg"
	legacyFrontendDemoAvatarURL = "/images/demo-avatar.jpg"
	demoAvatarURL               = "/images/avatar.jpg"
)

// migrateBundledAvatarURLs updates references to the relocated bundled avatar
// without replacing any other content in demo data or user-created resumes.
func migrateBundledAvatarURLs() {
	var demos []models.DemoContent
	if err := DB.Find(&demos).Error; err != nil {
		log.Printf("Warning: failed to load demo content for asset migration: %v", err)
	} else {
		for _, demo := range demos {
			content, changed, err := replaceDemoAvatarURL(demo.Content)
			if err != nil {
				log.Printf("Warning: failed to migrate demo content %s: %v", demo.ID, err)
				continue
			}
			if !changed {
				continue
			}
			if err := DB.Model(&models.DemoContent{}).
				Where("id = ?", demo.ID).
				UpdateColumn("content", content).Error; err != nil {
				log.Printf("Warning: failed to update demo content %s: %v", demo.ID, err)
				continue
			}
			log.Printf("Demo content asset path migrated for row %s", demo.ID)
		}
	}

	var resumes []models.Resume
	if err := DB.Find(&resumes).Error; err != nil {
		log.Printf("Warning: failed to load resumes for asset migration: %v", err)
		return
	}
	updatedResumes := 0
	for _, resume := range resumes {
		content, changed, err := replaceDemoAvatarURL(resume.Content)
		if err != nil {
			log.Printf("Warning: failed to migrate resume %s: %v", resume.ID, err)
			continue
		}
		if !changed {
			continue
		}
		if err := DB.Model(&models.Resume{}).
			Where("id = ?", resume.ID).
			UpdateColumn("content", content).Error; err != nil {
			log.Printf("Warning: failed to update resume %s: %v", resume.ID, err)
			continue
		}
		updatedResumes++
	}
	if updatedResumes > 0 {
		log.Printf("Resume asset paths migrated: %d row(s) updated", updatedResumes)
	}
}

func replaceDemoAvatarURL(content datatypes.JSON) (datatypes.JSON, bool, error) {
	var document map[string]any
	if err := json.Unmarshal(content, &document); err != nil {
		return nil, false, err
	}

	personalInfo, ok := document["personalInfo"].(map[string]any)
	if !ok {
		return content, false, nil
	}

	photoURL, _ := personalInfo["photoUrl"].(string)
	if photoURL != legacyBackendDemoAvatarURL && photoURL != legacyFrontendDemoAvatarURL {
		return content, false, nil
	}

	personalInfo["photoUrl"] = demoAvatarURL
	updated, err := json.Marshal(document)
	if err != nil {
		return nil, false, err
	}
	return datatypes.JSON(updated), true, nil
}

// DefaultDemoContentJSON returns the hardcoded resume used by theme preview cards.
// Keep it concise enough to fit one A4 page in card previews.
func DefaultDemoContentJSON() datatypes.JSON {
	type demoContent struct {
		PersonalInfo   map[string]any    `json:"personalInfo"`
		Education      []map[string]any  `json:"education"`
		WorkExperience []map[string]any  `json:"workExperience"`
		Projects       []map[string]any  `json:"projects"`
		Skills         string            `json:"skills"`
		Honors         []map[string]any  `json:"honors"`
		Certifications []map[string]any  `json:"certifications"`
		Portfolio      []map[string]any  `json:"portfolio"`
		Summary        string            `json:"summary"`
		CustomSections []map[string]any  `json:"customSections"`
		SectionOrder   []string          `json:"sectionOrder"`
		SectionTitles  map[string]string `json:"sectionTitles"`
		HiddenSections []string          `json:"hiddenSections"`
	}

	demoData := demoContent{
		PersonalInfo: map[string]any{
			"fullName":     "布丁",
			"phone":        "13888888888",
			"email":        "pudding@example.com",
			"photoUrl":     demoAvatarURL,
			"jobStatus":    "随时到岗",
			"jobTarget":    "Golang开发工程师",
			"location":     "深圳",
			"displayMode":  "icon",
			"photoLayout":  "right",
			"hiddenFields": []string{},
			"customFields": map[string]string{},
			"iconMap":      map[string]string{},
		},
		Education: []map[string]any{
			{
				"id":        "demo-edu-1",
				"school":    "布丁大学",
				"major":     "计算机科学与技术",
				"degree":    "本科",
				"startDate": "2018.09",
				"endDate":   "2022.06",
			},
		},
		WorkExperience: []map[string]any{
			{
				"id":         "demo-work-1",
				"company":    "布丁科技有限公司",
				"position":   "Golang开发工程师",
				"location":   "深圳",
				"startDate":  "2022.07",
				"endDate":    "至今",
				"highlights": "1. 设计并开发 简历平台后端服务，基于 Golang、Gin、GORM、PostgreSQL构建用户认证、简历管理、模板管理、导出记录等核心模块。\n2. 实现 JWT 登录认证与用户权限校验，支持用户注册、登录、Token 校验、接口鉴权等能力，保障用户数据访问安全。\n3. 开发简历增删改查、自动保存、本地草稿同步等接口，优化前后端数据交互流程，提升编辑器使用体验。\n4. 封装统一响应结构、错误码、中间件、日志与配置管理，提升后端代码规范性和可维护性。\n5. 排查生产环境端口占用、接口异常、CORS预检失败等问题，提升项目部署与运维效率。",
			},
		},
		Projects: []map[string]any{
			{
				"id":         "demo-project-1",
				"name":       "在线简历编辑与生成系统",
				"role":       "核心开发",
				"startDate":  "2023.04",
				"endDate":    "2023.12",
				"link":       "",
				"highlights": "该项目是一套在线简历编辑与生成平台，支持用户创建简历、选择模板、实时编辑内容、自动保存、简历预览、PDF/PNG 导出、分享链接、AI 简历诊断等功能，帮助用户快速生成结构清晰、排版规范的求职简历。\n\n**技术栈：**\n\nGolang、Gin、GORM、PostgreSQL/MySQL、Redis、JWT、React、Vite、Tailwind CSS\n\n**核心职责与成果：**\n\n1. 设计并开发 简历管理、用户认证、模板管理、导出记录等核心后端模块，支撑简历创建、编辑、保存、查询、删除等完整业务流程。\n2. 实现 JWT 登录认证与接口鉴权机制，完成用户注册、登录、Token 校验、权限拦截等能力，保障用户简历数据的访问安全。\n3. 封装 统一 API 响应结构、错误码、中间件、日志与配置管理，提升后端接口规范性和项目可维护性。\n4. 优化 简历自动保存逻辑，支持编辑过程中定时保存与手动保存，减少用户因刷新、误操作导致的数据丢失问题。\n5. 开发 简历模板与主题配置能力，支持不同模板样式、字体、颜色、模块顺序等个性化配置，提升简历编辑灵活性。",
			},
		},
		Skills:         "",
		Honors:         []map[string]any{},
		Certifications: []map[string]any{},
		Portfolio:      []map[string]any{},
		Summary:        "",
		CustomSections: []map[string]any{},
		SectionOrder: []string{
			"personal",
			"education",
			"work",
			"projects",
			"skills",
			"honors",
			"certifications",
			"portfolio",
			"summary",
		},
		SectionTitles:  map[string]string{},
		HiddenSections: []string{},
	}

	return marshalJSON(demoData)
}

// seedDocSettings syncs built-in document settings and backfills missing rows.
