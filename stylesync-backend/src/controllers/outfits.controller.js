const { supabase }          = require('../utils/supabase')
const { getCurrentWeather } = require('../services/weather.service')
const { generateOutfits }   = require('../services/outfit.service')

/**
 * POST /api/outfits/generate
 * Génère 3 suggestions de tenues selon météo + agenda
 * Body : { lat, lng, event, date }
 */
async function generate(req, res) {
  const { lat, lng, event, date } = req.body
  const userId = req.user.id

  // Récupère le profil utilisateur (localisation par défaut, sensibilité thermique)
  const { data: profile } = await supabase
    .from('profiles')
    .select('default_lat, default_lng, thermal_sensitivity')
    .eq('id', userId)
    .single()

  const finalLat = lat ?? profile?.default_lat
  const finalLng = lng ?? profile?.default_lng

  if (!finalLat || !finalLng) {
    return res.status(400).json({
      error: 'Localisation requise. Fournissez lat/lng ou configurez votre ville par défaut dans le profil.'
    })
  }

  // Météo en temps réel
  let weather
  try {
    weather = await getCurrentWeather(finalLat, finalLng)
  } catch (err) {
    return res.status(502).json({ error: 'Erreur API météo : ' + err.message })
  }

  // Génération des 3 tenues
  let suggestions
  try {
    suggestions = await generateOutfits(
      userId,
      weather,
      event || '',
      profile?.thermal_sensitivity || 0
    )
  } catch (err) {
    return res.status(500).json({ error: 'Erreur génération tenues : ' + err.message })
  }

  // Sauvegarde les suggestions en BDD (status = 'suggested')
  const saved = []
  for (const s of suggestions) {
    const { data: outfit, error: oErr } = await supabase
      .from('outfits')
      .insert({
        user_id:          userId,
        weather_temp:     weather.temp,
        weather_desc:     weather.description,
        weather_rain:     weather.rain,
        calendar_event:   event || null,
        suggestion_type:  s.type,
        match_score:      s.score,
        status:           'suggested'
      })
      .select()
      .single()

    if (oErr) continue

    // Sauvegarde les pièces de la tenue
    if (s.items.length) {
      await supabase.from('outfit_items').insert(
        s.items.map(i => ({
          outfit_id:  outfit.id,
          garment_id: i.garment.id,
          slot:       i.slot
        }))
      )
    }

    saved.push({
      ...outfit,
      items: s.items.map(i => ({
        slot:    i.slot,
        garment: {
          id:              i.garment.id,
          label:           i.garment.label,
          category:        i.garment.category,
          color_primary:   i.garment.color_primary,
          image_url_clean: i.garment.image_url_clean,
          image_url:       i.garment.image_url
        }
      }))
    })
  }

  res.json({ weather, suggestions: saved })
}

/**
 * POST /api/outfits/wear
 * Enregistre une tenue comme portée (crée une entrée wear_history)
 * Body : { outfit_id, worn_on?, notes? }
 */
async function wear(req, res) {
  const { outfit_id, worn_on, notes } = req.body
  const userId = req.user.id

  // Vérification que la tenue appartient à l'utilisateur
  const { data: outfit } = await supabase
    .from('outfits')
    .select('id')
    .eq('id', outfit_id)
    .eq('user_id', userId)
    .single()

  if (!outfit) return res.status(404).json({ error: 'Tenue introuvable' })

  // Marque la tenue comme portée
  await supabase.from('outfits')
    .update({ status: 'worn', worn_at: worn_on || new Date().toISOString().split('T')[0] })
    .eq('id', outfit_id)

  // Crée l'entrée historique (le trigger SQL mettra à jour wear_count automatiquement)
  const { data: history, error } = await supabase
    .from('wear_history')
    .insert({ user_id: userId, outfit_id, worn_on: worn_on || new Date().toISOString().split('T')[0], notes })
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json(history)
}

/**
 * GET /api/outfits/history
 * Historique des tenues portées (30 derniers jours par défaut)
 * Query params : limit, offset, from, to
 */
async function history(req, res) {
  const { limit = 30, offset = 0, from, to } = req.query

  let query = supabase
    .from('wear_history')
    .select(`
      id, worn_on, notes,
      outfits (
        id, suggestion_type, match_score, weather_temp, weather_desc, calendar_event,
        outfit_items (
          slot,
          garments ( id, label, category, color_primary, image_url_clean, image_url )
        )
      )
    `)
    .eq('user_id', req.user.id)
    .order('worn_on', { ascending: false })
    .range(offset, offset + limit - 1)

  if (from) query = query.gte('worn_on', from)
  if (to)   query = query.lte('worn_on', to)

  const { data, error } = await query
  if (error) return res.status(400).json({ error: error.message })

  res.json(data)
}

/**
 * PATCH /api/outfits/:id/rate
 * Note une tenue de 1 à 5 étoiles
 */
async function rateOutfit(req, res) {
  const { rating } = req.body

  const { data, error } = await supabase
    .from('outfits')
    .update({ user_rating: rating })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
}

module.exports = { generate, wear, history, rateOutfit }
