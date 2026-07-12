package models

import (
	"time"

	"gorm.io/gorm"
)

// User 用户表 — 存储用户基本信息与认证数据
type User struct {
	ID           string         `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid();comment:用户唯一标识（UUID v4）"`
	Username     string         `json:"username" gorm:"uniqueIndex;size:64;not null;comment:用户名（登录用）"`
	Email        string         `json:"email" gorm:"uniqueIndex;size:128;not null;comment:邮箱地址"`
	Password     string         `json:"-" gorm:"size:256;not null;comment:密码哈希（json:\"-\" 禁止序列化输出）"`
	Avatar       string         `json:"avatar" gorm:"size:512;comment:头像文件路径（相对于 uploads/avatars）"`
	Role         string         `json:"role" gorm:"size:32;default:user;not null;index;comment:用户角色（user / admin）"`
	TokenVersion int            `json:"-" gorm:"default:0;not null;comment:令牌版本号，递增会使所有旧 token 失效"`
	CreatedAt    time.Time      `json:"created_at" gorm:"comment:注册时间"`
	UpdatedAt    time.Time      `json:"updated_at" gorm:"comment:信息更新时间"`
	LastLoginAt  *time.Time     `json:"last_login_at" gorm:"comment:上一次登录时间"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index;comment:软删除时间（NULL 表示未删除）"`
}

func (User) TableName() string {
	return "user_info"
}

// UserPreference 用户偏好设置表 — 存储用户的个性化配置
type UserPreference struct {
	ID               string `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid();comment:偏好记录唯一标识（UUID v4）"`
	UserID           string `json:"user_id" gorm:"type:uuid;uniqueIndex;not null;comment:关联的用户ID"`
	AutoSaveInterval int    `json:"auto_save_interval" gorm:"default:120;not null;comment:自动保存间隔（秒），0 表示关闭"`
	AiPolishEnabled  bool   `json:"ai_polish_enabled" gorm:"default:false;not null;comment:是否启用 AI 润色"`
	ThemeMode        string `json:"theme_mode" gorm:"size:16;default:system;not null;comment:UI 主题模式：light / dark / system"`
	Language         string `json:"language" gorm:"size:16;default:zh-CN;not null;comment:界面语言：zh-CN / en-US"`
	// Live2D 看板娘偏好
	Live2dEnabled                        bool    `json:"live2d_enabled" gorm:"default:false;not null;comment:是否启用 Live2D 看板娘"`
	Live2dPosition                       string  `json:"live2d_position" gorm:"size:16;default:right;not null;comment:看板娘位置（left / right / bottom / right-bottom）"`
	Live2dHOffset                        int     `json:"live2d_h_offset" gorm:"default:20;not null;comment:看板娘水平偏移"`
	Live2dVOffset                        int     `json:"live2d_v_offset" gorm:"default:-40;not null;comment:看板娘垂直偏移"`
	Live2dWidth                          int     `json:"live2d_width" gorm:"default:140;not null;comment:看板娘画布宽度"`
	Live2dHeight                         int     `json:"live2d_height" gorm:"default:260;not null;comment:看板娘画布高度"`
	Live2dScale                          float64 `json:"live2d_scale" gorm:"default:1;not null;comment:看板娘缩放比例"`
	Live2dOpacity                        float64 `json:"live2d_opacity" gorm:"default:0.8;not null;comment:看板娘透明度(0~1)"`
	Live2dShowEditor                     bool    `json:"live2d_show_editor" gorm:"default:true;not null;comment:是否在编辑器页面显示看板娘"`
	Live2dMobileShow                     bool    `json:"live2d_mobile_show" gorm:"default:false;not null;comment:是否在手机端显示看板娘"`
	Live2dEnablePointerEventsPassThrough bool    `json:"live2d_enable_pointer_events_pass_through" gorm:"default:true;not null;comment:是否启用看板娘点击穿透"`
	Live2dPeekVisibleRatio               float64 `json:"live2d_peek_visible_ratio" gorm:"default:0.72;not null;comment:看板娘默认探出可见比例"`
	Live2dNearbyRetractRatio             float64 `json:"live2d_nearby_retract_ratio" gorm:"default:0.28;not null;comment:鼠标靠近时看板娘缩回后的可见比例"`
	Live2dNearbyBehavior                 string  `json:"live2d_nearby_behavior" gorm:"size:16;default:retract;not null;comment:鼠标靠近时看板娘行为（expand / retract）"`
	Live2dProximityThreshold             int     `json:"live2d_proximity_threshold" gorm:"default:120;not null;comment:看板娘鼠标靠近触发距离(px)"`
	Live2dRestoreDelay                   int     `json:"live2d_restore_delay" gorm:"default:400;not null;comment:看板娘恢复探出延迟(ms)"`
	Live2dTransitionDuration             int     `json:"live2d_transition_duration" gorm:"default:320;not null;comment:看板娘探出缩回动画时长(ms)"`
	Live2dPinned                         bool    `json:"live2d_pinned" gorm:"default:false;not null;comment:看板娘常驻模式，关闭靠近缩回行为"`
	// 本地存储偏好
	LocalStorageEnabled bool   `json:"local_storage_enabled" gorm:"default:false;not null;comment:是否启用本地文件存储"`
	LocalStoragePath    string `json:"local_storage_path" gorm:"size:256;default:'';comment:本地存储目录名称（仅用于展示）"`
	// 导出偏好
	ExportJsonWithSettings bool      `json:"export_json_with_settings" gorm:"default:false;not null;comment:JSON 导出时是否携带 settings 字段"`
	CreatedAt              time.Time `json:"created_at" gorm:"comment:创建时间"`
	UpdatedAt              time.Time `json:"updated_at" gorm:"comment:更新时间"`
}

