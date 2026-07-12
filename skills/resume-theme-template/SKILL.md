---
name: resume-theme-template
description: Add or modify resume theme templates in this pudding-resume project. Use when the user asks to create a new resume theme/layout, match a reference image, adjust template preview/export styling, or wire a layout into the frontend registry and backend style library.
---

# Resume Theme Template

## Workflow

1. Inspect the reference image and choose the layout type: single-column, centered-header, or sidebar/two-column.
2. Create `frontend/src/registry/layouts/<layout-id>.ts` with a `LayoutDefinition`.
3. Define the layout's `signature` and initial `previewVersion` in its `LayoutDefinition`.
4. Register the export in `frontend/src/registry/layouts/index.ts`.
5. Add `templateNames.<camelKey>` in both resume locale files.
6. Add a `models.StyleLibrary` entry in `backend/database/seed.go`.
7. Add the layout default color in `seedDocSettings()` -> `layout_default_colors`.
8. Run validation commands and search for the new ID/name.

## Naming

- Use lowercase hyphen layout IDs, e.g. `classic-horizontal`.
- Use camelCase i18n keys, e.g. `templateNames.classicHorizontal`.
- Name exports predictably, e.g. `classicHorizontalLayout`.

## Layout CSS

Always scope layout CSS:

```css
.resume-paper[data-layout="<layout-id>"] { ... }
```

Prefer existing hooks:

- `headerMode: 'bar' | 'icons' | 'underline'`
- `personalInfoClass` for contact icon color
- `contentMode: 'sidebar'` for sidebar layouts
- `data-page-section`, `data-section`, `data-page-entry` for CSS targeting

Use `var(--resume-line-spacing)` for body text. Fixed line-height is only for names and section headers.

## Preview Component Edits

Avoid editing `PreviewComponents.tsx` unless CSS cannot express the result.

Use narrow layout checks:

```ts
const isClassicHorizontal = layout.id === 'classic-horizontal';
```

Common cases:

- Centered personal header: add layout-specific wrapper/name/info classes.
- Sidebar template: add layout-specific sidebar contact rendering.
- Contact separators like `phone | email`: render value-only spans with a theme class and add CSS `::before` separators.

Do not change all themes unless the behavior is intentionally global.

## Theme Signature and Preview

Configure the compact right-panel fingerprint on every layout:

```ts
signature: {
  layout: 'single-column',
  headerDecoration: 'rings',
  sectionStyle: 'icon-line',
},
previewVersion: '1',
```

- Make `signature` express the real theme's primary structure and most recognizable decoration; never imitate a full resume with generic fake content.
- Choose `layout`, `headerDecoration`, and `sectionStyle` from `ThemeSignature` in `registry/layouts/types.ts`.
- Do not edit `SettingsPanel.tsx` when adding a theme; its SVG fingerprint renders from the registered `signature` and the active theme color.
- The theme picker is a real-time render using `ResumeCardPreview`, the registered layout CSS, and shared demo content. A normally registered theme appears there automatically.
- Increment `previewVersion` whenever layout visuals change so preview instances and future static preview caches invalidate. Update `signature` too when the recognizable structure changes.
- If backend static previews are introduced, populate `previewImage` and `previewVersion`; generate images from the real template and shared demo content, never from user data.

## Backend Seed

In `seedStyleLibraries()`, add one row with `Name`, `Description`, `LayoutID`, `Category`, `Highlights`, `PreviewColors`, and `SortOrder`.

In `seedDocSettings()`, add a default color:

```go
{LayoutID: "classic-horizontal", Color: "#333333"}
```

Run:

```powershell
gofmt -w backend/database/seed.go
```

## Verification

Run:

```powershell
cd frontend
npx tsc --noEmit --noUnusedLocals false --noUnusedParameters false
npx vite build

cd ..\backend
go test ./...
```

Confirm integration:

```powershell
rg -n "classic-horizontal|classicHorizontal|经典横线" frontend/src backend/database/seed.go
```

Confirm the new layout definition contains both `signature` and `previewVersion`. Switch to it once and verify the canvas, theme name, active badge, fingerprint, and theme color update together.

## Pitfalls

- Do not use unscoped `.resume-paper` rules in layout files.
- Do not place full-page/sidebar backgrounds on inner wrappers.
- Do not forget PDF/PNG export; it reuses preview DOM and injected CSS.
- Do not fix body `line-height`; it breaks the line-spacing setting.
- Ensure seed code backfills/syncs built-in rows for existing databases.
- Do not add a generic thumbnail or layout-ID conditional to `SettingsPanel.tsx`; keep theme-specific visual metadata in `LayoutDefinition.signature`.
