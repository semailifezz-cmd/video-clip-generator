const KIE_BASE = 'https://api.kie.ai/api/v1'

function apiKey(): string {
  const key = process.env.KIE_API_KEY
  if (!key) throw new Error('KIE_API_KEY not configured. Add it to .env.local or Vercel env vars.')
  return key
}

function authHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${apiKey()}`,
    'Content-Type': 'application/json',
  }
}

async function createTask(model: string, input: Record<string, unknown>): Promise<string> {
  const res = await fetch(`${KIE_BASE}/jobs/createTask`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ model, input }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Kie.ai createTask ${res.status}: ${body}`)
  }
  const data = await res.json()
  if (data.code !== 200) throw new Error(`Kie.ai error ${data.code}: ${data.msg}`)
  return data.data.taskId as string
}

export type KieState = 'waiting' | 'queuing' | 'generating' | 'success' | 'fail'

export interface PollResult {
  state: KieState
  resultUrls: string[]
  failReason?: string
}

export async function pollTask(taskId: string): Promise<PollResult> {
  const res = await fetch(`${KIE_BASE}/jobs/recordInfo?taskId=${taskId}`, {
    headers: { 'Authorization': `Bearer ${apiKey()}` },
  })
  if (!res.ok) throw new Error(`Kie.ai pollTask ${res.status}`)
  const data = await res.json()
  if (data.code !== 200) throw new Error(`Kie.ai poll error ${data.code}: ${data.msg}`)

  const task = data.data
  let resultUrls: string[] = []
  let failReason: string | undefined

  if (task.resultJson) {
    try {
      const parsed = JSON.parse(task.resultJson)
      resultUrls = parsed.resultUrls ?? []
    } catch {
      // non-critical
    }
  }

  // Top-level failure fields per Kie.ai docs: failMsg + failCode
  if (task.failMsg) failReason = task.failCode ? `[${task.failCode}] ${task.failMsg}` : task.failMsg
  if (!failReason && task.state === 'fail') failReason = `Task ${taskId} failed (no reason given)`

  return { state: task.state as KieState, resultUrls, failReason }
}

// Phase 3: Generate a single reference image (character portrait, venue shot, prop)
export async function submitImageJob(prompt: string): Promise<string> {
  return createTask('grok-imagine/text-to-image', {
    prompt,
    aspect_ratio: '1:1',
    enable_pro: true,
  })
}

// Phase 6: Generate a 15-second video clip
// Uses image-to-video when reference images are provided, text-to-video otherwise
// Kie.ai supports 6–30 seconds only for both video models
const KIE_MAX_DURATION = 30
const KIE_MIN_DURATION = 6

export async function submitVideoJob(payload: {
  prompt: string
  image_urls: string[]
  duration: number
  aspect_ratio: string
  resolution: string
}): Promise<string> {
  const clampedDuration = Math.min(KIE_MAX_DURATION, Math.max(KIE_MIN_DURATION, payload.duration))

  if (payload.image_urls.length > 0) {
    return createTask('grok-imagine/image-to-video', {
      image_urls: payload.image_urls,
      prompt: payload.prompt,
      mode: 'normal',
      duration: String(clampedDuration), // image-to-video expects string per docs
      aspect_ratio: payload.aspect_ratio,
      resolution: payload.resolution,
    })
  }
  return createTask('grok-imagine/text-to-video', {
    prompt: payload.prompt,
    mode: 'normal',
    duration: clampedDuration, // text-to-video expects number per docs
    aspect_ratio: payload.aspect_ratio,
    resolution: payload.resolution,
  })
}
