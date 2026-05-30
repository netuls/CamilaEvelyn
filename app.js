// ============================================================
// Constants
// ============================================================
const STORAGE_KEY = 'casalfit_v2';
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const PLAYERS = ['neto', 'camila'];

// Sistema de pontos
// +1 pt por treino registrado
// +1 pt a cada 30 min de treino
// +1 pt a cada 200 kcal
// +2 pts extra se treinar todo dia da semana (bônus no final)
function calcPontos(duracao, kcal, grupos) {
  let pts = 1; // ponto base por registrar
  pts += Math.floor(duracao / 30);                   // +1 a cada 30 min
  if (kcal) pts += Math.floor(kcal / 200);           // +1 a cada 200 kcal
  if (grupos.length >= 3) pts += 1;                  // +1 por treino completo (3+ grupos)
  return pts;
}

// ============================================================
// State
// ============================================================
let currentPlayer = 'neto'; // 'neto' | 'camila'

// ============================================================
// Storage
// ============================================================
function getData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ============================================================
// Date helpers
// ============================================================
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

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
// Player switching
// ============================================================
function setPlayer(player) {
  currentPlayer = player;
  document.body.classList.remove('player-neto', 'player-camila');
  document.body.classList.add(`player-${player}`);

  document.getElementById('tabNeto').classList.remove('active');
  document.getElementById('tabCamila').classList.remove('active');
  document.getElementById(`tab${player.charAt(0).toUpperCase() + player.slice(1)}`).classList.add('active');

  // Limpa seleção de grupos ao trocar
  limparFormulario();
  renderForPlayer();
}

// ============================================================
// Actions
// ============================================================
function adicionarTreino() {
  const selecionados = [...document.querySelectorAll('.grupo-btn.selected')]
    .map(b => b.dataset.grupo);

  if (selecionados.length === 0) {
    alert('Selecione ao menos um grupo muscular!');
    return;
  }

  const duracao = parseInt(document.getElementById('duracaoInput').value) || 0;
  const kcal    = parseInt(document.getElementById('kcalInput').value) || 0;

  if (!duracao) {
    alert('Informe a duração!');
    return;
  }

  const pts = calcPontos(duracao, kcal, selecionados);

  const data = getData();
  data.push({
    id: Date.now(),
    player: currentPlayer,
    nome: selecionados.join(' + '),
    duracao,
    kcal,
    pts,
    data: todayStr(),
    hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  });

  saveData(data);
  limparFormulario();
  render();

  // Animação de sucesso
  const btn = document.getElementById('btnAdicionar');
  const orig = btn.textContent;
  btn.textContent = '✅ Treino salvo!';
  setTimeout(() => { btn.textContent = orig; }, 1500);
}

function deletar(id) {
  const data = getData().filter(t => t.id !== id);
  saveData(data);
  render();
}

function limparFormulario() {
  document.querySelectorAll('.grupo-btn.selected').forEach(b => b.classList.remove('selected'));
  document.getElementById('duracaoInput').value = '';
  document.getElementById('kcalInput').value    = '';
  document.getElementById('ptsEstimado').textContent = '—';
}

// ============================================================
// Points total por jogador
// ============================================================
function totalPontosPorJogador(all, player) {
  return all.filter(t => t.player === player).reduce((a, t) => a + (t.pts || 0), 0);
}

// ============================================================
// Render duelo / header
// ============================================================
function renderDuelo(all) {
  const ptNeto   = totalPontosPorJogador(all, 'neto');
  const ptCamila = totalPontosPorJogador(all, 'camila');

  document.getElementById('ptNeto').textContent   = `${ptNeto} pts`;
  document.getElementById('ptCamila').textContent = `${ptCamila} pts`;

  const total = ptNeto + ptCamila || 1;
  const pctNeto   = Math.round((ptNeto / total) * 100);
  const pctCamila = 100 - pctNeto;

  document.getElementById('netoFill').style.width   = `${pctNeto}%`;
  document.getElementById('camilaFill').style.width = `${pctCamila}%`;

  const badge = document.getElementById('leaderBadge');
  if (ptNeto > ptCamila)        badge.textContent = '🔵';
  else if (ptCamila > ptNeto)   badge.textContent = '🩷';
  else                          badge.textContent = '🤝';
}

// ============================================================
// Render stats for current player
// ============================================================
function renderStats(hj, semana, all) {
  const ptsHoje = hj.reduce((a, t) => a + (t.pts || 0), 0);
  document.getElementById('totalHoje').textContent    = hj.length;
  document.getElementById('totalMinutos').textContent = hj.reduce((a, t) => a + t.duracao, 0);
  document.getElementById('totalSemana').textContent  = all.filter(t => t.player === currentPlayer && semana.includes(t.data)).length;
  document.getElementById('totalPts').textContent     = ptsHoje;
}

// ============================================================
// Render week chart (current player)
// ============================================================
function renderWeekChart(semana, hoje, all) {
  const playerData = all.filter(t => t.player === currentPlayer);
  const maxDia = Math.max(1, ...semana.map(d => playerData.filter(t => t.data === d).length));
  const barsEl = document.getElementById('barsContainer');
  barsEl.innerHTML = '';

  semana.forEach(d => {
    const count   = playerData.filter(t => t.data === d).length;
    const pct     = count > 0 ? Math.max(12, Math.round((count / maxDia) * 100)) : 0;
    const isToday = d === hoje;
    const dayObj  = new Date(d + 'T12:00:00');
    const dayName = DIAS_SEMANA[dayObj.getDay()];

    const wrap = document.createElement('div');
    wrap.className = `bar-wrap${isToday ? ' bar-today' : ''}`;
    wrap.innerHTML = `
      <div class="bar${count === 0 ? ' empty' : ''}" style="height:${pct}%"></div>
      <div class="bar-day">${dayName}</div>
    `;
    barsEl.appendChild(wrap);
  });
}

