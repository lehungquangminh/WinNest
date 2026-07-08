# WinNest UI/UX Design System & Aesthetics Manual

This document serves as the official design blueprint and UI/UX manual for the WinNest project. It establishes the design principles, visual patterns, layout grids, CSS variables, and state management synchronization flows to ensure that all current and future screens remain 100% consistent, premium, and unified in their presentation.

---

## 1. Design Philosophy & Visual Tone

WinNest rejects generic modern AI styles, saturated gradients, glowing neon shadows, and over-designed neumorphic patterns. The interface adheres to a **Sleek, Premium, and Flat Matte** visual tone.

### 1.1 Core Aesthetic Pillars
*   **The Slate-Ink Palette:** All background colors reside in dark slate, charcoal, and deep ink tones. True pitch black `#000` is avoided for major containers to reduce eye strain, while high-contrast typography and subtle border definitions maintain visual hierarchy.
*   **Matte Surface Treatments:** Surfaces do not use glow effects, blurry background shadows, or neon box-shadow highlights. Interactivity is defined strictly through flat background color changes and sharp border-color states.
*   **Flat Grouping (No "Card Soup"):** Avoid nesting border-boxes inside other border-boxes. Panels must not contain nested container panels with their own borders and backgrounds. Sub-sections (such as system configurations, tool buttons, or danger zones) must sit flat within their parent panels, separated by space (`gap`), dividers, or structured typography.
*   **Outline Iconography:** Indicators and controls rely on line-art/vector outline SVG elements (`stroke-width: 1.75` or `2.0`). Saturated flat status dots are prohibited. Instead, the system uses outline icons to represent state changes:
    *   **Success / Active:** A flat, green outline checkmark (`CheckIcon` ✓).
    *   **Warning / Pending / Diagnostics:** An amber outline information bubble (`InfoIcon` ℹ).
    *   **Danger / Failed:** A red outline cross (`XIcon` ✗).
    *   **Processing / Progress:** A rotating outline loader (`LoaderIcon` ↻ with a smooth linear infinite spin).

---

## 2. Design System Variables & Tokens

All layout spacing, font families, and color assets must be consumed via CSS custom properties. The following tokens are declared in `src/renderer/styles.css`:

### 2.1 Color Tokens
```css
:root {
  /* Surface & Background Levels */
  --bg-primary: #0a0b0d;      /* App shell background / layout bottom */
  --bg-panel: #111317;        /* Standard panel container background */
  --bg-hover: #1b1e24;        /* Button hover states / list-item hover */
  --bg-tertiary: #181b20;     /* Active state highlights / sidebar active items */
  --bg-input: #0c0d10;        /* Code containers, mono values, and inputs */

  /* Border System */
  --border-muted: #1e222a;    /* Default border for panels, lists, and forms */
  --border-strong: #2f3542;   /* Active border for focused items or panel hover */

  /* Typographical Tones */
  --text-primary: #f3f4f6;    /* Core body copy and titles */
  --text-secondary: #9ca3af;  /* Secondary details, subtitles, and labels */
  --text-muted: #6b7280;      /* Metadata, placeholders, and helper text */

  /* Functional Status Colors */
  --success: #10b981;         /* Operational green */
  --success-bg: rgba(16, 185, 129, 0.04);
  --success-border: rgba(16, 185, 129, 0.15);

  --warning: #f59e0b;         /* Caution / Pending amber */
  --warning-bg: rgba(245, 158, 11, 0.04);
  --warning-border: rgba(245, 158, 11, 0.15);

  --danger: #ef4444;          /* Destructive / Error red */
  --danger-text: #f87171;
  --danger-bg: rgba(239, 68, 68, 0.04);
  --danger-border: rgba(239, 68, 68, 0.15);
}
```

### 2.2 Typography & Sizing
*   **Fonts:**
    *   Sans-Serif: `--font-sans: 'Plus Jakarta Sans', system-ui, sans-serif;` (used for all labels, navigation, and body copy).
    *   Monospace: `--font-mono: 'JetBrains Mono', monospace;` (used for file paths, commands, terminal outputs, and system metrics).
*   **Border Radii:**
    *   Small: `--radius-sm: 4px;` (for buttons, input fields, badges, and inline chips).
    *   Medium: `--radius-md: 6px;` (for inner sub-sections and warning banners).
    *   Large: `--radius-lg: 8px;` (for main layout panels and metric cards).

---

## 3. Layout Architecture & Scaling Constraints

To prevent layout breakdowns under small window sizes or low-resolution screens, layouts must follow strict sizing constraints.

### 3.1 CSS Grid Columns and `minmax(0, 1fr)`
When laying out columns where one or more sections contain long file paths, package IDs, or URLs (which render inside `nowrap` code tags), you **MUST** use `minmax(0, ...)` to declare fractional columns. 

Failure to do so will cause the browser to compute the column's minimum size based on the content's full width, resulting in the right column being pushed off-screen.

*   **Incorrect Layout (Causes scaling overflow):**
    ```css
    .detail-layout {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 24px;
    }
    ```
*   **Correct Layout (Scales gracefully):**
    ```css
    .detail-layout {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
      gap: 24px;
    }
    ```

### 3.2 Property Sheets and Path Truncation
All system parameters, file paths, and IDs displayed inside panels must support truncation. Use the `.property-value` class to clamp elements:
```css
.property-value {
  font-family: var(--font-mono);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-grow: 1;
}
```
This preserves the layout grid while providing the full path via the HTML `title` attribute or a copy-to-clipboard button.

### 3.3 Banner Vertical Alignment
All system info/error banner boxes (`.banner`) must align their outline icons and text vertically in the center:
```css
.banner {
  display: flex;
  align-items: center;
  gap: 12px;
  line-height: 1.5;
}
```

---

## 4. State Management & Asynchronous UX Rules

Wine diagnostics (spawning external CLI processes such as `wine --version` and query tools) take 0.5 - 1.5 seconds. The React application must never block the UI or freeze navigation while fetching this data.

### 4.1 State Lifting (Lifting State Up)
To avoid unnecessary re-fetching and page flickers when switching between views (e.g., from Home to Install, or Settings to Detail), all core metrics and lists must be cached in the root component ([src/renderer/App.tsx](file:///src/renderer/App.tsx)):
*   `apps`: List of all managed Wine applications.
*   `doctor`: Diagnosed system state report.

### 4.2 Independent Fetching (Async Loading Pattern)
In the root component, fetch the lightweight app list and heavy doctor report in parallel, but update states independently. This lets the apps list display instantly:
```typescript
async function refresh(): Promise<void> {
  setIsRefreshing(true);
  setError(undefined);

  // Instantly load apps list
  const loadApps = window.winnest.invoke<ManagedApp[]>("listApps")
    .then((nextApps) => {
      setApps(nextApps);
    });

  // Load diagnostics report asynchronously
  const loadDoctor = window.winnest.invoke<DoctorReport>("doctor")
    .then((report) => {
      setDoctor(report);
    });

  try {
    await Promise.all([loadApps, loadDoctor]);
  } catch (err) {
    setError(err instanceof Error ? err.message : String(err));
  } finally {
    setIsRefreshing(false);
  }
}
```

### 4.3 Active Cache Synchronization
When child views modify application data (e.g., executing an installation, uninstalling a prefix, resetting a sandbox, or updating shortcut launchers), they must invoke a parent callback (`onRefreshParent()`) immediately upon action completion. This keeps the parent cache updated so the changes are visible when returning to the Home page.
