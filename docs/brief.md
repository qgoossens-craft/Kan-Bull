# Kan-Bull — Design Document

> A minimalist kanban plugin for Obsidian. No dates, no priorities, no bloat.
> Just columns and tickets you drag around.

---

## 1. Overview

### What is Kan-Bull?

Kan-Bull is a personal kanban board plugin for Obsidian designed to track **multi-day projects** — typically app ideas, plugin concepts, and side projects that don't fit in a simple todo list. It is NOT a task manager, NOT a project management tool. It's a parking lot for ideas that move at their own pace.

### Core Principles

- **Minimalist**: No dates, no deadlines, no priorities, no assignees, no AI, no notifications
- **Visual**: Drag-and-drop tickets across columns — the column IS the status
- **Integrated**: Right-click any todo in `Todo.md` and send it to a project board
- **Obsidian-native**: Renders as a view tab (like Graph View), respects the active theme

---

## 2. Data Model

### Storage

Single JSON file: `.obsidian/plugins/kan-bull/data.json`

### Schema

```json
{
  "projects": [
    {
      "id": "string (uuid)",
      "name": "string",
      "columns": [
        {
          "id": "string (uuid)",
          "name": "string",
          "tickets": [
            {
              "id": "string (uuid)",
              "title": "string",
              "description": "string (optional, default: '')",
              "sourceNote": "string | null (path to originating note, e.g. 'Todo.md')"
            }
          ]
        }
      ]
    }
  ],
  "settings": {
    "defaultColumns": ["Backlog", "Ongoing", "Review", "Done"],
    "todoFilePath": "Todo.md"
  }
}
```

### Key Design Decisions

- **Description is optional**: A ticket can be just a title (minimal) or title + 1-2 line description
- **sourceNote**: Tracks origin when a ticket was created from a todo. Value is the file path. Set to `null` for manually created tickets
- **Columns are per-project**: Each project carries its own column set — users can customize columns independently per project
- **IDs**: Use UUID v4 for all IDs (projects, columns, tickets)
- **Ticket ordering**: Array order = visual order within a column. Drag-and-drop reorders the array

---

## 3. User Interface

### View Type

Obsidian **leaf view** (tab-based, like Graph View or Canvas). Registered as a custom view type `kan-bull-view`. Openable via:
- Command palette: "Kan-Bull: Open board"
- Optional ribbon icon (bull emoji or custom SVG)

### Layout (Top to Bottom)

```
┌─────────────────────────────────────────────────────────────┐
│  🐂 Kan-Bull        [v Project Dropdown ▾]     [+ New]      │
├─────────────────────────────────────────────────────────────┤
│                    [+ Add Column]                            │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  Backlog     │  Ongoing     │  Review      │  Done          │
│              │              │              │                │
│ ┌──────────┐ │ ┌──────────┐ │              │ ┌──────────┐   │
│ │ Ticket 1 │ │ │ Ticket 3 │ │              │ │ Ticket 5 │   │
│ └──────────┘ │ └──────────┘ │              │ └──────────┘   │
│ ┌──────────┐ │ ┌──────────┐ │              │                │
│ │ Ticket 2 │ │ │ Ticket 4 │ │              │                │
│ └──────────┘ │ └──────────┘ │              │                │
│              │              │              │                │
│  [+ Add]     │  [+ Add]     │  [+ Add]     │  [+ Add]      │
└──────────────┴──────────────┴──────────────┴────────────────┘
```

### Header Bar

| Element | Behavior |
|---|---|
| 🐂 Logo + "Kan-Bull" | Static branding, left-aligned |
| Project dropdown | Lists all projects, selecting one loads its board |
| `+` button | Opens a small modal to create a new project (just a name input) |

### Columns

| Element | Behavior |
|---|---|
| Column header | Displays column name. Editable on double-click |
| `+ Add Column` button | Adds a new column to the right. Prompts for name |
| Column actions | Right-click header → rename, delete (with confirmation if tickets exist), reorder left/right |
| `+ Add` (bottom of column) | Creates a new ticket in that column. Inline title input |

### Ticket Card (Board View)

