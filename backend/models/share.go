package models

import (
	"time"

	"gorm.io/gorm"
)

// ResumeShare 简历分享配置表 — 存储分享权限和访问级别
type ResumeShare struct {
	ID           string         `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid();comment:分享配置唯一标识"`
	ResumeID     string         `json:"resume_id" gorm:"type:uuid;uniqueIndex;not null;comment:关联简历ID"`
	UserID       string         `json:"user_id" gorm:"type:uuid;index;not null;comment:简历所属用户ID"`
	ShareToken   string         `json:"share_token" gorm:"type:varchar(64);uniqueIndex;not null;comment:分享链接token"`
	Permission   string         `json:"permission" gorm:"type:varchar(32);default:'self_only';not null;comment:self_only 仅自己可见 / link_anyone 互联网获得链接的人"`
	AccessLevel  string         `json:"access_level" gorm:"type:varchar(16);default:'view';not null;comment:view 可查看 / edit 可复制"`
	CanExport    bool           `json:"can_export" gorm:"default:false;not null;comment:是否允许访问者导出文件"`
	Desensitized bool           `json:"desensitized" gorm:"default:false;not null;comment:是否对分享访问者脱敏简历的个人信息"`
	CreatedAt    time.Time      `json:"created_at" gorm:"comment:创建时间"`
	UpdatedAt    time.Time      `json:"updated_at" gorm:"comment:最后更新时间"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index;comment:软删除时间"`
}

func (ResumeShare) TableName() string {
	return "resume_shares"
}
