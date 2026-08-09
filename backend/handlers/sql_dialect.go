package handlers

import "fmt"

const providerUsageSelectSQL = `
	provider AS provider_key,
	COUNT(*) AS request_count,
	COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
	COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
	COALESCE(SUM(total_tokens), 0) AS total_tokens,
	COALESCE(SUM(reasoning_tokens), 0) AS reasoning_tokens,
	COALESCE(SUM(cache_hit_tokens), 0) AS cache_hit_tokens,
	COALESCE(SUM(cache_miss_tokens), 0) AS cache_miss_tokens
`

func dateOnlyExpression(dialect, column string) string {
	if dialect == "mysql" {
		return fmt.Sprintf("DATE_FORMAT(%s, '%%Y-%%m-%%d')", column)
	}
	return fmt.Sprintf("TO_CHAR(%s, 'YYYY-MM-DD')", column)
}

func dailyTrendSelectSQL(dialect string) string {
	return fmt.Sprintf(`
		%s AS usage_date,
		provider,
		model,
		COUNT(*) AS request_count,
		COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
		COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
		COALESCE(SUM(total_tokens), 0) AS total_tokens,
		COALESCE(SUM(reasoning_tokens), 0) AS reasoning_tokens,
		COALESCE(SUM(cache_hit_tokens), 0) AS cache_hit_tokens,
		COALESCE(SUM(cache_miss_tokens), 0) AS cache_miss_tokens
	`, dateOnlyExpression(dialect, "created_at"))
}
