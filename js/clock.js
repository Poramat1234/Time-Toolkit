const STORAGE_KEY = 'mytimes.clock.settings';

const DEFAULTS = {
  wallpaper: { kind: 'preset', value: 'midnight' },
  blur: 0,
  font: 'Orbitron',
  hour24: false,
  showSeconds: true,
  showDate: true,
  color: '#ffffff',
  size: 12,
  glow: 0,
  spacing: 0.04,
};

function formatTime(d, settings) {
  let h = d.getHours();
  const m = d.getMinutes();
  const s = d.getSeconds();
  let suffix = '';
  if (!settings.hour24) {
    suffix = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
  }
  const pad = (n) => String(n).padStart(2, '0');
  const base = settings.showSeconds
    ? `${pad(h)}:${pad(m)}:${pad(s)}`
    : `${pad(h)}:${pad(m)}`;
  return { base, suffix };
}

function renderTimeHTML(base, suffix) {
  let html = base;
  if (suffix) html += `<span class="t-suffix">${suffix}</span>`;
  return html;
}

function formatDate(d) {
  return d.toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

window.mountClock = function mountClock(root) {
  let settings = TT.load(STORAGE_KEY, DEFAULTS);

  root.innerHTML = `
    <div class="clock-view">
      <div class="wallpaper" id="wp"></div>
      <div class="clock-content">
        <div class="clock-time" id="time">--:--</div>
        <div class="clock-date" id="date"></div>
      </div>
      <div class="fab-row">
        <button class="fab" id="fullscreenBtn" title="Fullscreen">⛶</button>
        <button class="fab" id="settingsBtn" title="Settings">⚙</button>
      </div>

      <div class="drawer" id="drawer">
        <div class="drawer-head">
          <h2>Clock Settings</h2>
          <button class="drawer-close" id="drawerClose">×</button>
        </div>
        <div class="drawer-body">

          <div class="section">
            <h3>Wallpaper</h3>
            <div class="wp-grid" id="wpGrid"></div>
            <div class="upload-row">
              <button class="btn" id="uploadBtn">Upload image</button>
              <button class="btn danger" id="resetWpBtn">Reset</button>
            </div>
            <input type="file" id="uploadInput" accept="image/*" style="display:none" />
            <div class="row" style="margin-top:12px;">
              <label>Blur</label>
              <input type="range" id="blur" min="0" max="20" step="1" />
            </div>
          </div>

          <div class="section">
            <h3>Font</h3>
            <div class="font-grid" id="fontGrid"></div>
          </div>

          <div class="section">
            <h3>Display</h3>
            <div class="row">
              <label>24-hour</label>
              <div class="switch" id="sw24"></div>
            </div>
            <div class="row">
              <label>Show seconds</label>
              <div class="switch" id="swSec"></div>
            </div>
            <div class="row">
              <label>Show date</label>
              <div class="switch" id="swDate"></div>
            </div>
            <div class="row">
              <label>Color</label>
              <input type="color" id="color" />
            </div>
            <div class="row">
              <label>Size</label>
              <input type="range" id="size" min="6" max="22" step="1" />
            </div>
            <div class="row">
              <label>Glow</label>
              <input type="range" id="glow" min="0" max="40" step="1" />
            </div>
            <div class="row">
              <label>Spacing</label>
              <input type="range" id="spacing" min="-0.05" max="0.4" step="0.01" />
            </div>
          </div>

        </div>
      </div>
    </div>
  `;

  const $ = (id) => root.querySelector('#' + id);
  const wpEl = $('wp'), timeEl = $('time'), dateEl = $('date');
  const drawer = $('drawer');
  const wpGrid = $('wpGrid'), fontGrid = $('fontGrid');

  TT.buildWallpaperGrid(wpGrid, (id) => {
    settings.wallpaper = { kind: 'preset', value: id };
    applyAll();
  });
  TT.buildFontGrid(fontGrid, (id) => {
    settings.font = id;
    applyAll();
  });

  $('settingsBtn').addEventListener('click', () => drawer.classList.add('open'));
  $('drawerClose').addEventListener('click', () => drawer.classList.remove('open'));

  const cleanupFs = TT.setupFullscreen($('fullscreenBtn'));

  $('uploadBtn').addEventListener('click', () => $('uploadInput').click());
  $('uploadInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Image too large. Please use one under 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      settings.wallpaper = { kind: 'custom', value: reader.result };
      applyAll();
    };
    reader.readAsDataURL(file);
  });
  $('resetWpBtn').addEventListener('click', () => {
    settings.wallpaper = { ...DEFAULTS.wallpaper };
    applyAll();
  });

  $('blur').addEventListener('input',    (e) => { settings.blur = +e.target.value; applyAll(); });
  $('size').addEventListener('input',    (e) => { settings.size = +e.target.value; applyAll(); });
  $('glow').addEventListener('input',    (e) => { settings.glow = +e.target.value; applyAll(); });
  $('color').addEventListener('input',   (e) => { settings.color = e.target.value; applyAll(); });
  $('spacing').addEventListener('input', (e) => { settings.spacing = +e.target.value; applyAll(); });

  const bindSwitch = (el, key) => {
    el.addEventListener('click', () => { settings[key] = !settings[key]; applyAll(); });
  };
  bindSwitch($('sw24'),   'hour24');
  bindSwitch($('swSec'),  'showSeconds');
  bindSwitch($('swDate'), 'showDate');

  function applyControls() {
    TT.syncWallpaperGrid(wpGrid, settings.wallpaper);
    TT.syncFontGrid(fontGrid, settings.font);
    $('blur').value    = settings.blur;
    $('size').value    = settings.size;
    $('glow').value    = settings.glow;
    $('color').value   = settings.color;
    $('spacing').value = settings.spacing;
    $('sw24').classList.toggle('on',   settings.hour24);
    $('swSec').classList.toggle('on',  settings.showSeconds);
    $('swDate').classList.toggle('on', settings.showDate);
  }

  function applyClockFace() {
    timeEl.style.fontFamily = `'${settings.font}', sans-serif`;
    timeEl.style.color = settings.color;
    timeEl.style.fontSize = `${settings.size}vw`;
    timeEl.style.letterSpacing = `${settings.spacing}em`;
    timeEl.style.textShadow = settings.glow > 0
      ? `0 0 ${settings.glow}px ${settings.color}`
      : 'none';
    dateEl.style.display = settings.showDate ? '' : 'none';
    dateEl.style.color = settings.color;
  }

  function applyAll() {
    TT.applyWallpaper(wpEl, settings.wallpaper, settings.blur);
    applyControls();
    applyClockFace();
    TT.save(STORAGE_KEY, settings);
  }

  function tick() {
    const now = new Date();
    const { base, suffix } = formatTime(now, settings);
    timeEl.innerHTML = renderTimeHTML(base, suffix);
    if (settings.showDate) dateEl.textContent = formatDate(now);
  }

  applyAll();
  tick();
  const intervalId = setInterval(tick, 1000);

  return () => {
    clearInterval(intervalId);
    cleanupFs();
  };
};
