// ============================================================
// CASALFIT — app.js
// ============================================================

const STORAGE_KEY  = 'casalfit_v3';
const DIAS_SEMANA  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'];
const PTS_PER_TREINO = 10;

// Geolocation state
let geoWatchId   = null;
let geoEnabled   = false;
let geoAlerted   = false;
let gymLat       = null;
let gymLng       = null;
const GYM_RADIUS = 300; // metros

// ============================================================
// SPLASH
// ============================================================
(function initSplash() {
  // Set photo
  const img = document.getElementById('splashPhoto');
  if (window.COUPLE_PHOTO) img.src = window.COUPLE_PHOTO;

  // Animate progress bar
  const bar = document.getElementById('splashProgress');
  let pct = 0;
  const step = () => {
    pct += 2;
    bar.style.width = pct + '%';
    if (pct < 100) {
      setTimeout(step, 28);
    } else {
      setTimeout(showApp, 300);
    }
  };
  setTimeout(step, 400);
})();

function showApp() {
  const splash = document.getElementById('splash');
  const app    = document.getElementById('app');
  splash.classList.add('fade-out');
  app.classList.remove('hidden');
  setTimeout(() => { splash.style.display = 'none'; }, 700);
  initApp();
}

// ============================================================
// STORAGE
// ============================================================
function getData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveData(d) { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }

// ============================================================
// DATE
// ============================================================
function todayStr() { return new Date().toISOString().split('T')[0]; }

function getLastSevenDays() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

// ============================================================
// STATE
// ============================================================
let currentPlayer = 'neto';

// ============================================================
// PLAYER SWITCH
// ============================================================
function setPlayer(player) {
  currentPlayer = player;
  document.body.classList.toggle('player-neto',   player === 'neto');
  document.body.classList.toggle('player-camila', player === 'camila');

  const tabs = ['neto','camila'];
  tabs.forEach(p => {
    const el = document.getElementById('tab' + capitalize(p));
    el.classList.remove('active','neto-active','camila-active');
  });
  const activeTab = document.getElementById('tab' + capitalize(player));
  activeTab.classList.add('active', player + '-active');

  limparFormulario();
  renderForPlayer();
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ============================================================
// POINTS
// ============================================================
function calcPontos() { return PTS_PER_TREINO; }

// ============================================================
// ADD TREINO
// ============================================================
function adicionarTreino() {
  const selecionados = [...document.querySelectorAll('.grupo-btn.selected')]
    .map(b => b.dataset.grupo);

  if (!selecionados.length) { showToast('Selecione um grupo muscular'); return; }

  const pts  = calcPontos();
  const data = getData();
  data.push({
    id: Date.now(),
    player: currentPlayer,
    nome: selecionados.join(' + '),
    pts,
    data: todayStr(),
    hora: new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }),
  });

  saveData(data);
  limparFormulario();
  render();
  showToast('+' + pts + ' pontos adicionados!');
}

function deletar(id) {
  saveData(getData().filter(t => t.id !== id));
  render();
  showToast('Treino removido');
}

function limparFormulario() {
  document.querySelectorAll('.grupo-btn.selected').forEach(b => b.classList.remove('selected'));
}

// ============================================================
// RENDER DUEL
// ============================================================
function renderDuel(all) {
  const ptN = all.filter(t => t.player==='neto').reduce((a,t) => a+(t.pts||0), 0);
  const ptC = all.filter(t => t.player==='camila').reduce((a,t) => a+(t.pts||0), 0);

  document.getElementById('ptNeto').textContent   = ptN;
  document.getElementById('ptCamila').textContent = ptC;

  const total = ptN + ptC || 1;
  const pN = Math.round((ptN/total)*100);
  const pC = 100 - pN;

  document.getElementById('progNeto').style.width   = pN + '%';
  document.getElementById('progCamila').style.width = pC + '%';
  document.getElementById('progLabelNeto').textContent   = pN + '%';
  document.getElementById('progLabelCamila').textContent = pC + '%';

  const status = document.getElementById('duelStatus');
  if (ptN > ptC) status.textContent = 'Neto lidera';
  else if (ptC > ptN) status.textContent = 'Camila lidera';
  else status.textContent = 'Empate';
}