Compact card showing:
- **Title** (truncated if long, full on hover/tooltip)
- **Description preview** (first line, muted text, only if description exists)
- **Source indicator** (small icon/dot if ticket came from a todo)

Click on a ticket card → opens the **Ticket Detail Modal**.

### Ticket Detail Modal

```
┌────────────────────────────────────┐
│  Ticket Title (editable)       [X] │
├────────────────────────────────────┤
│                                    │
│  Description:                      │
│  ┌──────────────────────────────┐  │
│  │ (textarea, 1-2 lines)       │  │
│  └──────────────────────────────┘  │
│                                    │
│  Column: [Dropdown ▾]             │
│                                    │
│  Source: Todo.md (clickable link)  │
│          (only shown if exists)    │
│                                    │
│              [🗑 Delete Ticket]     │
└────────────────────────────────────┘
```

Fields:
- **Title**: Editable text input
- **Description**: Optional textarea (1-2 lines)
- **Column**: Dropdown to move ticket without drag-and-drop
- **Source**: Read-only clickable link to originating note (only displayed if `sourceNote` is not null)
- **Delete**: Button with confirmation prompt

No other fields. No dates. No tags. No priority.

---

## 4. User Flows

### Flow 1: Open Kan-Bull

1. User opens command palette → "Kan-Bull: Open board"
2. Kan-Bull view opens as a new tab
3. If projects exist → loads the last viewed project (or first in list)
4. If no projects → shows empty state with prompt to create first project

### Flow 2: Create a New Project

1. Click `+` in the header bar
2. Modal appears with a single text input: "Project name"
3. On confirm → project is created with the 4 default columns (Backlog, Ongoing, Review, Done)
4. Board switches to the new project

### Flow 3: Add a Ticket Manually

1. Click `+ Add` at the bottom of any column
2. Inline text input appears at the bottom of the column
3. User types title → press Enter to confirm, Escape to cancel
4. Ticket is created with title only (no description, no source)

### Flow 4: Send Todo to Kan-Bull (Right-Click)

1. User opens `Todo.md` (configurable path in settings)
2. Right-clicks on a line containing a checkbox (`- [ ] Some task`)
3. Context menu shows: **"📌 Send to Kan-Bull"**
4. Modal appears:
   - Project dropdown (required)
   - Column dropdown (defaults to "Backlog")
   - Title is pre-filled from the todo text (editable)
5. On confirm:
   - Ticket is created in the selected project/column
   - `sourceNote` is set to the file path (e.g., `Todo.md`)
   - **The line is deleted from Todo.md**
6. On cancel → nothing happens

### Flow 5: Drag and Drop

1. User clicks and holds a ticket card
2. Drags it to another column (visual feedback: drop zone highlight)
3. Drops it → ticket moves to the new column at the drop position
4. `data.json` is updated immediately
5. Drag-and-drop also works within the same column to reorder tickets

### Flow 6: Edit a Ticket

1. Click on a ticket card → Ticket Detail Modal opens
2. Edit title, description, or change column via dropdown
3. Changes are auto-saved on blur / modal close
4. Delete button removes the ticket (with "Are you sure?" confirmation)

### Flow 7: Manage Columns

1. Right-click on a column header → context menu:
   - **Rename**: Inline edit the column name
   - **Move Left / Move Right**: Reorder columns
   - **Delete**: Remove column (confirmation required if it contains tickets; tickets are deleted with it)
2. Click `+ Add Column` → input for column name → column appears on the right

### Flow 8: Delete a Project

1. Right-click on project name in dropdown (or a settings/gear icon)
2. Confirmation modal: "Delete project [name] and all its tickets?"
3. On confirm → project is removed from `data.json`, board switches to next project or empty state

---

## 5. Styling & Theme

### Approach

- Use **CSS variables from Obsidian's theme system** — no hardcoded colors
- This ensures native compatibility with Dracula and any other theme
- Use Obsidian's existing CSS classes where possible (`modal`, `dropdown`, `menu`, etc.)

### Dracula Accent Usage (Suggestions)

Since the user uses Dracula theme, the default experience should feel at home. Suggested accent mapping using Obsidian CSS variables (these will adapt to any theme):

