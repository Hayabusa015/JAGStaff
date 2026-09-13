# Vendored skill — taste-skill

`SKILL.md` is copied verbatim from the upstream project. Do not hand-edit it;
re-copy from upstream instead so updates stay clean.

- **Upstream:** https://github.com/leonxlnx/taste-skill
- **Path:** `skills/taste-skill/SKILL.md`
- **Commit:** `ccbc1563` (2026-08-24)
- **Licence:** MIT — see `LICENSE` in this folder.

## Scope note for this repo

Upstream describes this skill as covering *"landing pages, portfolios, and
redesigns — not dashboards, not data tables, not multi-step product UI."*
JAGStaff is mostly the second category, so most of it won't apply to the
staff-facing screens.

Its stated defaults also differ from what this app actually is:

| taste-skill default | JAGStaff today |
| --- | --- |
| Next.js + React Server Components | React + Vite, all client-side |
| Tailwind v4 | hand-written CSS with custom-property tokens (`styles.css`) |
| Phosphor / Radix icon packages | hand-rolled SVGs (`hallPassIcons.jsx`) + emoji |
| emoji discouraged | emoji used as the icon vocabulary throughout |

Treat those as upstream's defaults for greenfield work, not as instructions to
convert this codebase. The skill's own preamble says every rule is contextual
and that an existing project's choices win. Where they disagree, this repo's
existing conventions and `CLAUDE.md` take precedence.

The upstream repo carries 13 other skills (brandkit, minimalist, brutalist,
soft, redesign, stitch, image-to-code, output, and the imagegen pair). Only
this one is vendored here; pull another the same way if it earns its place.
