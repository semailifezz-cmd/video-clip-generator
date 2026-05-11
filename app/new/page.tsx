'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { upsertDramaEntry } from '@/lib/dramaStore'

const DEFAULT_FORMULA = `Step 1 — Cheerful Introduction (0–25%)
Setting: Colorful park, bright magical classroom, or a sunny adventure playground.
Plot: Our young hero is introduced in a vibrant, happy setting surrounded by friends, facing a small fun challenge or mystery.
Goal: Establish warmth and joy immediately; give viewers a character to root for with a smile.

Step 2 — Discovery & Wonder (25–50%)
Plot: The hero stumbles upon something magical — a glowing treasure, a talking animal, or a surprising new skill they didn't know they had.
Performance: Wide eyes fill with wonder and growing excitement. The hero shares the discovery with their best friend.

Step 3 — Teamwork & Kindness (50–75%)
Plot: Friends come together to tackle the challenge. Each character contributes their unique talent. Someone nearly gives up but is encouraged by the group.
Goal: Show the power of friendship, inclusivity, and never leaving anyone behind.

Step 4 — Joyful Celebration (75–100%)
Resolution: The challenge is solved! Everyone cheers, laughs, and dances together in the colorful setting.
Ending: The hero shares a heartfelt lesson about kindness or teamwork. The scene closes on bright smiles and a rainbow-lit sky.`

const VIDEO_LENGTHS = [
  { label: '15 seconds', value: 15, desc: 'Ultra short — punchy and instant' },
  { label: '30 seconds', value: 30, desc: 'Short-form — ideal for social media' },
  { label: '60 seconds', value: 60, desc: 'Classic — full story arc' },
  { label: '90 seconds', value: 90, desc: 'Extended — richer storytelling' },
]

const WORKFLOW_STEPS = ['① Universe', '② Assets', '③ Images', '④ Scripts', '⑤ Inject', '⑥ Video']

const inputClass =
  'w-full bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-orange-500/60 focus:bg-zinc-800 transition-colors'
const labelClass = 'block text-xs font-medium text-zinc-400 mb-1.5'

