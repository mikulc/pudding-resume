package models

import (
	"time"

	"gorm.io/datatypes"
)

// DemoContent 示例简历内容表 — 存储一份展示用的简历数据，供主题抽屉预览使用。
// 单行表设计（id 固定为 1），所有主题共用同一份内容。
type DemoContent struct {
	ID        string         `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid();comment:唯一标识（UUID v4，单行表）"`
	Content   datatypes.JSON `json:"content" gorm:"type:jsonb;comment:示例简历内容（ResumeData JSON）"`
	CreatedAt time.Time      `json:"created_at" gorm:"comment:创建时间"`
	UpdatedAt time.Time      `json:"updated_at" gorm:"comment:更新时间"`
}

func (DemoContent) TableName() string {
	return "demo_content"
}
