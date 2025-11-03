# Git History Sweep (Optional)

This repository keeps a live backup branch before any history rewrite. Follow these steps only after reviewing `scan-report.json` and confirming which paths must be purged.

1. **Create a safety branch**

   ```bash
   git switch -c backup/pre-sanitize
   ```

2. **Run deep history scanners**

   Choose your preferred tool (both are optional but recommended):

   ```bash
   gitleaks detect --redact --verbose
   trufflehog git file://$(pwd) --only-verified
   ```

3. **Identify the offending paths/patterns**

   From the tool output and `scan-report.json`, collect exact file paths or glob patterns that must be removed permanently.

4. **Rewrite history with git-filter-repo** *(requires https://github.com/newren/git-filter-repo)*

   ```bash
   pip install git-filter-repo  # if not already installed

   # Example: remove a leaked file path
   git filter-repo --path path/to/leaked.file --invert-paths

   # Example: scrub secrets matching a regex
   git filter-repo --replace-text replacements.txt
   ```

   - `replacements.txt` should contain lines like `regex==>replacement` to redact inline secrets.
   - Repeat commands for each path/pattern you need to purge.

5. **Verify and force-push**

   ```bash
   git status
   git log --stat | head
   npm run scan:sensitive
   ```

   Once satisfied, force-push to the remote branch (or open a PR if history rewrite is not desired):

   ```bash
   git push --force-with-lease origin <branch>
   ```

6. **Cleanup**

   - Remove the backup branch when you are confident the repository is clean: `git branch -D backup/pre-sanitize`.
   - Document the cleanup in `SECURITY.md` or project notes.

> ⚠️ History rewrites are destructive. Coordinate with collaborators before running these commands on shared branches.
