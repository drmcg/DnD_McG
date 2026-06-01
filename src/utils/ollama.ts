// Ollama client with streaming, timeouts, and retry.
// Uses Ollama's native API endpoints.
import { Settings } from '../types'

export async function fetchModels(baseUrl: string, signal?: AbortSignal): Promise<string[]> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/tags`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error('Failed fetching models: ' + res.status)
  const data = await res.json()
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

type OllamaGenerateChunk = {
  response?: string
  done?: boolean
  error?: string
}

export async function generateWithStreaming(opts: GenerateOptions): Promise<string> {
  const base = opts.settings.ollamaUrl.replace(/\/$/, '')
  const model = opts.settings.model
  if (!base) throw new Error('Ollama URL not set')
  if (!model) throw new Error('Model not selected')

  const url = `${base}/api/generate`
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
          prompt: opts.prompt,
          stream: true
        }),
        signal: combinedSignal
      })

      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error('Generate failed: ' + res.status + ' ' + txt)
      }

      if (!res.body) throw new Error('Generate failed: empty response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let responseText = ''
      let pending = ''
      let lastChunkTimer: ReturnType<typeof setTimeout> | null = null

      const resetChunkTimer = () => {
        if (lastChunkTimer) clearTimeout(lastChunkTimer)
        lastChunkTimer = setTimeout(() => {
          controller.abort()
        }, tokenIdleMs)
      }

      resetChunkTimer()

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        resetChunkTimer()
        pending += decoder.decode(value, { stream: true })

        let newlineIndex = pending.indexOf('\n')
        while (newlineIndex !== -1) {
          const line = pending.slice(0, newlineIndex).trim()
          pending = pending.slice(newlineIndex + 1)

          if (line) {
            const chunk = JSON.parse(line) as OllamaGenerateChunk
            if (chunk.error) throw new Error(chunk.error)

            const text = chunk.response ?? ''
            if (text) {
              responseText += text
              if (opts.onChunk) opts.onChunk(text)
            }

            if (chunk.done) {
              if (lastChunkTimer) clearTimeout(lastChunkTimer)
              clearTimeout(overallTimer)
              return responseText
            }
          }

          newlineIndex = pending.indexOf('\n')
        }
      }

      pending += decoder.decode()
      const finalLine = pending.trim()
      if (finalLine) {
        const chunk = JSON.parse(finalLine) as OllamaGenerateChunk
        if (chunk.error) throw new Error(chunk.error)
        const text = chunk.response ?? ''
        if (text) {
          responseText += text
          if (opts.onChunk) opts.onChunk(text)
        }
      }

      clearTimeout(overallTimer)
      if (lastChunkTimer) clearTimeout(lastChunkTimer)
      return responseText
    } catch (err) {
      clearTimeout(overallTimer)
      lastErr = err
      const backoff = 500 * attempt
      await new Promise((r) => setTimeout(r, backoff))
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
