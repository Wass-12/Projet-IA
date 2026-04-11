/* ============================================================
   PALETTE DE COULEURS PROPOSÉES
   Chaque couleur a un hex et un nom affiché en tooltip.
   border:true = ajouter une bordure (pour le blanc sur fond clair)
============================================================ */
const COLORS = [
  { hex: '#1C1A16', name: 'Noir' }, { hex: '#FDFCFA', name: 'Blanc', border: true },
  { hex: '#B0B0B0', name: 'Gris' }, { hex: '#8B5C3A', name: 'Marron' },
  { hex: '#C8572A', name: 'Terracotta' }, { hex: '#E8D5A3', name: 'Beige' },
  { hex: '#5B7FA6', name: 'Bleu' }, { hex: '#2E7D52', name: 'Vert' },
  { hex: '#8B4F8B', name: 'Violet' }, { hex: '#D4A843', name: 'Jaune' },
  { hex: '#C45B5B', name: 'Rouge' }, { hex: '#F7B5C8', name: 'Rose' },
  { hex: '#3C4A5C', name: 'Marine' }, { hex: '#8B7355', name: 'Kaki' },
];

/* ---- État global ---- */
let stream = null;          // MediaStream de la caméra (null si inactive)
let cameraActive = false;   // true quand la caméra est ouverte
let currentItem = null;     // données du dernier article analysé
let wardrobe = JSON.parse(localStorage.getItem('wardrobe') || '[]'); // garde-robe persistée
let selectedColors = [];    // hexs des couleurs sélectionnées

/* ============================================================
   EXEMPLES STATIQUES
   Utilisés par le bouton "Exemple" (sans appel API)
============================================================ */
const EXAMPLES = [
  { type: 'Chemise', brand: 'Sandro', size: 'M', material: 'Coton 100%', season: 'Printemps', colors: ['#FDFCFA', '#5B7FA6'], confidence: 91, occasions: ['Bureau', 'Casual', 'Week-end'], notes: 'Légèrement cintrée', emoji: '👔' },
  { type: 'Jean', brand: 'APC', size: '30', material: 'Denim 98% coton', season: 'Toutes saisons', colors: ['#3C4A5C', '#1C1A16'], confidence: 96, occasions: ['Casual', 'Week-end'], notes: 'Coupe droite', emoji: '👖' },
  { type: 'Pull', brand: 'Uniqlo', size: 'L', material: 'Laine mérinos', season: 'Automne', colors: ['#8B5C3A', '#E8D5A3'], confidence: 88, occasions: ['Casual', 'Travail', 'Week-end'], notes: '', emoji: '🧥' },
  { type: 'Robe', brand: 'Isabel Marant', size: '38', material: 'Soie 80%', season: 'Été', colors: ['#C8572A', '#F7B5C8'], confidence: 93, occasions: ['Soirée', 'Événement'], notes: 'Achetée en soldes', emoji: '👗' },
];

/* ============================================================
   ÉTAPES D'ANALYSE AFFICHÉES PENDANT LE CHARGEMENT IA
   [texte principal, sous-texte]
============================================================ */
const ANALYZING_STEPS = [
  ['Détection du vêtement…', 'classification'],
  ['Lecture des couleurs…', 'analyse chromatique'],
  ['Identification de la matière…', 'texture & tissu'],
  ['Suggestion des occasions…', 'style & usage'],
  ['Finalisation…', 'pré-remplissage'],
];

/* ============================================================
   CONSTRUCTION DES PUCES COULEURS
   Génère les chips cliquables dans #colorRow.
   selected = tableau de hex pré-cochés par l'IA.
============================================================ */
function buildColorRow(selected = []) {
  const row = document.getElementById('colorRow');
  row.innerHTML = '';
  selectedColors = [...selected];

  COLORS.forEach(c => {
    const chip = document.createElement('div');
    chip.className = 'color-chip' + (selectedColors.includes(c.hex) ? ' selected' : '');
    chip.style.background = c.hex;
    if (c.border) chip.style.border = '2px solid #D0CCC5'; // bordure pour le blanc
    chip.title = c.name;

    chip.onclick = () => {
      if (selectedColors.includes(c.hex)) {
        // Désélection
        selectedColors = selectedColors.filter(x => x !== c.hex);
        chip.classList.remove('selected');
      } else {
        // Sélection
        selectedColors.push(c.hex);
        chip.classList.add('selected');
      }
    };

    row.appendChild(chip);
  });
}

/* ============================================================
   CONSTRUCTION DES TAGS
   Insère les tags texte dans une .tag-row avant l'input.
============================================================ */
function buildTags(row, tags) {
  const input = row.querySelector('.tag-input');
  row.querySelectorAll('.tag').forEach(t => t.remove()); // vide les anciens
  tags.forEach(t => addTagEl(row, t, input));
}

