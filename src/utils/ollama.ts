// Ollama client with streaming, timeouts, and retry.
// Assumes model-list endpoint is at `${baseUrl}/v1/models`
// Assumes generation endpoint is at `${baseUrl}/v1/generate` (adjust if your Ollama uses different path)
import { Settings } from '../types'

export async function fetchModels(baseUrl: string, signal?: AbortSignal): Promise<string[]> {
  const url = `${baseUrl.replace(/\/$/, '')}/v1/models`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error('Failed fetching models: ' + res.status)
  const data = await res.json()
  // expecting an array or object - normalize:
  if (Array.isArray(data)) return data.map((m: any) => (m.name ?? m.id ?? String(m)))
  if (data.models) return data.models.map((m: any) => m.name ?? m.id)
  return []
}

type GenerateOptions = {
  settings: Settings
  prompt: string
  maxRuntimeMs?: number // total wait allowed
  onChunk?: (chunk: string) => void
  signal?: AbortSignal
  retry?: number
}

export async function generateWithStreaming(opts: GenerateOptions): Promise<string> {
  const base = opts.settings.ollamaUrl.replace(/\/$/, '')
  const model = opts.settings.model
  if (!base) throw new Error('Ollama URL not set')
  if (!model) throw new Error('Model not selected')

  const url = `${base}/v1/generate` // change if your Ollama endpoint differs
  const maxRuntimeMs = opts.maxRuntimeMs ?? 5 * 60 * 1000 // 5 minutes
  const tokenIdleMs = 30 * 1000 // 30 seconds between tokens after stream starts
  const maxRetries = opts.retry ?? 3

  let attempt = 0
  let lastErr: any = null

  while (attempt < maxRetries) {
    attempt++
    const controller = new AbortController()
    const overallTimer = setTimeout(() => controller.abort(), maxRuntimeMs)
    const combinedSignal = opts.signal ? anySignal([controller.signal, opts.signal]) : controller.signal

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          input: opts.prompt,
          stream: true
        }),
        signal: combinedSignal
      })
      if (!res.ok) {
        const txt = await res.text().catch(()=> '')
        throw new Error('Generate failed: ' + res.status + ' ' + txt)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let done = false
      let buffer = ''
      let lastChunkTimer: any = null

      const resetChunkTimer = () => {
        if (lastChunkTimer) clearTimeout(lastChunkTimer)
        lastChunkTimer = setTimeout(() => {
          // idle token timeout -> abort
          controller.abort()
        }, tokenIdleMs)
      }

      resetChunkTimer()

      while (!done) {
        const { value, done: d } = await reader.read()
        if (d) {
          done = true
          if (lastChunkTimer) clearTimeout(lastChunkTimer)
          break
        }
        resetChunkTimer()
        const chunkText = decoder.decode(value, { stream: true })
        buffer += chunkText
        // Some streaming endpoints send newlines-delimited JSON or raw text.
        // We'll forward raw text chunks to caller and accumulate.
        if (opts.onChunk) opts.onChunk(chunkText)
      }

      clearTimeout(overallTimer)
      // Return accumulated buffer
      return buffer
    } catch (err) {
      lastErr = err
      // retry logic with backoff
      const backoff = 500 * attempt
      await new Promise((r) => setTimeout(r, backoff))
      // continue to next attempt
    } finally {
      // nothing
    }
  }

  throw lastErr ?? new Error('Generation failed after retries')
}

// helper to combine signals (simple polyfill)
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController()
  const onAbort = () => controller.abort()
  for (const s of signals) {
    if (s.aborted) {
      controller.abort()
      break
    }
    s.addEventListener('abort', onAbort)
  }
  return controller.signal
}
