# Time Toolkit — project map

A single-page web app with 6 time-related views. Plain HTML/CSS/JS, no build step, no dependencies. Open `index.html` directly in a browser.

## File layout

```
time-toolkit/
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

## CSS conventions

- View root classes are prefixed by view: `.clock-view`, `.sw-view`, `.tm-view`, `.al-view`, `.fc-view`, `.wc-view`
- Generic shared classes (used across views): `.wallpaper`, `.fab-row`, `.fab`, `.drawer`, `.drawer-head`, `.drawer-body`, `.section`, `.row`, `.wp-grid`, `.wp-tile`, `.font-grid`, `.font-tile`, `.switch`, `.btn`, `.sw-btn`, `.sw-primary`, `.sw-secondary`, `.sw-stop`
- Wallpaper preset classes: `.wp-midnight`, `.wp-sunset`, `.wp-ocean`, `.wp-forest`, `.wp-aurora`, `.wp-mono`, `.wp-lavender`, `.wp-ember`
- Fullscreen mode: `body.fullscreen-mode` hides sidebar (set by `TT.setupFullscreen`)

## localStorage keys

| Key | Owner | Contents |
|---|---|---|
| `timeToolkit.clock.settings`     | clock     | wallpaper, font, color, size, glow, hour24, showSeconds, showDate, spacing |
| `timeToolkit.stopwatch.settings` | stopwatch | wallpaper, font, color, size, spacing |
| `timeToolkit.timer.settings`     | timer     | wallpaper, font, color, size, spacing, volume |
| `timeToolkit.alarm.settings`     | alarm     | wallpaper, font, color, size, spacing, volume |
| `timeToolkit.alarm.alarms`       | alarm     | Array of `{id, time, label, days, enabled, lastFiredKey}` |
| `timeToolkit.focus.settings`     | focus     | + studyMin, shortBreakMin, longBreakMin, cyclesPerSet, autoStart |
| `timeToolkit.world.settings`     | world     | + hour24, showSeconds |
| `timeToolkit.world.cities`       | world     | Array of `{name, tz}` (IANA timezone IDs) |

## Gotchas

- **AudioContext requires a user gesture.** First `TT.beep()` only succeeds after the user has clicked something on the page. If you walk away before clicking anything, alarm sounds may fail silently.
- **`tabular-nums` doesn't fix every font.** Some fonts (Audiowide, Bebas Neue) lack tabular figures. The Clock view ended up using natural typography + a user-controlled letter-spacing slider after several iterations of trying to lock digit positions.
- **World Clock card sizing.** Time font scales as `min(--wc-size, 18cqw)` (container query) — bumping `--wc-size` also enlarges card min-width via `grid-template-columns` calc. Touching one without the other breaks layout.
- **Focus phase transitions** call `nextPhase()` from inside the rAF loop. If you change the loop, make sure rAF is cancelled before `nextPhase()` reschedules.
- **Custom wallpaper images** are stored as base64 data URLs in localStorage (Clock only). Capped at 2 MB to avoid blowing the localStorage quota.

## Adding a new view

1. Pick a 2-letter prefix (e.g. `xy`)
2. Create `js/<view>.js` with `window.mount<ViewName>(root)`
3. Add `<script src="js/<view>.js"></script>` to `index.html` (after shared.js, before app.js)
4. Add a `<button class="nav-item" data-view="<view>">` to the sidebar in `index.html`
5. Add the view to the `views` registry in `app.js`
6. Add `.<prefix>-view` styles in `styles.css`
7. Use `TT.*` for wallpaper/fonts/fullscreen/beep — don't duplicate
