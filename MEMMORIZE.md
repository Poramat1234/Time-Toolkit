# Mytimes — project map

A single-page web app with 6 time-related views. Plain HTML/CSS/JS, no build step, no dependencies. Open `index.html` directly in a browser.

## File layout

```
mytimes/
├── index.html          App shell: sidebar + main mount point + script tags (load order matters: shared.js first)
├── styles.css          All styles. Sections marked "----- <view> view -----"
├── app.js              View router: registers mount functions, switches views via sidebar clicks
├── MEMMORIZE.md        This file
└── js/
    ├── shared.js       window.TT — all shared constants and helpers (see API below)
    ├── clock.js        window.mountClock — big clock display with wallpaper/font/glow
    ├── stopwatch.js    window.mountStopwatch — start/stop/lap with ms precision
    ├── timer.js        window.mountTimer — countdown with alarm beep on completion
    ├── alarm.js        window.mountAlarm — multiple scheduled alarms with repeat days
    ├── focus.js        window.mountFocus — Pomodoro: study/break cycles
    └── world.js        window.mountWorld — multi-city world clock grid
```

## View convention

Every view file exposes one function: `window.mount<ViewName>(root)`.

- Receives a `root` DOM element to render into
- Sets `root.innerHTML` with its full markup (wallpaper layer + content + fab buttons + drawer)
- Wires up event listeners
- Returns a cleanup function that the router calls when switching away (clears intervals/rAF, removes document-level listeners)

Each view manages its own `localStorage` and has its own settings; views don't share state with each other (intentional — different vibe per tool).

## TT shared API (js/shared.js)

```js
TT.PRESETS                                  // Array of 8 wallpaper preset gradients
TT.FONTS                                    // Array of 8 Google Fonts
TT.load(key, defaults)                      // localStorage load with defaults merge
TT.save(key, obj)                           // localStorage save (silent on failure)
TT.applyWallpaper(el, wallpaper, blur)      // Applies preset class or custom data URL + blur filter
TT.buildWallpaperGrid(container, onSelect)  // Populates a .wp-grid with tiles; onSelect(presetId) fires on click
TT.buildFontGrid(container, onSelect)       // Populates a .font-grid with font preview tiles
TT.syncWallpaperGrid(grid, wallpaper)       // Toggles .selected on the matching tile
TT.syncFontGrid(grid, fontId)               // Toggles .selected on the matching tile
TT.setupFullscreen(btn)                     // Wires fullscreen button + body class. Returns cleanup fn.
TT.beep(volume, freq=880, dur=0.4)          // Plays a single sine-wave tone via shared AudioContext
```

When adding a new view, use these — don't duplicate. When adding a new wallpaper preset or font, edit `shared.js` once and all views pick it up.

## CSS design tokens (in `:root`)

```
Colors:
  --bg, --bg-2                   Page backgrounds (deepest, slightly elevated)
  --panel, --panel-2, --panel-3  Surface tiers (low → high elevation)
  --border, --border-strong      Border tiers (default vs hover/active)
  --text, --muted                Foreground tiers
  --accent, --accent-bright      Brand color (default + hover state)
  --accent-soft                  Translucent accent for tinted backgrounds + focus rings
  --danger, --success            Semantic colors

Elevation:
  --shadow-sm                    Resting shadow on buttons/cards
  --shadow-md                    Hover shadow
  --shadow-lg                    Drawer + modal-like surfaces

Motion:
  --ease                         cubic-bezier(0.22, 0.61, 0.36, 1) — use for ALL transitions

Radii:
  --r-sm (6px), --r (10px), --r-lg (14px)
```

Use these tokens. Don't hard-code colors / shadows / easing in view CSS.

## CSS conventions

- View root classes are prefixed by view: `.clock-view`, `.sw-view`, `.tm-view`, `.al-view`, `.fc-view`, `.wc-view`
- Generic shared classes (used across views): `.wallpaper`, `.fab-row`, `.fab`, `.drawer`, `.drawer-head`, `.drawer-body`, `.section`, `.row`, `.wp-grid`, `.wp-tile`, `.font-grid`, `.font-tile`, `.switch`, `.btn`
- **Button system:** every action button uses `.sw-btn` + a variant — `.sw-primary` (accent fill), `.sw-secondary` (default panel), `.sw-stop` (danger fill, usually combined with `.sw-primary`). Yes, the prefix is `sw-` for legacy reasons (started in stopwatch); applies to all views now.
- Wallpaper preset classes: `.wp-midnight`, `.wp-sunset`, `.wp-ocean`, `.wp-forest`, `.wp-aurora`, `.wp-mono`, `.wp-lavender`, `.wp-ember`
- Fullscreen mode: `body.fullscreen-mode` hides sidebar (set by `TT.setupFullscreen`)
- **Sidebar nav active state:** uses `::before` pseudo-element animated `scaleY` for the accent left-bar. Don't restructure `.nav-item` markup without preserving this.
- **Brand text** in sidebar uses `background-clip: text` + transparent fill for the white→accent gradient.
- **Custom scrollbars** are set globally via `::-webkit-scrollbar` rules. Firefox falls back to default; that's fine.
- **Focus rings** for inputs: `box-shadow: 0 0 0 3px var(--accent-soft)` — applied via global selector for `input[type="number"]:focus`, `input[type="text"]:focus`, and `select:focus`.
- **Drawer width** is 360px, slides with `--ease` over 320ms. If you change width, also check that long font names in the font picker still wrap nicely.
- **Range slider thumbs** are styled (custom round accent thumbs). The styles are duplicated for `-webkit-slider-thumb` and `-moz-range-thumb` — both required.

