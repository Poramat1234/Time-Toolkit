window.TT = (() => {
  const PRESETS = [
    { id: 'midnight', cls: 'wp-midnight' },
    { id: 'sunset',   cls: 'wp-sunset' },
    { id: 'ocean',    cls: 'wp-ocean' },
    { id: 'forest',   cls: 'wp-forest' },
    { id: 'aurora',   cls: 'wp-aurora' },
    { id: 'mono',     cls: 'wp-mono' },
    { id: 'lavender', cls: 'wp-lavender' },
    { id: 'ember',    cls: 'wp-ember' },
  ];

  const FONTS = [
    { id: 'Orbitron',             label: '12:34' },
    { id: 'Space Mono',           label: '12:34' },
    { id: 'Major Mono Display',   label: '12:34' },
    { id: 'VT323',                label: '12:34' },
    { id: 'Audiowide',            label: '12:34' },
    { id: 'Cinzel',               label: '12:34' },
    { id: 'Bebas Neue',           label: '12:34' },
    { id: 'Playfair Display',     label: '12:34' },
    { id: 'Rubik Glitch',          label: '12:34' },
    { id: 'Quantico',              label: '12:34' },
    { id: 'Silkscreen',            label: '12:34' },
    { id: 'Jersey 25',             label: '12:34' },
    { id: 'Micro 5',               label: '12:34' },
    { id: 'Manufacturing Consent', label: '12:34' },
  ];

  let _audioCtx = null;
  function audioCtx() {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return _audioCtx;
  }

  return {
    PRESETS,
    FONTS,

    load(key, defaults) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return { ...defaults };
        return { ...defaults, ...JSON.parse(raw) };
      } catch { return { ...defaults }; }
    },
    save(key, obj) {
      try { localStorage.setItem(key, JSON.stringify(obj)); } catch {}
    },

    applyWallpaper(el, wallpaper, blur = 0) {
      if (wallpaper.kind === 'preset') {
        const preset = PRESETS.find((p) => p.id === wallpaper.value) || PRESETS[0];
        el.style.backgroundImage = '';
        el.className = `wallpaper ${preset.cls}`;
      } else {
        el.className = 'wallpaper';
        el.style.backgroundImage = `url(${wallpaper.value})`;
      }
      el.style.filter = `blur(${blur}px)`;
    },

    buildWallpaperGrid(container, onSelect) {
      PRESETS.forEach((p) => {
        const t = document.createElement('div');
        t.className = `wp-tile ${p.cls}`;
        t.dataset.id = p.id;
        t.title = p.id;
        t.addEventListener('click', () => onSelect(p.id));
        container.appendChild(t);
      });
    },
    buildFontGrid(container, onSelect) {
      FONTS.forEach((f) => {
        const t = document.createElement('div');
        t.className = 'font-tile';
        t.dataset.id = f.id;
        t.style.fontFamily = `'${f.id}', sans-serif`;
        t.textContent = f.label;
        t.addEventListener('click', () => onSelect(f.id));
        container.appendChild(t);
      });
    },
    syncWallpaperGrid(grid, wallpaper) {
      grid.querySelectorAll('.wp-tile').forEach((el) => {
        el.classList.toggle('selected',
          wallpaper.kind === 'preset' && el.dataset.id === wallpaper.value);
      });
    },
    syncFontGrid(grid, fontId) {
      grid.querySelectorAll('.font-tile').forEach((el) => {
        el.classList.toggle('selected', el.dataset.id === fontId);
      });
    },

    setupFullscreen(btn) {
      btn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
      const onChange = () => {
        document.body.classList.toggle('fullscreen-mode', !!document.fullscreenElement);
      };
      document.addEventListener('fullscreenchange', onChange);
      return () => {
        document.removeEventListener('fullscreenchange', onChange);
        document.body.classList.remove('fullscreen-mode');
      };
    },

    beep(volume, freq = 880, dur = 0.4) {
      try {
        const ctx = audioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.start();
        osc.stop(ctx.currentTime + dur);
      } catch {}
    },
  };
})();
