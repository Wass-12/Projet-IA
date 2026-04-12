import Anthropic from "@anthropic-ai/sdk"

const apiKey = process.env.ANTHROPIC_API_KEY

export const anthropic = apiKey ? new Anthropic({ apiKey }) : null

if (!apiKey) {
  console.warn("⚠️  ANTHROPIC_API_KEY non définie — /api/analyze sera désactivée")
}
