const { supabase } = require('../utils/supabase')

/**
 * GET /api/profile
 * Récupère le profil de l'utilisateur connecté
 */
async function getProfile(req, res) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single()

  if (error) return res.status(404).json({ error: 'Profil introuvable' })
  res.json(data)
}

/**
 * PUT /api/profile
 * Met à jour le profil de l'utilisateur
 */
async function updateProfile(req, res) {
  const { data, error } = await supabase
    .from('profiles')
    .update(req.body)
    .eq('id', req.user.id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
}

/**
 * GET /api/profile/stats
 * Statistiques agrégées du dressing (vue wardrobe_stats)
 */
async function getStats(req, res) {
  const { data, error } = await supabase
    .from('wardrobe_stats')
    .select('*')
    .eq('user_id', req.user.id)
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data || {})
}

module.exports = { getProfile, updateProfile, getStats }
