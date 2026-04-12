/* ============================================================
   security.js — Utilitaires anti-XSS
   Charger EN PREMIER dans chaque page, avant tous les scripts.
============================================================ */

/* Échappe les 5 caractères HTML dangereux.
   Utiliser partout où une valeur utilisateur va dans innerHTML. */
function esc(str) {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;')
}

/* Valide les URL src d'image : autorise uniquement data:image/* et https://.
   Bloque javascript:, data:text/html, http://, etc. */
function safeSrc(url) {
  if (!url || typeof url !== 'string') return ''
  const t = url.trim().toLowerCase()
  if (t.startsWith('data:image/')) return url
  if (t.startsWith('https://'))    return url
  return ''
}
