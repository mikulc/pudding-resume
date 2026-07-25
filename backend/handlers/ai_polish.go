package handlers

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"net/http"
	"strings"
	"time"
)

type PolishRequest struct {
	Text          string `json:"text" binding:"required"`
	SectionModule string `json:"section_module,omitempty"`
	// Optional AI config for unauthenticated users (guest mode)
	ApiUrl        string `json:"api_url,omitempty"`
	ApiKey        string `json:"api_key,omitempty"`
	Model         string `json:"model,omitempty"`
	ModelSource   string `json:"model_source,omitempty"` // "custom" or "public"
	PublicModelID string `json:"public_model_id,omitempty"`
}

type PolishResponse struct {
	Text string `json:"text"`
}

const polishSystemPrompt = `你是一位专业的简历文案优化专家。请先判断用户提供的简历文本片段是否存在实质性表达问题，再决定是否改写。

重点识别并优化以下类型的问题：
1. overclaim（夸大表达）：如"精通""专家""顶尖""大师"等绝对化词汇，容易显得不可信
2. vague（空泛描述）：如"负责""参与""协助"等没有体现具体贡献的描述
3. no_metric（缺少成果/数据）：描述缺少量化指标，如提升百分比、完成数量、优化效果等；可以提示或保留可填写占位，但不能编造虚假数据
4. empty_word（空洞词）：如"吃苦耐劳""抗压能力强""具备良好的沟通能力"等没有具体场景支撑的泛化评价
5. weak（表达偏弱）：如"熟悉""了解"等显得信心不足、缺乏说服力的描述

改写原则：
1. 只优化确实存在问题的表达，正常描述不要强行改写
2. 用更具体的动作、贡献、结果替代空泛职责描述
3. 保留事实，不新增用户未提及的经历、技能、项目或确定性数据
4. 保持原文 Markdown 格式、列表层级和段落结构
5. 忽略纯排版差异：不要把仅添加/删除空格、调整中英文之间空格、调整标点前后空格或换行当作优化
6. 如果没有实质性优化空间，请原样返回原文

直接返回优化后的纯文本，不要返回 JSON，不要添加诊断说明、解释、前后缀或代码块标记。`

func normalizePolishMeaning(text string) string {
	return strings.Join(strings.Fields(strings.TrimSpace(text)), "")
}

// PolishText handles POST /api/ai/polish (AuthOptional)
// 对单段简历长文本进行 AI 润色优化，输入输出均为 Markdown 纯文本。
func PolishText(c *gin.Context) {
	var req PolishRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, http.StatusBadRequest, "请提供有效的文本内容")
		return
	}

	if len(strings.TrimSpace(req.Text)) < 5 {
		respondError(c, http.StatusBadRequest, "文本内容过短，请至少输入 5 个字符")
		return
	}

	// 润色场景使用专用 system prompt，忽略 extractAIConfig 返回的用户自定义 prompt
	cfg, err := extractAIConfig(c, req.ApiUrl, req.ApiKey, req.Model, req.ModelSource, req.PublicModelID)
	if err != nil {
		respondError(c, http.StatusBadRequest, err.Error())
		return
	}

	// 构造用户消息：附带模块类型上下文
	userMessage := "请优化以下简历文本：\n\n" + req.Text
	if strings.TrimSpace(req.SectionModule) != "" {
		userMessage = "[模块：" + req.SectionModule + "]\n" + userMessage
	}

	// 调用 AI（润色文本可能较长，超时设为 60 秒）
	startedAt := time.Now()
	result, err := callAiApi(cfg.ApiURL, cfg.ApiKey, cfg.Model, polishSystemPrompt, userMessage, 60)
	recordAIUsage(c, "polish", cfg, result.Usage, err == nil, err, time.Since(startedAt))
	if err != nil {
		respondError(c, http.StatusInternalServerError, fmt.Sprintf("AI 润色失败: %v", err))
		return
	}

	// AI 返回纯文本，去除可能的代码块包裹并 trim
	polishedText := strings.TrimSpace(stripJSONCodeBlock(string(result.Content)))

	if polishedText == "" {
		respondError(c, http.StatusInternalServerError, "AI 返回的内容为空，请重试")
		return
	}

	if normalizePolishMeaning(polishedText) == normalizePolishMeaning(req.Text) {
		polishedText = strings.TrimSpace(req.Text)
	}

	c.JSON(http.StatusOK, PolishResponse{Text: polishedText})
}
