package services

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path"
	"path/filepath"
)

// referencedFontFiles returns the local font files referenced by @font-face
// declarations in the exported HTML.
func referencedFontFiles(html string) []string {
	matches := fontURLPattern.FindAllStringSubmatch(html, -1)
	if len(matches) == 0 {
		return nil
	}

	seen := make(map[string]bool, len(matches))
	files := make([]string, 0, len(matches))
	for _, match := range matches {
		if len(match) < 2 {
			continue
		}
		name := path.Base(match[1])
		if name == "." || name == "/" || seen[name] {
			continue
		}
		seen[name] = true
		files = append(files, name)
	}
	return files
}

// copyFontsToDir copies only the .woff2 files referenced by the exported HTML.
// If a font file is missing locally, it attempts to download it from cdnBaseURL
// into srcDir first (lazy cache). If cdnBaseURL is empty, it falls back to an
// error when the local file is missing.
func copyFontsToDir(srcDir, dstDir, html, cdnBaseURL string) error {
	files := referencedFontFiles(html)
	if len(files) == 0 {
		log.Println("[export] no referenced .woff2 font files, skipping font copy")
		return nil
	}

	copied := 0
	for _, file := range files {
		src := filepath.Join(srcDir, file)
		data, err := os.ReadFile(src)
		if err != nil {
			// Local font missing — try CDN download as a one-time cache
			if cdnBaseURL != "" {
				log.Printf("[export] font %s not found locally, downloading from CDN...", file)
				if dlErr := downloadFontFromCDN(cdnBaseURL, srcDir, file); dlErr != nil {
					return fmt.Errorf("download font %s from CDN: %w", file, dlErr)
				}
				data, err = os.ReadFile(src)
				if err != nil {
					return fmt.Errorf("read font file %s after CDN download: %w", src, err)
				}
			} else {
				return fmt.Errorf("read font file %s (no CDN configured): %w", src, err)
			}
		}
		dst := filepath.Join(dstDir, file)
		if err := os.WriteFile(dst, data, 0644); err != nil {
			return fmt.Errorf("write font file %s: %w", dst, err)
		}
		copied++
	}
	log.Printf("[export] copied %d referenced font file(s) from %s to temp dir", copied, srcDir)
	return nil
}

// downloadFontFromCDN fetches a single .woff2 font file from the CDN and saves
// it to destDir for persistent caching. Subsequent exports will find it locally.
func downloadFontFromCDN(cdnBaseURL, destDir, fileName string) error {
	cdURL := fmt.Sprintf("%s/%s", cdnBaseURL, fileName)
	resp, err := http.Get(cdURL)
	if err != nil {
		return fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("CDN returned status %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("read response body: %w", err)
	}

	// Ensure destination directory exists (may have been deleted or never created)
	if err := os.MkdirAll(destDir, 0755); err != nil {
		return fmt.Errorf("create font directory %s: %w", destDir, err)
	}

	dest := filepath.Join(destDir, fileName)
	if err := os.WriteFile(dest, data, 0644); err != nil {
		return fmt.Errorf("write file: %w", err)
	}

	log.Printf("[export] downloaded font %s from CDN (%d bytes), cached to %s", fileName, len(data), dest)
	return nil
}
