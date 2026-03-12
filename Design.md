# Design.md

## 1. Purpose of this document
This document converts the approved visual direction into a strict implementation guide for the mobile app UI. It defines the design system, layout rules, light and dark themes, component behavior, screen composition, and accessibility requirements.

The agent must not redesign screens, simplify navigation, invent alternate visual systems, or use arbitrary color choices outside the token system defined here.

---

## 2. Visual direction
The app must feel:
- calm;
- modern;
- premium but lightweight;
- clear;
- structured;
- mobile-first.

The UI should look like a refined productivity app, not a corporate admin panel and not a playful social app.

The dominant visual pattern is:
- soft surfaces;
- rounded cards;
- strong spacing discipline;
- restrained accent colors;
- high clarity in content hierarchy.

Primary emotional outcome: **organized and under control**.

---

## 3. Core design principles
1. Content comes first.
2. Every screen must have one obvious primary action.
3. Color is used for recognition and structure, not decoration.
4. Both light and dark themes are first-class modes.
5. Interactive elements must feel soft and deliberate, not noisy.
6. Folders and Themes must be visually recognizable at a glance.
7. Important reminder state must be clear without relying on color alone.

---

## 4. Platform assumptions
This is a mobile-first app.

Reference layout width:
- 390px mobile viewport as the primary design target.

Requirements:
- respect safe area on every screen;
- support both iOS and Android;
- do not build tablet-specific layouts in MVP, but avoid fragile fixed sizing.

---

## 5. Navigation model
Primary navigation is a fixed bottom tab bar.

Tabs:
1. Notes
2. Reminders
3. Archive
4. Organize
5. Settings

A global floating action button must be visible on the main content screens.

FAB menu options:
- New Note
- New Reminder
- New Folder
- New Theme

The bottom tab bar must always remain the main navigation anchor. The app must not hide structure behind a hamburger menu.

---

## 6. Design token system
All visual values must come from a shared token system.

### 6.1 Radius tokens
- `radius.xs = 8`
- `radius.sm = 12`
- `radius.md = 16`
- `radius.lg = 20`
- `radius.xl = 24`
- `radius.full = 999`

### 6.2 Spacing tokens
Use an 8-point system.
- `space.1 = 4`
- `space.2 = 8`
- `space.3 = 12`
- `space.4 = 16`
- `space.5 = 20`
- `space.6 = 24`
- `space.8 = 32`
- `space.10 = 40`

### 6.3 Border tokens
- `border.thin = 1`
- `border.medium = 1.5`
- `border.strong = 2`

### 6.4 Elevation tokens
#### Light mode
- `shadow.card = 0 6 20 rgba(17, 24, 39, 0.08)`
- `shadow.fab = 0 12 28 rgba(59, 130, 246, 0.22)`

#### Dark mode
- `shadow.card = 0 8 24 rgba(0, 0, 0, 0.24)`
- `shadow.fab = 0 12 28 rgba(37, 99, 235, 0.28)`

In dark mode, surfaces should rely more on contrast between layers than on heavy shadows.

---

## 7. Color system
Colors must not be hardcoded inside screen components.

### 7.1 Base colors: light theme
- `bg.app = #F5F7FB`
- `bg.surface = #FFFFFF`
- `bg.surfaceSecondary = #EEF2F8`
- `bg.input = #F3F6FB`
- `text.primary = #111827`
- `text.secondary = #667085`
- `text.tertiary = #98A2B3`
- `border.default = #E4E7EC`
- `accent.primary = #5B7CFA`
- `accent.primaryPressed = #4C6DF0`
- `accent.soft = #E8EEFF`
- `success = #12B76A`
- `warning = #F79009`
- `error = #F04438`
- `info = #2E90FA`

### 7.2 Base colors: dark theme
- `bg.app = #0B1020`
- `bg.surface = #121A2F`
- `bg.surfaceSecondary = #1A2540`
- `bg.input = #18233B`
- `text.primary = #F8FAFC`
- `text.secondary = #C7D0E0`
- `text.tertiary = #8FA0BA`
- `border.default = #26324F`
- `accent.primary = #7C95FF`
- `accent.primaryPressed = #6E88FF`
- `accent.soft = #1F2B52`
- `success = #32D583`
- `warning = #FDB022`
- `error = #F97066`
- `info = #53B1FD`

### 7.3 User-selectable folder/theme colors
Users must choose from a controlled palette, not an unrestricted color picker.

