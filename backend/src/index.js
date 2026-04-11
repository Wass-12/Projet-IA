import express from "express"
import routes from "./routes/index.routes.js"
import { loadEnv } from "./config/env.js"

loadEnv()

const app = express()
app.use(express.json())

app.use("/api", routes)

const PORT = process.env.PORT || 3000
app.get("/health", (req, res) => res.send("OK"))
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
