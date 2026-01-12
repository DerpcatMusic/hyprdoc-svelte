# Git Workflow Guide

Quick reference for git best practices in the HyprDoc project.

## Daily Workflow

### Starting Work
```bash
# Make sure you're on master and up to date
git checkout master
git pull origin master

# Create a new branch
git checkout -b feature/your-feature-name
```

### While Working
```bash
# Check what changed
git status

# See detailed changes
git diff

# Stage specific files
git add path/to/file.ts

# Or stage all changes
git add .

# Commit with conventional format
git commit -m "feat(scope): description

Optional longer explanation

Co-Authored-By: Warp <agent@warp.dev>"
```

### Before Pushing
```bash
# Run validation
bun run validate

# If validation passes, push
git push origin feature/your-feature-name
```

## Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Formatting, missing semicolons, etc
- `refactor` - Code change that neither fixes a bug nor adds a feature
- `perf` - Performance improvement
- `test` - Adding tests
- `chore` - Updating build tasks, package manager configs, etc

### Scope Examples
- `editor` - Editor-related changes
- `auth` - Authentication
- `ui` - UI components
- `api` - API routes
- `blocks` - Smart blocks system
- `docs` - Documentation

### Good Commit Messages
```bash
feat(editor): add inline AI editing support
fix(auth): handle expired session tokens
docs(readme): update smart block creation guide
refactor(stores): simplify document store logic
perf(editor): optimize autosave debouncing
chore(deps): update convex to v1.31.3
```

### Bad Commit Messages
```bash
update stuff
fix bug
wip
changes
asdf
```

## Branch Naming

### Conventions
```bash
feature/descriptive-name    # New features
fix/issue-description       # Bug fixes
docs/what-changed          # Documentation
refactor/what-refactored   # Refactoring
chore/task-description     # Maintenance
```

### Examples
```bash
feature/contract-reminders
feature/airtable-integration
fix/editor-autosave-race
fix/signature-block-validation
docs/architecture-updates
refactor/block-registry-simplify
chore/update-dependencies
```

## Useful Commands

### Checking Status
```bash
# Short status
git status -s

# See what's staged
git diff --staged

# See commit history
git log --oneline -10

# See commits with changes
git log -p -2
```

### Undoing Changes
```bash
# Unstage a file
git reset HEAD path/to/file.ts

# Discard changes in working directory
git checkout -- path/to/file.ts

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes) - CAREFUL!
git reset --hard HEAD~1
```

### Branch Management
```bash
# List all branches
git branch -a

# Switch branches
git checkout branch-name

# Delete local branch
git branch -d feature/old-branch

# Delete remote branch
git push origin --delete feature/old-branch
```

### Syncing
```bash
# Get latest from remote
git fetch origin

# Pull latest master
git pull origin master

# Rebase on master
git checkout feature/my-feature
git rebase master
```

### Stashing
```bash
# Save current work temporarily
git stash

# List stashes
git stash list

# Apply most recent stash
git stash pop

# Apply specific stash
git stash apply stash@{2}
```

## Git Configuration

### Recommended Settings
```bash
# Set line ending handling (Windows)
git config --global core.autocrlf true

# Set default branch name
git config --global init.defaultBranch master

# Enable color output
git config --global color.ui auto

# Set default editor (optional)
git config --global core.editor "code --wait"
```

### Project-Specific Settings
```bash
# These are already configured in .gitignore
# No need to manually configure unless customizing
```

## Co-Author Attribution

Always include co-author line when using Warp AI:

```bash
git commit -m "feat(editor): add new feature

Co-Authored-By: Warp <agent@warp.dev>"
```

## Pre-Commit Checklist

Before every commit:
- [ ] Code follows project conventions
- [ ] No commented-out code
- [ ] No debug `console.log` statements
- [ ] No TypeScript errors: `bun run check`
- [ ] No lint errors: `bun run lint`
- [ ] Files are formatted: `bun run format`

Before pushing:
- [ ] Run full validation: `bun run validate`
- [ ] Test manually in browser
- [ ] Check console for errors

## Common Workflows

### Fix a Bug
```bash
git checkout -b fix/bug-description
# Make changes
git add .
git commit -m "fix(scope): description

Co-Authored-By: Warp <agent@warp.dev>"
bun run validate
git push origin fix/bug-description
# Create PR
```

### Add a Feature
```bash
git checkout -b feature/feature-name
# Make changes incrementally, commit often
git add specific-files
git commit -m "feat(scope): add X"
# More changes
git add .
git commit -m "feat(scope): add Y"
bun run validate
git push origin feature/feature-name
# Create PR
```

### Update Documentation
```bash
git checkout -b docs/what-changed
# Edit docs
git add *.md
git commit -m "docs: update documentation

Co-Authored-By: Warp <agent@warp.dev>"
git push origin docs/what-changed
# Create PR (usually fast-tracked)
```

### Emergency Hotfix
```bash
git checkout master
git checkout -b fix/critical-issue
# Fix the issue
git add .
git commit -m "fix: critical issue description"
bun run validate
git push origin fix/critical-issue
# Create PR, merge immediately
```

## Git Ignore Patterns

Already configured in `.gitignore`:
- `node_modules/` - Dependencies
- `.svelte-kit/` - Build output
- `*.log` - Log files
- `.env*` - Environment variables (except `.env.example`)
- `convex/_generated/` - Auto-generated Convex code
- `.vscode/`, `.idea/`, `.zed/` - IDE configs

## Tips

### Write Good Commit Messages
- Use present tense: "add feature" not "added feature"
- Be specific but concise
- Explain **why** in the body if non-obvious
- Reference issues if applicable

### Commit Often
- Small, focused commits are better
- Each commit should be a logical unit
- Easier to review and revert if needed

### Keep Branches Short-Lived
- Merge within a few days
- Reduces merge conflicts
- Keeps changes manageable

### Review Before Committing
```bash
git diff                    # See what changed
git diff --staged          # See what's about to be committed
git status                 # Verify correct files staged
```

### Use `.gitignore` Wisely
- Never commit secrets or API keys
- Don't commit build artifacts
- Don't commit IDE-specific files
- Don't commit personal configuration

## Resources

- [Git Documentation](https://git-scm.com/doc)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow Guide](https://guides.github.com/introduction/flow/)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)

## Getting Help

If you're stuck:
1. Check `git status` first
2. Use `git log` to see history
3. Use `git diff` to see changes
4. Search the error message
5. Ask for help with context

## Common Issues

### "Nothing to commit"
You haven't staged any changes. Run `git add .` first.

### "Merge conflict"
```bash
# See conflicted files
git status

# Edit files to resolve conflicts
# Look for <<<<<<< markers

# After resolving
git add resolved-file.ts
git commit
```

### "Detached HEAD"
```bash
# Get back to a branch
git checkout master
```

### "Permission denied"
You may need to set up SSH keys or use HTTPS with credentials.

### Line Ending Issues (Windows)
```bash
git config --global core.autocrlf true
```

This is already handled by `.gitignore` and git configuration.