func (UserPreference) TableName() string {
	return "user_preference"
}

// AIServiceConfig AI 服务商配置表 — 存储用户配置的 AI 模型连接参数
type AIServiceConfig struct {
	ID            string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid();comment:配置记录唯一标识（UUID v4）"`
	UserID        string    `json:"user_id" gorm:"type:uuid;uniqueIndex;not null;comment:关联的用户ID"`
	ApiUrl        string    `json:"api_url" gorm:"size:512;default:'';comment:AI 模型 API 地址"`
	ApiKey        string    `json:"api_key" gorm:"size:256;default:'';comment:AI 模型的 API Key"`
	Model         string    `json:"model" gorm:"size:128;default:'';comment:AI 模型名称"`
	Prompt        string    `json:"prompt" gorm:"type:text;comment:自定义提示词模板（已弃用）"`
	ModelSource   string    `json:"model_source" gorm:"size:16;default:public;not null;comment:模型来源(custom/public)"`
	PublicModelID *string   `json:"public_model_id" gorm:"type:uuid;index;comment:选用的公共模型ID"`
	CreatedAt     time.Time `json:"created_at" gorm:"comment:创建时间"`
	UpdatedAt     time.Time `json:"updated_at" gorm:"comment:更新时间"`
}

func (AIServiceConfig) TableName() string {
	return "ai_service_config"
}

// AIModelPool 公共AI模型池表 — 管理员配置的共享AI模型
type AIModelPool struct {
	ID               string     `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid();comment:模型记录唯一标识（UUID v4）"`
	Name             string     `json:"name" gorm:"size:128;not null;comment:模型显示名称"`
	ApiUrl           string     `json:"api_url" gorm:"size:512;not null;comment:API 地址"`
	ApiKey           string     `json:"-" gorm:"size:256;not null;comment:API 密钥（不对外暴露）"`
	Model            string     `json:"model" gorm:"size:128;not null;comment:模型名称"`
	Balance          float64    `json:"balance" gorm:"type:decimal(12,4);default:0;comment:余额"`
	BalanceUpdatedAt *time.Time `json:"balance_updated_at" gorm:"comment:余额最后刷新时间"`
	IsActive         bool       `json:"is_active" gorm:"default:true;not null;index;comment:是否启用"`
	SortOrder        int        `json:"sort_order" gorm:"default:0;comment:排序权重"`
	CreatedAt        time.Time  `json:"created_at" gorm:"comment:创建时间"`
	UpdatedAt        time.Time  `json:"updated_at" gorm:"comment:更新时间"`
}

func (AIModelPool) TableName() string {
	return "ai_model_pool"
}

// UserQuota 用户配额表 — 记录用户的最大简历数、导出次数等配额
type UserQuota struct {
	ID                 string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid();comment:配额记录唯一标识（UUID v4）"`
	UserID             string    `json:"user_id" gorm:"type:uuid;uniqueIndex;not null;comment:关联的用户ID"`
	MaxResumes         int       `json:"max_resumes" gorm:"default:10;not null;comment:最大简历创建数量"`
	ExportCount        int       `json:"export_count" gorm:"default:100;not null;comment:剩余导出次数"`
	DailyLimitTokens   int       `json:"daily_limit_tokens" gorm:"default:0;not null;comment:每日 AI token 额度预留，0 表示不限"`
	MonthlyLimitTokens int       `json:"monthly_limit_tokens" gorm:"default:0;not null;comment:每月 AI token 额度预留，0 表示不限"`
	UpdatedAt          time.Time `json:"updated_at" gorm:"comment:配额更新时间"`
}

func (UserQuota) TableName() string {
	return "user_quota"
}

// UserStats 用户统计表 — 记录用户的创建简历数、导出次数、编辑时长等累计统计
type UserStats struct {
	ID                  string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid();comment:统计记录唯一标识（UUID v4）"`
	UserID              string    `json:"user_id" gorm:"type:uuid;uniqueIndex;not null;comment:关联的用户ID"`
	TotalResumesCreated int       `json:"total_resumes_created" gorm:"default:0;not null;comment:累计创建简历数"`
	TotalExports        int       `json:"total_exports" gorm:"default:0;not null;comment:累计导出次数"`
	TotalEditingSeconds int64     `json:"total_editing_seconds" gorm:"default:0;not null;comment:累计编辑时长（秒）"`
	LastActiveAt        time.Time `json:"last_active_at" gorm:"comment:最近活跃时间"`
	CreatedAt           time.Time `json:"created_at" gorm:"comment:统计记录创建时间"`
	UpdatedAt           time.Time `json:"updated_at" gorm:"comment:统计记录更新时间"`
}

func (UserStats) TableName() string {
	return "user_stats"
}

// UserDailyStats 每日统计表 — 按天记录用户的简历创建、导出、编辑增量数据
type UserDailyStats struct {
	ID             string `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid();comment:每日统计唯一标识（UUID v4）"`
	UserID         string `json:"user_id" gorm:"type:uuid;not null;uniqueIndex:idx_daily_user_date;comment:关联的用户ID"`
	Date           string `json:"date" gorm:"type:date;not null;uniqueIndex:idx_daily_user_date;comment:统计日期"`
	ResumesCreated int    `json:"resumes_created" gorm:"default:0;not null;comment:当日创建简历数"`
	ExportsCount   int    `json:"exports_count" gorm:"default:0;not null;comment:当日导出次数"`
	EditingSeconds int64  `json:"editing_seconds" gorm:"default:0;not null;comment:当日编辑时长（秒）"`
}

func (UserDailyStats) TableName() string {
	return "user_daily_stats"
}
