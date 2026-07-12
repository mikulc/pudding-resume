package database

import (
	"log"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"

	"pudding-resume-backend/models"
)

// seedStyleLibraries populates the style_library table with default data
// and backfills missing built-in layouts (safe to call on every server start).
func seedStyleLibraries() {
	type previewColors struct {
		HeaderBg  string `json:"headerBg"`
		AccentBar string `json:"accentBar"`
		BodyBg    string `json:"bodyBg"`
		SectionBg string `json:"sectionBg"`
	}

	entries := []models.StyleLibrary{
		{
			ID:            uuid.New().String(),
			Name:          "浅蓝通栏",
			Description:   "通栏浅蓝标题版式，结构清晰，适配应届生、产品运营和通用求职简历。",
			LayoutID:      "skyveil",
			Category:      "商务",
			Highlights:    marshalJSON([]string{"清爽通栏", "层级清晰", "通用版式"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#DBEAFE", AccentBar: "#3B82F6", BodyBg: "#FFFFFF", SectionBg: "#F3F4F6"}),
			SortOrder:     1,
		},
		{
			ID:            uuid.New().String(),
			Name:          "青蓝圆标",
			Description:   "青蓝色标题、圆形图标和细线分割组合，适配互联网、管理和商务岗位简历。",
			LayoutID:      "cyanblu",
			Category:      "商务",
			Highlights:    marshalJSON([]string{"青蓝点缀", "图标标题", "细线分割"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#FFFFFF", AccentBar: "#1e3a5f", BodyBg: "#FFFFFF", SectionBg: "#F3F4F6"}),
			SortOrder:     2,
		},
		{
			ID:            uuid.New().String(),
			Name:          "黑白简线",
			Description:   "黑白极简版式，减少装饰元素，适配技术、科研和金融类简历。",
			LayoutID:      "ordrin",
			Category:      "极简",
			Highlights:    marshalJSON([]string{"黑白极简", "ATS 友好", "信息密度高"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#FFFFFF", AccentBar: "#1a1a1a", BodyBg: "#FFFFFF", SectionBg: "#F3F4F6"}),
			SortOrder:     3,
		},
		{
			ID:            uuid.New().String(),
			Name:          "青影侧栏",
			Description:   "浅蓝侧栏、圆角边框与绿色标题点缀，适配互联网产品、研发和 AI 工程岗位简历。",
			LayoutID:      "left-sidebar-two-column",
			Category:      "互联网",
			Highlights:    marshalJSON([]string{"侧栏信息", "彩色标题", "产品岗风格"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#EEF3FB", AccentBar: "#248f83", BodyBg: "#FFFFFF", SectionBg: "#EEF3FB"}),
			SortOrder:     4,
		},
		{
			ID:            uuid.New().String(),
			Name:          "居中单栏",
			Description:   "纯白单栏、居中抬头与黑白分割线，适配 ATS 投递、国企银行和正式商务简历。",
			LayoutID:      "centerline",
			Category:      "极简",
			Highlights:    marshalJSON([]string{"居中抬头", "纯白单栏", "ATS 友好"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#FFFFFF", AccentBar: "#000000", BodyBg: "#FFFFFF", SectionBg: "#F5F5F5"}),
			SortOrder:     5,
		},
		{
			ID:            uuid.New().String(),
			Name:          "经典横线",
			Description:   "黑白单栏、居中抬头和粗体横线标题，适配嵌入式、制造业、国企和传统技术岗简历。",
			LayoutID:      "classic-horizontal",
			Category:      "极简",
			Highlights:    marshalJSON([]string{"经典横线", "黑白单栏", "高密度内容"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#FFFFFF", AccentBar: "#333333", BodyBg: "#FFFFFF", SectionBg: "#F5F5F5"}),
			SortOrder:     6,
		},
		{
			ID:            uuid.New().String(),
			Name:          "蓝环职线",
			Description:   "左上个人信息、右上证件照、蓝色圆形图标标题和浅蓝细线分隔，适配系统集成、研发和技术实施岗位简历。",
			LayoutID:      "blueprint-icons",
			Category:      "商务",
			Highlights:    marshalJSON([]string{"圆形图标标题", "浅蓝细线", "证件照抬头"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#FFFFFF", AccentBar: "#4F8CFF", BodyBg: "#FFFFFF", SectionBg: "#E8F0FF"}),
			SortOrder:     7,
		},
		{
			ID:            uuid.New().String(),
			Name:          "黑杠灰条",
			Description:   "居中抬头、右上证件照、黑色竖杠和灰色横条标题，适配电商运营、项目助理和通用校招简历。",
			LayoutID:      "monochrome-rings",
			Category:      "极简",
			Highlights:    marshalJSON([]string{"黑色竖杠", "灰色横条", "居中抬头"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#F0F0F0", AccentBar: "#111111", BodyBg: "#FFFFFF", SectionBg: "#F0F0F0"}),
			SortOrder:     8,
		},
		{
			ID:            uuid.New().String(),
			Name:          "弧顶青签",
			Description:   "蓝色弧形页眉、居中圆形头像和青绿色斜角标签标题，适配客户经理、市场运营和校园活动经历简历。",
			LayoutID:      "teal-ribbon-wave",
			Category:      "商务",
			Highlights:    marshalJSON([]string{"弧形页眉", "圆形头像", "青绿标签"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#4388F6", AccentBar: "#168B8C", BodyBg: "#FFFFFF", SectionBg: "#E7F2F2"}),
			SortOrder:     9,
		},
		{
			ID:            uuid.New().String(),
			Name:          "蓝幕圆标",
			Description:   "深蓝通栏抬头、白色个人信息和深蓝圆形图标标题，适配外贸、跨境电商和商务实习简历。",
			LayoutID:      "blue-banner-icons",
			Category:      "商务",
			Highlights:    marshalJSON([]string{"深蓝通栏", "深蓝圆标", "高密度正文"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#1e3a5f", AccentBar: "#1e3a5f", BodyBg: "#FFFFFF", SectionBg: "#F5F5F5"}),
			SortOrder:     10,
		},
		{
			ID:            uuid.New().String(),
			Name:          "蔚蓝侧栏",
			Description:   "蓝色左侧栏集中展示头像、联系方式和求职意向，右侧主栏承载完整经历，适配算法、视觉和研发岗位简历。",
			LayoutID:      "azure-sidebar",
			Category:      "技术",
			Highlights:    marshalJSON([]string{"蓝色侧栏", "双栏结构", "主栏细线标题"}),
			PreviewColors: marshalJSON(previewColors{HeaderBg: "#4388F6", AccentBar: "#4388F6", BodyBg: "#FFFFFF", SectionBg: "#EEF5FF"}),
			SortOrder:     11,
		},
	}

	for _, e := range entries {
		if e.LayoutID != "left-sidebar-two-column" {
			continue
		}
		if err := DB.Model(&models.StyleLibrary{}).
			Where("layout_id = ?", "kusen").
			Updates(map[string]any{
				"name":           e.Name,
				"description":    e.Description,
				"layout_id":      e.LayoutID,
				"category":       e.Category,
				"highlights":     e.Highlights,
				"preview_colors": e.PreviewColors,
				"sort_order":     e.SortOrder,
			}).Error; err != nil {
			log.Printf("Warning: failed to migrate style library layout_id kusen: %v", err)
		}
		break
	}

	inserted := 0
	updated := 0
	for _, e := range entries {
		var existing models.StyleLibrary
		err := DB.Where("layout_id = ?", e.LayoutID).First(&existing).Error
		if err == nil {
			if err := DB.Model(&existing).Updates(map[string]any{
				"name":           e.Name,
				"description":    e.Description,
				"category":       e.Category,
				"highlights":     e.Highlights,
				"preview_colors": e.PreviewColors,
				"sort_order":     e.SortOrder,
			}).Error; err != nil {
				log.Printf("Warning: failed to update style library entry %s: %v", e.LayoutID, err)
				continue
			}
			updated++
			continue
		}
		if err != nil && err != gorm.ErrRecordNotFound {
			log.Printf("Warning: failed to check style library entry %s: %v", e.LayoutID, err)
			continue
		}
		if err := DB.Create(&e).Error; err != nil {
			log.Printf("Warning: failed to seed style library entry %s: %v", e.Name, err)
			continue
		}
		inserted++
	}

	if inserted > 0 {
		log.Printf("Style library seeded: %d missing entries inserted", inserted)
	}
	if updated > 0 {
		log.Printf("Style library synced: %d built-in entries updated", updated)
	}
}

// seedDemoContent populates the demo_content table with a sample resume
// if the table is currently empty (safe to call on every server start).
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
		ID:      uuid.New().String(),
		Content: DefaultDemoContentJSON(),
	}

	if err := DB.Create(&demo).Error; err != nil {
		log.Printf("Warning: failed to seed demo content: %v", err)
		return
	}

	log.Println("Demo content seeded successfully")
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
			"photoUrl":     "/api/avatars/demo-avatar.jpg",
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
func seedDocSettings() {
	type presetColor struct {
		Color string `json:"color"`
		Label string `json:"label,omitempty"`
	}

	type layoutDefault struct {
		LayoutID string `json:"layout_id"`
		Color    string `json:"color"`
	}

	type themeDefault struct {
		PageMargin  float64 `json:"page_margin"`
		LineSpacing float64 `json:"line_spacing"`
		FontSize    float64 `json:"font_size"`
	}

	type customColorDefault struct {
		Bg      string `json:"bg"`
		Border  string `json:"border"`
		TagBg   string `json:"tag_bg"`
		TagText string `json:"tag_text"`
	}

	type pageRange struct {
		Key     string  `json:"key"`
		Min     float64 `json:"min"`
		Max     float64 `json:"max"`
		Step    float64 `json:"step"`
		Unit    string  `json:"unit"`
		Default float64 `json:"default"`
		Label   string  `json:"label"`
	}

	type watermarkRange struct {
		Key     string  `json:"key"`
		Min     float64 `json:"min"`
		Max     float64 `json:"max"`
		Step    float64 `json:"step"`
		Unit    string  `json:"unit"`
		Default float64 `json:"default"`
		Label   string  `json:"label"`
	}

	type densityOption struct {
		Value string `json:"value"`
		Label string `json:"label"`
	}

	settings := []models.DocumentSetting{
		// ---- Preset colors (主题颜色预设色板) ----
		{
			ID: "preset_colors", Category: "preset_colors", Label: "预设主题色",
			Data: marshalJSON([]presetColor{
				{Color: "#3B82F6", Label: "蓝色"},
				{Color: "#1e3a5f", Label: "深蓝"},
				{Color: "#000000", Label: "黑色"},
				{Color: "#248f83", Label: "陶土红"},
				{Color: "#2890ca", Label: "孔雀蓝"},
				{Color: "#75b35d", Label: "草绿"},
				{Color: "#5c95c1", Label: "灰蓝"},
				{Color: "#4079a1", Label: "深青蓝"},
				{Color: "#f9a22c", Label: "暖橙"},
				{Color: "#bf9f6c", Label: "卡其金"},
				{Color: "#9861db", Label: "紫罗兰"},
				{Color: "#555968", Label: "石板灰"},
				{Color: "#c76b8b", Label: "玫瑰红"},
				{Color: "#4a8c7e", Label: "青瓷绿"},
				{Color: "#8b6b4a", Label: "焦糖棕"},
				{Color: "#6b7db3", Label: "薰衣草蓝"},
			}),
			SortOrder: 1,
		},
		// ---- Watermark colors (水印颜色选项) ----
		{
			ID: "watermark_colors", Category: "watermark_colors", Label: "水印颜色",
			Data: marshalJSON([]presetColor{
				{Color: "#9CA3AF", Label: "浅灰"},
				{Color: "#6B7280", Label: "中灰"},
				{Color: "#EF4444", Label: "红色"},
				{Color: "#3B82F6", Label: "蓝色"},
				{Color: "#10B981", Label: "绿色"},
			}),
			SortOrder: 2,
		},
		// ---- Custom color defaults (自定义颜色默认值) ----
		{
			ID: "custom_color_defaults", Category: "theme_defaults", Label: "自定义颜色默认值",
			Data: marshalJSON(customColorDefault{
				Bg: "#DBEAFE", Border: "#3B82F6", TagBg: "#EFF6FF", TagText: "#2563EB",
			}),
			SortOrder: 3,
		},
		// ---- Layout default colors (每个布局的默认主色) ----
		{
			ID: "layout_default_colors", Category: "layout_defaults", Label: "布局默认主色",
			Data: marshalJSON([]layoutDefault{
				{LayoutID: "skyveil", Color: "#3B82F6"},
				{LayoutID: "cyanblu", Color: "#1e3a5f"},
				{LayoutID: "ordrin", Color: "#000000"},
				{LayoutID: "left-sidebar-two-column", Color: "#248f83"},
				{LayoutID: "centerline", Color: "#000000"},
				{LayoutID: "classic-horizontal", Color: "#333333"},
				{LayoutID: "blueprint-icons", Color: "#4F8CFF"},
				{LayoutID: "monochrome-rings", Color: "#111111"},
				{LayoutID: "teal-ribbon-wave", Color: "#168B8C"},
				{LayoutID: "blue-banner-icons", Color: "#1e3a5f"},
				{LayoutID: "azure-sidebar", Color: "#4388F6"},
			}),
			SortOrder: 4,
		},
		// ---- Theme defaults (主题默认值) ----
		{
			ID: "theme_defaults", Category: "theme_defaults", Label: "主题默认值",
			Data: marshalJSON(themeDefault{
				PageMargin: 15, LineSpacing: 1.6, FontSize: 13,
			}),
			SortOrder: 5,
		},
		// ---- Page setting ranges (滑块范围) ----
		{
			ID: "page_ranges", Category: "page_ranges", Label: "页面设置滑块范围",
			Data: marshalJSON([]pageRange{
				{Key: "pageMargin", Min: 10, Max: 30, Step: 1, Unit: "mm", Default: 15, Label: "页边距"},
				{Key: "lineSpacing", Min: 1.0, Max: 2.4, Step: 0.05, Unit: "", Default: 1.6, Label: "行间距"},
				{Key: "fontSize", Min: 11, Max: 16, Step: 1, Unit: "px", Default: 13, Label: "字体大小"},
			}),
			SortOrder: 6,
		},
		// ---- Watermark setting ranges (水印滑块范围) ----
		{
			ID: "watermark_ranges", Category: "watermark_ranges", Label: "水印设置滑块范围",
			Data: marshalJSON([]watermarkRange{
				{Key: "opacity", Min: 0.03, Max: 0.3, Step: 0.01, Unit: "%", Default: 0.08, Label: "透明度"},
				{Key: "fontSize", Min: 1, Max: 48, Step: 1, Unit: "px", Default: 26, Label: "字体大小"},
				{Key: "rotation", Min: -90, Max: 0, Step: 5, Unit: "°", Default: -30, Label: "旋转角度"},
			}),
			SortOrder: 7,
		},
		// ---- Watermark density options (水印密度选项) ----
		{
			ID: "watermark_density", Category: "watermark_ranges", Label: "水印密度选项",
			Data: marshalJSON([]densityOption{
				{Value: "low", Label: "稀疏"},
				{Value: "medium", Label: "适中"},
				{Value: "high", Label: "密集"},
			}),
			SortOrder: 8,
		},
		// ---- Watermark defaults (水印默认值) ----
		{
			ID: "watermark_defaults", Category: "watermark_ranges", Label: "水印默认值",
			Data: marshalJSON(map[string]any{
				"enabled":  true,
				"content":  "布丁简历",
				"opacity":  0.08,
				"fontSize": 26,
				"rotation": -30,
				"color":    "#6B7280",
				"density":  "medium",
			}),
			SortOrder: 9,
		},
	}

	synced := 0
	for _, s := range settings {
		var existing models.DocumentSetting
		err := DB.Where("id = ?", s.ID).First(&existing).Error
		if err == nil {
			if err := DB.Model(&existing).Updates(map[string]any{
				"category":   s.Category,
				"label":      s.Label,
				"data":       s.Data,
				"sort_order": s.SortOrder,
			}).Error; err != nil {
				log.Printf("Warning: failed to update doc_setting %s: %v", s.ID, err)
				continue
			}
			synced++
			continue
		}
		if err != nil && err != gorm.ErrRecordNotFound {
			log.Printf("Warning: failed to check doc_setting %s: %v", s.ID, err)
			continue
		}
		if err := DB.Create(&s).Error; err != nil {
			log.Printf("Warning: failed to seed doc_setting %s: %v", s.ID, err)
			continue
		}
		synced++
	}

	if synced > 0 {
		log.Printf("Document settings synced: %d rows upserted", synced)
	}
}