Allowed palette:
- blue `#6EA8FE`
- purple `#A78BFA`
- pink `#F472B6`
- orange `#FB923C`
- green `#4ADE80`
- teal `#2DD4BF`
- yellow `#FACC15`
- red `#F87171`

Each palette option must have:
- a soft background variant for cards/chips;
- a stronger foreground/icon/text variant for contrast.

### 7.4 Reminder priority colors
- low = green
- medium = yellow
- high = orange
- urgent = red

Priority must always be shown as both text and color.

---

## 8. Typography
Use a system sans-serif font. Decorative fonts are not allowed.

### Text styles
- `display`: 32 / 38 / semibold
- `title1`: 28 / 34 / semibold
- `title2`: 22 / 28 / semibold
- `sectionTitle`: 18 / 24 / semibold
- `cardTitle`: 17 / 22 / semibold
- `body`: 15 / 22 / regular
- `bodyStrong`: 15 / 22 / medium
- `caption`: 13 / 18 / regular
- `captionStrong`: 13 / 18 / medium
- `micro`: 11 / 14 / medium

Rules:
- screen titles are large and left-aligned;
- important metadata must not be smaller than 13px;
- truncation must be intentional and predictable;
- line height must remain readable in both themes.

---

## 9. Iconography
Use a single coherent icon set. Recommended: Lucide or equivalent.

Required icon categories:
- notes;
- reminders;
- archive;
- organize;
- settings;
- folders;
- themes;
- push;
- email;
- telegram;
- complete;
- snooze;
- edit;
- delete;
- pin;
- search;
- filter;
- calendar;
- clock.

Rules:
- icons must not overpower text;
- icon stroke weight must remain consistent;
- folder and theme visuals must not look identical even if they use the same color palette.

---

## 10. Core components

### 10.1 App shell
The app shell includes:
- SafeArea wrapper;
- screen header;
- content region;
- bottom tab bar;
- floating action button.

### 10.2 Screen header
Each major screen uses a large title and optional utility actions on the right.

Rules:
- do not overload headers;
- max 2 actionable icons on the right unless the screen explicitly requires more;
- headers must remain visually calm.

### 10.3 Search input
Search input style:
- pill-like rounded field;
- search icon on the left;
- placeholder text in tertiary color;
- focused state with accent border or accent glow;
- clear button when text is present.

### 10.4 Filter chips
Used for reminder subtabs, archive type filters, and optional quick filters.

States:
- default;
- selected;
- disabled.

Selected chip:
- light theme: accent soft background + accent text;
- dark theme: dark accent surface + accent text.

### 10.5 Cards
Cards are the dominant content container.

Card rules:
- radius = `radius.md`;
- padding = 16;
- thin border + subtle elevation;
- primary content at top;
- secondary metadata below.

### 10.6 Floating action button
- size = 56;
- shape = circular or soft squircle;
- background = accent primary;
- icon = white plus;
- bottom offset = tab bar height + 16;
- right offset = 20.

### 10.7 Bottom tab bar
- solid surface background;
- thin top border;
- icon + text label on every tab;
- selected tab highlighted with accent color;
- do not use glassmorphism.

### 10.8 Form inputs
Every form field must support:
- default;
- focused;
- error;
- disabled.

Error message placement:
- directly below the field.

---

## 11. Notes screen specification

### 11.1 Purpose
The Notes screen is the primary place for browsing, searching, filtering, and opening notes.

### 11.2 Screen structure
Top to bottom:
1. Header with title `Notes`
2. Search input
3. Horizontal folder strip
4. `Pinned` section
5. `Recent` section

### 11.3 Folder strip
Folder items should appear as soft colored chips or mini tiles.

Each folder item shows:
- icon;
- name;
- background color based on folder color token.

### 11.4 Pinned section
Pinned notes appear above recent notes.

Each pinned note card shows:
- title;
- up to 2 lines of preview;
- optional date;
- pin indicator.

### 11.5 Recent list
Recent notes appear as a vertical compact list.

Each row/card shows:
- leading icon;
- title;
- small subtitle or date;
- optional folder/theme accent marker.

### 11.6 Empty state
If there are no notes:
- show a neutral illustration or icon placeholder;
- primary text: `No notes yet`;
- secondary text explaining that notes can be created from the FAB;
- CTA button: `Create note`.

---

## 12. Reminder list screen specification

### 12.1 Purpose
This is the main operational screen for active reminders.

### 12.2 Screen structure
Top to bottom:
1. Header with title `Reminders`
2. Internal tabs/chips: `Active`, `Today`, `Upcoming`, `Overdue`
3. Vertical list of reminder cards

