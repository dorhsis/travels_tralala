/* ---------- Theme ---------- */
const root = document.documentElement;
const toggle = document.getElementById('themeToggle');
const stored = localStorage.getItem('theme');
const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches;
setTheme(stored || (prefersDark ? 'dark' : 'light'));
toggle.addEventListener('click', () => {
  setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});
function setTheme(t) {
  root.setAttribute('data-theme', t);
  localStorage.setItem('theme', t);
  toggle.innerHTML = t === 'dark' ? '<i class="ti ti-sun"></i>' : '<i class="ti ti-moon"></i>';
  if (window.__mmReady) renderMermaid();   // re-render diagrams in the new theme
}

/* ---------- Progress bar animation ---------- */
function animateBars(scope) {
  scope.querySelectorAll('.prog-bar').forEach(bar => {
    bar.style.width = '0';
    requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = bar.dataset.w + '%'; }));
  });
}

/* ---------- Tab switching ---------- */
document.getElementById('nav').addEventListener('click', e => {
  const btn = e.target.closest('.nav-btn');
  if (!btn) return;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  const page = document.getElementById('page-' + btn.dataset.page);
  page.classList.add('active');
  animateBars(page);
  if ((btn.dataset.page === 'architecture' || btn.dataset.page === 'flutter') && !window.__mmReady) renderMermaid();
});

/* initial bar animation on the default page */
const startPage = document.querySelector('.page.active');
if (startPage) animateBars(startPage);

/* ---------- Video window (modal) ---------- */
const modal = document.getElementById('videoModal');
const modalTitle = document.getElementById('modalTitle');
const modalHint = document.getElementById('modalHint');
const modalFoot = document.getElementById('modalFoot');
const modalCount = document.getElementById('modalCount');
const nextBtn = document.getElementById('nextBtn');
const ytWrap = document.getElementById('ytWrap');
const ygBox = document.getElementById('yg-widget');

let mode = null;                    // 'yt' | 'youglish'
let ytPlayer = null, ytApiReady = false;
let curIds = [], curIdx = 0, ytErrors = 0;
let ygWidget = null;

/* YouTube IFrame API calls this global once it finishes loading */
window.onYouTubeIframeAPIReady = () => { ytApiReady = true; };

document.addEventListener('click', e => {
  const btn = e.target.closest('.plat-watch');
  if (!btn) return;
  openVideo(btn.dataset);
});

function openVideo(d) {
  modalTitle.textContent = d.title || 'Видео';
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  modalFoot.hidden = false;

  resetPlayers();                    // stop + remove whatever played before (separation)

  if (d.video === 'youglish') {
    mode = 'youglish';
    show(ygBox);
    modalCount.textContent = '';
    modalHint.textContent = 'Введите слово в строке поиска и слушайте, как его произносят носители. «Воспроизвести далее» — следующий ролик.';
    initYouglish(d.q || 'vocabulary');
  } else {
    mode = 'yt';
    show(ytWrap);
    curIds = (d.ids || '').split(',').map(s => s.trim()).filter(Boolean);
    curIdx = 0; ytErrors = 0;
    modalHint.textContent = 'Видео с официального канала приложения. «Воспроизвести далее» — следующее видео. Ролики с ограниченным доступом пропускаются автоматически.';
    withPlayer(() => { ytPlayer.loadVideoById(curIds[0]); updateCount(); });
  }
}

/* show one element, used together with resetPlayers() which hides everything */
function show(el) { el.hidden = false; el.style.display = ''; }
function hide(el) { el.hidden = true; el.style.display = 'none'; }

/* Stop and hide ALL views so only the next one is visible & audible */
function resetPlayers() {
  if (ytPlayer && ytPlayer.stopVideo) { try { ytPlayer.stopVideo(); } catch (e) {} }
  hide(ytWrap);
  if (ygWidget && ygWidget.pause) { try { ygWidget.pause(); } catch (e) {} }
  ygBox.innerHTML = '';              // fully remove Youglish iframe → its video stops & disappears
  ygWidget = null;
  hide(ygBox);
}

function updateCount() {
  modalCount.textContent = curIds.length ? `Видео ${curIdx + 1} из ${curIds.length}` : '';
}

function closeVideo() {
  modal.classList.remove('open');
  document.body.style.overflow = '';
  resetPlayers();                    // stop everything on close
}

/* --- YouTube: create once, then reuse --- */
function withPlayer(cb) {
  if (ytPlayer && ytPlayer.loadVideoById) return cb();
  if (!ytApiReady || typeof YT === 'undefined' || !YT.Player) {
    setTimeout(() => withPlayer(cb), 200);                    // API still loading
    return;
  }
  ytPlayer = new YT.Player('ytPlayer', {
    height: '100%', width: '100%',
    playerVars: { rel: 0, modestbranding: 1, playsinline: 1, origin: location.origin },
    events: {
      onReady: () => cb(),
      onStateChange: e => { if (e.data === YT.PlayerState.PLAYING) ytErrors = 0; },
      onError: () => {                       // owner disabled embedding → skip to next
        if (ytErrors < curIds.length) { ytErrors++; nextYT(); }
      }
    }
  });
}
function nextYT() {
  if (!curIds.length) return;
  curIdx = (curIdx + 1) % curIds.length;                      // wrap around
  if (ytPlayer && ytPlayer.loadVideoById) ytPlayer.loadVideoById(curIds[curIdx]);
  updateCount();
}

/* --- Youglish: create once, refetch on open --- */
function initYouglish(query) {
  if (typeof YG === 'undefined') {
    ygBox.innerHTML = '<p style="font-size:13px;color:var(--text-2)">Не удалось загрузить виджет Youglish — проверьте интернет-соединение.</p>';
    return;
  }
  ygWidget = new YG.Widget('yg-widget', { width: 540, components: 9 });   // fresh instance each open
  ygWidget.fetch(query, 'english');
}

/* --- "Воспроизвести далее" (video / Youglish) --- */
nextBtn.addEventListener('click', () => {
  if (mode === 'youglish') { if (ygWidget) ygWidget.next(); }
  else nextYT();
});

document.getElementById('modalClose').addEventListener('click', closeVideo);
modal.addEventListener('click', e => { if (e.target === modal) closeVideo(); });
document.addEventListener('keydown', e => {
  if (modal.classList.contains('open') && e.key === 'Escape') closeVideo();
});

/* ---------- Architecture diagrams (Mermaid) ---------- */
const mmEls = Array.from(document.querySelectorAll('.mermaid'));
const mmSrc = new Map(mmEls.map(el => [el, el.textContent]));   // keep original definitions

function renderMermaid() {
  if (typeof mermaid === 'undefined' || !mmEls.length) return;
  const dark = root.getAttribute('data-theme') === 'dark';
  mermaid.initialize({
    startOnLoad: false,
    theme: dark ? 'dark' : 'default',
    securityLevel: 'loose',
    fontFamily: 'Inter, system-ui, sans-serif',
    flowchart: { curve: 'basis', useMaxWidth: false }
  });
  mmEls.forEach(el => { el.removeAttribute('data-processed'); el.innerHTML = ''; el.textContent = mmSrc.get(el); });
  try { mermaid.run({ nodes: mmEls }); } catch (e) {}
  window.__mmReady = true;
}
