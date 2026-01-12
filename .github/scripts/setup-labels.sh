#!/bin/bash

# HyprDoc GitHub Labels Setup Script
# Run this after creating your GitHub repository
# Usage: ./setup-labels.sh owner/repo
# Example: ./setup-labels.sh yourusername/hyprdoc-svelte

REPO=${1:-"YOUR_USERNAME/hyprdoc-svelte"}

echo "Setting up labels for $REPO..."
echo "Make sure you have GitHub CLI (gh) installed and authenticated."
echo ""

# Delete default labels (optional - comment out if you want to keep them)
echo "Removing default labels..."
gh label delete "bug" --repo "$REPO" --yes 2>/dev/null
gh label delete "documentation" --repo "$REPO" --yes 2>/dev/null
gh label delete "duplicate" --repo "$REPO" --yes 2>/dev/null
gh label delete "enhancement" --repo "$REPO" --yes 2>/dev/null
gh label delete "good first issue" --repo "$REPO" --yes 2>/dev/null
gh label delete "help wanted" --repo "$REPO" --yes 2>/dev/null
gh label delete "invalid" --repo "$REPO" --yes 2>/dev/null
gh label delete "question" --repo "$REPO" --yes 2>/dev/null
gh label delete "wontfix" --repo "$REPO" --yes 2>/dev/null

# ===== TYPE LABELS =====
echo "Creating type labels..."
gh label create "feature" --description "New feature request" --color "0E8A16" --repo "$REPO"
gh label create "bug" --description "Something isn't working" --color "D73A4A" --repo "$REPO"
gh label create "docs" --description "Documentation improvements" --color "0075CA" --repo "$REPO"
gh label create "refactor" --description "Code improvement without behavior change" --color "FEF2C0" --repo "$REPO"
gh label create "test" --description "Testing related" --color "BFD4F2" --repo "$REPO"
gh label create "chore" --description "Maintenance tasks" --color "EDEDED" --repo "$REPO"

# ===== PRIORITY LABELS =====
echo "Creating priority labels..."
gh label create "priority: critical" --description "Blocking core functionality" --color "B60205" --repo "$REPO"
gh label create "priority: high" --description "Significant user value" --color "D93F0B" --repo "$REPO"
gh label create "priority: medium" --description "Nice to have" --color "FBCA04" --repo "$REPO"
gh label create "priority: low" --description "Future consideration" --color "0E8A16" --repo "$REPO"

# ===== HORIZON LABELS =====
echo "Creating horizon labels..."
gh label create "horizon-1" --description "NOW (0-4 weeks)" --color "7057FF" --repo "$REPO"
gh label create "horizon-2" --description "NEXT (1-3 months)" --color "008672" --repo "$REPO"
gh label create "horizon-3" --description "LATER (3-6 months)" --color "0366D6" --repo "$REPO"
gh label create "horizon-4" --description "FUTURE (6-12 months)" --color "5319E7" --repo "$REPO"

# ===== AREA LABELS =====
echo "Creating area labels..."
gh label create "area: editor" --description "Editor, Smart Blocks, formatting" --color "C2E0C6" --repo "$REPO"
gh label create "area: living-contracts" --description "Post-signature, dynamic features" --color "BFDADC" --repo "$REPO"
gh label create "area: dashboard" --description "Document list, navigation" --color "D4C5F9" --repo "$REPO"
gh label create "area: signing" --description "Signature flow, verification" --color "FFC0CB" --repo "$REPO"
gh label create "area: integrations" --description "Stripe, HubSpot, APIs" --color "F9D0C4" --repo "$REPO"
gh label create "area: onboarding" --description "User profiles, autofill" --color "C5DEF5" --repo "$REPO"
gh label create "area: ui-ux" --description "Design, responsiveness" --color "FBCA04" --repo "$REPO"
gh label create "area: api" --description "External API, webhooks" --color "1D76DB" --repo "$REPO"
gh label create "area: infra" --description "DevOps, CI/CD, deployment" --color "5319E7" --repo "$REPO"

# ===== SIZE LABELS =====
echo "Creating size labels..."
gh label create "size: epic" --description "Multiple features, weeks of work" --color "3E4B9E" --repo "$REPO"
gh label create "size: large" --description "1-2 weeks" --color "5C6BC0" --repo "$REPO"
gh label create "size: medium" --description "2-5 days" --color "7986CB" --repo "$REPO"
gh label create "size: small" --description "< 1 day" --color "9FA8DA" --repo "$REPO"

# ===== STATUS LABELS =====
echo "Creating status labels..."
gh label create "needs-triage" --description "Needs initial review" --color "EDEDED" --repo "$REPO"
gh label create "needs-design" --description "Needs UI/UX design" --color "D876E3" --repo "$REPO"
gh label create "needs-discussion" --description "Needs team discussion" --color "CC317C" --repo "$REPO"
gh label create "ready" --description "Ready for implementation" --color "0E8A16" --repo "$REPO"
gh label create "in-progress" --description "Currently being worked on" --color "FBCA04" --repo "$REPO"
gh label create "blocked" --description "Blocked by dependency" --color "B60205" --repo "$REPO"
gh label create "on-hold" --description "Paused, may revisit" --color "EDEDED" --repo "$REPO"

# ===== SPECIAL LABELS =====
echo "Creating special labels..."
gh label create "good-first-issue" --description "Good for newcomers" --color "7057FF" --repo "$REPO"
gh label create "help-wanted" --description "Extra attention needed" --color "008672" --repo "$REPO"
gh label create "breaking-change" --description "Introduces breaking changes" --color "B60205" --repo "$REPO"
gh label create "security" --description "Security related" --color "D73A4A" --repo "$REPO"
gh label create "performance" --description "Performance improvement" --color "F9D0C4" --repo "$REPO"
gh label create "accessibility" --description "Accessibility improvement" --color "0E8A16" --repo "$REPO"

echo ""
echo "✅ Labels setup complete!"
echo ""
echo "Next steps:"
echo "1. Go to https://github.com/$REPO/labels to see your labels"
echo "2. Create a new issue to test the templates"
echo "3. Set up a Project board at https://github.com/$REPO/projects"