// ============================================================
// Render workout list (current player, today)
// ============================================================
function renderWorkoutList(hj) {
  const list = document.getElementById('workoutList');
  const emoji = currentPlayer === 'neto' ? '💪' : '🌸';
  const cls   = currentPlayer === 'neto' ? 'neto-item' : 'camila-item';

  if (hj.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="emoji">${emoji}</span>
        <p>Nenhum treino hoje.<br>Bora começar!</p>
      </div>`;
    return;
  }

  list.innerHTML = hj.slice().reverse().map(t => {
    const pts = t.pts || 0;
    return `
      <div class="workout-item ${cls}">
        <div class="workout-emoji">${emoji}</div>
        <div class="workout-info">
          <div class="workout-name">${t.nome}</div>
          <div class="workout-meta">
            ${t.kcal ? `<span>🔥 ${t.kcal} kcal</span>` : ''}
            <span>⏰ ${t.hora}</span>
          </div>
        </div>
        <div class="workout-right">
          <div class="workout-time">${t.duracao}<span class="unit">min</span></div>
          <div class="workout-pts-badge">+${pts} pts</div>
          <button class="delete-btn" onclick="deletar(${t.id})">✕</button>
        </div>
      </div>`;
  }).join('');
}

// ============================================================
// Render ranking
// ============================================================
function renderRanking(all) {
  const ptNeto   = totalPontosPorJogador(all, 'neto');
  const ptCamila = totalPontosPorJogador(all, 'camila');
  const maxPts   = Math.max(1, ptNeto, ptCamila);

  const players = [
    { key: 'neto',   label: 'Neto',   pts: ptNeto,   pct: Math.round((ptNeto / maxPts) * 100) },
    { key: 'camila', label: 'Camila', pts: ptCamila, pct: Math.round((ptCamila / maxPts) * 100) },
  ].sort((a, b) => b.pts - a.pts);

  const el = document.getElementById('rankingCard');
  el.innerHTML = players.map((p, i) => {
    const pos      = i === 0 ? '🥇' : '🥈';
    const posClass = i === 0 ? 'gold' : 'silver';
    const avClass  = p.key === 'neto' ? 'rank-neto' : 'rank-camila';
    const barClass = p.key === 'neto' ? 'rank-bar-neto' : 'rank-bar-camila';
    const treinos  = all.filter(t => t.player === p.key).length;
    const leader   = i === 0 && players[0].pts > (players[1] ? players[1].pts : 0);

    return `
      <div class="rank-row${leader ? ' leader' : ''}">
        ${leader ? '<div class="rank-crown">👑</div>' : ''}
        <div class="rank-pos ${posClass}">${pos}</div>
        <div class="rank-avatar ${avClass}">${p.label.charAt(0)}</div>
        <div class="rank-info">
          <div class="rank-name">${p.label}</div>
          <div class="rank-bar-bg">
            <div class="rank-bar-fill ${barClass}" style="width:${p.pct}%"></div>
          </div>
        </div>
        <div style="text-align:right">
          <div class="rank-pts">${p.pts}</div>
          <div class="rank-pts-label">${treinos} treinos</div>
        </div>
      </div>`;
  }).join('');
}

// ============================================================
// Render para o jogador atual
// ============================================================
function renderForPlayer() {
  const all    = getData();
  const hoje   = todayStr();
  const hj     = all.filter(t => t.player === currentPlayer && t.data === hoje);
  const semana = getLastSevenDays();

  renderStats(hj, semana, all);
  renderWeekChart(semana, hoje, all);
  renderWorkoutList(hj);
}

// ============================================================
// Render global
// ============================================================
function render() {
  const all = getData();
  renderDuelo(all);
  renderRanking(all);
  renderForPlayer();
}

// ============================================================
// Estimativa de pontos ao vivo
// ============================================================
function atualizarPtsEstimado() {
  const selecionados = [...document.querySelectorAll('.grupo-btn.selected')];
  const duracao = parseInt(document.getElementById('duracaoInput').value) || 0;
  const kcal    = parseInt(document.getElementById('kcalInput').value) || 0;

  if (duracao > 0) {
    const pts = calcPontos(duracao, kcal, selecionados.map(b => b.dataset.grupo));
    document.getElementById('ptsEstimado').textContent = `+${pts} pts`;
  } else {
    document.getElementById('ptsEstimado').textContent = '—';
  }
}

// ============================================================
// Init
// ============================================================
(function init() {
  // Date badge
  const opts = { weekday: 'short', day: 'numeric', month: 'short' };
  document.getElementById('dateBadge').textContent =
    new Date().toLocaleDateString('pt-BR', opts);

  // Grupo toggle
  document.getElementById('gruposGrid').addEventListener('click', e => {
    const btn = e.target.closest('.grupo-btn');
    if (btn) {
      btn.classList.toggle('selected');
      atualizarPtsEstimado();
    }
  });

  // Live pts preview
  document.getElementById('duracaoInput').addEventListener('input', atualizarPtsEstimado);
  document.getElementById('kcalInput').addEventListener('input', atualizarPtsEstimado);

  // Inicia como Neto
  setPlayer('neto');
})();
