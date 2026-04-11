/* ============================================================
   DONNÉES DE DÉMO
   Simule une garde-robe (normalement lue depuis localStorage
   via le scanner, clé "wardrobe")
============================================================ */
const DEMO_WARDROBE = [
  { id: 'w1', type: 'Chemise',  brand: 'Sandro',       size: 'M',  colors: ['#FDFCFA', '#5B7FA6'], emoji: '👔', img: '' },
  { id: 'w2', type: 'Jean',     brand: 'APC',           size: '30', colors: ['#3C4A5C', '#1C1A16'], emoji: '👖', img: '' },
  { id: 'w3', type: 'Pull',     brand: 'Uniqlo',        size: 'L',  colors: ['#8B5C3A', '#E8D5A3'], emoji: '🧥', img: '' },
  { id: 'w4', type: 'Robe',     brand: 'Isabel Marant', size: '38', colors: ['#C8572A', '#F7B5C8'], emoji: '👗', img: '' },
  { id: 'w5', type: 'Veste',    brand: 'Jacquemus',     size: 'S',  colors: ['#1C1A16'],            emoji: '🧥', img: '' },
  { id: 'w6', type: 'Pantalon', brand: 'COS',           size: '36', colors: ['#B0B0B0'],            emoji: '👖', img: '' },
  { id: 'w7', type: 'T-shirt',  brand: 'Muji',          size: 'M',  colors: ['#FDFCFA'],            emoji: '👕', img: '' },
  { id: 'w8', type: 'Manteau',  brand: 'Maje',          size: 'S',  colors: ['#8B7355'],            emoji: '🧥', img: '' },
  { id: 'w9', type: 'Short',    brand: 'H&M',           size: 'M',  colors: ['#5B7FA6'],            emoji: '🩳', img: '' },
];

const CATEGORIES = ['Tous', 'Chemise', 'Jean', 'Pull', 'Robe', 'Veste', 'Pantalon', 'T-shirt', 'Manteau', 'Short'];

/* ============================================================
   ÉTAT GLOBAL
============================================================ */

/* Garde-robe : depuis localStorage (scanner) ou démo */
let wardrobe = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem('wardrobe') || '[]');
    return saved.length
      ? saved.map((item, i) => ({ id: item.id || `w${i}`, emoji: getEmoji(item.type), ...item }))
      : DEMO_WARDROBE;
  } catch { return DEMO_WARDROBE; }
})();

/* Agenda : map "YYYY-MM-DD" → { garmentId, mode: 'worn'|'planned' } */
let agenda = (() => {
  try { return JSON.parse(localStorage.getItem('calendar') || '{}'); }
  catch { return {}; }
})();

let currentMonth  = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let selectedDay   = null;   /* clé YYYY-MM-DD du jour sélectionné */
let pickerMode    = 'worn'; /* 'worn' ou 'planned' */
let pickerSelected = null;  /* id du vêtement choisi dans le picker */
let activeFilter  = 'Tous'; /* filtre catégorie actif */

/* ============================================================
   UTILITAIRES DATE
============================================================ */

/* Formate une Date en clé "YYYY-MM-DD" */
function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayKey() { return toKey(new Date()); }

/* Formate une clé en libellé lisible ex: "Mardi 1 Avril" */
function formatDayLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const jours = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const mois  = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  return `${jours[date.getDay()]} ${d} ${mois[m - 1]}`;
}

/* Vérifie si une clé de date est passée ou aujourd'hui */
function isPast(dateStr) { return dateStr <= todayKey(); }

/* ============================================================
   EMOJI PAR TYPE
============================================================ */
function getEmoji(type) {
  const map = {
    'T-shirt':'👕','Chemise':'👔','Pull':'🧥','Veste':'🧥',
    'Manteau':'🧥','Pantalon':'👖','Jean':'👖','Short':'🩳',
    'Robe':'👗','Jupe':'👗','Costume':'🤵','Chaussures':'👟','Accessoire':'🎩'
  };
  return map[type] || '👔';
}

/* ============================================================
   PERSISTANCE
============================================================ */
function saveAgenda() {
  try { localStorage.setItem('calendar', JSON.stringify(agenda)); } catch {}
}