## localStorage keys

| Key | Owner | Contents |
|---|---|---|
| `mytimes.clock.settings`     | clock     | wallpaper, font, color, size, glow, hour24, showSeconds, showDate, spacing |
| `mytimes.stopwatch.settings` | stopwatch | wallpaper, font, color, size, spacing |
| `mytimes.timer.settings`     | timer     | wallpaper, font, color, size, spacing, volume |
| `mytimes.alarm.settings`     | alarm     | wallpaper, font, color, size, spacing, volume |
| `mytimes.alarm.alarms`       | alarm     | Array of `{id, time, label, days, enabled, lastFiredKey}` |
| `mytimes.focus.settings`     | focus     | + studyMin, shortBreakMin, longBreakMin, cyclesPerSet, autoStart |
| `mytimes.world.settings`     | world     | + hour24, showSeconds |
| `mytimes.world.cities`       | world     | Array of `{name, tz}` (IANA timezone IDs) |

## Gotchas

- **AudioContext requires a user gesture.** First `TT.beep()` only succeeds after the user has clicked something on the page. If you walk away before clicking anything, alarm sounds may fail silently.
- **`tabular-nums` doesn't fix every font.** Some fonts (Audiowide, Bebas Neue) lack tabular figures. The Clock view ended up using natural typography + a user-controlled letter-spacing slider after several iterations of trying to lock digit positions.
- **World Clock card sizing.** Time font scales as `min(--wc-size, 18cqw)` (container query) — bumping `--wc-size` also enlarges card min-width via `grid-template-columns` calc. Touching one without the other breaks layout.
- **Alarm time sizing — non-obvious pattern.** `.al-content` is a `container-type: inline-size` container. The font size on `.al-now` is `min(var(--al-size, 6vw), 16cqw)`, and `--al-size` is set as a CSS variable on `.al-content` (NOT as inline `font-size` on `.al-now`). This caps the time at the container width even when the user cranks the size slider. If you set `nowEl.style.fontSize` directly, you'll bypass the cap and the time will overflow the frame.
- **Alarm top padding.** `.al-content` has `padding-top: 56px` to clear the FAB row in the top-right. Without it, the time slides under the buttons at large sizes.
- **Focus phase transitions** call `nextPhase()` from inside the rAF loop. If you change the loop, make sure rAF is cancelled before `nextPhase()` reschedules.
- **Custom wallpaper images** are stored as base64 data URLs in localStorage (Clock only). Capped at 2 MB to avoid blowing the localStorage quota.

## Responsive behavior

All responsive rules live in **one section at the bottom of `styles.css`** under "Responsive — Tablet & Mobile". Three breakpoints:

| Width | Layout |
|---|---|
| **>1024px** (desktop, iPad landscape) | Original sidebar layout, unchanged |
| **641–1024px** (iPad portrait, small tablet) | Sidebar narrows to 190px; drawer clamped to `min(360px, 86vw)`; view padding 32→24px |
| **≤640px** (phone) | Sidebar becomes a **bottom tab bar** (CSS-only via grid + flex direction swap on `.sidebar` / `.nav`); drawer is full-width; clock/stopwatch/timer/focus displays use `clamp(px, vw, vh)` so they stay readable on phones and don't overflow in landscape; wallpaper grid drops to 3 cols; `100dvh` on `.app` to avoid mobile Safari URL-bar jumps |
| **≤900w × ≤480h landscape** | Extra-tight vertical spacing pass for phone-landscape |

**Important when editing views for mobile:**
- The active-state left-bar indicator (`.nav-item::before`) is rotated to a **top-bar** on phone. Don't restructure `.nav-item` markup or you'll break it.
- On phone, the sidebar's `display: none` is still used by `body.fullscreen-mode`; that hides the bottom tab bar too — no extra rule needed.
- View JS never measures viewport; layout is entirely CSS-driven. Keep it that way.
- When adding a new view: also add a mobile-padding override under the `@media (max-width: 640px)` block if the default 32px padding is too wide for phone.

## Adding a new view

1. Pick a 2-letter prefix (e.g. `xy`)
2. Create `js/<view>.js` with `window.mount<ViewName>(root)`
3. Add `<script src="js/<view>.js"></script>` to `index.html` (after shared.js, before app.js)
4. Add a `<button class="nav-item" data-view="<view>">` to the sidebar in `index.html`
5. Add the view to the `views` registry in `app.js`
6. Add `.<prefix>-view` styles in `styles.css`. Use the design tokens (`--ease`, `--r`, `--shadow-*`, etc.)
7. Use `TT.*` for wallpaper/fonts/fullscreen/beep — don't duplicate
8. Use the `.sw-btn` button system for action buttons
