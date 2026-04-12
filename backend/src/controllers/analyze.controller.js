import { anthropic } from "../config/anthropic.js"
import { removeBackground } from "../services/removebg.js"

const HINT_MAX  = 200
const IMG_MAX   = 8_000_000
const IMG_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

function sanitizeHint(raw) {
  return String(raw)
    .slice(0, HINT_MAX)
    .replace(/[\r\n]+/g, " ")
    .replace(/[`"'\\]/g, "")
    .replace(/\b(ignore|oublie|forget|system|assistant|instruction|prompt|context)\b/gi, "")
    .trim()
}

function validateImage(img) {
  if (typeof img !== "string") return "image doit être une chaîne"
  if (!img.startsWith("data:image/")) return "image doit commencer par data:image/"
  const mime = img.split(";")[0].replace("data:", "")
  if (!IMG_TYPES.includes(mime)) return `Type non supporté. Acceptés : ${IMG_TYPES.join(", ")}`
  if ((img.split(",")[1] || "").length > IMG_MAX) return "Image trop volumineuse (max 8 MB)"
  return null
}

export const analyzeGarment = async (req, res, next) => {
  try {
    // ── Mock IA (si pas de clé Anthropic) ────────────────────
    if (!anthropic) {
      return res.json({
        type:       "T-shirt",
        brand:      "Mock Brand",
        size:       "M",
        material:   "Coton",
        season:     "Toutes saisons",
        colors:     ["#ffffff", "#000000"],
        confidence: 90,
        occasions:  ["Casual", "Sport"],
        notes:      "Résultat de test — clé Anthropic manquante",
      })
    }
    // ────────────────────────────────────────────────────────

    const { image, hint } = req.body
    if (!image && !hint) return res.status(400).json({ error: "Fournir 'image' (base64) ou 'hint' (texte)" })

    if (image) {
      const err = validateImage(image)
      if (err) return res.status(400).json({ error: err })
    }

    const safeHint = hint ? sanitizeHint(hint) : "aléatoire"
    const isImg    = Boolean(image)

    // ── Détourage Remove.bg ──────────────────────────────────
    let finalImage = image
    if (isImg && process.env.REMOVEBG_API_KEY) {
      try {
        const buffer   = Buffer.from(image.split(",")[1], "base64")
        const cleanBuf = await removeBackground(buffer)
        finalImage     = `data:image/png;base64,${cleanBuf.toString("base64")}`
      } catch (e) {
        console.warn("Remove.bg échoué, image originale utilisée :", e.message)
      }
    }
    // ────────────────────────────────────────────────────────

    const prompt = isImg
      ? `Analyse cette photo de vêtement et retourne UNIQUEMENT un JSON valide (sans markdown) :
{"type":"string","brand":"string ou vide","size":"string ou vide","material":"string","season":"Printemps|Été|Automne|Hiver|Toutes saisons","colors":["#hex"],"confidence":80-99,"occasions":["string"],"notes":"string ou vide"}
Types : T-shirt, Chemise, Pull, Veste, Manteau, Pantalon, Jean, Short, Robe, Jupe, Costume, Chaussures, Accessoire ou Autre.`
      : `Génère un exemple réaliste de vêtement de type "${safeHint}" et retourne UNIQUEMENT un JSON valide (sans markdown) :
{"type":"string","brand":"string","size":"string","material":"string","season":"Printemps|Été|Automne|Hiver|Toutes saisons","colors":["#hex"],"confidence":85-97,"occasions":["string"],"notes":"string"}`

    const content = isImg
      ? [
          { type: "image", source: { type: "base64", media_type: finalImage.split(";")[0].replace("data:", "") || "image/jpeg", data: finalImage.split(",")[1] } },
          { type: "text", text: prompt }
        ]
      : [{ type: "text", text: prompt }]

    const resp  = await anthropic.messages.create({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content }] })
    const clean = (resp.content?.[0]?.text || "{}").replace(/```json|```/g, "").trim()

    try {
      const p = JSON.parse(clean)
      return res.json({
        type:       typeof p.type === "string"       ? p.type.slice(0, 50)      : "Autre",
        brand:      typeof p.brand === "string"      ? p.brand.slice(0, 100)    : "",
        size:       typeof p.size === "string"       ? p.size.slice(0, 20)      : "",
        material:   typeof p.material === "string"   ? p.material.slice(0, 100) : "",
        season:     typeof p.season === "string"     ? p.season.slice(0, 50)    : "",
        colors:     Array.isArray(p.colors) ? p.colors.slice(0, 5).filter(c => /^#[0-9a-fA-F]{3,6}$/.test(c)) : [],
        confidence: typeof p.confidence === "number" ? Math.min(99, Math.max(0, p.confidence)) : 80,
        occasions:  Array.isArray(p.occasions) ? p.occasions.slice(0, 10).filter(o => typeof o === "string").map(o => o.slice(0, 50)) : [],
        notes:      typeof p.notes === "string"      ? p.notes.slice(0, 300)    : "",
      })
    } catch { return res.status(502).json({ error: "Réponse IA invalide" }) }
  } catch (err) { next(err) }
}