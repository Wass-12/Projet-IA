const axios = require('axios')
const FormData = require('form-data')

/**
 * Supprime le fond d'une image via l'API Photoroom
 * @param {Buffer} imageBuffer - Buffer de l'image originale
 * @returns {Buffer} - Image PNG sans fond
 */
async function removeBackground(imageBuffer) {
  const form = new FormData()
  form.append('image_file', imageBuffer, {
    filename: 'garment.jpg',
    contentType: 'image/jpeg'
  })

  const { data } = await axios.post(
    'https://sdk.photoroom.com/v1/segment',
    form,
    {
      headers: {
        ...form.getHeaders(),
        'x-api-key': process.env.PHOTOROOM_API_KEY
      },
      responseType: 'arraybuffer',
      timeout: 15000
    }
  )

  return Buffer.from(data)
}

/**
 * Analyse une image de vêtement et retourne les attributs détectés
 * Utilise l'API Photoroom pour l'analyse de couleur + logique interne
 *
 * En production, vous pourriez brancher ici GPT-4o Vision ou Google Vision API
 * pour un auto-tagging plus précis.
 *
 * @param {Buffer} imageBuffer
 * @returns {{ category, color_primary, color_hex, pattern, confidence }}
 */
async function analyzeGarment(imageBuffer) {
  // --- Simulation d'analyse IA ---
  // À remplacer par un appel réel à GPT-4o Vision ou Google Vision API
  //
  // Exemple avec GPT-4o Vision :
  // const response = await openai.chat.completions.create({
  //   model: 'gpt-4o',
  //   messages: [{
  //     role: 'user',
  //     content: [
  //       { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
  //       { type: 'text', text: 'Analyse ce vêtement. Retourne un JSON avec: category (haut/bas/robe/chaussures/sur-vetement/accessoire), subcategory (ex: jean, col-roule, trench), color_primary (nom couleur FR), color_hex (#RRGGBB), pattern (uni/rayures/carreaux/fleurs/imprime/autre), material si visible.' }
  //     ]
  //   }]
  // })

  return {
    category:      'haut',
    subcategory:   null,
    color_primary: null,
    color_hex:     null,
    pattern:       'uni',
    material:      null,
    confidence:    0.0,
    raw:           { note: 'Intégrez GPT-4o Vision ou Google Vision API ici' }
  }
}

module.exports = { removeBackground, analyzeGarment }
