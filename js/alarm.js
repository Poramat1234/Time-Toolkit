const AL_STORAGE_KEY = 'mytimes.alarm.settings';
const AL_ALARMS_KEY = 'mytimes.alarm.alarms';

const AL_DEFAULTS = {
  wallpaper: { kind: 'preset', value: 'aurora' },
  blur: 0,
  font: 'Orbitron',
  color: '#ffffff',
  size: 6,
  spacing: 0.04,
  volume: 0.5,
};

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function alLoadAlarms() {
  try {
    const raw = localStorage.getItem(AL_ALARMS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}
function alSaveAlarms(list) {
  try { localStorage.setItem(AL_ALARMS_KEY, JSON.stringify(list)); } catch {}
}

window.mountAlarm = function mountAlarm(root) {
  let settings = TT.load(AL_STORAGE_KEY, AL_DEFAULTS);
  let alarms = alLoadAlarms();
  let firing = null;
  let alarmInterval = null;
  const pad = (n) => String(n).padStart(2, '0');

  root.innerHTML = `
    <div class="al-view">
      <div class="wallpaper" id="alWp"></div>
      <div class="al-content">
        <div class="al-now" id="alNow">--:--:--</div>

        <div class="al-list-head">
          <h2>Alarms</h2>
          <button class="sw-btn sw-primary" id="alAddBtn">+ Add Alarm</button>
        </div>

        <div class="al-form" id="alForm" style="display:none;">
          <div class="al-form-row">
            <div class="tm-input-group">
              <input type="number" id="alFormHr" min="0" max="23" value="7" />
              <label>Hours</label>
            </div>
            <span class="tm-input-sep">:</span>
            <div class="tm-input-group">
              <input type="number" id="alFormMin" min="0" max="59" value="0" />
              <label>Minutes</label>
            </div>
          </div>
          <div class="al-form-row">
            <input type="text" class="al-label-input" id="alFormLabel" placeholder="Label (optional)" maxlength="40" />
          </div>
          <div class="al-form-row">
            <div class="al-days" id="alFormDays"></div>
          </div>
          <div class="al-form-actions">
            <button class="sw-btn sw-secondary" id="alFormCancel">Cancel</button>
            <button class="sw-btn sw-primary" id="alFormSave">Save</button>
          </div>
        </div>

        <div class="al-list" id="alList"></div>
      </div>

      <div class="al-fire" id="alFire" style="display:none;">
        <div class="al-fire-icon">⏰</div>
        <div class="al-fire-label" id="alFireLabel"></div>
        <div class="al-fire-time" id="alFireTime"></div>
        <button class="sw-btn sw-primary sw-stop" id="alFireDismiss">Dismiss</button>
      </div>

      <div class="fab-row">
        <button class="fab" id="alFsBtn" title="Fullscreen">⛶</button>
        <button class="fab" id="alSetBtn" title="Settings">⚙</button>
      </div>

      <div class="drawer" id="alDrawer">
        <div class="drawer-head">
          <h2>Alarm Settings</h2>
          <button class="drawer-close" id="alDrawerClose">×</button>
        </div>
        <div class="drawer-body">
          <div class="section">
            <h3>Wallpaper</h3>
            <div class="wp-grid" id="alWpGrid"></div>
            <div class="row" style="margin-top:12px;">
              <label>Blur</label>
              <input type="range" id="alBlur" min="0" max="20" step="1" />
            </div>
          </div>
          <div class="section">
            <h3>Font</h3>
            <div class="font-grid" id="alFontGrid"></div>
          </div>
          <div class="section">
            <h3>Display</h3>
            <div class="row">
              <label>Color</label>
              <input type="color" id="alColor" />
            </div>
            <div class="row">
              <label>Size</label>
              <input type="range" id="alSize" min="3" max="14" step="1" />
            </div>
            <div class="row">
              <label>Spacing</label>
              <input type="range" id="alSpacing" min="-0.05" max="0.4" step="0.01" />
            </div>
          </div>
          <div class="section">
            <h3>Alarm</h3>
            <div class="row">
              <label>Volume</label>
              <input type="range" id="alVolume" min="0" max="1" step="0.05" />
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const $ = (id) => root.querySelector('#' + id);
  const wpEl = $('alWp');
  const nowEl = $('alNow');
  const listEl = $('alList');
  const formEl = $('alForm');
  const formDaysEl = $('alFormDays');
  const fireEl = $('alFire');
  const drawer = $('alDrawer');
  const wpGrid = $('alWpGrid');
  const fontGrid = $('alFontGrid');

  TT.buildWallpaperGrid(wpGrid, (id) => {
    settings.wallpaper = { kind: 'preset', value: id };
    applySettings();
  });
  TT.buildFontGrid(fontGrid, (id) => {
    settings.font = id;
    applySettings();
  });

  // Form day chips
  let formDays = new Set();
  DAY_LABELS.forEach((lbl, i) => {
    const c = document.createElement('button');
    c.className = 'al-day-chip';
    c.textContent = lbl;
    c.title = DAY_FULL[i];
    c.dataset.day = i;
    c.addEventListener('click', () => {
      if (formDays.has(i)) { formDays.delete(i); c.classList.remove('selected'); }
      else { formDays.add(i); c.classList.add('selected'); }
    });
    formDaysEl.appendChild(c);
  });

  $('alSetBtn').addEventListener('click', () => drawer.classList.add('open'));
  $('alDrawerClose').addEventListener('click', () => drawer.classList.remove('open'));

  const cleanupFs = TT.setupFullscreen($('alFsBtn'));

  $('alBlur').addEventListener('input',    (e) => { settings.blur = +e.target.value; applySettings(); });
  $('alColor').addEventListener('input',   (e) => { settings.color = e.target.value; applySettings(); });
  $('alSize').addEventListener('input',    (e) => { settings.size = +e.target.value; applySettings(); });
  $('alSpacing').addEventListener('input', (e) => { settings.spacing = +e.target.value; applySettings(); });
  $('alVolume').addEventListener('input',  (e) => { settings.volume = +e.target.value; applySettings(); });

  function applyControls() {
    TT.syncWallpaperGrid(wpGrid, settings.wallpaper);
    TT.syncFontGrid(fontGrid, settings.font);
    $('alBlur').value    = settings.blur;
    $('alColor').value   = settings.color;
    $('alSize').value    = settings.size;
    $('alSpacing').value = settings.spacing;
    $('alVolume').value  = settings.volume;
  }
  function applyDisplay() {
    const content = root.querySelector('.al-content');
    nowEl.style.fontFamily = `'${settings.font}', monospace`;
    nowEl.style.color = settings.color;
    content.style.setProperty('--al-size', `${settings.size}vw`);
    nowEl.style.letterSpacing = `${settings.spacing}em`;
  }
  function applySettings() {
    TT.applyWallpaper(wpEl, settings.wallpaper, settings.blur);
    applyControls();
    applyDisplay();
    TT.save(AL_STORAGE_KEY, settings);
  }

  // ----- Alarm list -----
  function renderList() {
    if (alarms.length === 0) {
      listEl.innerHTML = '<div class="al-empty">No alarms set. Add one above.</div>';
      return;
    }
    listEl.innerHTML = alarms.map((a) => {
      const repeatTxt = a.days.length === 0
        ? 'Once'
        : (a.days.length === 7 ? 'Daily' : a.days.map((d) => DAY_FULL[d]).join(' '));
      return `
        <div class="al-card${a.enabled ? '' : ' al-off'}" data-id="${a.id}">
          <div class="al-card-main">
            <div class="al-card-time">${a.time}</div>
            <div class="al-card-meta">
              ${a.label ? `<div class="al-card-label">${escapeHtml(a.label)}</div>` : ''}
              <div class="al-card-repeat">${repeatTxt}</div>
            </div>
          </div>
          <div class="al-card-actions">
            <div class="switch ${a.enabled ? 'on' : ''}" data-action="toggle"></div>
            <button class="al-card-del" data-action="delete" title="Delete">×</button>
          </div>
        </div>
      `;
    }).join('');
    listEl.querySelectorAll('.al-card').forEach((card) => {
      const id = +card.dataset.id;
      card.querySelector('[data-action="toggle"]').addEventListener('click', () => {
        const a = alarms.find((x) => x.id === id);
        if (!a) return;
        a.enabled = !a.enabled;
        alSaveAlarms(alarms);
        renderList();
      });
      card.querySelector('[data-action="delete"]').addEventListener('click', () => {
        alarms = alarms.filter((x) => x.id !== id);
        alSaveAlarms(alarms);
        renderList();
      });
    });
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  $('alAddBtn').addEventListener('click', () => {
    formEl.style.display = 'flex';
    formDays.clear();
    formDaysEl.querySelectorAll('.al-day-chip').forEach((c) => c.classList.remove('selected'));
    $('alFormHr').value = 7;
    $('alFormMin').value = 0;
    $('alFormLabel').value = '';
  });
  $('alFormCancel').addEventListener('click', () => { formEl.style.display = 'none'; });
  $('alFormSave').addEventListener('click', () => {
    const h = Math.max(0, Math.min(23, +$('alFormHr').value || 0));
    const m = Math.max(0, Math.min(59, +$('alFormMin').value || 0));
    const label = $('alFormLabel').value.trim();
    const days = [...formDays].sort();
    alarms.push({
      id: Date.now(),
      time: `${pad(h)}:${pad(m)}`,
      label,
      days,
      enabled: true,
      lastFiredKey: '',
    });
    alSaveAlarms(alarms);
    renderList();
    formEl.style.display = 'none';
  });

  function checkAlarms() {
    if (firing) return;
    const now = new Date();
    const day = now.getDay();
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const todayKey = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${hh}:${mm}`;
    for (const a of alarms) {
      if (!a.enabled) continue;
      if (a.time !== `${hh}:${mm}`) continue;
      if (a.days.length > 0 && !a.days.includes(day)) continue;
      if (a.lastFiredKey === todayKey) continue;
      a.lastFiredKey = todayKey;
      if (a.days.length === 0) a.enabled = false;
      alSaveAlarms(alarms);
      renderList();
      fireAlarm(a);
      break;
    }
  }

  function fireAlarm(a) {
    firing = a;
    $('alFireLabel').textContent = a.label || 'Alarm';
    $('alFireTime').textContent = a.time;
    fireEl.style.display = 'flex';
    startAlarmSound();
  }
  $('alFireDismiss').addEventListener('click', () => {
    fireEl.style.display = 'none';
    firing = null;
    stopAlarmSound();
  });

  function startAlarmSound() {
    TT.beep(settings.volume);
    alarmInterval = setInterval(() => TT.beep(settings.volume), 700);
  }
  function stopAlarmSound() {
    if (alarmInterval) { clearInterval(alarmInterval); alarmInterval = null; }
  }

  function tick() {
    const now = new Date();
    nowEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    checkAlarms();
  }
  tick();
  const tickId = setInterval(tick, 1000);

  applySettings();
  renderList();

  return () => {
    clearInterval(tickId);
    stopAlarmSound();
    cleanupFs();
  };
};
