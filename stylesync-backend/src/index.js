require('dotenv').config()

const express     = require('express')
const cors        = require('cors')
const helmet      = require('helmet')
const morgan      = require('morgan')
const rateLimit   = require('express-rate-limit')

const routes = require('./routes')

const app  = express()
const PORT = process.env.PORT || 3000

// ── Sécurité ──────────────────────────────────────────────────
app.use(helmet())
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS']
}))

// Rate limiting global : 100 requêtes / 15 min par IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, réessayez dans quelques minutes.' }
}))

// Rate limiting strict sur la génération de tenues (API météo coûteuse)
app.use('/api/outfits/generate', rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Maximum 10 générations par minute.' }
}))

// ── Parsing ───────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

// ── Logs ──────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
}

// ── Santé ─────────────────────────────────────────────────────
app.get('/health', (_, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() })
})

// ── Routes API ────────────────────────────────────────────────
app.use('/api', routes)

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} introuvable` })
})

// ── Gestion d'erreurs globale ─────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[ERROR]', err.message)

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Image trop lourde (max 10 MB)' })
  }

  const status = err.status || 500
  res.status(status).json({
    error: process.env.NODE_ENV === 'production' ? 'Erreur interne du serveur' : err.message
  })
})

// ── Démarrage ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║       StyleSync API — v1.0.0          ║
  ║  Serveur : http://localhost:${PORT}      ║
  ║  Env     : ${(process.env.NODE_ENV || 'development').padEnd(27)}║
  ╚═══════════════════════════════════════╝
  `)
})

module.exports = app
