/* public/script.js — Cosmic Dashboard (v6.8.6)
   - Socket.IO client integration
   - Loader ring (server-driven)
   - Logs, Plugin list, Uptime formatting
   - Adaptive FPS perf chart
   - PWA registration
*/

(() => {
  const socket = io(); // assume same origin
  const $ = id => document.getElementById(id);

  // Elements
  const overlay = $('overlay');
  const overlayPercent = $('overlay-percent');
  const overlayMessage = $('overlay-message');
  const ringArc = $('ringArc');
  const welcomeMessage = $('welcome-message');
  const app = $('app');
  const connBubble = $('conn-bubble');
  const toastWrap = $('toast-wrap');
  const versionTag = $('versionTag');
  const securityBanner = $('security-banner');

  // Info
  const usernameEl = $('username');
  const serverEl = $('server');
  const uptimeEl = $('uptime');
  const pluginCountEl = $('plugin-count');
  const pluginsListEl = $('plugins');
  const logsEl = $('logs');
  const logCountEl = $('log-count');
  const cpuEl = $('cpu');
  const ramEl = $('ram');
  const tpsEl = $('tps');
  const perfCanvas = $('perf-chart');

  // buttons
  const saveAuthBtn = $('save-auth');
  const reloadAllBtn = $('reload-all');
  const startBtn = $('start-btn');
  const stopBtn = $('stop-btn');
  const restartBtn = $('restart-btn');

  // sounds
  const snd = {
    connect: $('snd-connect'),
    disconnect: $('snd-disconnect'),
    info: $('snd-info'),
    reload: $('snd-reload'),
    retry: $('snd-retry'),
  };

  // state
  let muted = JSON.parse(localStorage.getItem('botMuted') || 'false');
  let adminAuth = localStorage.getItem('adminAuth') || '';
  let logs = [];
  const MAX_LOGS = 1500;
  let perfData = { cpu: [], ram: [] };

  // adapt animation speed (low-end devices slower)
  const prefersHighFPS = !( /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ) && (window.devicePixelRatio >= 1);
  document.documentElement.style.setProperty('--anim-speed', prefersHighFPS ? '1' : '1.6');

  // play sound helper
  function playSound(name){
    if(muted) return;
    try{ const s = snd[name]; if(s){ s.currentTime = 0; s.play().catch(()=>{}); } } catch(e) {}
  }

  // toast helper
  function showToast(msg, type='info', opts = {}) {
    const el = document.createElement('div');
    el.className = 'toast ' + (type || 'info');
    el.textContent = msg;
    if (opts.actionText && typeof opts.onAction === 'function') {
      const btn = document.createElement('button');
      btn.className = 'toast-action';
      btn.textContent = opts.actionText;
      btn.addEventListener('click', opts.onAction);
      el.appendChild(btn);
    }
    toastWrap.appendChild(el);
    setTimeout(() => el.remove(), opts.duration || 5000);
    return el;
  }

  // overlay set
  function setOverlay(percent = 0, message = '') {
    overlayPercent.textContent = Math.min(100, Math.max(0, Math.floor(percent)));
    // stroke dashoffset: 302 -> 0
    const offset = Math.round(302 - (302 * (percent / 100)));
    ringArc.style.strokeDashoffset = offset;
    overlayMessage.textContent = message || '';
    if (percent >= 100) {
      // show welcome, hide overlay after a short delay
      welcomeMessage.hidden = false;
      setTimeout(() => {
        overlay.classList.add('hide');
        setTimeout(() => { overlay.style.display = 'none'; app.hidden = false; }, 350);
      }, 350);
    } else {
      overlay.style.display = '';
      overlay.classList.remove('hide');
    }
  }

  // simple escape
  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // log append
  function appendLog(text, cls = 'info') {
    logs.push({ text, cls, ts: Date.now() });
    if (logs.length > MAX_LOGS) logs.shift();
    const node = document.createElement('div');
    node.className = `log-line ${cls}`;
    node.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
    logsEl.appendChild(node);
    logsEl.scrollTop = logsEl.scrollHeight;
    logCountEl.textContent = `${logs.length} lines`;
  }

  // render logs (filtering)
  function renderLogs(){
    const q = (document.getElementById('log-search')?.value || '').toLowerCase();
    const lvl = (document.getElementById('log-level')?.value || '');
    logsEl.innerHTML = logs.filter(l => {
      if (lvl && l.cls !== lvl) return false;
      if (q && !l.text.toLowerCase().includes(q)) return false;
      return true;
    }).map(l => `[${new Date(l.ts).toLocaleTimeString()}] ${escapeHtml(l.text)}`)
      .map(s => `<div class="log-line">${s}</div>`).join('');
    document.getElementById('log-count').textContent = `${logs.length} lines`;
  }

  // uptime format
  function formatHMS(ms) {
    const sec = Math.floor(ms / 1000);
    const h = String(Math.floor(sec / 3600)).padStart(2, '0');
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  // socket events
  socket.on('connect', ()=> {
    connBubble.classList.add('online');
    playSound('connect');
    showToast('Connected', 'success');
  });

  socket.on('disconnect', ()=> {
    connBubble.classList.remove('online');
    playSound('disconnect');
    showToast('Disconnected — reconnecting', 'error');
  });

  socket.on('connect_error', ()=> showToast('Connection error', 'error'));

  // loader progress emitted by server
  socket.on('loaderProgress', (d) => {
    if (!d) return;
    setOverlay(d.percent || 0, d.message || 'Loading');
    if (d.percent >= 100) playSound('info');
  });

  // version info / security banner
  socket.on('versionInfo', info => {
    if (!info) return;
    versionTag.textContent = info.version || versionTag.textContent;
    if (info.publicMode) {
      securityBanner.hidden = false;
      showToast('Public Mode Enabled — CORS Wide Open', 'warn');
    } else {
      securityBanner.hidden = true;
    }
  });

  // initial device info -> adapt layout
  socket.on('deviceInfo', d => {
    if (!d) return;
    if (d.isMobile) document.body.classList.add('mobile');
    else document.body.classList.remove('mobile');
  });

  // uptime event (object)
  socket.on('uptime', u => {
    if (!u) return;
    if (u.uptimeStr) uptimeEl.textContent = u.uptimeStr;
    else if (u.uptimeMs) uptimeEl.textContent = formatHMS(u.uptimeMs);
  });

  // plugin count & list
  socket.on('pluginCount', p => {
    if (!p) return;
    pluginCountEl.textContent = p.total ?? (p.names?.length || 0);
    if (p.names && p.names.length) {
      pluginsListEl.innerHTML = p.names.map(n => `<div class="plugin-item"><img src="icons/plugin.svg" class="svg-16"> ${escapeHtml(n)}</div>`).join('');
    }
  });

  socket.on('pluginStatus', s => {
    if (!s) return;
    document.getElementById('plugins-meta').textContent = `${s.loaded ?? 0}/${s.total ?? 0}`;
  });

  // logs
  socket.on('log', l => {
    const text = l && (l.text || l.message) ? (l.text || l.message) : JSON.stringify(l);
    appendLog(text, l?.type || l?.level || 'info');
  });

  // system stats
  socket.on('systemStats', m => {
    if (!m) return;
    cpuEl.textContent = `${m.loadAvg ?? '—'}`;
    ramEl.textContent = `${m.memoryMB ?? '—'} MB`;
    // perf capture
    perfData.cpu.push(Number(m.loadAvg) || 0);
    perfData.ram.push(Number(m.memoryMB) || 0);
    if (perfData.cpu.length > 120) perfData.cpu.shift();
    if (perfData.ram.length > 120) perfData.ram.shift();
  });

  // toast messages from server
  socket.on('toast', t => { if (t?.message) showToast(t.message, t.type || 'info'); });

  // system events
  socket.on('systemEvent', e => {
    if (!e) return;
    showToast(e.message || 'System event', 'info');
  });

  // user actions
  saveAuthBtn?.addEventListener('click', ()=> {
    adminAuth = document.getElementById('auth-token').value || '';
    localStorage.setItem('adminAuth', adminAuth);
    showToast('Admin token saved', 'success');
  });

  reloadAllBtn?.addEventListener('click', ()=> {
    socket.emit('reloadPlugins');
    showToast('Reload requested', 'info');
    playSound('reload');
  });

  startBtn?.addEventListener('click', ()=> sendAdmin('start'));
  stopBtn?.addEventListener('click', ()=> sendAdmin('stop'));
  restartBtn?.addEventListener('click', ()=> sendAdmin('restart'));

  // dock icons
  $('dock-reload')?.addEventListener('click', ()=> { socket.emit('reloadPlugins'); playSound('reload'); showToast('Reloading...', 'info'); });
  $('dock-start')?.addEventListener('click', ()=> sendAdmin('start'));
  $('dock-stop')?.addEventListener('click', ()=> sendAdmin('stop'));

  // log filtering UI
  document.getElementById('log-search')?.addEventListener('input', renderLogs);
  document.getElementById('log-level')?.addEventListener('change', renderLogs);
  document.getElementById('clear-logs')?.addEventListener('click', ()=> { logs = []; logsEl.innerHTML=''; logCountEl.textContent='0 lines'; showToast('Logs cleared', 'info'); });

  // send admin command with saved token
  function sendAdmin(action){
    const token = localStorage.getItem('adminAuth') || '';
    socket.emit('adminCommand', { action, authToken: token });
    showToast(`Admin: ${action}`, 'info');
  }

  // canvas perf chart (simple)
  const ctx = perfCanvas.getContext('2d');
  let lastDraw = 0;
  // target FPS adaptively: desktop high fps, mobile 30-60
  const targetFps = prefersHighFPS ? 60 : 30;
  const frameInterval = 1000 / targetFps;

  function drawPerf(now) {
    if (!perfCanvas) return;
    if (!lastDraw) lastDraw = now;
    const elapsed = now - lastDraw;
    if (elapsed < frameInterval) {
      requestAnimationFrame(drawPerf);
      return;
    }
    lastDraw = now;
    const w = perfCanvas.width = perfCanvas.clientWidth * devicePixelRatio;
    const h = perfCanvas.height = perfCanvas.clientHeight * devicePixelRatio;
    ctx.clearRect(0,0,w,h);

    // draw background grid
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,w,h);
    ctx.globalAlpha = 1;

    // cpu line
    const cpuArr = perfData.cpu.slice(-60);
    ctx.strokeStyle = 'rgba(0,255,255,0.95)';
    ctx.lineWidth = 2 * devicePixelRatio;
    ctx.beginPath();
    cpuArr.forEach((v,i) => {
      const x = (i / Math.max(1, cpuArr.length-1)) * w;
      const y = h - (Math.min(100, v) / 100) * h;
      if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();

    // ram line
    const ramArr = perfData.ram.slice(-60);
    ctx.strokeStyle = 'rgba(153,102,255,0.95)';
    ctx.lineWidth = 1.5 * devicePixelRatio;
    ctx.beginPath();
    ramArr.forEach((v,i) => {
      const x = (i / Math.max(1, ramArr.length-1)) * w;
      const y = h - (Math.min(1000, v) / Math.max(1000, Math.max(...ramArr,1000)) ) * h;
      if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();

    requestAnimationFrame(drawPerf);
  }
  requestAnimationFrame(drawPerf);

  // visibility
  document.addEventListener('visibilitychange', () => {
    socket.emit('clientVisibility', { visible: !document.hidden });
  });

  // PWA prompt: show install toast if beforeinstallprompt fired
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showToast('Install Cosmic Dashboard?', 'info', {
      actionText: 'Install',
      onAction: () => {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(choice => {
          if (choice.outcome === 'accepted') showToast('Thanks — installed!', 'success'); else showToast('Install dismissed', 'warn');
          deferredPrompt = null;
        });
      }
    });
  });

  // PWA registration (also appended per requirement)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('[PWA] Service Worker registered'))
        .catch((err) => console.warn('[PWA] Registration failed:', err));
    });
  }

  // initial hide overlay when backend ready fallback
  // if server doesn't emit loaderProgress to 100 after 6s, hide overlay to avoid blocking
  setTimeout(() => {
    if (overlay && overlay.style.display !== 'none') {
      overlay.classList.add('hide');
      setTimeout(() => { overlay.style.display = 'none'; app.hidden = false; }, 300);
    }
  }, 6000);

  // small UX: toggle theme
  $('theme-toggle')?.addEventListener('click', () => {
    document.documentElement.classList.toggle('light');
    const isLight = document.documentElement.classList.contains('light');
    localStorage.setItem('cosmicThemeLight', isLight ? '1' : '0');
    showToast(isLight ? 'Light mode' : 'Dark mode', 'info');
  });

  // mute toggle
  $('mute-toggle')?.addEventListener('click', () => {
    muted = !muted;
    localStorage.setItem('botMuted', JSON.stringify(muted));
    showToast(muted ? 'Muted' : 'Unmuted', 'info');
  });

  // small helper: update version.txt fetch
  fetch('/version.txt').then(r => r.text()).then(v => {
    if (v) {
      versionTag.textContent = v.trim();
      $('versionFooter').textContent = v.trim();
    }
  }).catch(()=>{});

})();