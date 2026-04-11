  let currentCat = 'all';
  let currentView = 'grid';
  let showFlaggedOnly = false;

  /* ── VIEW TOGGLE ── */
  function setView(v) {
    currentView = v;
    const grid = document.getElementById('garmentGrid');
    grid.classList.toggle('list-mode', v === 'list');
    document.getElementById('gridBtn').classList.toggle('active', v === 'grid');
    document.getElementById('listBtn').classList.toggle('active', v === 'list');
  }

  /* ── CATEGORY (sidebar + tabs) ── */
  function filterCat(el, cat) {
    currentCat = cat;
    showFlaggedOnly = false;
    // Sidebar highlight
    document.querySelectorAll('.cat-item').forEach(i => i.classList.remove('active'));
    if (el) el.classList.add('active');
    // Tab highlight
    document.querySelectorAll('.cat-tab').forEach(t => {
      t.classList.toggle('active', t.getAttribute('onclick').includes("'"+cat+"'"));
    });
    applyFilters();
  }

  function switchTab(el, cat) {
    currentCat = cat;
    showFlaggedOnly = false;
    document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    // Sync sidebar
    document.querySelectorAll('.cat-item').forEach(i => {
      i.classList.toggle('active', i.dataset.cat === cat);
    });
    applyFilters();
  }

  function filterFlagged() {
    showFlaggedOnly = true;
    currentCat = 'all';
    document.querySelectorAll('.cat-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('searchInput').value = '';
    applyFilters();
    showToast('3 pièces signalées affichées');
  }

  /* ── SEARCH ── */
  function filterCards() { applyFilters(); }

  /* ── SORT ── */
  function sortCards() { applyFilters(); }

  /* ── FILTER TAGS ── */
  function toggleFtag(el) { el.classList.toggle('active'); applyFilters(); }
  function toggleColor(el) { el.classList.toggle('active'); applyFilters(); }

  /* ── APPLY ALL FILTERS ── */
  function applyFilters() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const sortVal = document.getElementById('sortSelect').value;
    const cards = Array.from(document.querySelectorAll('#garmentGrid .g-card[data-cat]'));

    cards.forEach(c => {
      const catMatch = currentCat === 'all' || c.dataset.cat === currentCat;
      const nameMatch = c.dataset.name.toLowerCase().includes(q);
      const flagMatch = !showFlaggedOnly || c.dataset.flag === 'true';
      c.style.display = (catMatch && nameMatch && flagMatch) ? '' : 'none';
    });

    // Sort
    const grid = document.getElementById('garmentGrid');
    const visible = cards.filter(c => c.style.display !== 'none');
    visible.sort((a, b) => {
      if (sortVal === 'worn') return parseInt(b.dataset.worn) - parseInt(a.dataset.worn);
      if (sortVal === 'unworn') return parseInt(a.dataset.worn) - parseInt(b.dataset.worn);
      if (sortVal === 'alpha') return a.dataset.name.localeCompare(b.dataset.name);
      return 0;
    });
    visible.forEach(c => grid.appendChild(c));

    const count = visible.length;
    document.getElementById('resultCount').textContent = count + ' pièce' + (count > 1 ? 's' : '');
    document.getElementById('emptyState').classList.toggle('visible', count === 0);

    // Active filters chips
    const chips = document.getElementById('activeFilters');
    chips.innerHTML = '';
    if (currentCat !== 'all') addChip(chips, currentCat);
    if (showFlaggedOnly) addChip(chips, 'À donner');
    if (q) addChip(chips, '"'+q+'"');
  }

  function addChip(parent, label) {
    const chip = document.createElement('span');
    chip.className = 'filter-chip';
    chip.innerHTML = label + ' <span class="rm">✕</span>';
    chip.onclick = () => {
      showFlaggedOnly = false;
      currentCat = 'all';
      document.getElementById('searchInput').value = '';
      document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
      document.querySelector('.cat-tab[onclick*="\'all\'"]').classList.add('active');
      document.querySelectorAll('.cat-item').forEach(i => i.classList.toggle('active', i.dataset.cat === 'all'));
      applyFilters();
    };
    parent.appendChild(chip);
  }

  /* ── DETAIL PANEL ── */
  function openDetail(d) {
    document.getElementById('detailThumb').textContent = d.emoji;
    document.getElementById('detailName').textContent = d.name;
    document.getElementById('detailSub').textContent = d.cat + ' · ' + d.color;

    const flagEl = document.getElementById('detailFlag');
    if (d.flag) { flagEl.textContent = '⚠ ' + d.flag; flagEl.style.display = 'block'; }
    else { flagEl.style.display = 'none'; }

    const rows = [
      ['Couleur', `<span style="display:inline-flex;align-items:center;gap:6px;"><span style="width:10px;height:10px;border-radius:50%;background:${d.colorHex};border:1px solid rgba(255,255,255,0.2);flex-shrink:0;"></span>${d.color}</span>`],
      ['Matière', d.matiere],
      ['Taille', d.taille],
      ['État', d.etat],
      ['Ajouté', d.added],
      ['Porté', d.worn + ' fois'],
    ];
    document.getElementById('detailRows').innerHTML = rows.map(([k, v]) =>
      `<div class="detail-row"><span class="detail-key">${k}</span><span class="detail-val">${v}</span></div>`
    ).join('');

    document.getElementById('detailTags').innerHTML = d.tags.map(t =>
      `<span class="detail-tag">${t}</span>`
    ).join('');

    // Wear bar (random-ish but seeded by worn count)
    const bar = document.getElementById('wearBar');
    bar.innerHTML = '';
    const months = 12;
    for (let i = 0; i < months; i++) {
      const h = Math.max(4, Math.floor(Math.random() * 36));
      const worn = d.worn > 0 && Math.random() > 0.4;
      const col = document.createElement('div');
      col.className = 'wear-bar-col' + (worn ? ' has' : '');
      col.style.height = (worn ? h : 4) + 'px';
      bar.appendChild(col);
    }

    document.getElementById('detailActions').innerHTML = `
      <button class="detail-btn primary" onclick="wearToday('${d.name}');closeDetail()">Porter aujourd'hui</button>
      <button class="detail-btn" onclick="closeDetail()">Modifier</button>
      <button class="detail-btn danger" onclick="closeDetail()">Retirer</button>
    `;

    document.getElementById('detailOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDetail() {
    document.getElementById('detailOverlay').classList.remove('open');
    document.body.style.overflow = '';
  }

  function closeDetailOutside(e) {
    if (e.target === document.getElementById('detailOverlay')) closeDetail();
  }

  /* ── WEAR TODAY ── */
  function wearToday(name) {
    showToast('« ' + name + ' » ajouté à la tenue du jour');
  }

  /* ── TOAST ── */
  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(20px)';
    }, 2800);
  }