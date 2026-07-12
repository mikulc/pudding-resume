/** Auth-related type definitions */

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
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
  ai_service_api_key: string;     // user configured AI model API key
  ai_service_model: string;       // user configured AI model name
  ai_service_prompt: string;      // user customized AI prompt template
  model_source: string;        // AI model source: "custom" | "public"
  public_model_id: string;     // selected public model ID (when model_source is "public")
  // Live2D preferences
  live2d_enabled: boolean;     // whether Live2D mascot is enabled
  live2d_position: string;     // mascot position: "left" | "right" | "bottom" | "right-bottom"
  live2d_h_offset: number;     // horizontal offset (px)
  live2d_v_offset: number;     // vertical offset (px)
  live2d_width: number;        // canvas width (px)
  live2d_height: number;       // canvas height (px)
  live2d_scale: number;        // model scale (0.1~3)
  live2d_opacity: number;      // opacity (0~1)
  live2d_show_editor: boolean; // whether to show in editor page
  live2d_mobile_show: boolean; // whether to show on mobile devices
  live2d_enable_pointer_events_pass_through: boolean; // whether the mascot ignores pointer events
  live2d_peek_visible_ratio: number;        // default visible ratio while peeking from the edge
  live2d_nearby_retract_ratio: number;      // visible ratio while mouse is nearby
  live2d_nearby_behavior: string;           // "expand" shows more when nearby, "retract" shows less
  live2d_proximity_threshold: number;       // mouse proximity threshold in px
  live2d_restore_delay: number;             // delay before restoring peek state in ms
  live2d_transition_duration: number;       // peek/retract animation duration in ms
  live2d_pinned: boolean;                  // always fully visible, disable retract behavior
  // 本地存储偏好
  local_storage_path: string;    // display name of the selected local directory (空字符串表示未启用)
  // 导出偏好
  export_json_with_settings: boolean;  // JSON 导出时是否携带 settings 字段
  quota_updated_at: string;    // formatted quota update datetime string
  created_at: string;          // formatted datetime string
  last_login_at: string;        // formatted datetime string, empty if never logged in
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

/** Public AI model from the admin-configured model pool */
export interface PublicModel {
  id: string;
  name: string;
  model: string;
  balance: number;
  balance_updated_at: string;
  sort_order: number;
}

/** Response from GET /api/ai/model-pools */
export interface PublicModelListResponse {
  models: PublicModel[];
}
