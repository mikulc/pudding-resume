package models

import "time"

// AdminAuditLog 管理员操作审计日志
type AdminAuditLog struct {
	ID         string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	AdminID    string    `json:"admin_id" gorm:"type:uuid;not null;index;comment:操作管理员ID"`
	AdminName  string    `json:"admin_name" gorm:"size:64;not null;comment:操作管理员用户名"`
	Action     string    `json:"action" gorm:"size:64;not null;index;comment:操作类型"`
	TargetType string    `json:"target_type" gorm:"size:64;comment:目标资源类型"`
	TargetID   string    `json:"target_id" gorm:"type:uuid;index;comment:目标资源ID"`
	TargetName string    `json:"target_name" gorm:"size:256;comment:目标资源名称/标识"`
	Detail     string    `json:"detail" gorm:"type:text;comment:操作详情 JSON"`
	IP         string    `json:"ip" gorm:"size:64;comment:操作IP"`
	CreatedAt  time.Time `json:"created_at"`
}

func (AdminAuditLog) TableName() string {
	return "admin_audit_logs"
}
