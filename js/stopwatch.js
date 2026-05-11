const SW_STORAGE_KEY = 'mytimes.stopwatch.settings';

const SW_DEFAULTS = {
  wallpaper: { kind: 'preset', value: 'mono' },
  blur: 0,
  font: 'Space Mono',
  color: '#ffffff',
  size: 14,
  spacing: 0.04,
};

window.mountStopwatch = function mountStopwatch(root) {
  const state = {
    running: false,
    startTime: 0,
    accumulated: 0,
    laps: [],
  };
  let settings = TT.load(SW_STORAGE_KEY, SW_DEFAULTS);

  root.innerHTML = `
    <div class="sw-view">
      <div class="wallpaper" id="swWp"></div>
      <div class="sw-content">
        <div class="sw-display" id="swTime">00:00.00</div>
        <div class="sw-controls">
          <button class="sw-btn sw-secondary" id="swLap" disabled>Lap</button>
          <button class="sw-btn sw-primary" id="swStart">Start</button>
          <button class="sw-btn sw-secondary" id="swReset" disabled>Reset</button>
        </div>
        <div class="sw-laps" id="swLaps">
          <div class="sw-laps-empty">No laps yet</div>
        </div>
      </div>

      <div class="fab-row">
        <button class="fab" id="swFsBtn" title="Fullscreen">⛶</button>
        <button class="fab" id="swSetBtn" title="Settings">⚙</button>
      </div>

      <div class="drawer" id="swDrawer">
        <div class="drawer-head">
          <h2>Stopwatch Settings</h2>
          <button class="drawer-close" id="swDrawerClose">×</button>
        </div>
        <div class="drawer-body">

          <div class="section">
            <h3>Wallpaper</h3>
            <div class="wp-grid" id="swWpGrid"></div>
            <div class="row" style="margin-top:12px;">
              <label>Blur</label>
              <input type="range" id="swBlur" min="0" max="20" step="1" />
            </div>
          </div>

          <div class="section">
            <h3>Font</h3>
            <div class="font-grid" id="swFontGrid"></div>
          </div>

          <div class="section">
            <h3>Display</h3>
            <div class="row">
              <label>Color</label>
              <input type="color" id="swColor" />
            </div>
            <div class="row">
              <label>Size</label>
              <input type="range" id="swSize" min="6" max="22" step="1" />
            </div>
            <div class="row">
              <label>Spacing</label>
              <input type="range" id="swSpacing" min="-0.05" max="0.4" step="0.01" />
            </div>
          </div>

        </div>
      </div>
    </div>
  `;

  const $ = (id) => root.querySelector('#' + id);
  const wpEl = $('swWp');
  const timeEl = $('swTime');
  const lapsEl = $('swLaps');
  const startBtn = $('swStart');
  const lapBtn = $('swLap');
  const resetBtn = $('swReset');
  const drawer = $('swDrawer');
  const wpGrid = $('swWpGrid');
  const fontGrid = $('swFontGrid');

  TT.buildWallpaperGrid(wpGrid, (id) => {
    settings.wallpaper = { kind: 'preset', value: id };
    applySettings();
  });
  TT.buildFontGrid(fontGrid, (id) => {
    settings.font = id;
    applySettings();
  });

  $('swSetBtn').addEventListener('click', () => drawer.classList.add('open'));
  $('swDrawerClose').addEventListener('click', () => drawer.classList.remove('open'));

  const cleanupFs = TT.setupFullscreen($('swFsBtn'));

  $('swBlur').addEventListener('input',    (e) => { settings.blur = +e.target.value; applySettings(); });
  $('swColor').addEventListener('input',   (e) => { settings.color = e.target.value; applySettings(); });
  $('swSize').addEventListener('input',    (e) => { settings.size = +e.target.value; applySettings(); });
  $('swSpacing').addEventListener('input', (e) => { settings.spacing = +e.target.value; applySettings(); });

  function applyControls() {
    TT.syncWallpaperGrid(wpGrid, settings.wallpaper);
    TT.syncFontGrid(fontGrid, settings.font);
    $('swBlur').value    = settings.blur;
    $('swColor').value   = settings.color;
    $('swSize').value    = settings.size;
    $('swSpacing').value = settings.spacing;
  }

  function applyDisplay() {
    timeEl.style.fontFamily = `'${settings.font}', monospace`;
    timeEl.style.color = settings.color;
    timeEl.style.fontSize = `${settings.size}vw`;
    timeEl.style.letterSpacing = `${settings.spacing}em`;
  }

  function applySettings() {
    TT.applyWallpaper(wpEl, settings.wallpaper, settings.blur);
    applyControls();
    applyDisplay();
    TT.save(SW_STORAGE_KEY, settings);
  }

  // ----- Stopwatch behavior -----
  const pad = (n, w = 2) => String(n).padStart(w, '0');

  function format(ms) {
    const cs = Math.floor(ms / 10) % 100;
    const s = Math.floor(ms / 1000) % 60;
    const m = Math.floor(ms / 60000) % 60;
    const h = Math.floor(ms / 3600000);
    return h > 0
      ? `${pad(h)}:${pad(m)}:${pad(s)}.${pad(cs)}`
      : `${pad(m)}:${pad(s)}.${pad(cs)}`;
  }
  function elapsed() {
    return state.running
      ? state.accumulated + (performance.now() - state.startTime)
      : state.accumulated;
  }
  function render() { timeEl.textContent = format(elapsed()); }

  function updateButtons() {
    if (state.running) {
      startBtn.textContent = 'Stop';
      startBtn.classList.add('sw-stop');
    } else {
      startBtn.textContent = state.accumulated > 0 ? 'Resume' : 'Start';
      startBtn.classList.remove('sw-stop');
    }
    lapBtn.disabled = !state.running;
    resetBtn.disabled = state.running || state.accumulated === 0;
  }

  function renderLaps() {
    if (state.laps.length === 0) {
      lapsEl.innerHTML = '<div class="sw-laps-empty">No laps yet</div>';
      return;
    }
    const splits = state.laps.map((l) => l.split);
    const fastest = Math.min(...splits);
    const slowest = Math.max(...splits);
    const rows = state.laps.map((l, i) => {
      let cls = '';
      if (state.laps.length > 1 && l.split === fastest) cls = ' sw-fast';
      else if (state.laps.length > 1 && l.split === slowest) cls = ' sw-slow';
      return `
        <div class="sw-lap-row${cls}">
          <span class="sw-lap-num">Lap ${i + 1}</span>
          <span class="sw-lap-split">${format(l.split)}</span>
          <span class="sw-lap-total">${format(l.total)}</span>
        </div>
      `;
    }).reverse().join('');
    lapsEl.innerHTML = rows;
  }

  let rafId = null;
  function rafLoop() {
    if (!state.running) return;
    render();
    rafId = requestAnimationFrame(rafLoop);
  }

  function start() {
    state.running = true;
    state.startTime = performance.now();
    updateButtons();
    rafLoop();
  }
  function stop() {
    state.accumulated = elapsed();
    state.running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    render();
    updateButtons();
  }
  function reset() {
    state.running = false;
    state.startTime = 0;
    state.accumulated = 0;
    state.laps = [];
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    render();
    renderLaps();
    updateButtons();
  }
  function lap() {
    if (!state.running) return;
    const total = elapsed();
    const prev = state.laps.length > 0
      ? state.laps[state.laps.length - 1].total
      : 0;
    state.laps.push({ split: total - prev, total });
    renderLaps();
  }

  startBtn.addEventListener('click', () => (state.running ? stop() : start()));
  lapBtn.addEventListener('click', lap);
  resetBtn.addEventListener('click', reset);

  applySettings();
  render();
  renderLaps();
  updateButtons();

  return () => {
    if (rafId) cancelAnimationFrame(rafId);
    cleanupFs();
  };
};
