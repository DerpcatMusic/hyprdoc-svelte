# HyprDoc Svelte Styling Rules (UnoCSS)

This document defines the styling conventions for the HyprDoc Svelte project using **UnoCSS**.

---

## 1. Icons with Iconify

We use `@unocss/preset-icons` with Lucide icons. Icons are applied as **class names**.

### Syntax
```html
<!-- Icon as class -->
<span class="i-lucide-check h-4 w-4"></span>

<!-- Icon with color -->
<span class="i-lucide-settings text-muted-foreground"></span>

<!-- Icon in button -->
<button class="btn-ghost btn-icon">
  <span class="i-lucide-plus"></span>
</button>
```

### Rules
- Always prefix with `i-lucide-` for Lucide icons
- Set explicit size (`h-4 w-4`, `h-5 w-5`, etc.)
- Icons inherit `currentColor` by default

---

## 2. Semantic Color Tokens

Use CSS variables via UnoCSS theme colors. **Never hardcode colors**.

### Available Tokens
| Token | Usage |
|-------|-------|
| `bg-background` | Main page background |
| `bg-card` | Card/panel backgrounds |
| `bg-sidebar` | Sidebar background |
| `bg-primary` | Primary action (violet) |
| `bg-secondary` | Secondary action (cyan) |
| `bg-muted` | Muted/disabled areas |
| `bg-accent` | Hover/focus highlights |
| `bg-destructive` | Danger/delete actions |
| `text-foreground` | Main text |
| `text-muted-foreground` | Secondary text |
| `border-border` | Default borders |
| `text-success` | Success states |
| `text-error` | Error states |

### Example
```html
<div class="bg-card text-card-foreground border border-border rounded-lg p-4">
  <h2 class="text-foreground">Title</h2>
  <p class="text-muted-foreground">Subtitle</p>
</div>
```

---

## 3. Shortcuts (Utility Classes)

Use UnoCSS shortcuts for common patterns. Defined in `uno.config.ts`.

| Shortcut | Expansion |
|----------|-----------|
| `flex-center` | `flex items-center justify-center` |
| `flex-between` | `flex items-center justify-between` |
| `flex-col-center` | `flex flex-col items-center justify-center` |
| `btn-primary` | Primary button styles |
| `btn-secondary` | Secondary button styles |
| `btn-outline` | Outlined button |
| `btn-ghost` | Ghost/transparent button |
| `btn-destructive` | Red destructive button |
| `btn-sm` / `btn-md` / `btn-lg` | Button sizes |
| `btn-icon` | Square icon button |
| `card` | Card container styles |
| `input-base` | Form input styles |

### Example
```html
<button class="btn-primary btn-md">Save</button>
<div class="card p-6">Card content</div>
<input class="input-base" placeholder="Enter text" />
```

---

## 4. CSS-Only Classes (app.css)

These are defined in `app.css`, not UnoCSS:

| Class | Usage |
|-------|-------|
| `glass-panel` | Card-like container |
| `glass-panel-hover` | Hoverable panel |
| `glass-input` | Themed input field |
| `animate-spin` | Loading spinner |
| `animate-fade-in` | Fade-in animation |
| `animate-slide-up` | Slide-up animation |

---

## 5. Dark Mode

Dark mode is activated by the `.dark` class on `<html>`.

- **Do NOT** use `dark:` variant manually on new components
- Theme tokens automatically switch values in dark mode
- Use `ModeWatcher` from `mode-watcher` for toggle

---

## 6. Attributify Mode (Optional)

We can enable attributify for cleaner markup:

```html
<!-- Standard class syntax -->
<div class="flex items-center gap-4 p-4 bg-card rounded-lg"></div>

<!-- Attributify syntax (if enabled) -->
<div flex items-center gap-4 p-4 bg="card" rounded="lg"></div>
```

**Status**: Not currently enabled. Enable via `presetAttributify()` in `uno.config.ts`.

---

## 7. Tagify Mode (Optional)

Tagify allows using utility names as HTML tags:

```html
<flex gap-4>
  <text-red>Error message</text-red>
</flex>
```

**Status**: Not currently enabled. Enable via `presetTagify()` in `uno.config.ts`.

---

## Quick Reference

```html
<!-- Button variants -->
<button class="btn-primary btn-md">Primary</button>
<button class="btn-secondary btn-sm">Secondary</button>
<button class="btn-ghost btn-icon"><span class="i-lucide-x"></span></button>

<!-- Card -->
<div class="card p-6">
  <h3 class="text-lg font-semibold">Card Title</h3>
  <p class="text-muted-foreground text-sm">Description</p>
</div>

<!-- Input -->
<input class="input-base" placeholder="Type here..." />

<!-- Flex layouts -->
<div class="flex-between">
  <span>Left</span>
  <span>Right</span>
</div>

<!-- Icons -->
<span class="i-lucide-settings h-5 w-5 text-muted-foreground"></span>
```