/* Crée et insère un élément tag avant l'input */
function addTagEl(row, text, inputEl) {
  const tag = document.createElement('div');
  tag.className = 'tag';
  tag.innerHTML = `${text}<span class="remove" onclick="this.parentElement.remove()">×</span>`;
  row.insertBefore(tag, inputEl);
}

/* Ajoute un tag sur Enter ou virgule */
function addTag(e, rowId, inputId) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const input = document.getElementById(inputId);
    const val = input.value.trim().replace(',', '');
    if (val) {
      addTagEl(document.getElementById(rowId), val, input);
      input.value = '';
    }
  }
}

/* ============================================================
   REMPLISSAGE DES CHAMPS AVEC LES DONNÉES IA
   data = objet JSON retourné par l'API ou les exemples
============================================================ */
function fillResults(data) {
  // Sélectionne l'option correspondante dans le <select> Type
  const typeEl = document.getElementById('fieldType');
  [...typeEl.options].forEach((o, i) => { if (o.text === data.type) typeEl.selectedIndex = i; });

  document.getElementById('fieldBrand').value = data.brand;
  document.getElementById('fieldSize').value = data.size;
  document.getElementById('fieldMaterial').value = data.material;

  // Sélectionne l'option correspondante dans le <select> Saison
  const seasonEl = document.getElementById('fieldSeason');
  [...seasonEl.options].forEach((o, i) => { if (o.text === data.season) seasonEl.selectedIndex = i; });

  document.getElementById('confidenceLabel').textContent = `Confiance ${data.confidence}%`;
  document.getElementById('fieldNotes').value = data.notes || '';

  buildColorRow(data.colors);
  buildTags(document.getElementById('occasionRow'), data.occasions);

  currentItem = { ...data }; // sauvegarde pour usage ultérieur
}

/* Affiche la section résultats et le bouton sauvegarder */
function showResults(data) {
  fillResults(data);
  document.getElementById('aiResults').classList.add('visible');
  document.getElementById('saveZone').classList.add('visible');
}

/* ============================================================
   ANIMATION D'ANALYSE
   Fait défiler les étapes ANALYZING_STEPS pendant que fn() tourne.
   fn = fonction async qui appelle l'API (ou retourne un exemple).
============================================================ */
async function animateAnalysis(fn) {
  const overlay = document.getElementById('analyzingOverlay');
  const stepEl  = document.getElementById('analyzingStep');
  const textEl  = document.getElementById('analyzingText');

  overlay.classList.add('visible');

  // Affiche chaque étape successivement
  for (let i = 0; i < ANALYZING_STEPS.length; i++) {
    stepEl.textContent = ANALYZING_STEPS[i][0];
    textEl.textContent = ANALYZING_STEPS[i][1];
    await sleep(i === 0 ? 400 : 550);
  }

  const result = await fn(); // attend la réponse réelle
  overlay.classList.remove('visible');
  return result;
}

/* Utilitaire : pause non bloquante */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ============================================================
   APPEL API ANTHROPIC
   imageBase64OrHint :
     - "data:image/..." → analyse d'une vraie photo (vision)
     - string texte     → génère un exemple fictif (mode démo)
============================================================ */
async function analyzeWithAI(imageBase64OrHint) {
  const isBase64 = imageBase64OrHint && imageBase64OrHint.startsWith('data:image');

  // Prompt différent selon qu'on envoie une image ou un hint texte
  const prompt = isBase64
    ? `Analyse cette photo de vêtement et retourne UNIQUEMENT un JSON avec ces champs exacts (pas de markdown, pas d'explication) :
{"type":"string","brand":"string ou vide","size":"string ou vide","material":"string","season":"string parmi Printemps|Été|Automne|Hiver|Toutes saisons","colors":["#hex"],"confidence":number 80-99,"occasions":["string"],"notes":"string ou vide"}
Pour type utilise: T-shirt, Chemise, Pull, Veste, Manteau, Pantalon, Jean, Short, Robe, Jupe, Costume, Chaussures, Accessoire ou Autre.`
    : `Génère un exemple réaliste de vêtement (${imageBase64OrHint || 'aléatoire'}) et retourne UNIQUEMENT un JSON avec ces champs (pas de markdown) :
{"type":"string","brand":"string","size":"string","material":"string","season":"string parmi Printemps|Été|Automne|Hiver|Toutes saisons","colors":["#hex"],"confidence":number 85-97,"occasions":["string"],"notes":"string"}`;

  const body = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: isBase64
        // Message multimodal : image + texte
        ? [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64OrHint.split(',')[1] } },
            { type: 'text', text: prompt }
          ]
        // Message texte seul
        : [{ type: 'text', text: prompt }]
    }]
  };

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await resp.json();
  const text  = data.content?.[0]?.text || '{}';
  // Nettoie d'éventuels blocs ```json ``` avant de parser
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

