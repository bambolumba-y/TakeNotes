# Phase_7.md

## Phase 7. Search, filters, smart views, UX polish, and product completeness for MVP

## 1. Objective
Turn the implemented core into a complete MVP experience. At the end of this phase, the user must be able to efficiently search, filter, and navigate notes, reminders, and archive content, with polished states and a fully coherent `Organize` experience.

This phase is not a visual redesign. It is a completeness and polish phase for the existing product specification.

---

## 2. Scope of this phase
This phase must include:
- full search flows across Notes, Reminders, and Archive;
- complete filter and sort behavior;
- smart reminder views;
- empty states, loading states, and error states;
- better organize flows;
- pinned note polish;
- reminder priority presentation polish;
- FAB create flows fully wired to real forms;
- deep-link routing into reminder detail where applicable.

This phase must not include:
- collaboration;
- attachments;
- analytics dashboards;
- desktop/web expansion.

---

## 3. Search requirements

### 3.1 Notes search
Must support:
- title search;
- content search;
- search combined with folder filter;
- search combined with theme filter.

### 3.2 Reminders search
Must support:
- title search;
- description search;
- search combined with status/date filters.

### 3.3 Archive search
Must support:
- notes and reminders;
- type filter plus search.

### 3.4 UX rules
- search input must debounce requests or otherwise prevent wasteful request spam;
- loading state must be visible during search;
- empty result state must be distinct from empty dataset state.

---

## 4. Filter and sort requirements

### 4.1 Notes
Support:
- folder filter;
- themes filter;
- sort by updated date;
- sort by created date;
- sort by title.

### 4.2 Reminders
Support:
- status/view filter;
- folder filter;
- theme filter;
- date range filter;
- sort by due date;
- sort by updated date.

### 4.3 Archive
Support:
- item type filter;
- folder filter where relevant;
- theme filter where relevant;
- date filter.

---

## 5. Smart views
The following reminder views must behave correctly:
- Active
- Today
- Upcoming
- Overdue

Definitions:
- `Today`: due today in user timezone and still actionable;
- `Upcoming`: future reminders excluding those already shown in Today;
- `Overdue`: actionable reminders past due;
- `Active`: all actionable reminders, regardless of due grouping.

The implementation must use timezone-aware calculations.

---

## 6. Organize screen completeness
The `Organize` tab must now feel finished.

### Required behavior
- clearly separated Themes and Folders areas;
- create/edit/delete fully wired;
- counts displayed where useful;
- empty states for no folders or no themes;
- icon and color previews in forms;
- validation messages visible in forms.

---

## 7. FAB flow completeness
All FAB actions must now open real implementations:
- New Note -> note create screen
- New Reminder -> reminder create screen
- New Folder -> folder create modal/screen
- New Theme -> theme create modal/screen

No placeholder targets are allowed after this phase.

---

## 8. Error and empty state requirements
Every major list and create/edit flow must support:
- loading state;
- error state;
- empty dataset state;
- empty filtered-result state;
- success feedback.

Examples:
- no notes at all;
- no reminders in Overdue;
- no archived items;
- search returned no results;
- create action failed.

---

## 9. Reminder and note presentation polish

### 9.1 Notes
Pinned notes must always render in a visually distinct section.
Recent notes must remain compact and scannable.

### 9.2 Reminders
Priority must be clearly visible.
Channel icons must be consistent.
Overdue state must be obvious.

### 9.3 Archive
Archived items must clearly show item type and date context.

---

## 10. Deep links
Push and other reminder entry points must route into the correct reminder detail screen when the user opens the app from a reminder context.

This does not require complete app-link production setup for every platform in this phase, but in-app route handling and payload routing must already exist.

---

## 11. User flows in this phase

### Flow A. Search notes
1. User opens Notes.
2. User types search query.
3. Results update.
4. User optionally adds folder/theme filter.
5. Result set remains correct.

### Flow B. Browse Today reminders
1. User opens Reminders.
2. User selects Today.
3. Only reminders due today in user timezone are shown.

### Flow C. Create folder from FAB
1. User taps FAB.
2. User selects New Folder.
3. Real folder create form opens.
4. Folder is created and immediately available in selectors.

### Flow D. Open reminder from notification context
1. User receives reminder.
2. User taps the reminder entry point.
3. App opens the correct reminder detail screen.

---

## 12. Acceptance criteria
This phase is complete only if:
- search works across Notes, Reminders, and Archive;
- all documented filters work;
- smart reminder views are correct in user timezone;
- FAB actions are fully wired;
- empty/loading/error states exist on all major screens;
- deep-link handling reaches reminder detail correctly;
- Organize screen feels complete and functional.

---

## 13. Tests required in this phase
Minimum required:
- search query tests for notes and reminders;
- timezone-aware view tests for Today and Overdue;
- UI test for FAB create folder/theme flow;
- deep-link routing test into reminder detail;
- empty-state rendering tests for at least Notes and Archive.

---

## 14. What the agent must not do in this phase
- do not introduce new product domains;
- do not leave placeholder create flows;
- do not calculate Today/Overdue without timezone awareness;
- do not treat empty-state work as optional polish.
