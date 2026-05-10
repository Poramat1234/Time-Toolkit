const FC_STORAGE_KEY = 'timeToolkit.focus.settings';

const FC_DEFAULTS = {
  wallpaper: { kind: 'preset', value: 'forest' },
  blur: 0,
  font: 'Orbitron',
  color: '#ffffff',
  size: 14,
  spacing: 0.04,
  volume: 0.5,
  studyMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  cyclesPerSet: 4,
  autoStart: true,
};

const PHASE_LABELS = {
  idle:        'Ready',
  study:       'Study',
  short_break: 'Short Break',
  long_break:  'Long Break',
};

window.mountFocus = function mountFocus(root) {
  let settings = TT.load(FC_STORAGE_KEY, FC_DEFAULTS);

  const state = {
    phase: 'idle',
    cycleNum: 1,
    endTime: 0,
    remainingMs: 0,
    running: false,
  };

  root.innerHTML = `
    <div class="fc-view">
      <div class="wallpaper" id="fcWp"></div>
      <div class="fc-content">
        <div class="fc-meta">
          <div class="fc-phase" id="fcPhase">Ready</div>
          <div class="fc-cycles" id="fcCycles"></div>
        </div>
        <div class="fc-display" id="fcTime">25:00</div>
        <div class="fc-controls">
          <button class="sw-btn sw-secondary" id="fcResetBtn">Reset</button>
          <button class="sw-btn sw-primary" id="fcStartBtn">Start</button>
          <button class="sw-btn sw-secondary" id="fcSkipBtn" disabled>Skip phase</button>
        </div>

        <div class="fc-config">
          <div class="fc-config-row">
            <label>Study</label>
            <input type="number" id="fcStudy" min="1" max="180" />
            <span>min</span>
          </div>
          <div class="fc-config-row">
            <label>Short break</label>
            <input type="number" id="fcShort" min="1" max="60" />
            <span>min</span>
          </div>
          <div class="fc-config-row">
            <label>Long break</label>
            <input type="number" id="fcLong" min="1" max="120" />
            <span>min</span>
          </div>
          <div class="fc-config-row">
            <label>Cycles per set</label>
            <input type="number" id="fcCycCount" min="1" max="12" />
          </div>
          <div class="fc-config-row">
            <label>Auto-start next phase</label>
            <div class="switch" id="fcAuto"></div>
          </div>
        </div>
      </div>

      <div class="fab-row">
        <button class="fab" id="fcFsBtn" title="Fullscreen">⛶</button>
        <button class="fab" id="fcSetBtn" title="Settings">⚙</button>
      </div>

      <div class="drawer" id="fcDrawer">
        <div class="drawer-head">
          <h2>Focus Settings</h2>
          <button class="drawer-close" id="fcDrawerClose">×</button>
        </div>
        <div class="drawer-body">
          <div class="section">
            <h3>Wallpaper</h3>
            <div class="wp-grid" id="fcWpGrid"></div>
            <div class="row" style="margin-top:12px;">
              <label>Blur</label>
              <input type="range" id="fcBlur" min="0" max="20" step="1" />
            </div>
          </div>
          <div class="section">
            <h3>Font</h3>
            <div class="font-grid" id="fcFontGrid"></div>
          </div>
          <div class="section">
            <h3>Display</h3>
            <div class="row">
              <label>Color</label>
              <input type="color" id="fcColor" />
            </div>
            <div class="row">
              <label>Size</label>
              <input type="range" id="fcSize" min="6" max="22" step="1" />
            </div>
            <div class="row">
              <label>Spacing</label>
              <input type="range" id="fcSpacing" min="-0.05" max="0.4" step="0.01" />
            </div>
          </div>
          <div class="section">
            <h3>Sound</h3>
            <div class="row">
              <label>Volume</label>
              <input type="range" id="fcVolume" min="0" max="1" step="0.05" />
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const $ = (id) => root.querySelector('#' + id);
  const wpEl = $('fcWp');
  const phaseEl = $('fcPhase');
  const cyclesEl = $('fcCycles');
  const timeEl = $('fcTime');
  const startBtn = $('fcStartBtn');
  const resetBtn = $('fcResetBtn');
  const skipBtn = $('fcSkipBtn');
  const drawer = $('fcDrawer');
  const wpGrid = $('fcWpGrid');
  const fontGrid = $('fcFontGrid');
  const view = root.querySelector('.fc-view');

  TT.buildWallpaperGrid(wpGrid, (id) => {
    settings.wallpaper = { kind: 'preset', value: id };
    applySettings();
  });
  TT.buildFontGrid(fontGrid, (id) => {
    settings.font = id;
    applySettings();
  });

  $('fcSetBtn').addEventListener('click', () => drawer.classList.add('open'));
  $('fcDrawerClose').addEventListener('click', () => drawer.classList.remove('open'));

  const cleanupFs = TT.setupFullscreen($('fcFsBtn'));

  $('fcBlur').addEventListener('input',    (e) => { settings.blur = +e.target.value; applySettings(); });
  $('fcColor').addEventListener('input',   (e) => { settings.color = e.target.value; applySettings(); });
  $('fcSize').addEventListener('input',    (e) => { settings.size = +e.target.value; applySettings(); });
  $('fcSpacing').addEventListener('input', (e) => { settings.spacing = +e.target.value; applySettings(); });
  $('fcVolume').addEventListener('input',  (e) => { settings.volume = +e.target.value; applySettings(); });

  $('fcStudy').addEventListener('change',    (e) => { settings.studyMin = clampInt(e.target.value, 1, 180, 25); commitConfig(); });
  $('fcShort').addEventListener('change',    (e) => { settings.shortBreakMin = clampInt(e.target.value, 1, 60, 5); commitConfig(); });
  $('fcLong').addEventListener('change',     (e) => { settings.longBreakMin = clampInt(e.target.value, 1, 120, 15); commitConfig(); });
  $('fcCycCount').addEventListener('change', (e) => { settings.cyclesPerSet = clampInt(e.target.value, 1, 12, 4); commitConfig(); });
  $('fcAuto').addEventListener('click',      ()  => { settings.autoStart = !settings.autoStart; applySettings(); });

  function clampInt(v, lo, hi, fallback) {
    const n = parseInt(v, 10);
    if (Number.isNaN(n)) return fallback;
    return Math.max(lo, Math.min(hi, n));
  }
  function commitConfig() {
    TT.save(FC_STORAGE_KEY, settings);
    if (state.phase === 'idle') {
      state.remainingMs = settings.studyMin * 60 * 1000;
      render();
    }
    syncConfigInputs();
    renderCyclesIndicator();
  }
  function syncConfigInputs() {
    $('fcStudy').value    = settings.studyMin;
    $('fcShort').value    = settings.shortBreakMin;
    $('fcLong').value     = settings.longBreakMin;
    $('fcCycCount').value = settings.cyclesPerSet;
    $('fcAuto').classList.toggle('on', settings.autoStart);
  }

  function applyControls() {
    TT.syncWallpaperGrid(wpGrid, settings.wallpaper);
    TT.syncFontGrid(fontGrid, settings.font);
    $('fcBlur').value    = settings.blur;
    $('fcColor').value   = settings.color;
    $('fcSize').value    = settings.size;
    $('fcSpacing').value = settings.spacing;
    $('fcVolume').value  = settings.volume;
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
    syncConfigInputs();
    TT.save(FC_STORAGE_KEY, settings);
  }

  // ----- Phase / time logic -----
  const pad = (n) => String(n).padStart(2, '0');
  function format(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${pad(m)}:${pad(s)}`;
  }

  function phaseDurationMs(phase) {
    switch (phase) {
      case 'study':       return settings.studyMin * 60 * 1000;
      case 'short_break': return settings.shortBreakMin * 60 * 1000;
      case 'long_break':  return settings.longBreakMin * 60 * 1000;
      default:            return settings.studyMin * 60 * 1000;
    }
  }

  function nextPhase() {
    if (state.phase === 'study') {
      if (state.cycleNum >= settings.cyclesPerSet) {
        state.phase = 'long_break';
      } else {
        state.phase = 'short_break';
      }
    } else if (state.phase === 'short_break') {
      state.phase = 'study';
      state.cycleNum++;
    } else if (state.phase === 'long_break') {
      state.phase = 'study';
      state.cycleNum = 1;
    }
    state.remainingMs = phaseDurationMs(state.phase);
    state.endTime = performance.now() + state.remainingMs;
    notifyPhaseStart();
    if (settings.autoStart) {
      state.running = true;
      rafLoop();
    } else {
      state.running = false;
    }
    updateUI();
  }

  function render() {
    let ms;
    if (state.running) {
      ms = state.endTime - performance.now();
      if (ms <= 0) {
        ms = 0;
        timeEl.textContent = format(0);
        nextPhase();
        return;
      }
    } else {
      ms = state.remainingMs;
    }
    timeEl.textContent = format(ms);
  }

  function renderCyclesIndicator() {
    const dots = [];
    for (let i = 1; i <= settings.cyclesPerSet; i++) {
      const filled = (state.phase === 'long_break') ? true : (i < state.cycleNum);
      dots.push(`<span class="fc-dot${filled ? ' fc-dot-on' : ''}"></span>`);
    }
    cyclesEl.innerHTML = `<span class="fc-cycle-label">Cycle ${Math.min(state.cycleNum, settings.cyclesPerSet)} / ${settings.cyclesPerSet}</span>${dots.join('')}`;
  }

  function updateUI() {
    phaseEl.textContent = PHASE_LABELS[state.phase];
    phaseEl.className = `fc-phase fc-${state.phase}`;
    view.classList.remove('fc-view-study', 'fc-view-short_break', 'fc-view-long_break', 'fc-view-idle');
    view.classList.add(`fc-view-${state.phase}`);

    if (state.running) {
      startBtn.textContent = 'Pause';
      startBtn.classList.add('sw-stop');
    } else {
      startBtn.textContent = state.phase === 'idle' ? 'Start' : 'Resume';
      startBtn.classList.remove('sw-stop');
    }
    skipBtn.disabled = state.phase === 'idle';
    renderCyclesIndicator();
    render();
  }

  let rafId = null;
  function rafLoop() {
    if (!state.running) return;
    render();
    rafId = requestAnimationFrame(rafLoop);
  }

  function start() {
    if (state.phase === 'idle') {
      state.phase = 'study';
      state.cycleNum = 1;
      state.remainingMs = phaseDurationMs('study');
    }
    state.endTime = performance.now() + state.remainingMs;
    state.running = true;
    rafLoop();
    updateUI();
  }
  function pause() {
    if (!state.running) return;
    state.remainingMs = Math.max(0, state.endTime - performance.now());
    state.running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    render();
    updateUI();
  }
  function reset() {
    state.phase = 'idle';
    state.cycleNum = 1;
    state.running = false;
    state.remainingMs = phaseDurationMs('study');
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    updateUI();
  }
  function skip() {
    if (state.phase === 'idle') return;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    nextPhase();
  }

  startBtn.addEventListener('click', () => (state.running ? pause() : start()));
  resetBtn.addEventListener('click', reset);
  skipBtn.addEventListener('click', skip);

  function notifyPhaseStart() {
    if (state.phase === 'study') {
      TT.beep(settings.volume, 880, 0.15);
      setTimeout(() => TT.beep(settings.volume, 1100, 0.25), 180);
    } else {
      TT.beep(settings.volume, 660, 0.15);
      setTimeout(() => TT.beep(settings.volume, 440, 0.3), 180);
    }
  }

  applySettings();
  state.remainingMs = phaseDurationMs('study');
  updateUI();

  return () => {
    if (rafId) cancelAnimationFrame(rafId);
    cleanupFs();
  };
};
