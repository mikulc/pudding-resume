package models

import (
	"encoding/json"
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// Resume 简历表 — 存储用户创建的简历，content 和 settings 以 JSONB 存放
type Resume struct {
	ID        string         `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid();comment:简历唯一标识（UUID v4）"`
	UserID    string         `json:"user_id" gorm:"type:uuid;index;not null;comment:所属用户ID（关联 user_info.id）"`
	Name      string         `json:"name" gorm:"type:varchar(255);default:'未命名简历';not null;comment:简历名称"`
	Content   datatypes.JSON `json:"content" gorm:"type:jsonb;not null;comment:简历内容（JSON格式）"`
	Settings  datatypes.JSON `json:"settings" gorm:"type:jsonb;comment:文档设置（JSON格式：主题颜色、页边距、水印配置等）"`
	CreatedAt time.Time      `json:"created_at" gorm:"comment:创建时间"`
	UpdatedAt time.Time      `json:"updated_at" gorm:"comment:最后更新时间"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index;comment:软删除时间"`
}

func (Resume) TableName() string {
	return "user_resumes"
}

// ResumeListItem 简历列表接口的响应类型
type ResumeListItem struct {
	ID        string          `json:"id"`
	Name      string          `json:"name"`
	Content   json.RawMessage `json:"content"`
	Settings  json.RawMessage `json:"settings"`
	UpdatedAt string          `json:"updated_at"`
}
