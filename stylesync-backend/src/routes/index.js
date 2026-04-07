const router  = require('express').Router()
const multer  = require('multer')

const { authenticate }  = require('../middleware/auth')
const { validate, schemas } = require('../middleware/validate')

const profileCtrl  = require('../controllers/profile.controller')
const garmentsCtrl = require('../controllers/garments.controller')
const outfitsCtrl  = require('../controllers/outfits.controller')

// Multer : stockage en mémoire (buffer), max 10 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Seules les images sont acceptées'))
  }
})

// Toutes les routes nécessitent un token valide
router.use(authenticate)

// ── Profil ────────────────────────────────────────────────────
router.get  ('/profile',       profileCtrl.getProfile)
router.put  ('/profile',       validate(schemas.updateProfile), profileCtrl.updateProfile)
router.get  ('/profile/stats', profileCtrl.getStats)

// ── Vêtements ─────────────────────────────────────────────────
router.get   ('/garments',     garmentsCtrl.listGarments)
router.get   ('/garments/:id', garmentsCtrl.getGarment)
router.post  ('/garments',     upload.single('image'), validate(schemas.createGarment), garmentsCtrl.createGarment)
router.patch ('/garments/:id', validate(schemas.updateGarment), garmentsCtrl.updateGarment)
router.delete('/garments/:id', garmentsCtrl.deleteGarment)

// ── Tenues ────────────────────────────────────────────────────
router.post  ('/outfits/generate',    validate(schemas.generateOutfit), outfitsCtrl.generate)
router.post  ('/outfits/wear',        validate(schemas.wearOutfit),     outfitsCtrl.wear)
router.get   ('/outfits/history',     outfitsCtrl.history)
router.patch ('/outfits/:id/rate',    validate(schemas.rateOutfit),     outfitsCtrl.rateOutfit)

module.exports = router
