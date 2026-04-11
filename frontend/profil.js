  // Thermal buttons
  function setTherm(btn) {
    const group = btn.dataset.g;
    document.querySelectorAll('[data-g="'+group+'"]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  // Avoid colors
  function toggleAvoid(el) {
    el.classList.toggle('sel-avoid');
  }

  // Fav colors
  function toggleFav(el) {
    el.classList.toggle('sel-fav');
  }

  // Tags (excluded / neutral)
  function toggleTag(el) {
    if (el.classList.contains('excluded')) {
      el.classList.remove('excluded');
    } else {
      el.classList.add('excluded');
    }
  }

  // Style single-select
  function selectStyle(el) {
    document.querySelectorAll('#styleTags .tag').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
  }

  // Morph single-select
  function selectMorph(el) {
    document.querySelectorAll('#morphTags .tag').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
  }

  // Occasions toggle
  function toggleOcc(el) {
    el.classList.toggle('active');
    updateScore();
  }

  // Toggle switches
  function toggleSwitch(el) {
    el.classList.toggle('on');
  }

  // Boldness label
  function updateBold(slider) {
    // no label needed — handled by visual position
  }

  // Score update
  function updateScore() {
    const activeOcc = document.querySelectorAll('.occ-item.active').length;
    const base = 68;
    const bonus = Math.round((activeOcc / 6) * 10);
    const total = Math.min(base + bonus, 100);
    document.getElementById('scoreBar').style.width = total + '%';
    document.querySelector('.score-num').innerHTML = total + '<span>%</span>';
  }

  // Save
  function saveProfile() {
    const btn = document.getElementById('saveBtn');
    btn.textContent = 'Enregistré ✓';
    btn.classList.add('saved');
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = 'Enregistrer';
      btn.classList.remove('saved');
      btn.disabled = false;
    }, 2500);
  }

