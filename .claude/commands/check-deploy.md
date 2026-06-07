# Check Deploy Status

Check whether the latest changes have been merged to main and deployed to Vercel.

1. Use the mcp__github__list_commits tool to get the latest commit on `main` for repo `Hayabusa015/JAGStaff` (perPage: 1)
2. Report:
   - The commit message
   - Who merged it and when (in a human-friendly time like "3 minutes ago")
   - Whether it matches the most recent branch work or if there's a pending PR still waiting to be merged
3. Remind the user that Vercel auto-deploys within ~60 seconds of a merge, and to refresh jag-staff.vercel.app