/* ============================================================
   CAMÉRA
============================================================ */

/* Bascule caméra on/off */
async function toggleCamera() {
  if (cameraActive) { stopCamera(); return; }

  try {
    // Demande accès caméra (préfère la caméra arrière sur mobile)
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false
    });

    const video = document.getElementById('videoEl');
    video.srcObject = stream;
    video.style.display = 'block';

    // Affiche les éléments liés à la caméra
    document.getElementById('scannerIdle').style.display = 'none';
    document.getElementById('scanLine').classList.add('active');
    document.getElementById('overlayText').classList.add('visible');
    document.getElementById('captureBtn').classList.add('visible');
    document.getElementById('previewImg').style.display = 'none';
    document.getElementById('cameraBtn').textContent = '✕ Arrêter';

    cameraActive = true;
  } catch {
    alert('Caméra non disponible. Utilisez "Photo" pour importer une image.');
  }
}

/* Arrête le flux et remet l'interface en état repos */
function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop()); // libère le hardware
    stream = null;
  }

  document.getElementById('videoEl').style.display = 'none';

  // Ré-affiche l'état repos seulement s'il n'y a pas de prévisualisation
  document.getElementById('scannerIdle').style.display =
    document.getElementById('previewImg').style.display === 'block' ? 'none' : 'flex';

  document.getElementById('scanLine').classList.remove('active');
  document.getElementById('overlayText').classList.remove('visible');
  document.getElementById('captureBtn').classList.remove('visible');

  // Remet l'icône et le texte du bouton Caméra
  document.getElementById('cameraBtn').innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="9" rx="2" stroke="currentColor" stroke-width="1.2"/><circle cx="7" cy="7.5" r="2.5" stroke="currentColor" stroke-width="1.2"/><path d="M5 2h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg> Caméra`;

  cameraActive = false;
}

/* Capture le frame courant du flux vidéo via le canvas */
async function capture() {
  const video  = document.getElementById('videoEl');
  const canvas = document.getElementById('canvasEl');

  // Adapte le canvas à la résolution native de la caméra
  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);

  // Convertit en base64 JPEG (qualité 0.85 = bon compromis taille/qualité)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

  // Affiche la photo capturée
  const img = document.getElementById('previewImg');
  img.src = dataUrl;
  img.style.display = 'block';

  stopCamera(); // arrête le flux caméra

  // Lance l'analyse IA sur la photo capturée
  const result = await animateAnalysis(() => analyzeWithAI(dataUrl));
  showResults(result);
}

/* ============================================================
   IMPORT DE FICHIER IMAGE
============================================================ */

/* Affiche/masque la zone de dépôt */
function toggleUpload() {
  document.getElementById('uploadZone').classList.toggle('visible');
}

/* Traite le fichier sélectionné par l'input file */
async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  document.getElementById('uploadZone').classList.remove('visible');

  // Lit le fichier en base64 via FileReader
  const reader = new FileReader();
  reader.onload = async (ev) => {
    const dataUrl = ev.target.result;

    // Affiche la prévisualisation
    const img = document.getElementById('previewImg');
    img.src = dataUrl;
    img.style.display = 'block';
    document.getElementById('scannerIdle').style.display = 'none';

    stopCamera();

    // Lance l'analyse IA sur le fichier importé
    const result = await animateAnalysis(() => analyzeWithAI(dataUrl));
    showResults(result);
  };
  reader.readAsDataURL(file);
}

/* ============================================================
   MODE EXEMPLE (sans photo, sans API)
   Pioche aléatoirement dans EXAMPLES et simule une analyse.
============================================================ */
async function useExample() {
  document.getElementById('uploadZone').classList.remove('visible');

  const ex  = EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)];
  const img = document.getElementById('previewImg');

  // Cache la prévisualisation photo et affiche l'emoji à la place
  img.src = '';
  img.style.display = 'none';

  const idle = document.getElementById('scannerIdle');
  idle.innerHTML = `<div style="font-size: 72px; line-height:1;">${ex.emoji}</div><p style="opacity:.5">Exemple de scan</p>`;
  idle.style.display = 'flex';

  stopCamera();

  // Simule un délai d'analyse puis retourne les données de l'exemple
  const result = await animateAnalysis(async () => {
    await sleep(800);
    return { ...ex };
  });

  showResults(result);
}

