const TM_STORAGE_KEY = 'mytimes.timer.settings';

const TM_DEFAULTS = {
  wallpaper: { kind: 'preset', value: 'ember' },
  blur: 0,
  font: 'Orbitron',
  color: '#ffffff',
  size: 14,
  spacing: 0.04,
  volume: 0.5,
};

window.mountTimer = function mountTimer(root) {
  const state = {
    status: 'setup',
    durationMs: 0,
    remainingMs: 0,
    endTime: 0,
  };
  let settings = TT.load(TM_STORAGE_KEY, TM_DEFAULTS);
  let alarmInterval = null;

  root.innerHTML = `
    <div class="tm-view">
      <div class="wallpaper" id="tmWp"></div>
      <div class="tm-content">
        <div class="tm-display" id="tmTime">00:00:00</div>

        <div class="tm-setup" id="tmSetup">
          <div class="tm-input-row">
            <div class="tm-input-group">
              <input type="number" id="tmHr" min="0" max="99" value="0" />
              <label>Hours</label>
            </div>
            <span class="tm-input-sep">:</span>
            <div class="tm-input-group">
              <input type="number" id="tmMin" min="0" max="59" value="0" />
              <label>Minutes</label>
            </div>
            <span class="tm-input-sep">:</span>
            <div class="tm-input-group">
              <input type="number" id="tmSec" min="0" max="59" value="0" />
              <label>Seconds</label>
            </div>
          </div>
          <div class="tm-quick">
            <button class="tm-chip" data-add="30">+30s</button>
            <button class="tm-chip" data-add="60">+1m</button>
            <button class="tm-chip" data-add="300">+5m</button>
            <button class="tm-chip" data-add="600">+10m</button>
            <button class="tm-chip tm-chip-clear" id="tmClear">Clear</button>
          </div>
        </div>

        <div class="tm-controls">
          <button class="sw-btn sw-secondary" id="tmReset" disabled>Reset</button>
          <button class="sw-btn sw-primary" id="tmStart" disabled>Start</button>
          <button class="sw-btn sw-primary sw-stop" id="tmDismiss" style="display:none;">Dismiss</button>
        </div>
      </div>

      <div class="fab-row">
        <button class="fab" id="tmFsBtn" title="Fullscreen">⛶</button>
        <button class="fab" id="tmSetBtn" title="Settings">⚙</button>
      </div>

      <div class="drawer" id="tmDrawer">
        <div class="drawer-head">
          <h2>Timer Settings</h2>
          <button class="drawer-close" id="tmDrawerClose">×</button>
        </div>
        <div class="drawer-body">

          <div class="section">
            <h3>Wallpaper</h3>
            <div class="wp-grid" id="tmWpGrid"></div>
            <div class="row" style="margin-top:12px;">
              <label>Blur</label>
              <input type="range" id="tmBlur" min="0" max="20" step="1" />
            </div>
          </div>

          <div class="section">
            <h3>Font</h3>
            <div class="font-grid" id="tmFontGrid"></div>
          </div>

          <div class="section">
            <h3>Display</h3>
            <div class="row">
              <label>Color</label>
              <input type="color" id="tmColor" />
            </div>
            <div class="row">
              <label>Size</label>
              <input type="range" id="tmSize" min="6" max="22" step="1" />
            </div>
            <div class="row">
              <label>Spacing</label>
              <input type="range" id="tmSpacing" min="-0.05" max="0.4" step="0.01" />
            </div>
          </div>

          <div class="section">
            <h3>Alarm</h3>
            <div class="row">
              <label>Volume</label>
              <input type="range" id="tmVolume" min="0" max="1" step="0.05" />
            </div>
          </div>

        </div>
      </div>
    </div>
  `;

  const $ = (id) => root.querySelector('#' + id);
  const wpEl = $('tmWp');
  const timeEl = $('tmTime');
  const setupEl = $('tmSetup');
  const startBtn = $('tmStart');
  const resetBtn = $('tmReset');
  const dismissBtn = $('tmDismiss');
  const drawer = $('tmDrawer');
  const wpGrid = $('tmWpGrid');
  const fontGrid = $('tmFontGrid');
  const hrIn = $('tmHr'), minIn = $('tmMin'), secIn = $('tmSec');

  TT.buildWallpaperGrid(wpGrid, (id) => {
    settings.wallpaper = { kind: 'preset', value: id };
    applySettings();
  });
  TT.buildFontGrid(fontGrid, (id) => {
    settings.font = id;
    applySettings();
  });

  $('tmSetBtn').addEventListener('click', () => drawer.classList.add('open'));
  $('tmDrawerClose').addEventListener('click', () => drawer.classList.remove('open'));

  const cleanupFs = TT.setupFullscreen($('tmFsBtn'));

  $('tmBlur').addEventListener('input',    (e) => { settings.blur = +e.target.value; applySettings(); });
  $('tmColor').addEventListener('input',   (e) => { settings.color = e.target.value; applySettings(); });
  $('tmSize').addEventListener('input',    (e) => { settings.size = +e.target.value; applySettings(); });
  $('tmSpacing').addEventListener('input', (e) => { settings.spacing = +e.target.value; applySettings(); });
  $('tmVolume').addEventListener('input',  (e) => { settings.volume = +e.target.value; applySettings(); });

  function applyControls() {
    TT.syncWallpaperGrid(wpGrid, settings.wallpaper);
    TT.syncFontGrid(fontGrid, settings.font);
    $('tmBlur').value    = settings.blur;
    $('tmColor').value   = settings.color;
    $('tmSize').value    = settings.size;
    $('tmSpacing').value = settings.spacing;
    $('tmVolume').value  = settings.volume;
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
    TT.save(TM_STORAGE_KEY, settings);
  }

  // ----- Timer behavior -----
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  function format(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  function readInputs() {
    const h = Math.max(0, Math.min(99, +hrIn.value || 0));
    const m = Math.max(0, Math.min(59, +minIn.value || 0));
    const s = Math.max(0, Math.min(59, +secIn.value || 0));
    return (h * 3600 + m * 60 + s) * 1000;
  }
  function writeInputs(ms) {
    const total = Math.floor(ms / 1000);
    hrIn.value  = Math.floor(total / 3600);
    minIn.value = Math.floor((total % 3600) / 60);
    secIn.value = total % 60;
  }

  function render() {
    let ms;
    if (state.status === 'running') {
      ms = state.endTime - performance.now();
      if (ms <= 0) { ms = 0; finish(); }
    } else {
      ms = state.remainingMs;
    }
    timeEl.textContent = format(ms);
  }

  function updateUI() {
    const inSetup = state.status === 'setup';
    const isRunning = state.status === 'running';
    const isPaused = state.status === 'paused';
    const isDone = state.status === 'done';

    setupEl.style.visibility = (inSetup || isPaused) ? 'visible' : 'hidden';
    setupEl.style.pointerEvents = inSetup ? '' : 'none';
    [hrIn, minIn, secIn].forEach((i) => i.disabled = !inSetup);
    setupEl.querySelectorAll('.tm-chip').forEach((b) => b.disabled = !inSetup);

    startBtn.style.display = isDone ? 'none' : '';
    dismissBtn.style.display = isDone ? '' : 'none';

    if (isRunning) { startBtn.textContent = 'Pause'; startBtn.classList.add('sw-stop'); }
    else if (isPaused) { startBtn.textContent = 'Resume'; startBtn.classList.remove('sw-stop'); }
    else { startBtn.textContent = 'Start'; startBtn.classList.remove('sw-stop'); }

    startBtn.disabled = inSetup && state.durationMs === 0;
    resetBtn.disabled = inSetup && state.durationMs === 0;

    timeEl.classList.toggle('tm-blink', isDone);
  }

  function syncFromInputs() {
    state.durationMs = readInputs();
    state.remainingMs = state.durationMs;
    render();
    updateUI();
  }

  let rafId = null;
  function rafLoop() {
    if (state.status !== 'running') return;
    render();
    rafId = requestAnimationFrame(rafLoop);
  }

  function start() {
    if (state.status === 'setup') {
      if (state.durationMs === 0) return;
      state.remainingMs = state.durationMs;
    }
    state.status = 'running';
    state.endTime = performance.now() + state.remainingMs;
    updateUI();
    rafLoop();
  }
  function pause() {
    if (state.status !== 'running') return;
    state.remainingMs = Math.max(0, state.endTime - performance.now());
    state.status = 'paused';
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    render();
    updateUI();
  }
  function reset() {
    state.status = 'setup';
    state.remainingMs = state.durationMs;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    stopAlarm();
    writeInputs(state.durationMs);
    render();
    updateUI();
  }
  function finish() {
    state.status = 'done';
    state.remainingMs = 0;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    startAlarm();
    updateUI();
  }
  function dismiss() {
    stopAlarm();
    reset();
  }

  function startAlarm() {
    TT.beep(settings.volume);
    alarmInterval = setInterval(() => TT.beep(settings.volume), 700);
  }
  function stopAlarm() {
    if (alarmInterval) { clearInterval(alarmInterval); alarmInterval = null; }
  }

  // Wire up inputs and buttons
  [hrIn, minIn, secIn].forEach((i) => i.addEventListener('input', syncFromInputs));
  setupEl.querySelectorAll('.tm-chip[data-add]').forEach((b) => {
    b.addEventListener('click', () => {
      const add = +b.dataset.add * 1000;
      state.durationMs = Math.min(99 * 3600 * 1000 + 59 * 60 * 1000 + 59 * 1000, state.durationMs + add);
      writeInputs(state.durationMs);
      state.remainingMs = state.durationMs;
      render();
      updateUI();
    });
  });
  $('tmClear').addEventListener('click', () => {
    state.durationMs = 0;
    state.remainingMs = 0;
    writeInputs(0);
    render();
    updateUI();
  });

  startBtn.addEventListener('click', () => {
    if (state.status === 'running') pause();
    else start();
  });
  resetBtn.addEventListener('click', reset);
  dismissBtn.addEventListener('click', dismiss);

  applySettings();
  syncFromInputs();

  return () => {
    if (rafId) cancelAnimationFrame(rafId);
    stopAlarm();
    cleanupFs();
  };
};
