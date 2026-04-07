const { supabaseAnon } = require('../utils/supabase')

/**
 * Middleware d'authentification — vérifie le JWT Supabase
 * Injecte req.user = { id, email } sur chaque requête authentifiée
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant ou mal formé' })
  }

  const token = authHeader.split(' ')[1]

  const { data, error } = await supabaseAnon.auth.getUser(token)

  if (error || !data?.user) {
    return res.status(401).json({ error: 'Token invalide ou expiré' })
  }

  req.user = {
    id: data.user.id,
    email: data.user.email
  }

  next()
}

module.exports = { authenticate }
