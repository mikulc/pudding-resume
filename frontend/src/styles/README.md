# Stylesheet architecture

`../index.css` is the single ordered entry point. Keep it declarative: it should only import modules.

## Module taxonomy

- `foundation/`: Tailwind directives, design tokens, base rules, shared motion and print rules.
- `components/`: reusable UI surfaces that are not owned by one product area.
- `features/`: styles owned by the editor, diagnosis flow, or resume library.
- `pages/`: route-specific styles.
- `themes/`: application-wide theme adapters. `dark-utilities.css` is a compatibility seam for global Tailwind utility remaps.

## Maintenance contract

1. Put new rules in the narrowest owning module; never append declarations to `index.css`.
2. Keep light and dark variants beside the owning module. Add to `themes/` only when the rule is genuinely application-wide.
3. Scope page and feature rules through a stable root selector where practical, so styles do not leak into other routes.
4. Treat import order as part of the public interface: later modules may override earlier modules. Review cascade effects before reordering.
5. Keep `@tailwind` directives in `foundation/tailwind.css`; preserve existing `@layer` membership when moving rules.
6. Split only at top-level selector or at-rule seams. Never cut through `@media`, `@layer`, or `@keyframes` blocks.
7. Prefix new global keyframe names with their owner to reduce collisions.
8. For a zero-visual-change refactor, run `pnpm build` and compare the generated CSS with the previous artifact.

## Compatibility seams

- `pages/homepage/legacy-layout.css` stays at its current cascade position until the homepage rules are consolidated.
- `themes/dark-utilities.css` contains legacy utility remaps with broad selectors and `!important`. Prefer semantic feature selectors for new work.
- Some motion declarations load after the rules that reference them. CSS permits this, and their import positions preserve the existing output order.