| Element | Style |
|---|---|
| Column headers | `--text-normal` with subtle `--background-secondary` background |
| Ticket cards | `--background-primary` with `--background-modifier-border` border |
| Ticket hover | Slight elevation/shadow or `--background-modifier-hover` |
| Drop zone highlight | `--interactive-accent` with low opacity |
| Source indicator | Small dot using `--text-accent` |
| Delete actions | `--text-error` color |

### Responsive Behavior

- Columns scroll horizontally if they exceed the view width
- Ticket cards have a max-width and wrap content
- Mobile: columns stack vertically (if Obsidian mobile support is desired — can be deferred)

---

## 6. Plugin Architecture

### File Structure

```
kan-bull/
├── main.ts              # Plugin entry point, registers view & commands
├── view.ts              # KanBullView class (extends ItemView)
├── components/
│   ├── Board.ts         # Main board renderer (columns + tickets)
│   ├── Column.ts        # Single column component
│   ├── TicketCard.ts    # Ticket card in board view
│   ├── TicketModal.ts   # Ticket detail modal
│   ├── ProjectModal.ts  # New project creation modal
│   └── SendToModal.ts   # "Send to Kan-Bull" modal (from todo right-click)
├── models/
│   └── types.ts         # TypeScript interfaces (Project, Column, Ticket, Settings)
├── services/
│   ├── DataService.ts   # Read/write data.json, CRUD operations
│   └── TodoService.ts   # Parse Todo.md, delete lines, extract task text
├── styles.css           # Plugin styles (using CSS variables)
├── manifest.json        # Obsidian plugin manifest
└── package.json
```

### Key Technical Notes

- **View registration**: Use `registerView()` with a custom view type `kan-bull-view`
- **Drag and drop**: Use native HTML5 drag-and-drop API (no external libraries needed)
- **Data persistence**: Read/write via `this.app.vault` or `this.loadData()` / `this.saveData()` (Obsidian plugin API)
- **Context menu**: Use `registerEvent()` on `editor-menu` event to inject "Send to Kan-Bull" option. Check if current file matches `settings.todoFilePath` and if the cursor line is a checkbox
- **No external dependencies** if possible — keep it lean

---

## 7. Settings Tab

Minimal settings (accessible via Obsidian Settings → Kan-Bull):

| Setting | Type | Default | Description |
|---|---|---|---|
| Todo file path | Text input | `Todo.md` | Path to the todo file for right-click integration |
| Default columns | Comma-separated text | `Backlog, Ongoing, Review, Done` | Columns created with each new project |

That's it. No other settings needed.

---

## 8. Scope & Non-Goals

### In Scope (MVP)

- [x] Create, rename, delete projects
- [x] Default columns (Backlog, Ongoing, Review, Done)
- [x] Custom columns (add, rename, reorder, delete)
- [x] Create tickets (title only or title + description)
- [x] Drag-and-drop tickets between columns and within columns
- [x] Ticket detail modal (edit title, description, move column, delete)
- [x] Right-click todo → send to Kan-Bull → delete from Todo.md
- [x] Source note tracking
- [x] Dracula-friendly theming via CSS variables
- [x] Done tickets persist (archive passive)

### Explicitly Out of Scope

- ❌ Dates (due dates, created dates, any dates)
- ❌ Priorities
- ❌ Tags / labels
- ❌ AI features
- ❌ Notifications / reminders
- ❌ Assignees / multi-user
- ❌ Integrations with external services
- ❌ Mobile-specific UI (can be added later)
- ❌ Undo/redo
- ❌ Keyboard shortcuts (can be added later)
- ❌ Search/filter within boards

---

## 9. Future Considerations (Post-MVP)

These are explicitly **not in the MVP** but worth noting for later:

- Keyboard navigation (j/k to move between tickets, Enter to open, etc.)
- Archive column (collapsed "Done" to reduce visual noise)
- Ticket count per column in header
- Export project as markdown
- Bulk actions (move all Done tickets, clear column)
- Mobile layout
- Custom theme accent overrides in settings

---

*Document version: 1.0*
*Created: 2025-02-07*
*Plugin name: Kan-Bull 🐂*