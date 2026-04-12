import { supabase } from "../config/supabase.js"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const isUUID  = v => typeof v === "string" && UUID_RE.test(v)

const ALLOWED = ["user_id","image_url","image_url_clean","category","subcategory","label",
  "color_primary","color_hex","color_secondary","pattern","material",
  "formality","seasons","temp_min","temp_max","tags","ai_confidence","ai_raw_response"]
const pick = body => Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED.includes(k)))

const checkDB = res => {
  if (!supabase) { res.status(503).json({ error: "SUPABASE_URL / SUPABASE_SERVICE_KEY manquantes dans .env" }); return false }
  return true
}

export const getGarments = async (req, res, next) => {
  try {
    if (!checkDB(res)) return
    if (!isUUID(req.query.user_id)) return res.status(400).json({ error: "user_id doit être un UUID valide" })
    const { data, error } = await supabase.from("garments").select("*")
      .eq("user_id", req.query.user_id).eq("is_active", true)
      .order("created_at", { ascending: false }).limit(500)
    if (error) throw error
    return res.json(data)
  } catch (err) { next(err) }
}

export const createGarment = async (req, res, next) => {
  try {
    if (!checkDB(res)) return
    const raw = req.body
    if (!isUUID(raw.user_id))                             return res.status(400).json({ error: "user_id doit être un UUID valide" })
    if (!raw.image_url || typeof raw.image_url !== "string") return res.status(400).json({ error: "image_url requis" })
    if (!raw.category  || typeof raw.category  !== "string") return res.status(400).json({ error: "category requise" })
    const { data, error } = await supabase.from("garments").insert([pick(raw)]).select().single()
    if (error) throw error
    return res.status(201).json(data)
  } catch (err) { next(err) }
}

export const deleteGarment = async (req, res, next) => {
  try {
    if (!checkDB(res)) return
    if (!isUUID(req.params.id)) return res.status(400).json({ error: "id doit être un UUID valide" })
    const { error } = await supabase.from("garments")
      .update({ is_active: false, donated_at: new Date().toISOString() }).eq("id", req.params.id)
    if (error) throw error
    return res.status(204).send()
  } catch (err) { next(err) }
}
