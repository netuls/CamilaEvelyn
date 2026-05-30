// ============================================================
// Constants
// ============================================================
const STORAGE_KEY = 'meustreino_v1';

const TIPO  = 'musculacao';
const EMOJI = '💪';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// ============================================================
// Storage helpers
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

  const data = getData();
  data.push({
    id: Date.now(),
    tipo: TIPO,
    nome: selecionados.join(' + '),
    duracao,
    kcal,
    data: todayStr(),
    hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  });

  saveData(data);
  limparFormulario();
  render();
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
}

// ============================================================
// Render helpers
// ============================================================
function renderStats(hj, semana, all) {
  document.getElementById('totalHoje').textContent    = hj.length;
  document.getElementById('totalMinutos').textContent = hj.reduce((a, t) => a + t.duracao, 0);

  const totalSemana = all.filter(t => semana.includes(t.data)).length;
  document.getElementById('totalSemana').textContent = totalSemana;
}

function renderWeekChart(semana, hoje, all) {
  const maxDia  = Math.max(1, ...semana.map(d => all.filter(t => t.data === d).length));
  const barsEl  = document.getElementById('barsContainer');
  barsEl.innerHTML = '';

  semana.forEach(d => {
    const count   = all.filter(t => t.data === d).length;
    const pct     = count > 0 ? Math.max(10, Math.round((count / maxDia) * 100)) : 0;
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

function renderWorkoutList(hj) {
  const list = document.getElementById('workoutList');

  if (hj.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="emoji">💪</span>
        <p>Nenhum treino registrado hoje.<br>Adicione seu primeiro treino acima!</p>
      </div>
    `;
    return;
  }

  list.innerHTML = hj.slice().reverse().map(t => {
    return `
      <div class="workout-item musculacao">
        <div class="workout-emoji">${EMOJI}</div>
        <div class="workout-info">
          <div class="workout-name">${t.nome}</div>
          <div class="workout-meta">
            ${t.kcal ? `<span>🔥 ${t.kcal} kcal</span>` : ''}
            <span>⏰ ${t.hora}</span>
          </div>
        </div>
        <div class="workout-right">
          <div class="workout-time">
            ${t.duracao}<span class="unit">min</span>
          </div>
          <button class="delete-btn" onclick="deletar(${t.id})">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================
// Main render
// ============================================================
function render() {
  const all    = getData();
  const hoje   = todayStr();
  const hj     = all.filter(t => t.data === hoje);
  const semana = getLastSevenDays();

  renderStats(hj, semana, all);
  renderWeekChart(semana, hoje, all);
  renderWorkoutList(hj);
}

// ============================================================
// Init
// ============================================================
(function init() {
  // Set date badge
  const opts = { weekday: 'short', day: 'numeric', month: 'short' };
  document.getElementById('dateBadge').textContent =
    new Date().toLocaleDateString('pt-BR', opts);

  // Pill toggle
  document.getElementById('gruposGrid').addEventListener('click', e => {
    const btn = e.target.closest('.grupo-btn');
    if (btn) btn.classList.toggle('selected');
  });

  render();
})();
