package handlers

import (
	"strings"
	"testing"
)

func TestDateOnlyExpressionUsesDatabaseDialect(t *testing.T) {
	mysqlExpression := dateOnlyExpression("mysql", "created_at")
	if !strings.Contains(mysqlExpression, "DATE_FORMAT") || strings.Contains(mysqlExpression, "TO_CHAR") {
		t.Fatalf("unexpected MySQL date expression: %s", mysqlExpression)
	}

	postgresExpression := dateOnlyExpression("postgres", "created_at")
	if !strings.Contains(postgresExpression, "TO_CHAR") || strings.Contains(postgresExpression, "DATE_FORMAT") {
		t.Fatalf("unexpected PostgreSQL date expression: %s", postgresExpression)
	}
}

func TestAIUsageSelectsAvoidMySQLReservedKeyAlias(t *testing.T) {
	selectSQL := strings.ToLower(providerUsageSelectSQL)
	if strings.Contains(selectSQL, " as key") {
		t.Fatalf("provider query uses reserved MySQL alias key: %s", providerUsageSelectSQL)
	}
	if !strings.Contains(selectSQL, "provider as provider_key") {
		t.Fatalf("provider query is missing the portable alias: %s", providerUsageSelectSQL)
	}
}

func TestDailyTrendSelectUsesMySQLDateFunction(t *testing.T) {
	selectSQL := dailyTrendSelectSQL("mysql")
	if strings.Contains(selectSQL, "TO_CHAR") || !strings.Contains(selectSQL, "DATE_FORMAT") {
		t.Fatalf("unexpected MySQL daily trend query: %s", selectSQL)
	}
}
