/** Auth-related type definitions */

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  registration_ticket?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SendRegistrationCodeResponse {
  message: string;
  retry_after: number;
}

export interface VerifyRegistrationCodeResponse {
  registration_ticket: string;
  expires_in: number;
}

export interface PublicConfigResponse {
  registration_email_code_enabled: boolean;
}

export interface AuthResponse {
  token: string;
  username: string;
  role: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
}

/** User profile returned from GET /api/user/profile */
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar: string;              // URL path, e.g. "/api/avatars/uuid.jpg" or ""
  role: string;                // user role: "user" or "admin"
  max_resumes: number;         // maximum number of resumes the user can create
  used_resumes: number;        // current number of resumes created
  export_count: number;        // remaining export quota
  daily_limit_tokens: number;   // daily AI token quota, 0 = unlimited
  monthly_limit_tokens: number; // monthly AI token quota, 0 = unlimited
	auto_save_interval: number;        // auto-save interval in seconds, 0 = disabled
	ai_polish_enabled: boolean;        // whether AI polish is enabled
  theme_mode: 'light' | 'dark' | 'system'; // UI theme mode
  language?: string;               // UI language: "zh-CN" | "en-US"
  ai_service_api_url: string;     // user configured AI model API URL
  ai_service_model: string;       // user configured AI model name
  // Live2D preferences
  live2d_enabled: boolean;     // whether Live2D mascot is enabled
  live2d_position: string;     // mascot position: "left" | "right" | "bottom" | "right-bottom"
  live2d_show_editor: boolean; // whether to show in editor page
  live2d_mobile_show: boolean; // whether to show on mobile devices
  live2d_enable_pointer_events_pass_through: boolean; // whether the mascot ignores pointer events
  live2d_nearby_behavior: string;           // "expand" shows more when nearby, "retract" shows less
  live2d_pinned: boolean;                  // always fully visible, disable retract behavior
  // 本地存储偏好
  local_storage_path: string;    // display name of the selected local directory (空字符串表示未启用)
  // 导出偏好
  export_json_with_settings: boolean;  // JSON 导出时是否携带 settings 字段
  quota_updated_at: string;    // formatted quota update datetime string
  created_at: string;          // formatted datetime string
  last_login_at: string;        // formatted datetime string, empty if never logged in
  email_verified_at: string;    // formatted verification datetime, empty for legacy/unverified accounts
}

/** Request body for PUT /api/user/profile */
export interface UpdateProfileRequest {
  username: string;
}

/** Response from POST /api/user/avatar */
export interface AvatarResponse {
  avatar_url: string;
}

/** Request body for PUT /api/user/password */
export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}
