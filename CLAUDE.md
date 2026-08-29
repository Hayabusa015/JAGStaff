# JAGStaff — notes for Claude

## Deployment

- Production is Vercel project `jag-staff`, deployed only from `main` (live at
  jagportal.org / www.jagportal.org). Feature branches get preview deploys,
  never production.
- Supabase project: `jag-staff-portal` (`ucsiveyyygnxkkfvyvos`). DB migrations
  are applied directly via the Supabase API/MCP, independent of git — a
  migration can be live even when the matching frontend code isn't merged yet.

## Do not merge these branches

- `claude/platform-feature-review-ujqg3y` — 2.5+ months stale as of Aug 2026,
  conflicts with current `main` in `App.jsx`, `supabase.js`, `CeuTracker.jsx`,
  `Requisition.jsx`. Also contains a commit that shelves/removes the AI
  Grader. Superseded by later work; not safe to auto-merge.
- `claude/hopeful-feynman-kqwnew` — early "wire Classroom to Supabase" pass,
  conflicts with current `main` including an add/add conflict in
  `src/classroomData.js`. Fully superseded by the Classroom module as it
  exists today; merging would risk reverting months of later classroom work.

Both were reviewed and deliberately left unmerged (2026-08-29). If either
turns out to contain something still wanted (e.g. the gradebook owner-only
RLS hardening in the first one), pull that specific change forward against
current `main` rather than merging the branch wholesale.
