const { supabase } = require('../utils/supabase')
const { getEffectiveTempRange, getSeason } = require('./weather.service')

/**
 * Détermine le niveau de formalité requis selon l'événement agenda
 */
function inferFormality(eventLabel = '') {
  const label = eventLabel.toLowerCase()
  if (/mariage|gala|soirée\s*habillée|cocktail/.test(label)) return { min: 4, max: 5 }
  if (/réunion|client|présentation|entretien|conférence/.test(label)) return { min: 3, max: 5 }
  if (/dîner|restaurant|date/.test(label)) return { min: 2, max: 4 }
  if (/sport|gym|yoga|running|foot/.test(label)) return { min: 1, max: 2 }
  return { min: 1, max: 5 } // pas de contrainte
}

/**
 * Récupère les garments portés dans les 48h (à pénaliser dans l'algo)
 */
async function getRecentlyWornIds(userId) {
  const { data } = await supabase
    .from('recently_worn_garments')
    .select('garment_id')
    .eq('user_id', userId)

  return new Set((data || []).map(r => r.garment_id))
}

/**
 * Calcule un score de pertinence pour un vêtement donné un contexte météo/agenda
 */
function scoreGarment(garment, ctx, recentlyWornIds) {
  let score = 100

  // Pénalité si porté récemment (48h)
  if (recentlyWornIds.has(garment.id)) score -= 40

  // Compatibilité météo
  if (garment.temp_min != null && ctx.feels_like < garment.temp_min) score -= 30
  if (garment.temp_max != null && ctx.feels_like > garment.temp_max) score -= 30

  // Compatibilité saison
  if (garment.seasons && !garment.seasons.includes(ctx.season)) score -= 15

  // Compatibilité formalité
  if (garment.formality < ctx.formality.min) score -= 25
  if (garment.formality > ctx.formality.max) score -= 15

  // Bonus : vêtements peu portés (stimule la rotation)
  if (garment.wear_count < 3) score += 10

  // Pluie → pénalise les matières fragiles
  if (ctx.rain && garment.material && /suede|velours|soie/.test(garment.material.toLowerCase())) score -= 20

  return Math.max(0, score)
}

/**
 * Sélectionne la meilleure pièce pour un slot donné
 */
function pickBest(garments, slot, ctx, recentlyWornIds, mode = 'ia') {
  const filtered = garments.filter(g => slotMatchesCategory(slot, g.category))
  if (!filtered.length) return null

  const scored = filtered.map(g => ({ ...g, _score: scoreGarment(g, ctx, recentlyWornIds) }))

  if (mode === 'audacieux') {
    // Favorise les pièces peu portées et colorées
    scored.sort((a, b) => (b.wear_count === 0 ? 1 : 0) - (a.wear_count === 0 ? 1 : 0) || b._score - a._score)
  } else if (mode === 'confort') {
    // Favorise formality basse + matières douces
    scored.sort((a, b) => {
      const comfortA = (3 - a.formality) * 10 + a._score
      const comfortB = (3 - b.formality) * 10 + b._score
      return comfortB - comfortA
    })
  } else {
    // Mode IA : score pur
    scored.sort((a, b) => b._score - a._score)
  }

  return scored[0] || null
}

function slotMatchesCategory(slot, category) {
  const map = {
    haut:          ['haut'],
    bas:           ['bas'],
    chaussures:    ['chaussures'],
    'sur-vetement':['sur-vetement'],
    accessoire:    ['accessoire']
  }
  return (map[slot] || []).includes(category)
}

/**
 * Point d'entrée principal — génère 3 tenues (ia, confort, audacieux)
 *
 * @param {string} userId
 * @param {{ temp, feels_like, rain, description }} weather
 * @param {string} eventLabel - label de l'événement agenda
 * @param {number} thermalSensitivity - préférence thermique utilisateur
 * @returns {Array<{ type, score, items: { slot, garment }[] }>}
 */
async function generateOutfits(userId, weather, eventLabel = '', thermalSensitivity = 0) {
  const season    = getSeason()
  const formality = inferFormality(eventLabel)
  const { tempMin, tempMax } = getEffectiveTempRange(weather.feels_like, thermalSensitivity)

  const ctx = {
    feels_like: weather.feels_like,
    rain:       weather.rain,
    season,
    formality,
    tempMin,
    tempMax
  }

  // Récupération de tous les vêtements actifs de l'utilisateur
  const { data: garments, error } = await supabase
    .from('garments')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error) throw new Error('Erreur récupération dressing : ' + error.message)
  if (!garments?.length) return []

  const recentlyWornIds = await getRecentlyWornIds(userId)

  const slots        = ['haut', 'bas', 'chaussures']
  const slotsWithOuter = [...slots, 'sur-vetement']

  // Sur-vêtement requis si < 14°C ou pluie
  const needsOuter   = ctx.feels_like < 14 || ctx.rain
  const activeSlots  = needsOuter ? slotsWithOuter : slots

  const buildOutfit = (mode) => {
    const items = []
    const usedIds = new Set()

    for (const slot of activeSlots) {
      const available = garments.filter(g => !usedIds.has(g.id))
      const pick = pickBest(available, slot, ctx, recentlyWornIds, mode)
      if (pick) {
        items.push({ slot, garment: pick })
        usedIds.add(pick.id)
      }
    }

    // Score global = moyenne des scores individuels
    const avgScore = items.length
      ? Math.round(items.reduce((sum, i) => sum + scoreGarment(i.garment, ctx, recentlyWornIds), 0) / items.length)
      : 0

    return { type: mode, score: avgScore, items }
  }

  return [
    buildOutfit('ia'),
    buildOutfit('confort'),
    buildOutfit('audacieux')
  ]
}

module.exports = { generateOutfits }