/* ============================================================
   RENDU DU CALENDRIER
============================================================ */
function renderCalendar() {
  const grid  = document.getElementById('calendarGrid');
  const today = todayKey();
  grid.innerHTML = '';

  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDay  = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  /* Décalage : lundi = premier jour de semaine */
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    const dayOffset = i - startOffset;
    const date = new Date(firstDay);
    date.setDate(date.getDate() + dayOffset);
    const key     = toKey(date);
    const inMonth = date.getMonth() === currentMonth.getMonth();
    const entry   = agenda[key];

    const cell = document.createElement('div');
    cell.className = 'day-cell';
    if (!inMonth)               cell.classList.add('other-month');
    if (key === today)          cell.classList.add('is-today');
    if (key === selectedDay)    cell.classList.add('selected');
    if (entry?.mode === 'worn')    cell.classList.add('has-worn');
    if (entry?.mode === 'planned') cell.classList.add('has-planned');

    /* Numéro du jour */
    const num = document.createElement('div');
    num.className = 'day-num';
    num.textContent = date.getDate();
    cell.appendChild(num);

    /* Point + pastilles couleur si tenue enregistrée */
    if (entry && inMonth) {
      const dot = document.createElement('div');
      dot.className = 'day-dot';
      cell.appendChild(dot);

      const garment = wardrobe.find(w => w.id === entry.garmentId);
      if (garment?.colors?.length) {
        const preview = document.createElement('div');
        preview.className = 'day-preview';
        garment.colors.slice(0, 2).forEach(hex => {
          const c = document.createElement('div');
          c.className = 'day-color';
          c.style.background = hex;
          preview.appendChild(c);
        });
        cell.appendChild(preview);
      }
    }

    if (inMonth) cell.addEventListener('click', () => openDay(key));
    grid.appendChild(cell);
  }

  updateHeader();
}

/* ============================================================
   MISE À JOUR DE L'EN-TÊTE
============================================================ */
function updateHeader() {
  const mois = ['Janvier','Février','Mars','Avril','Mai','Juin',
                 'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

  document.getElementById('monthTitle').textContent =
    `${mois[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

  const prefix = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2,'0')}`;
  const count  = Object.keys(agenda).filter(k => k.startsWith(prefix)).length;
  document.getElementById('monthSub').textContent =
    count === 0 ? 'Aucune tenue enregistrée'
    : `${count} tenue${count > 1 ? 's' : ''} enregistrée${count > 1 ? 's' : ''}`;
}

/* ============================================================
   NAVIGATION ENTRE MOIS
============================================================ */
function shiftMonth(delta) {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1);
  renderCalendar();
  if (selectedDay) closePanel();
}

/* ============================================================
   PANNEAU JOUR — OUVERTURE
============================================================ */
function openDay(key) {
  selectedDay = key;
  renderCalendar();

  document.getElementById('panelDate').textContent = formatDayLabel(key);

  const entry   = agenda[key];
  const past    = isPast(key);
  const isToday = key === todayKey();

  renderPanel(key, entry, past, isToday);
  document.getElementById('dayPanel').classList.add('open');
}

