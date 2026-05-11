const WC_STORAGE_KEY = 'mytimes.world.settings';
const WC_CITIES_KEY = 'mytimes.world.cities';

const CITY_LIST = [
  { name: 'Bangkok',      tz: 'Asia/Bangkok' },
  { name: 'Tokyo',        tz: 'Asia/Tokyo' },
  { name: 'Seoul',        tz: 'Asia/Seoul' },
  { name: 'Shanghai',     tz: 'Asia/Shanghai' },
  { name: 'Hong Kong',    tz: 'Asia/Hong_Kong' },
  { name: 'Singapore',    tz: 'Asia/Singapore' },
  { name: 'Mumbai',       tz: 'Asia/Kolkata' },
  { name: 'Dubai',        tz: 'Asia/Dubai' },
  { name: 'Istanbul',     tz: 'Europe/Istanbul' },
  { name: 'Moscow',       tz: 'Europe/Moscow' },
  { name: 'Berlin',       tz: 'Europe/Berlin' },
  { name: 'Paris',        tz: 'Europe/Paris' },
  { name: 'London',       tz: 'Europe/London' },
  { name: 'Lisbon',       tz: 'Europe/Lisbon' },
  { name: 'Cairo',        tz: 'Africa/Cairo' },
  { name: 'Lagos',        tz: 'Africa/Lagos' },
  { name: 'Cape Town',    tz: 'Africa/Johannesburg' },
  { name: 'São Paulo',    tz: 'America/Sao_Paulo' },
  { name: 'Mexico City',  tz: 'America/Mexico_City' },
  { name: 'New York',     tz: 'America/New_York' },
  { name: 'Toronto',      tz: 'America/Toronto' },
  { name: 'Chicago',      tz: 'America/Chicago' },
  { name: 'Denver',       tz: 'America/Denver' },
  { name: 'Los Angeles',  tz: 'America/Los_Angeles' },
  { name: 'Honolulu',     tz: 'Pacific/Honolulu' },
  { name: 'Auckland',     tz: 'Pacific/Auckland' },
  { name: 'Sydney',       tz: 'Australia/Sydney' },
];

const WC_DEFAULTS = {
  wallpaper: { kind: 'preset', value: 'ocean' },
  blur: 0,
  font: 'Space Mono',
  color: '#ffffff',
  size: 4,
  spacing: 0.04,
  hour24: true,
  showSeconds: true,
};

function wcLoadCities() {
  try {
    const raw = localStorage.getItem(WC_CITIES_KEY);
    if (!raw) {
      const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const localName = localTz.split('/').pop().replace(/_/g, ' ');
      return [{ name: `${localName} (Local)`, tz: localTz }];
    }
    return JSON.parse(raw);
  } catch { return []; }
}
function wcSaveCities(list) {
  try { localStorage.setItem(WC_CITIES_KEY, JSON.stringify(list)); } catch {}
}

