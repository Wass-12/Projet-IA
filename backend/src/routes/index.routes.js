import { Router } from "express"
import { getUsers } from "../controllers/user.controller.js"
import { analyzeGarment } from "../controllers/analyze.controller.js"
import { getGarments, createGarment, deleteGarment } from "../controllers/garment.controller.js"

const router = Router()

router.get("/users",           getUsers)
router.post("/analyze",        analyzeGarment)
router.get("/garments",        getGarments)
router.post("/garments",       createGarment)
router.delete("/garments/:id", deleteGarment)

export default router