/* ============================================================
   RENDU DU CONTENU DU PANNEAU
============================================================ */
function renderPanel(key, entry, past, isToday) {
  const body    = document.getElementById('panelBody');
  const actions = document.getElementById('panelActions');
  const status  = document.getElementById('panelStatus');

  body.innerHTML    = '';
  actions.innerHTML = '';

  if (entry) {
    /* Tenue déjà enregistrée */
    const garment = wardrobe.find(w => w.id === entry.garmentId);
    status.textContent = entry.mode === 'worn' ? 'Tenue portée' : 'Tenue planifiée';

    body.innerHTML = `
      <div class="outfit-card">
        <div class="outfit-thumb">
          ${garment?.img ? `<img src="${garment.img}" alt="">` : `<span>${garment?.emoji || '👔'}</span>`}
        </div>
        <div class="outfit-info">
          <div class="outfit-name">${garment?.brand || garment?.type || 'Vêtement'}</div>
          <div class="outfit-meta">${garment?.type || ''}${garment?.size ? ' · ' + garment.size : ''}</div>
        </div>
        <span class="outfit-badge ${entry.mode}">${entry.mode === 'worn' ? 'Porté' : 'Planifié'}</span>
      </div>`;

    actions.innerHTML = `
      <button class="action-btn" onclick="openPicker('${key}', '${entry.mode}')">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M2 9.5V11h1.5l5-5L7 4.5l-5 5zM10.7 3.8a.9.9 0 000-1.3l-1.2-1.2a.9.9 0 00-1.3 0L7 2.5l2.5 2.5 1.2-1.2z" fill="currentColor"/>
        </svg>
        Changer
      </button>
      <button class="action-btn danger" onclick="removeEntry('${key}')">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M2 3.5h9M5 3.5V2.5h3v1M5.5 5.5v4M7.5 5.5v4M3 3.5l.5 7h6l.5-7" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
        </svg>
        Supprimer
      </button>`;

  } else if (past || isToday) {
    /* Passé ou aujourd'hui : enregistrer ce qui a été porté */
    status.textContent = isToday ? "Aujourd'hui" : 'Aucune tenue';

    body.innerHTML = `
      <div class="panel-empty">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M10 14a6 6 0 1112 0v2H10v-2z" stroke="#A8A49F" stroke-width="1.2"/>
          <rect x="8" y="16" width="16" height="10" rx="2" stroke="#A8A49F" stroke-width="1.2"/>
        </svg>
        <div>${past ? 'Que portiez-vous ce jour ?' : "Que portez-vous aujourd'hui ?"}</div>
      </div>`;

    actions.innerHTML = `
      <button class="action-btn primary" onclick="openPicker('${key}', 'worn')">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M6.5 2v9M2 6.5h9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
        Enregistrer la tenue
      </button>`;

  } else {
    /* Futur : planifier (premium) */
    status.textContent = 'Jour à venir';

    body.innerHTML = `
      <div class="panel-empty">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect x="5" y="7" width="22" height="20" rx="3" stroke="#A8A49F" stroke-width="1.2"/>
          <path d="M5 13h22M11 4v6M21 4v6" stroke="#A8A49F" stroke-width="1.2" stroke-linecap="round"/>
        </svg>
        <div>Planifier une tenue pour ce jour</div>
      </div>`;

    actions.innerHTML = `
      <button class="action-btn primary" onclick="openPicker('${key}', 'planned')">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M6.5 2v9M2 6.5h9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
        Planifier
      </button>
      <span style="font-size:9px;color:var(--ink3);align-self:center;letter-spacing:.06em;">Premium</span>`;
  }
}

/* ============================================================
   FERMETURE DU PANNEAU JOUR
============================================================ */
function closePanel() {
  document.getElementById('dayPanel').classList.remove('open');
  selectedDay = null;
  renderCalendar();
}

/* ============================================================
   SUPPRESSION D'UNE ENTRÉE
============================================================ */
function removeEntry(key) {
  delete agenda[key];
  saveAgenda();
  closePanel();
  renderCalendar();
  renderRepetitionPanel();
  showToast('Tenue supprimée');
}

/* ============================================================
   PICKER — OUVERTURE
============================================================ */
function openPicker(key, mode) {
  pickerMode     = mode;
  pickerSelected = agenda[key]?.garmentId || null;
  activeFilter   = 'Tous';

  document.getElementById('pickerTitle').textContent =
    mode === 'worn' ? "Qu'est-ce que j'ai porté ?" : 'Planifier une tenue';
  document.getElementById('pickerSearch').value = '';

  buildPickerFilters();
  renderPickerGrid('');

  document.getElementById('pickerOverlay').dataset.key = key;
  document.getElementById('pickerOverlay').classList.add('open');
}

/* ============================================================
   PICKER — FILTRES CATÉGORIE
============================================================ */
function buildPickerFilters() {
  const container = document.getElementById('pickerFilters');
  container.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-chip' + (cat === activeFilter ? ' active' : '');
    btn.textContent = cat;
    btn.onclick = () => {
      activeFilter = cat;
      buildPickerFilters();
      renderPickerGrid(document.getElementById('pickerSearch').value);
    };
    container.appendChild(btn);
  });
}

/* ============================================================
   PICKER — FILTRAGE PAR TEXTE
============================================================ */
function filterPicker(query) { renderPickerGrid(query); }