// ============================================================
// RENDER STATS
// ============================================================
function renderStats(hj, semana, all) {
  const ptsHoje = hj.reduce((a,t) => a+(t.pts||0), 0);
  document.getElementById('totalHoje').textContent    = hj.length;
  document.getElementById('totalSemana').textContent  = all.filter(t => t.player===currentPlayer && semana.includes(t.data)).length;
  document.getElementById('totalPtsHoje').textContent = ptsHoje;

  // Tab sub-labels
  const treinosN = all.filter(t=>t.player==='neto').length;
  const treinosC = all.filter(t=>t.player==='camila').length;
  document.getElementById('tabNetoSub').textContent   = treinosN + (treinosN===1?' treino':' treinos');
  document.getElementById('tabCamilaSub').textContent = treinosC + (treinosC===1?' treino':' treinos');
}

// ============================================================
// RENDER CHART
// ============================================================
function renderChart(semana, hoje, all) {
  const playerData = all.filter(t => t.player===currentPlayer);
  const maxDia = Math.max(1, ...semana.map(d => playerData.filter(t=>t.data===d).length));
  const barsEl = document.getElementById('barsContainer');
  const ptsEl  = document.getElementById('chartPtsRow');
  barsEl.innerHTML = '';
  ptsEl.innerHTML  = '';

  semana.forEach(d => {
    const count   = playerData.filter(t=>t.data===d).length;
    const pts     = playerData.filter(t=>t.data===d).reduce((a,t)=>a+(t.pts||0),0);
    const pct     = count > 0 ? Math.max(10, Math.round((count/maxDia)*100)) : 0;
    const isToday = d === hoje;
    const dayObj  = new Date(d + 'T12:00:00');
    const dayName = DIAS_SEMANA[dayObj.getDay()];

    const wrap = document.createElement('div');
    wrap.className = 'bar-wrap' + (isToday ? ' today' : '');
    wrap.innerHTML = `
      <div class="bar${count===0?' empty':''}" style="height:${pct}%"></div>
      <div class="bar-day">${dayName}</div>
    `;
    barsEl.appendChild(wrap);

    const ptsDay = document.createElement('div');
    ptsDay.className = 'chart-day-pts';
    ptsDay.textContent = pts > 0 ? pts+'p' : '';
    ptsEl.appendChild(ptsDay);
  });
}

// ============================================================
// RENDER WORKOUT LIST
// ============================================================
function renderWorkoutList(hj) {
  const container = document.getElementById('workoutList');
  const cls = currentPlayer==='neto' ? 'neto-item' : 'camila-item';

  if (!hj.length) {
    container.innerHTML = `
      <div class="empty-card">
        <div class="empty-title">Nenhum treino hoje</div>
        <div class="empty-sub">Registre seu primeiro treino acima<br>e comece a somar pontos!</div>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="workout-list-inner">` +
    hj.slice().reverse().map(t => `
      <div class="workout-item ${cls}">
        <div class="workout-body">
          <div class="workout-name">${t.nome}</div>
          <div class="workout-meta">
            <span>${t.hora}</span>
          </div>
        </div>
        <div class="workout-right">
          <div class="workout-pts" style="font-size:14px">+${t.pts||0} pts</div>
          <button class="delete-btn" onclick="deletar(${t.id})">&#x2715;</button>
        </div>
      </div>`).join('') +
  `</div>`;
}

// ============================================================
// RENDER RANKING
// ============================================================
function renderRanking(all) {
  const ptN = all.filter(t=>t.player==='neto').reduce((a,t)=>a+(t.pts||0),0);
  const ptC = all.filter(t=>t.player==='camila').reduce((a,t)=>a+(t.pts||0),0);
  const trN = all.filter(t=>t.player==='neto').length;
  const trC = all.filter(t=>t.player==='camila').length;
  const maxPts = Math.max(1, ptN, ptC);

  const players = [
    { key:'neto',   label:'Neto',   pts:ptN, tr:trN, pct:Math.round((ptN/maxPts)*100), av:'r-neto',   fill:'fill-neto'   },
    { key:'camila', label:'Camila', pts:ptC, tr:trC, pct:Math.round((ptC/maxPts)*100), av:'r-camila', fill:'fill-camila' },
  ].sort((a,b) => b.pts - a.pts);

  const el = document.getElementById('rankingWrap');
  el.innerHTML = players.map((p,i) => {
    const medal   = i===0 ? '1o' : '2o';
    const pClass  = i===0 ? 'p1' : 'p2';
    const isLead  = i===0 && p.pts > (players[1]?.pts || 0);
    return `
      <div class="rank-row${isLead?' leader-row':''}">
        ${isLead ? '<div class="rank-crown">&#x1F451;</div>' : ''}
        <div class="rank-pos ${pClass}">${medal}</div>
        <div class="rank-avatar ${p.av}">${p.label.charAt(0)}</div>
        <div class="rank-body">
          <div class="rank-name">${p.label}</div>
          <div class="rank-bar-bg">
            <div class="rank-bar-fill ${p.fill}" style="width:${p.pct}%"></div>
          </div>
        </div>
        <div class="rank-pts-block">
          <div class="rank-pts-num">${p.pts}</div>
          <div class="rank-pts-meta">${p.tr} treino${p.tr!==1?'s':''}</div>
        </div>
      </div>`;
  }).join('');
}

// ============================================================
// RENDER
// ============================================================
function renderForPlayer() {
  const all    = getData();
  const hoje   = todayStr();
  const hj     = all.filter(t => t.player===currentPlayer && t.data===hoje);
  const semana = getLastSevenDays();
  renderStats(hj, semana, all);
  renderChart(semana, hoje, all);
  renderWorkoutList(hj);
}

function render() {
  const all = getData();
  renderDuel(all);
  renderRanking(all);
  renderForPlayer();
}

// ============================================================
// TOAST
// ============================================================
let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}

