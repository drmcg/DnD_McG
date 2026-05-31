import { Settings } from '../types'
import { generateWithStreaming } from './ollama'

export async function summarizeConversation(settings: Settings, previousSummary: string, latestEvents: string): Promise<string> {
  const prompt = [
    "You are a concise summarizer for a D&D campaign. Produce a short coherent summary (3-6 sentences) capturing the important facts, locations, NPCs, player conditions, items, and ongoing goals.",
    "Be brief and factual: no flavourful storytelling. This summary will be used as the ONLY context sent to the Dungeon Master LLM for future turns.",
    "Previous summary:",
    previousSummary || "(none)",
    "New events to incorporate:",
    latestEvents,
    "Produce an updated summary:"
  ].join("\n\n")

  const out = await generateWithStreaming({
    settings,
    prompt,
    maxRuntimeMs: 60_000, // 1 min for summary
    retry: 3
  })
  // strip whitespace
  return out.trim()
}
