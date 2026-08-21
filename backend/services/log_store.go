package services

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

type LogEntry struct {
	ID         uint64         `json:"id"`
	Timestamp  time.Time      `json:"timestamp"`
	Level      string         `json:"level"`
	Source     string         `json:"source"`
	Message    string         `json:"message"`
	Attributes map[string]any `json:"attributes,omitempty"`
}

type LogFilter struct {
	Limit  int
	After  uint64
	Level  string
	Source string
	Query  string
}

type LogSnapshot struct {
	Entries    []LogEntry `json:"entries"`
	Total      uint64     `json:"total"`
	Dropped    uint64     `json:"dropped"`
	NextCursor uint64     `json:"next_cursor"`
}

// LogStore is a bounded, concurrency-safe ring buffer and slog sink. JSON logs
// remain on stderr for the deployment platform; this store powers the admin UI.
type LogStore struct {
	mu       sync.RWMutex
	entries  []LogEntry
	capacity int
	next     int
	count    int
	total    uint64
}

func NewLogStore(capacity int) *LogStore {
	if capacity < 1 {
		capacity = 1
	}
	return &LogStore{entries: make([]LogEntry, capacity), capacity: capacity}
}

func (s *LogStore) Handler(source string, minLevel slog.Level) slog.Handler {
	return &storeLogHandler{store: s, source: source, minLevel: minLevel}
}

// Writer adapts line-oriented third-party log output to structured entries.
func (s *LogStore) Writer(source string) io.Writer {
	return sourceLogWriter{store: s, source: source}
}

type sourceLogWriter struct {
	store  *LogStore
	source string
}

func (w sourceLogWriter) Write(p []byte) (int, error) {
	for _, line := range strings.Split(strings.ReplaceAll(string(p), "\r\n", "\n"), "\n") {
		line = strings.TrimSpace(line)
		if line != "" {
			w.store.Add(w.source, inferLogLevel(line), line, nil)
		}
	}
	return len(p), nil
}

func (s *LogStore) Add(source, level, message string, attributes map[string]any) {
	s.addAt(time.Now().UTC(), source, level, message, attributes)
}

