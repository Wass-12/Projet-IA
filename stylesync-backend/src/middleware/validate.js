const Joi = require('joi')

/**
 * Factory : retourne un middleware qui valide req.body avec un schéma Joi
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    })
    if (error) {
      const details = error.details.map(d => d.message)
      return res.status(422).json({ error: 'Validation échouée', details })
    }
    req.body = value
    next()
  }
}

// ── Schémas ───────────────────────────────────────────────────

const schemas = {
  updateProfile: Joi.object({
    username:             Joi.string().min(3).max(30),
    full_name:            Joi.string().max(100),
    style_persona:        Joi.string().valid('minimal','streetwear','corporate','boheme','casual','sport'),
    gender:               Joi.string().valid('homme','femme','non-binaire','non-renseigné'),
    disliked_colors:      Joi.array().items(Joi.string()),
    thermal_sensitivity:  Joi.number().integer().min(-2).max(2),
    default_city:         Joi.string().max(100),
    default_lat:          Joi.number().min(-90).max(90),
    default_lng:          Joi.number().min(-180).max(180),
    calendar_sync_enabled: Joi.boolean(),
    location_enabled:     Joi.boolean(),
    notifications_enabled: Joi.boolean()
  }),

  createGarment: Joi.object({
    category:         Joi.string().valid('haut','bas','robe','combinaison','sur-vetement','chaussures','accessoire','sous-vetement','sport').required(),
    subcategory:      Joi.string().max(50),
    label:            Joi.string().max(100),
    color_primary:    Joi.string().max(50),
    color_hex:        Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
    color_secondary:  Joi.string().max(50),
    pattern:          Joi.string().valid('uni','rayures','carreaux','fleurs','imprime','autre'),
    material:         Joi.string().max(50),
    formality:        Joi.number().integer().min(1).max(5),
    seasons:          Joi.array().items(Joi.string().valid('printemps','ete','automne','hiver')),
    temp_min:         Joi.number().integer().min(-30).max(50),
    temp_max:         Joi.number().integer().min(-30).max(50),
    tags:             Joi.array().items(Joi.string().max(30))
  }),

  updateGarment: Joi.object({
    label:            Joi.string().max(100),
    color_primary:    Joi.string().max(50),
    color_hex:        Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
    pattern:          Joi.string().valid('uni','rayures','carreaux','fleurs','imprime','autre'),
    material:         Joi.string().max(50),
    formality:        Joi.number().integer().min(1).max(5),
    seasons:          Joi.array().items(Joi.string().valid('printemps','ete','automne','hiver')),
    temp_min:         Joi.number().integer().min(-30).max(50),
    temp_max:         Joi.number().integer().min(-30).max(50),
    tags:             Joi.array().items(Joi.string().max(30)),
    is_active:        Joi.boolean()
  }),

  generateOutfit: Joi.object({
    lat:    Joi.number().min(-90).max(90),
    lng:    Joi.number().min(-180).max(180),
    event:  Joi.string().max(200),  // événement agenda optionnel
    date:   Joi.string().isoDate()  // date cible, défaut = aujourd'hui
  }),

  wearOutfit: Joi.object({
    outfit_id: Joi.string().uuid().required(),
    worn_on:   Joi.string().isoDate(),
    notes:     Joi.string().max(500)
  }),

  rateOutfit: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required()
  })
}

module.exports = { validate, schemas }
