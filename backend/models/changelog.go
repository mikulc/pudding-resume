package models

import "time"

// ChangelogEntry 更新日志条目 — 管理员可编辑的版本更新记录
type ChangelogEntry struct {
	ID          string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Version     string    `json:"version" gorm:"size:32;not null;comment:版本号"`
	Date        string    `json:"date" gorm:"size:32;not null;comment:发布日期显示"`
	Title       string    `json:"title" gorm:"size:256;not null;comment:更新标题"`
	Summary     string    `json:"summary" gorm:"size:512;comment:更新摘要"`
	Items       string    `json:"items" gorm:"type:text;not null;comment:更新条目 JSON 数组"`
	Tone        string    `json:"tone" gorm:"size:32;default:blue;comment:色调 blue/emerald/amber"`
	IsPublished bool      `json:"is_published" gorm:"default:false;not null;index;comment:是否对外发布"`
	SortOrder   int       `json:"sort_order" gorm:"default:0;comment:排序权重"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (ChangelogEntry) TableName() string {
	return "changelog_entries"
}