/* ============================================================
   PICKER — RENDU DE LA GRILLE
============================================================ */
function renderPickerGrid(query = '') {
  const grid = document.getElementById('pickerGrid');
  grid.innerHTML = '';

  const filtered = wardrobe.filter(item => {
    if (activeFilter !== 'Tous' && item.type !== activeFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      return (item.brand || '').toLowerCase().includes(q) ||
             (item.type  || '').toLowerCase().includes(q);
    }
    return true;
  });

  if (!filtered.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--ink3);font-size:11px;padding:20px 0;">Aucun vêtement trouvé</div>`;
    return;
  }

  filtered.forEach(item => {
    const div = document.createElement('div');
    div.className = 'picker-item' + (item.id === pickerSelected ? ' selected' : '');
    div.innerHTML = `
      <div class="picker-thumb">
        ${item.img ? `<img src="${item.img}" alt="">` : `<span>${item.emoji || getEmoji(item.type)}</span>`}
      </div>
      <div class="picker-label">${item.brand || item.type}</div>
      <div class="picker-check">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 5l2.5 2.5 3.5-4" stroke="white" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
      </div>`;

    div.onclick = () => {
      pickerSelected = item.id;
      document.querySelectorAll('.picker-item').forEach(el => el.classList.remove('selected'));
      div.classList.add('selected');
      document.getElementById('confirmBtn').disabled = false;
    };

    grid.appendChild(div);
  });

  document.getElementById('confirmBtn').disabled = !pickerSelected;
}

/* ============================================================
   PICKER — CONFIRMATION
============================================================ */
function confirmSelection() {
  if (!pickerSelected) return;
  const key = document.getElementById('pickerOverlay').dataset.key;

  agenda[key] = { garmentId: pickerSelected, mode: pickerMode };
  saveAgenda();
  closePicker();
  renderCalendar();
  renderRepetitionPanel();

  if (selectedDay === key) {
    renderPanel(key, agenda[key], isPast(key), key === todayKey());
  }

  showToast(pickerMode === 'worn' ? 'Tenue enregistrée ✓' : 'Tenue planifiée ✓');
}

/* ============================================================
   PICKER — FERMETURE
============================================================ */
function closePicker() {
  document.getElementById('pickerOverlay').classList.remove('open');
  pickerSelected = null;
}

/* ============================================================
   PANNEAU ANTI-RÉPÉTITION
   Calcule recently_worn_garments sur 30 jours
============================================================ */
function renderRepetitionPanel() {
  const panel = document.getElementById('repetitionPanel');
  const list  = document.getElementById('repList');

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  /* Compte les ports par vêtement */
  const counts = {};
  Object.entries(agenda).forEach(([key, entry]) => {
    if (entry.mode !== 'worn') return;
    const [y, m, d] = key.split('-').map(Number);
    if (new Date(y, m - 1, d) >= cutoff) {
      counts[entry.garmentId] = (counts[entry.garmentId] || 0) + 1;
    }
  });

  const sorted = Object.entries(counts).sort(([,a],[,b]) => b - a).slice(0, 10);

  if (!sorted.length) { panel.classList.remove('visible'); return; }

  panel.classList.add('visible');
  list.innerHTML = '';

  sorted.forEach(([garmentId, count]) => {
    const garment = wardrobe.find(w => w.id === garmentId);
    if (!garment) return;
    const level = count >= 5 ? 'high' : count >= 3 ? 'mid' : 'low';

    const item = document.createElement('div');
    item.className = 'rep-item';
    item.innerHTML = `
      <div class="rep-thumb">
        ${garment.img ? `<img src="${garment.img}" alt="">` : garment.emoji}
        <span class="rep-count ${level}">${count}</span>
      </div>
      <div class="rep-name">${garment.brand || garment.type}</div>`;
    list.appendChild(item);
  });
}

/* ============================================================
   TOAST
============================================================ */
function showToast(msg = 'Enregistré') {
  const toast = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2400);
}

/* ============================================================
   DONNÉES DE DÉMO (si agenda vide)
============================================================ */
function seedDemoData() {
  if (Object.keys(agenda).length > 0) return;
  const today = new Date();

  /* Derniers 14 jours : tenues portées */
  [1,2,4,5,7,8,10,11,13].forEach(offset => {
    const d = new Date(today);
    d.setDate(d.getDate() - offset);
    agenda[toKey(d)] = { garmentId: wardrobe[offset % wardrobe.length].id, mode: 'worn' };
  });

  /* Prochains jours : tenues planifiées */
  [1,3,5].forEach(offset => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    agenda[toKey(d)] = { garmentId: wardrobe[(offset * 2) % wardrobe.length].id, mode: 'planned' };
  });

  saveAgenda();
}

/* Ferme le picker en cliquant sur le voile */
document.getElementById('pickerOverlay').addEventListener('click', function(e) {
  if (e.target === this) closePicker();
});

/* ============================================================
   INITIALISATION
============================================================ */
seedDemoData();
renderCalendar();
renderRepetitionPanel();