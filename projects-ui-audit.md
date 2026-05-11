# Projects UI Audit
_Generated: 2026-05-11_

---

## Fully Working

| Area | What works |
|---|---|
| Sidebar | Project list, `<Link>` navigation, active highlight, New Project modal (form + store + navigate) |
| Board | Static `STORY_GROUPS` drag & drop between columns |
| Board | Active sprint story-grouped view, story collapse/expand, `BLStatusPill` status changes |
| Board | Active sprint card drag → `onSprintStatusChange` → updates shared state |
| Board | "Complete sprint" button → shared modal with per-item destination picker |
| Backlog | Sprint/backlog section collapse, item status pills, inline create, drag between sections |
| Backlog | Story tree expand/collapse (children indent), search filter |
| Backlog | "Start sprint" modal, "Add dates" modal, "Create sprint" |
| CreateStoryPanel | Summary validation, work type/status/priority/assignee/sprint/estimate all wired |
| TaskPanel | Edit mode toggle — title, status, priority editable; RichEditor for description |
| My Work / My Tasks | Checkboxes toggle + strikethrough, filter buttons (partial) |
| Overview | Project name/emoji/client badge from store |

---

## Dead Buttons / Broken Logic

### Topbar & Navigation

| Button | Location | Problem |
|---|---|---|
| Search box | everywhere | no handler, cosmetic only |
| Bell | everywhere | no handler |
| "Open board →" | Overview context banner | no `onClick` — should switch to `board` tab |
| Sprint chip | Topbar | always "Sprint 14 · ends in 2d" even for new/other projects |

---

### Overview Tab

| Button | Problem |
|---|---|
| "Log time" | no handler |
| "Add task" in hero | calls `onOpenPanel` → opens **TaskPanel** (view panel for NB-218), not CreateStoryPanel |
| "Snooze all" | no handler |
| "Sprint view" link | no handler |
| All "Needs attention" items | open TaskPanel — fine for mockup but always same hardcoded task |

---

### Board Tab

| Button / Element | Problem |
|---|---|
| Every board card click | always opens hardcoded NB-218 `TaskPanel` regardless of which card was clicked |
| `+` button in kanban column headers | opens TaskPanel, should open CreateStoryPanel |
| "New project" card in grid view | no `onClick` |
| Static `STORY_GROUPS` on board | shown **alongside** active sprint groups — overlapping stories (e.g. "Auth & Sessions" appears in both active sprint section AND static groups) |
| `StoryPanel` Save edit | saves to local state only, does not push back into `groups` state in `BoardTab` — story name does not update in board header |
| `StoryPanel` "Open" button | dead |

---

### Backlog Tab

| Button / Element | Problem |
|---|---|
| Item title click → `onOpenPanel` | always opens hardcoded NB-218 TaskPanel |
| "Assignee" / "Filter" chips | no handler |
| Section `<input type="checkbox">` | no `onChange` |
| `sb-more-btn` (…) on each sprint row | no dropdown / handler |
| Inline create | new items have no `parentStoryId` even when created under an expanded story |

---

### CreateStoryPanel

| Problem |
|---|
| "Create" button closes panel but **never adds item to `blSprints`/`blBacklog` state** — item is silently discarded |
| "Space" field hardcoded `occs (OCCS)` |
| Parent, Components, Labels, Fix versions — all fake dropdowns, no state |
| Attachment drop zone — no file input wired |

---

### TaskPanel

| Problem |
|---|
| Always shows hardcoded NB-218 data — no dynamic binding to the clicked card |
| Subtask checkboxes — `onClick` updates `checked` state but render reads `s.done` (static data), completely disconnected |
| Comment textarea — no state attached; "Comment" button does nothing |
| "Open" button — dead |
| "More" (…) — no dropdown |

---

### Timeline Tab

| Problem |
|---|
| `<` `>` nav buttons — no scroll logic |
| "Year · 2025" filter — dead |
| "Now" line hardcoded at 30% regardless of actual date |

---

### Team Tab

| Problem |
|---|
| "Invite" button — no onClick |
| Member cards not clickable/interactive |

---

### Sidebar

| Problem |
|---|
| "Archived" button — no handler |
| "Settings" button — no handler |

---

### My Work / My Tasks / Assigned (`_views.tsx`)

| Problem |
|---|
| "New project" button in topbar — no onClick (should open NewProjectModal) |
| "Add task" / "New task" buttons — no onClick |
| Open (↗) button on My Work rows — calls `onOpenProject(t.id)` with **ticket ID** (e.g. `"NB-218"`) not project ID → navigates to `/projects/NB-218` which doesn't exist |
| Filter chips in My Tasks / Assigned — no handler |

---

## Top 5 Fixes by Impact

| # | Fix | Why |
|---|---|---|
| 1 | **CreateStoryPanel "Create" → actually insert item into `blBacklog`/sprint state** | Entire create flow is silent — nothing persists |
| 2 | **Board card click → open TaskPanel with that card's data** | All cards open same hardcoded NB-218 panel |
| 3 | **Overview "Add task" → open CreateStoryPanel** not TaskPanel | "Add task" should create, not view |
| 4 | **Board: hide static `STORY_GROUPS` when active sprint exists** | Duplicate story groups showing simultaneously |
| 5 | **"New project" topbar button → open NewProjectModal** | Currently dead from home canvas |

---

## File Map

| File | Role |
|---|---|
| `app/projects/[id]/page.tsx` | Main project detail page — all 5 tabs, all modals |
| `app/projects/_views.tsx` | Overview, My Work, My Tasks, Assigned views |
| `app/projects/overview/page.tsx` | `/projects/overview` route → renders `_views.tsx` |
| `app/projects/my-work/page.tsx` | `/projects/my-work` route |
| `app/projects/my-tasks/page.tsx` | `/projects/my-tasks` route |
| `app/projects/assigned/page.tsx` | `/projects/assigned` route |
| `app/projects/projects.css` | All project CSS (2376 lines, design token system) |
| `components/ProjectsListSidebar.tsx` | Left sidebar — project list + New Project modal |
| `lib/projectStore.ts` | Zustand store — shared project list across sidebar + detail page |