func (s *LogStore) addAt(timestamp time.Time, source, level, message string, attributes map[string]any) {
	message = redactMessage(strings.TrimSpace(message))
	if message == "" {
		return
	}
	if source == "" {
		source = "app"
	}
	if level == "" {
		level = "info"
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.total++
	s.entries[s.next] = LogEntry{
		ID: s.total, Timestamp: timestamp.UTC(), Level: level, Source: source,
		Message: message, Attributes: attributes,
	}
	s.next = (s.next + 1) % s.capacity
	if s.count < s.capacity {
		s.count++
	}
}

// Snapshot returns chronological matches. After enables cheap incremental polls;
// NextCursor always advances even when new entries do not match the filters.
func (s *LogStore) Snapshot(filter LogFilter) LogSnapshot {
	limit := filter.Limit
	if limit < 1 {
		limit = 200
	}
	if limit > 500 {
		limit = 500
	}
	level := strings.ToLower(strings.TrimSpace(filter.Level))
	source := strings.ToLower(strings.TrimSpace(filter.Source))
	query := strings.ToLower(strings.TrimSpace(filter.Query))

	s.mu.RLock()
	defer s.mu.RUnlock()
	after := filter.After
	if after > s.total {
		after = 0 // The process restarted and the client's cursor belongs to the old process.
	}
	matched := make([]LogEntry, 0, min(limit, s.count))
	start := (s.next - s.count + s.capacity) % s.capacity
	for i := 0; i < s.count; i++ {
		entry := s.entries[(start+i)%s.capacity]
		if entry.ID <= after || level != "" && entry.Level != level || source != "" && entry.Source != source {
			continue
		}
		if query != "" && !entryMatches(entry, query) {
			continue
		}
		if len(matched) == limit {
			copy(matched, matched[1:])
			matched[len(matched)-1] = entry
		} else {
			matched = append(matched, entry)
		}
	}
	return LogSnapshot{Entries: matched, Total: s.total, Dropped: s.total - uint64(s.count), NextCursor: s.total}
}

func entryMatches(entry LogEntry, query string) bool {
	if strings.Contains(strings.ToLower(entry.Message), query) {
		return true
	}
	for key, value := range entry.Attributes {
		if strings.Contains(strings.ToLower(key+"="+fmt.Sprint(value)), query) {
			return true
		}
	}
	return false
}

type storeLogHandler struct {
	store    *LogStore
	source   string
	minLevel slog.Level
	attrs    []slog.Attr
	groups   []string
}

func (h *storeLogHandler) Enabled(_ context.Context, level slog.Level) bool {
	return level >= h.minLevel
}

func (h *storeLogHandler) Handle(_ context.Context, record slog.Record) error {
	attributes := make(map[string]any, record.NumAttrs()+len(h.attrs))
	source := h.source
	for _, attr := range h.attrs {
		addLogAttr(attributes, h.groups, attr)
	}
	record.Attrs(func(attr slog.Attr) bool {
		addLogAttr(attributes, h.groups, attr)
		return true
	})
	if value, ok := attributes["source"].(string); ok && value != "" {
		source = value
		delete(attributes, "source")
	}
	h.store.addAt(record.Time, source, slogLevelName(record.Level), record.Message, attributes)
	return nil
}

func (h *storeLogHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	clone := *h
	clone.attrs = append(append([]slog.Attr(nil), h.attrs...), attrs...)
	return &clone
}

func (h *storeLogHandler) WithGroup(name string) slog.Handler {
	if name == "" {
		return h
	}
	clone := *h
	clone.groups = append(append([]string(nil), h.groups...), name)
	return &clone
}

func addLogAttr(target map[string]any, groups []string, attr slog.Attr) {
	attr.Value = attr.Value.Resolve()
	if attr.Equal(slog.Attr{}) {
		return
	}
	if attr.Value.Kind() == slog.KindGroup {
		for _, child := range attr.Value.Group() {
			addLogAttr(target, append(groups, attr.Key), child)
		}
		return
	}
	key := strings.Join(append(groups, attr.Key), ".")
	if isSensitiveLogKey(key) {
		target[key] = "[REDACTED]"
		return
	}
	target[key] = logValue(attr.Value)
}

func logValue(value slog.Value) any {
	switch value.Kind() {
	case slog.KindBool:
		return value.Bool()
	case slog.KindDuration:
		return value.Duration().String()
	case slog.KindFloat64:
		return value.Float64()
	case slog.KindInt64:
		return value.Int64()
	case slog.KindString:
		return redactMessage(value.String())
	case slog.KindTime:
		return value.Time().UTC().Format(time.RFC3339Nano)
	case slog.KindUint64:
		return value.Uint64()
	default:
		return redactMessage(fmt.Sprint(value.Any()))
	}
}

func slogLevelName(level slog.Level) string {
	switch {
	case level >= slog.LevelError:
		return "error"
	case level >= slog.LevelWarn:
		return "warn"
	case level >= slog.LevelInfo:
		return "info"
	default:
		return "debug"
	}
}

var sensitiveMessagePattern = regexp.MustCompile(`(?i)(authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret)(=|:)([^\s&]+)`)

func isSensitiveLogKey(key string) bool {
	key = strings.ToLower(key)
	for _, fragment := range []string{"authorization", "cookie", "password", "secret", "api_key", "apikey", "access_token", "refresh_token"} {
		if strings.Contains(key, fragment) {
			return true
		}
	}
	return false
}

func redactMessage(message string) string {
	return sensitiveMessagePattern.ReplaceAllString(message, "$1$2[REDACTED]")
}

// RedactSlogAttr can be plugged into JSONHandler so external log output follows
// the same secret-redaction policy as the admin buffer.
func RedactSlogAttr(groups []string, attr slog.Attr) slog.Attr {
	key := strings.Join(append(groups, attr.Key), ".")
	if isSensitiveLogKey(key) {
		return slog.String(attr.Key, "[REDACTED]")
	}
	resolved := attr.Value.Resolve()
	if resolved.Kind() == slog.KindString {
		return slog.String(attr.Key, redactMessage(resolved.String()))
	}
	return attr
}

func inferLogLevel(line string) string {
	lower := strings.ToLower(line)
	if strings.Contains(lower, "panic") || strings.Contains(lower, "fatal") || strings.Contains(lower, "error") || strings.Contains(lower, "failed") || ginStatusInRange(line, 500, 599) {
		return "error"
	}
	if strings.Contains(lower, "warn") || ginStatusInRange(line, 400, 499) {
		return "warn"
	}
	if strings.Contains(lower, "debug") {
		return "debug"
	}
	return "info"
}

func ginStatusInRange(line string, low, high int) bool {
	for _, field := range strings.Fields(line) {
		value, err := strconv.Atoi(strings.Trim(field, "|[]"))
		if err == nil && value >= low && value <= high {
			return true
		}
	}
	return false
}