// ============================================================
// GEOLOCATION — ACADEMIA ALERT
// ============================================================
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const φ1 = lat1 * Math.PI/180, φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1)*Math.PI/180, Δλ = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const beep = (freq, start, dur) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.4, ctx.currentTime+start);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime+start+dur);
      osc.start(ctx.currentTime+start);
      osc.stop(ctx.currentTime+start+dur+0.05);
    };
    beep(523, 0, 0.2);
    beep(659, 0.22, 0.2);
    beep(784, 0.44, 0.35);
  } catch(e) {}
}

function toggleGeo() {
  if (geoEnabled) { disableGeo(); return; }
  if (!('geolocation' in navigator)) {
    showToast('Geolocalizacao nao disponivel');
    return;
  }

  // Ask user to set the gym location first
  const r = confirm(
    'Alerta de academia ativado!\n\n' +
    'Sua posicao ATUAL sera salva como a localizacao da academia.\n\n' +
    'Va ate a academia e ative novamente, OU pressione OK para usar sua posicao atual como referencia.'
  );

  if (!r) return;

  navigator.geolocation.getCurrentPosition(pos => {
    gymLat = pos.coords.latitude;
    gymLng = pos.coords.longitude;
    startGeoWatch();
    showToast('Academia registrada! Monitorando...');
  }, () => { showToast('Permissao de localizacao negada'); });
}

function startGeoWatch() {
  geoEnabled = true;
  geoAlerted = false;
  document.getElementById('geoBtn').classList.add('active');
  document.getElementById('geoBanner').classList.remove('hidden');
  document.getElementById('geoBannerText').textContent = 'Monitorando localizacao — Academia registrada';

  geoWatchId = navigator.geolocation.watchPosition(pos => {
    if (!gymLat) return;
    const dist = haversineMeters(pos.coords.latitude, pos.coords.longitude, gymLat, gymLng);
    const bannerTxt = document.getElementById('geoBannerText');
    bannerTxt.textContent = 'Academia a ' + Math.round(dist) + 'm de distancia';

    if (dist <= GYM_RADIUS && !geoAlerted) {
      geoAlerted = true;
      playAlertSound();
      showToast('Voce chegou perto da academia! Hora de treinar!');
      // Browser notification if allowed
      if (Notification.permission === 'granted') {
        new Notification('CasalFit', {
          body: 'Voce esta perto da academia! Hora de treinar!',
          icon: ''
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(p => {
          if (p === 'granted') {
            new Notification('CasalFit', { body: 'Voce esta perto da academia!' });
          }
        });
      }
    }
    if (dist > GYM_RADIUS + 50) { geoAlerted = false; }
  }, () => {
    showToast('Erro ao obter localizacao');
  }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 });
}

function disableGeo() {
  if (geoWatchId !== null) navigator.geolocation.clearWatch(geoWatchId);
  geoWatchId = null;
  geoEnabled = false;
  gymLat = gymLng = null;
  document.getElementById('geoBtn').classList.remove('active');
  document.getElementById('geoBanner').classList.add('hidden');
  showToast('Monitoramento desativado');
}

// ============================================================
// INIT
// ============================================================
function initApp() {
  // Date badge
  document.getElementById('dateBadge').textContent =
    new Date().toLocaleDateString('pt-BR', { weekday:'short', day:'numeric', month:'short' });

  // Grupos toggle
  document.getElementById('gruposGrid').addEventListener('click', e => {
    const btn = e.target.closest('.grupo-btn');
    if (btn) btn.classList.toggle('selected');
  });

  // Set initial player
  setPlayer('neto');

  // Request notification permission proactively (optional)
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}