export default function NewVideoSeries() {
  const router = useRouter()
  const [form, setForm] = useState({
    prompt: '',
    total_videos: 5,
    video_length_s: 30,
    clip_length_s: 15,
    episode_formula: DEFAULT_FORMULA,
  })
  const [submitting, setSubmitting] = useState(false)

  const set = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const id = crypto.randomUUID()
    localStorage.setItem(`vcg_${id}`, JSON.stringify(form))
    upsertDramaEntry({
      id,
      title: form.prompt.slice(0, 60) || 'Untitled',
      genre: 'Kids Animation',
      createdAt: new Date().toISOString(),
      status: 'generating',
      clipCount: 0,
      episodeCount: 0,
    })
    router.push(`/generate/${id}`)
  }

  const estCost = Math.round(form.total_videos * 1)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav className="border-b border-zinc-800/60 px-6 py-4 flex items-center justify-between sticky top-0 z-10 bg-zinc-950/90 backdrop-blur">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
          >
            ← Dashboard
          </button>
          <div className="w-px h-4 bg-zinc-800" />
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-orange-500 rounded flex items-center justify-center text-white text-[11px] font-bold tracking-tight">
              VCG
            </div>
            <span className="font-mono text-xs tracking-widest uppercase text-zinc-400">
              New Video Set
            </span>
          </div>
        </div>
        <span className="font-mono text-[11px] text-zinc-600 hidden sm:block">
          Grok · Kie.ai · v2.0
        </span>
      </nav>

      <div className="max-w-3xl mx-auto px-6">
        <div className="pt-14 pb-10">
          <p className="font-mono text-xs tracking-widest uppercase text-orange-400 mb-3">
            AI-Powered Kids Video Pipeline
          </p>
          <h1 className="text-5xl font-bold tracking-tight text-white leading-tight mb-4">
            Create Your<br />
            <span className="text-orange-400">Video Set</span>
          </h1>
          <p className="text-zinc-400 text-base max-w-lg mb-8">
            Describe a world and characters. We&apos;ll generate a shared universe and produce multiple standalone short videos — same cast, different stories.
          </p>
          <div className="flex items-center flex-wrap gap-0">
            {WORKFLOW_STEPS.map((step, i) => (
              <div key={step} className="flex items-center">
                <div className="bg-zinc-900 border border-zinc-700/60 rounded px-3 py-1.5 text-xs font-mono text-zinc-400">
                  {step}
                </div>
                {i < WORKFLOW_STEPS.length - 1 && (
                  <span className="text-zinc-700 px-1 text-sm">→</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="pb-24 space-y-6">

          {/* Prompt */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6">
            <div className="mb-5">
              <p className="font-mono text-[11px] tracking-widest uppercase text-zinc-500">01 — Your Prompt</p>
              <p className="text-sm text-zinc-600 mt-1">
                Describe the world, characters, and vibe. Everything — characters, venues, stories — is generated from this.
              </p>
            </div>
            <label className={labelClass}>Prompt *</label>
            <textarea
              value={form.prompt}
              onChange={set('prompt')}
              placeholder="e.g. A cheerful magical forest where a curious young bunny named Pip and their animal friends go on fun adventures every day, discovering hidden treasures and learning about kindness"
              rows={4}
              className={`${inputClass} resize-none`}
              required
            />
          </div>

          {/* Video settings */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6">
            <div className="mb-5">
              <p className="font-mono text-[11px] tracking-widest uppercase text-zinc-500">02 — Video Settings</p>
              <p className="text-sm text-zinc-600 mt-1">Each video is a standalone story with the same characters.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className={labelClass}>Number of Videos</label>
                <select
                  value={form.total_videos}
                  onChange={e => setForm(p => ({ ...p, total_videos: parseInt(e.target.value) }))}
                  className={inputClass}
                >
                  <option value={1}>1 video</option>
                  <option value={3}>3 videos</option>
                  <option value={5}>5 videos</option>
                  <option value={10}>10 videos</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Video Length</label>
                <select
                  value={form.video_length_s}
                  onChange={e => setForm(p => ({ ...p, video_length_s: parseInt(e.target.value) }))}
                  className={inputClass}
                >
                  {VIDEO_LENGTHS.map(vl => (
                    <option key={vl.value} value={vl.value}>
                      {vl.label} — {vl.desc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center bg-zinc-800/40 border border-zinc-700/40 rounded-lg p-4">
                <div className="text-3xl font-bold text-white">{form.total_videos}</div>
                <div className="text-[11px] text-zinc-500 font-mono mt-1">Videos</div>
              </div>
              <div className="text-center bg-zinc-800/40 border border-zinc-700/40 rounded-lg p-4">
                <div className="text-3xl font-bold text-white">{form.video_length_s}s</div>
                <div className="text-[11px] text-zinc-500 font-mono mt-1">Per Video</div>
              </div>
              <div className="text-center bg-zinc-800/40 border border-zinc-700/40 rounded-lg p-4">
                <div className="text-3xl font-bold text-orange-400">~${estCost}</div>
                <div className="text-[11px] text-zinc-500 font-mono mt-1">Est. Cost</div>
              </div>
            </div>
          </div>

          {/* Formula */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6">
            <div className="mb-4">
              <p className="font-mono text-[11px] tracking-widest uppercase text-zinc-500">03 — Story Formula</p>
              <p className="text-sm text-zinc-600 mt-1">
                The arc every video follows — all steps are woven into one continuous video.
              </p>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {['Intro (0–25%)', 'Discovery (25–50%)', 'Teamwork (50–75%)', 'Celebration (75–100%)'].map(s => (
                <span key={s} className="font-mono text-[11px] px-2 py-1 bg-zinc-800/60 border border-zinc-700 rounded text-zinc-500">{s}</span>
              ))}
            </div>
            <textarea
              value={form.episode_formula}
              onChange={set('episode_formula')}
              rows={14}
              className={`${inputClass} font-mono text-xs leading-relaxed resize-none`}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl text-base transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? <><span className="animate-spin inline-block">◌</span> Starting…</> : <>Generate Video Set →</>}
          </button>
        </form>
      </div>
    </div>
  )
}
