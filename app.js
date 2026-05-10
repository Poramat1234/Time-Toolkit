const main = document.getElementById('main');
const navItems = document.querySelectorAll('.nav-item');

const views = {
  clock:     window.mountClock,
  stopwatch: window.mountStopwatch,
  timer:     window.mountTimer,
  alarm:     window.mountAlarm,
  focus:     window.mountFocus,
  world:     window.mountWorld,
};

function mountPlaceholder(title, text) {
  return (root) => {
    root.innerHTML = `
      <div class="placeholder">
        <h2>${title}</h2>
        <p>${text}</p>
      </div>
    `;
    return () => {};
  };
}

let cleanup = null;

function switchView(name) {
  if (cleanup) { cleanup(); cleanup = null; }
  main.innerHTML = '';
  cleanup = views[name](main) || null;
  navItems.forEach((b) => b.classList.toggle('active', b.dataset.view === name));
}

navItems.forEach((b) => {
  b.addEventListener('click', () => switchView(b.dataset.view));
});

switchView('clock');