window.mountWorld = function mountWorld(root) {
  let settings = TT.load(WC_STORAGE_KEY, WC_DEFAULTS);
  let cities = wcLoadCities();

  root.innerHTML = `
    <div class="wc-view">
      <div class="wallpaper" id="wcWp"></div>
      <div class="wc-content">
        <div class="wc-head">
          <h2>World Clock</h2>
          <div class="wc-add-row">
            <select id="wcCitySel"></select>
            <button class="sw-btn sw-primary" id="wcAddBtn">+ Add</button>
          </div>
        </div>
        <div class="wc-grid" id="wcGrid"></div>
      </div>

      <div class="fab-row">
        <button class="fab" id="wcFsBtn" title="Fullscreen">⛶</button>
        <button class="fab" id="wcSetBtn" title="Settings">⚙</button>
      </div>

      <div class="drawer" id="wcDrawer">
        <div class="drawer-head">
          <h2>World Clock Settings</h2>
          <button class="drawer-close" id="wcDrawerClose">×</button>
        </div>
        <div class="drawer-body">
          <div class="section">
            <h3>Wallpaper</h3>
            <div class="wp-grid" id="wcWpGrid"></div>
            <div class="row" style="margin-top:12px;">
              <label>Blur</label>
              <input type="range" id="wcBlur" min="0" max="20" step="1" />
            </div>
          </div>
          <div class="section">
            <h3>Font</h3>
            <div class="font-grid" id="wcFontGrid"></div>
          </div>
          <div class="section">
            <h3>Display</h3>
            <div class="row">
              <label>24-hour</label>
              <div class="switch" id="wcSw24"></div>
            </div>
            <div class="row">
              <label>Show seconds</label>
              <div class="switch" id="wcSwSec"></div>
            </div>
            <div class="row">
              <label>Color</label>
              <input type="color" id="wcColor" />
            </div>
            <div class="row">
              <label>Card size</label>
              <input type="range" id="wcSize" min="2" max="8" step="0.5" />
            </div>
            <div class="row">
              <label>Spacing</label>
              <input type="range" id="wcSpacing" min="-0.05" max="0.4" step="0.01" />
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const $ = (id) => root.querySelector('#' + id);
  const wpEl = $('wcWp');
  const gridEl = $('wcGrid');
  const drawer = $('wcDrawer');
  const wpGrid = $('wcWpGrid');
  const fontGrid = $('wcFontGrid');
  const citySel = $('wcCitySel');

  const sortedCities = [...CITY_LIST].sort((a, b) => a.name.localeCompare(b.name));
  sortedCities.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c.tz;
    opt.dataset.name = c.name;
    opt.textContent = c.name;
    citySel.appendChild(opt);
  });

  TT.buildWallpaperGrid(wpGrid, (id) => {
    settings.wallpaper = { kind: 'preset', value: id };
    applySettings();
  });
  TT.buildFontGrid(fontGrid, (id) => {
    settings.font = id;
    applySettings();
  });

  $('wcSetBtn').addEventListener('click', () => drawer.classList.add('open'));
  $('wcDrawerClose').addEventListener('click', () => drawer.classList.remove('open'));

  const cleanupFs = TT.setupFullscreen($('wcFsBtn'));

  $('wcBlur').addEventListener('input',    (e) => { settings.blur = +e.target.value; applySettings(); });
  $('wcColor').addEventListener('input',   (e) => { settings.color = e.target.value; applySettings(); });
  $('wcSize').addEventListener('input',    (e) => { settings.size = +e.target.value; applySettings(); });
  $('wcSpacing').addEventListener('input', (e) => { settings.spacing = +e.target.value; applySettings(); });
  $('wcSw24').addEventListener('click',    () => { settings.hour24 = !settings.hour24; applySettings(); renderGrid(); });
  $('wcSwSec').addEventListener('click',   () => { settings.showSeconds = !settings.showSeconds; applySettings(); renderGrid(); });

  function applyControls() {
    TT.syncWallpaperGrid(wpGrid, settings.wallpaper);
    TT.syncFontGrid(fontGrid, settings.font);
    $('wcBlur').value    = settings.blur;
    $('wcColor').value   = settings.color;
    $('wcSize').value    = settings.size;
    $('wcSpacing').value = settings.spacing;
    $('wcSw24').classList.toggle('on', settings.hour24);
    $('wcSwSec').classList.toggle('on', settings.showSeconds);
  }
  function applySettings() {
    TT.applyWallpaper(wpEl, settings.wallpaper, settings.blur);
    applyControls();
    gridEl.style.setProperty('--wc-font', `'${settings.font}', monospace`);
    gridEl.style.setProperty('--wc-color', settings.color);
    gridEl.style.setProperty('--wc-size', `${settings.size}vw`);
    gridEl.style.setProperty('--wc-spacing', `${settings.spacing}em`);
    TT.save(WC_STORAGE_KEY, settings);
  }

  $('wcAddBtn').addEventListener('click', () => {
    const tz = citySel.value;
    const name = citySel.options[citySel.selectedIndex].dataset.name;
    if (cities.some((c) => c.tz === tz)) return;
    cities.push({ name, tz });
    wcSaveCities(cities);
    renderGrid();
  });

  function timeFor(tz) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: !settings.hour24,
      hour: '2-digit',
      minute: '2-digit',
      second: settings.showSeconds ? '2-digit' : undefined,
    }).formatToParts(new Date());
    return parts.map((p) => p.value).join('').trim();
  }
  function dateFor(tz) {
    return new Date().toLocaleDateString(undefined, {
      timeZone: tz,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }
  function hourIn(tz) {
    const h = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour: 'numeric', hour12: false,
    }).format(new Date());
    return parseInt(h, 10);
  }
  function offsetVsLocal(tz) {
    const now = new Date();
    const localStr = now.toLocaleString('en-US', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    const tzStr = now.toLocaleString('en-US', { timeZone: tz });
    const diffMs = new Date(tzStr) - new Date(localStr);
    const diffH = Math.round(diffMs / 3600000);
    if (diffH === 0) return 'same as local';
    const sign = diffH > 0 ? '+' : '';
    return `${sign}${diffH}h vs local`;
  }

  function renderGrid() {
    if (cities.length === 0) {
      gridEl.innerHTML = '<div class="wc-empty">No cities. Pick one above and click Add.</div>';
      return;
    }
    gridEl.innerHTML = cities.map((c, i) => {
      const h = hourIn(c.tz);
      const isDay = h >= 6 && h < 18;
      return `
        <div class="wc-card${isDay ? ' wc-day' : ' wc-night'}" data-i="${i}">
          <div class="wc-card-head">
            <div class="wc-card-name">${c.name}</div>
            <div class="wc-card-actions">
              <span class="wc-card-icon">${isDay ? '☀' : '🌙'}</span>
              <button class="wc-card-del" title="Remove">×</button>
            </div>
          </div>
          <div class="wc-card-time" data-tz="${c.tz}">${timeFor(c.tz)}</div>
          <div class="wc-card-meta">
            <span>${dateFor(c.tz)}</span>
            <span class="wc-card-offset">${offsetVsLocal(c.tz)}</span>
          </div>
        </div>
      `;
    }).join('');
    gridEl.querySelectorAll('.wc-card-del').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        cities.splice(i, 1);
        wcSaveCities(cities);
        renderGrid();
      });
    });
  }

  function tickTimes() {
    gridEl.querySelectorAll('.wc-card-time').forEach((el) => {
      el.textContent = timeFor(el.dataset.tz);
    });
  }

  applySettings();
  renderGrid();
  const tickId = setInterval(() => {
    tickTimes();
    if (new Date().getSeconds() === 0) renderGrid();
  }, 1000);

  return () => {
    clearInterval(tickId);
    cleanupFs();
  };
};
