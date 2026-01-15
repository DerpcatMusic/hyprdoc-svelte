# Automating Project Board Creation

I have prepared a Python script (`setup_project_board.py`) that will:

1.  **Create a New Project V2 Board**: "HyprDoc Roadmap Board"
2.  **Create Custom Fields**:
    *   **Horizon**: Single Select (Horizon-1 to 4)
    *   **Priority**: Single Select (Critical, High, Medium, Low)
    *   **Size**: Single Select (Epic, Large, Medium, Small)
    *   **Area**: Single Select (Editor, Dashboard, etc.)
3.  **Import All Issues**: Adds all 40+ open issues to the board.
4.  **Auto-Populate Metadata**: Reads your existing labels (e.g., `horizon-1`, `priority: critical`, `area: editor`) and updates the corresponding Project Fields automatically.

### ⚠️ ACTION REQUIRED: Update Permissions

The script failed as expected because your GitHub token lacks the `project` scope.

**Please run this command in your terminal to enable it:**

```bash
gh auth refresh -s project,read:project
```

**Once you have authorized the new scope, run the script:**

```bash
python setup_project_board.py
```

This will build your complex, fully categorized board in seconds.