### 12.3 Reminder card content
Each reminder card must include:
- title;
- due time;
- optional due date when not implied by the current tab;
- priority badge;
- folder chip when assigned;
- one or more channel icons;
- overflow menu;
- optional description preview.

### 12.4 Visual state rules
- overdue reminders use warning or error visual treatment;
- urgent reminders use an urgent badge, but the full card must still match the design system;
- completed reminders must not remain in active views.

### 12.5 Quick actions
Each reminder must support:
- Complete
- Snooze
- Edit

These actions can be exposed via swipe, overflow, or inline buttons depending on the screen density, but the underlying actions are mandatory.

---

## 13. Reminder detail screen specification
This is one of the highest-importance screens.

### 13.1 Layout order
1. Back button
2. Overflow menu
3. Reminder title
4. Due date/time block
5. Repeat block
6. Primary action row
7. Channels section
8. Description section
9. Secondary actions section

### 13.2 Primary action row
This row must contain 3 medium-sized action buttons/cards:
- Complete
- Snooze
- Edit

Do not implement these as bare icon-only buttons.

### 13.3 Channels section
Channels must be shown as selectable chips/cards:
- Push
- Email
- Telegram

A selected channel must be visually obvious.

### 13.4 Surface treatment
The detail screen may use a richer surface hierarchy than list screens, especially in dark mode, but it must still derive from the token system.

---

## 14. Archive screen specification

### 14.1 Purpose
Archive shows the history of completed reminders and manually archived notes.

### 14.2 Screen structure
1. Header `Archive`
2. Search input
3. Filter chips: `All`, `Notes`, `Reminders`
4. Vertical list of archived items

### 14.3 Archived item layout
Each item must show:
- title;
- item type marker;
- archived/completed date;
- optional restore action;
- optional status metadata.

### 14.4 Empty state
Primary text: `Archive is empty`
Secondary text: `Completed reminders and archived notes will appear here.`

---

## 15. Organize screen specification

### 15.1 Purpose
The Organize section manages the user-defined structure: folders and themes.

### 15.2 Structure
This screen must contain either:
- two internal tabs; or
- two vertically separated sections.

The two sections are:
- Themes
- Folders

### 15.3 Theme tile
Each theme tile shows:
- icon;
- name;
- color;
- optional count of linked items.

### 15.4 Folder row
Each folder row shows:
- icon;
- name;
- optional item count.

### 15.5 Create/Edit modal
Folder and Theme create/edit flows must include:
- Name field
- Color selection from controlled palette
- Icon selection from controlled icon set

Emoji-as-icon input is not allowed for MVP.

---

## 16. Settings screen specification

### 16.1 Required sections
- Appearance
- Notification Channels
- Account
- About

### 16.2 Appearance section
Must allow:
- System
- Light
- Dark

### 16.3 Notification Channels section
Must display:
- push permission state;
- email address used for reminders;
- Telegram connection state;
- actions to connect or disconnect where appropriate.

### 16.4 Account section
Must display and support:
- display name;
- email;
- timezone;
- sign out.

---

## 17. Form design rules
Every create/edit form must follow the same pattern.

Rules:
- label above field;
- field below label;
- helper or error text below field;
- primary CTA easy to reach;
- destructive actions visually separated.

### Date/time inputs
Native or platform-appropriate pickers are allowed, but the selected value must be displayed in a design-system-consistent summary row.

---

## 18. Motion and interaction rules
Required motion behaviors:
- pressed state on cards and buttons;
- soft open/close animation for the FAB menu;
- smooth theme transition;
- skeleton loading or placeholder states for async screens;
- toast/snackbar feedback for success and failure.

Motion must be subtle and short.

---

## 19. Accessibility requirements
Required:
- sufficient contrast in both themes;
- color must not be the only meaning carrier;
- interactive touch targets at least 44x44;
- icons must have accessibility labels;
- tab bar must be screen-reader friendly;
- reminder state and priority must be readable without color alone.

---

## 20. Theme implementation rules
Theme logic must be isolated.

Required structure:

```text
src/theme/
  tokens.ts
  light.ts
  dark.ts
  index.ts
  ThemeProvider.tsx
  useTheme.ts
```

The agent must not:
- hardcode theme colors inside screens;
- create separate duplicated components for light and dark mode;
- mix business logic and theme logic.

All components must consume the active theme through the shared theme layer.

---

## 21. Final implementation target
By following this document, the agent must produce a mobile UI that:
- matches the approved visual direction;
- is consistent across all screens;
- supports both light and dark themes from the beginning;
- leaves no major visual behavior undefined.