/* ============================================================
   SAUVEGARDE D'UN ARTICLE
   Lit les champs, construit l'objet item, l'ajoute à wardrobe[]
   et persiste en localStorage.
============================================================ */
function saveItem() {
  // Lecture des champs du formulaire
  const type     = document.getElementById('fieldType').value;
  const brand    = document.getElementById('fieldBrand').value;
  const size     = document.getElementById('fieldSize').value;
  const material = document.getElementById('fieldMaterial').value;
  const season   = document.getElementById('fieldSeason').value;
  const notes    = document.getElementById('fieldNotes').value;

  // Récupère les textes des tags (sans la croix "×")
  const occasions = [...document.getElementById('occasionRow').querySelectorAll('.tag')]
    .map(t => t.textContent.replace('×', '').trim());

  // Photo : on ne stocke que les data URLs (pas les src vides ou blob)
  const imgSrc = document.getElementById('previewImg').src;

  const item = {
    type, brand, size, material, season, notes, occasions,
    colors: selectedColors,
    img: imgSrc && imgSrc.startsWith('data:') ? imgSrc : '',
    timestamp: Date.now()
  };

  // Ajoute en tête de liste (plus récent en premier)
  wardrobe.unshift(item);

  // Persiste en localStorage (peut échouer si quota dépassé)
  try { localStorage.setItem('wardrobe', JSON.stringify(wardrobe)); } catch {}

  updateCount();
  renderWardrobe();
  showToast();

  // Feedback visuel : bouton passe en vert "Ajouté !"
  document.getElementById('saveBtn').classList.add('saved');
  document.getElementById('saveBtn').innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5 6.5-7" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Ajouté !';

  // Remet l'interface en état initial après 2 secondes
  setTimeout(() => {
    document.getElementById('saveBtn').classList.remove('saved');
    document.getElementById('saveBtn').innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5 6.5-7" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Ajouter à ma garde-robe';
    resetForm();
  }, 2000);
}

/* Réinitialise le formulaire et la zone scanner */
function resetForm() {
  document.getElementById('aiResults').classList.remove('visible');
  document.getElementById('saveZone').classList.remove('visible');
  document.getElementById('previewImg').style.display = 'none';

  // Remet l'icône et le message d'invite dans le scanner
  document.getElementById('scannerIdle').innerHTML = `<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="6" y="6" width="36" height="36" rx="8" stroke="#6B6660" stroke-width="1.5"/><circle cx="24" cy="22" r="7" stroke="#6B6660" stroke-width="1.5"/><circle cx="24" cy="22" r="2.5" fill="#6B6660"/><path d="M14 34c0-5.5 4.5-8 10-8s10 2.5 10 8" stroke="#6B6660" stroke-width="1.5" stroke-linecap="round"/></svg><p>Appuyer pour scanner un vêtement</p>`;
  document.getElementById('scannerIdle').style.display = 'flex';
}

/* ============================================================
   TOAST DE CONFIRMATION
   Apparaît 2.6s puis disparaît.
============================================================ */
function showToast() {
  const toast = document.getElementById('toast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
}

/* ============================================================
   MISE À JOUR DU COMPTEUR EN EN-TÊTE
============================================================ */
function updateCount() {
  const n = wardrobe.length;
  document.getElementById('countBadge').textContent = `${n} pièce${n > 1 ? 's' : ''}`;
}

/* ============================================================
   RENDU DE LA GRILLE GARDE-ROBE
   Affiche les 9 derniers articles (max).
============================================================ */
function renderWardrobe() {
  const sec  = document.getElementById('wardrobeSection');
  const grid = document.getElementById('wardrobeGrid');

  // Masque la section si la garde-robe est vide
  if (!wardrobe.length) { sec.style.display = 'none'; return; }

  sec.style.display = 'block';
  grid.innerHTML = '';

  // Correspondance type → emoji de fallback (si pas de photo)
  const emojiMap = {
    'T-shirt': '👕', 'Chemise': '👔', 'Pull': '🧥', 'Veste': '🧥',
    'Manteau': '🧥', 'Pantalon': '👖', 'Jean': '👖', 'Short': '🩳',
    'Robe': '👗', 'Jupe': '👗', 'Costume': '🤵', 'Chaussures': '👟', 'Accessoire': '🎩'
  };

  wardrobe.slice(0, 9).forEach(item => {
    const el    = document.createElement('div');
    el.className = 'wardrobe-item';
    const emoji  = emojiMap[item.type] || '👔';

    el.innerHTML = `
      <div class="item-thumb">
        ${item.img
          ? `<img src="${item.img}" alt="">`
          : `<div class="item-thumb-placeholder">${emoji}</div>`}
      </div>
      <div class="item-info">
        <div class="item-name">${item.brand || item.type}</div>
        <div class="item-sub">${item.type}${item.size ? ' · ' + item.size : ''}</div>
      </div>`;

    grid.appendChild(el);
  });
}

/* ============================================================
   INITIALISATION AU CHARGEMENT
============================================================ */
updateCount();      // affiche le nombre de pièces en en-tête
renderWardrobe();   // affiche les articles déjà sauvegardés
buildColorRow([]);  // construit les puces couleurs (aucune sélectionnée)