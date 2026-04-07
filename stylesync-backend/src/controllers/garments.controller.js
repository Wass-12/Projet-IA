const { supabase }                    = require('../utils/supabase')
const { removeBackground, analyzeGarment } = require('../services/vision.service')
const { v4: uuidv4 }                  = require('uuid')

/**
 * GET /api/garments
 * Liste les vêtements de l'utilisateur avec filtres optionnels
 * Query params : category, season, is_active, sort
 */
async function listGarments(req, res) {
  const { category, season, is_active = 'true', sort = 'created_at' } = req.query

  let query = supabase
    .from('garments')
    .select('id, label, category, subcategory, color_primary, color_hex, pattern, formality, seasons, wear_count, last_worn_at, image_url_clean, image_url, tags, is_active, created_at')
    .eq('user_id', req.user.id)
    .order(sort, { ascending: false })

  if (is_active !== 'all') query = query.eq('is_active', is_active === 'true')
  if (category)            query = query.eq('category', category)
  if (season)              query = query.contains('seasons', [season])

  const { data, error } = await query
  if (error) return res.status(400).json({ error: error.message })

  res.json(data)
}

/**
 * GET /api/garments/:id
 * Détail d'un vêtement
 */
async function getGarment(req, res) {
  const { data, error } = await supabase
    .from('garments')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single()

  if (error || !data) return res.status(404).json({ error: 'Vêtement introuvable' })
  res.json(data)
}

/**
 * POST /api/garments
 * Crée un vêtement avec upload image + détourage IA + auto-tagging
 * Attend un multipart/form-data avec champ "image" + JSON metadata
 */
async function createGarment(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Image requise (champ "image")' })
  }

  const userId    = req.user.id
  const garmentId = uuidv4()
  const ext       = req.file.originalname.split('.').pop() || 'jpg'

  // 1. Upload image originale dans Supabase Storage
  const originalPath = `${userId}/${garmentId}/original.${ext}`
  const { error: uploadErr } = await supabase.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET)
    .upload(originalPath, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false
    })

  if (uploadErr) return res.status(500).json({ error: 'Erreur upload image : ' + uploadErr.message })

  const { data: { publicUrl: imageUrl } } = supabase.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET)
    .getPublicUrl(originalPath)

  // 2. Détourage IA (background removal)
  let imageUrlClean = null
  try {
    const cleanBuffer  = await removeBackground(req.file.buffer)
    const cleanPath    = `${userId}/${garmentId}/clean.png`

    await supabase.storage
      .from(process.env.SUPABASE_STORAGE_BUCKET)
      .upload(cleanPath, cleanBuffer, { contentType: 'image/png', upsert: false })

    const { data: { publicUrl } } = supabase.storage
      .from(process.env.SUPABASE_STORAGE_BUCKET)
      .getPublicUrl(cleanPath)

    imageUrlClean = publicUrl
  } catch (err) {
    console.warn('[vision] Détourage échoué, on continue sans :', err.message)
  }

  // 3. Auto-tagging IA
  let aiData = {}
  try {
    const analysis = await analyzeGarment(req.file.buffer)
    aiData = {
      ai_confidence:   analysis.confidence,
      ai_raw_response: analysis.raw,
      // On pré-remplit seulement si l'utilisateur n'a pas fourni la valeur
      category:      req.body.category      || analysis.category,
      subcategory:   req.body.subcategory   || analysis.subcategory,
      color_primary: req.body.color_primary || analysis.color_primary,
      color_hex:     req.body.color_hex     || analysis.color_hex,
      pattern:       req.body.pattern       || analysis.pattern,
      material:      req.body.material      || analysis.material
    }
  } catch (err) {
    console.warn('[vision] Auto-tagging échoué :', err.message)
  }

  // 4. Insertion en BDD
  const garmentData = {
    id:              garmentId,
    user_id:         userId,
    image_url:       imageUrl,
    image_url_clean: imageUrlClean,
    ...req.body,   // données validées par le middleware
    ...aiData      // surcharge par les données IA (si user n'a pas précisé)
  }

  const { data, error } = await supabase
    .from('garments')
    .insert(garmentData)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json(data)
}

/**
 * PATCH /api/garments/:id
 * Met à jour les attributs d'un vêtement
 */
async function updateGarment(req, res) {
  // Vérifier que le vêtement appartient bien à l'utilisateur
  const { data: existing } = await supabase
    .from('garments')
    .select('id')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single()

  if (!existing) return res.status(404).json({ error: 'Vêtement introuvable' })

  const { data, error } = await supabase
    .from('garments')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
}

/**
 * DELETE /api/garments/:id
 * Mise en corbeille (soft delete) ou suppression définitive
 * Query param : hard=true pour suppression définitive
 */
async function deleteGarment(req, res) {
  const { hard } = req.query

  if (hard === 'true') {
    // Suppression définitive (images + BDD)
    const { data: g } = await supabase
      .from('garments').select('id').eq('id', req.params.id).eq('user_id', req.user.id).single()
    if (!g) return res.status(404).json({ error: 'Vêtement introuvable' })

    // Supprime les images du storage
    await supabase.storage.from(process.env.SUPABASE_STORAGE_BUCKET)
      .remove([`${req.user.id}/${req.params.id}/original.jpg`, `${req.user.id}/${req.params.id}/clean.png`])

    const { error } = await supabase.from('garments').delete().eq('id', req.params.id)
    if (error) return res.status(400).json({ error: error.message })
    return res.status(204).end()
  }

  // Soft delete : is_active = false
  const { data, error } = await supabase
    .from('garments')
    .update({ is_active: false, donated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select().single()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
}

module.exports = { listGarments, getGarment, createGarment, updateGarment, deleteGarment }
