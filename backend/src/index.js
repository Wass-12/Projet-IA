import express from "express"
import cors from "cors"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import routes from "./routes/index.routes.js"
import { loadEnv } from "./config/env.js"

loadEnv()

const app = express()

app.use(helmet())

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",").map(o => o.trim()).filter(Boolean)

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)
    if (allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error(`CORS bloqué : origine non autorisée (${origin})`))
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}))

app.use(rateLimit({
  windowMs: 15 * 60 * 1000, max: 100,
  standardHeaders: true, legacyHeaders: false,
  message: { error: "Trop de requêtes, réessayez dans 15 minutes." },
}))

app.use("/api/analyze", rateLimit({
  windowMs: 60 * 1000, max: 10,
  message: { error: "Limite d'analyse IA atteinte, réessayez dans 1 minute." },
}))

app.use(express.json({ limit: "10mb" }))

app.use("/api", routes)

app.get("/health", (req, res) => res.json({ status: "OK", timestamp: new Date().toISOString() }))

app.use((err, req, res, _next) => {
  console.error("[ERROR]", err.message)
  res.status(err.status || 500).json({ error: err.message || "Erreur interne du serveur" })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`✅ Serveur démarré sur le port ${PORT} [${process.env.NODE_ENV}]`))
