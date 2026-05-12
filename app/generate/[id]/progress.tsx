'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { UniversePrompt, SeriesBible, VideoScript, ScenePrompt } from '@/lib/types'
import { injectRefUrls, sleep } from '@/lib/workflow'
import { upsertDramaEntry, getDramaEntry } from '@/lib/dramaStore'

const PHASES = [
  { id: 1, name: 'Universe Bible Generation', desc: 'Gemini creates shared characters, venues & story outlines' },
  { id: 2, name: 'Asset Database Population', desc: 'Structuring character, venue, and prop tables' },
  { id: 3, name: 'Reference Image Generation', desc: 'Grok Imagine creates portraits & venue shots via Kie.ai' },
  { id: 4, name: 'Video Script Generation', desc: 'Writing 1 comprehensive prompt per video using the formula' },
  { id: 5, name: 'Reference URL Injection', desc: 'Assembling final video prompts with reference images' },
  { id: 6, name: 'Video Generation', desc: 'Generating all videos via Grok Imagine Video (Kie.ai)' },
]

type PhaseStatus = 'idle' | 'running' | 'done' | 'error'

interface PhaseState {
  status: PhaseStatus
  progress: number
  detail: string
}

async function downloadVideo(url: string, filename: string) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  } catch {
    window.open(url, '_blank')
  }
}

function VideoCard({
  videoNum,
  url,
  universeTitle,
  title,
}: {
  videoNum: number
  url: string
  universeTitle: string
  title: string
}) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    const filename = `${universeTitle.replace(/\s+/g, '_')}_Video${videoNum}.mp4`
    await downloadVideo(url, filename)
    setDownloading(false)
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
      <div className="relative bg-black" style={{ aspectRatio: '9/16' }}>
        <video
          src={url}
          controls
          playsInline
          className="w-full h-full object-contain"
          preload="metadata"
        />
      </div>
      <div className="p-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-mono text-zinc-300 font-semibold truncate max-w-[140px]">{title}</p>
          <p className="text-[11px] text-zinc-600 font-mono">Video {videoNum}</p>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 text-[11px] font-mono bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
        >
          {downloading ? '…' : '↓ MP4'}
        </button>
      </div>
    </div>
  )
}

function SceneCard({ scene, videoTitle }: { scene: ScenePrompt; videoTitle?: string }) {
  return (
    <div className="bg-zinc-800/40 border border-zinc-700/30 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-mono bg-orange-950/50 text-orange-400 border border-orange-900/40 px-1.5 py-0.5 rounded">
          Video {scene.video_num}
        </span>
        {videoTitle && (
          <span className="text-[10px] font-mono text-zinc-500 truncate max-w-[200px]">{videoTitle}</span>
        )}
        <span className="text-[10px] font-mono text-zinc-600 ml-auto truncate max-w-[180px]">
          {scene.venue_used}
        </span>
      </div>

      {(scene.camera_angle || scene.camera_movement) && (
        <div className="space-y-1 bg-zinc-900/50 rounded-lg p-2.5">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-1">Camera</p>
          {scene.camera_angle && (
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-mono text-zinc-600 w-18 flex-shrink-0 mt-0.5">Angle</span>
              <p className="text-xs text-zinc-400 leading-relaxed">{scene.camera_angle}</p>
            </div>
          )}
          {scene.camera_movement && (
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-mono text-zinc-600 w-18 flex-shrink-0 mt-0.5">Movement</span>
              <p className="text-xs text-zinc-400 leading-relaxed">{scene.camera_movement}</p>
            </div>
          )}
        </div>
      )}

      {scene.characters_used.length > 0 && (scene.character_expressions || scene.character_actions) && (
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">Characters</p>
          {scene.characters_used.map(name => (
            <div key={name} className="bg-zinc-900/60 border border-zinc-800/60 rounded-lg p-2.5 space-y-1.5">
              <p className="text-[11px] font-mono text-zinc-300 font-semibold">{name}</p>
              {scene.character_expressions?.[name] && (
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-mono text-zinc-600 w-20 flex-shrink-0 mt-0.5">Expression</span>
                  <p className="text-xs text-zinc-500 leading-relaxed">{scene.character_expressions[name]}</p>
                </div>
              )}
              {scene.character_actions?.[name] && (
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-mono text-zinc-600 w-20 flex-shrink-0 mt-0.5">Action</span>
                  <p className="text-xs text-zinc-500 leading-relaxed">{scene.character_actions[name]}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {(scene.atmosphere || scene.color_ambience) && (
        <div className="space-y-1 bg-zinc-900/50 rounded-lg p-2.5">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-1">Mood & Color</p>
          {scene.atmosphere && (
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-mono text-zinc-600 w-18 flex-shrink-0 mt-0.5">Atmosphere</span>
              <p className="text-xs text-zinc-500 leading-relaxed">{scene.atmosphere}</p>
            </div>
          )}
          {scene.color_ambience && (
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-mono text-zinc-600 w-18 flex-shrink-0 mt-0.5">Color</span>
              <p className="text-xs text-zinc-500 leading-relaxed">{scene.color_ambience}</p>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-zinc-700/40 pt-3">
        <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-1.5">Video Prompt</p>
        <p className="text-xs text-zinc-400 leading-relaxed">{scene.raw_prompt}</p>
      </div>
    </div>
  )
}

export default function Progress({ id }: { id: string }) {
  const router = useRouter()
  const [formData, setFormData] = useState<UniversePrompt | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [phases, setPhases] = useState<PhaseState[]>(
    PHASES.map(() => ({ status: 'idle' as PhaseStatus, progress: 0, detail: '' }))
  )
  const [currentPhase, setCurrentPhase] = useState(-1)
  const [bible, setBible] = useState<SeriesBible | null>(null)
  const [refImages, setRefImages] = useState<Record<string, string>>({})
  const [scripts, setScripts] = useState<VideoScript[]>([])
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({})
  const [videoErrors, setVideoErrors] = useState<Record<string, string>>({})
  const [pendingAssets, setPendingAssets] = useState<Array<{ name: string; type: string }>>([])
  const [imageErrors, setImageErrors] = useState<Record<string, string>>({})
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    const stored = localStorage.getItem(`vcg_${id}`)
    if (!stored) { setNotFound(true); return }
    setFormData(JSON.parse(stored))

    const saved = localStorage.getItem(`vcg_${id}_result`)
    if (saved) {
      try {
        const { videoUrls: savedUrls, bible: savedBible, refImages: savedImages, scripts: savedScripts } = JSON.parse(saved)
        setVideoUrls(savedUrls ?? {})
        setBible(savedBible)
        setRefImages(savedImages ?? {})
        setScripts(savedScripts ?? [])
        setIsComplete(true)
        setPhases(PHASES.map(() => ({ status: 'done' as PhaseStatus, progress: 100, detail: '' })))
        setCurrentPhase(PHASES.length - 1)
      } catch { /* ignore corrupt saved data */ }
    }
  }, [id])

  useEffect(() => {
    if (!formData || startedRef.current || isComplete) return
    startedRef.current = true
    runWorkflow(formData)
  }, [formData]) // eslint-disable-line react-hooks/exhaustive-deps

  const setPhase = (index: number, status: PhaseStatus, detail: string, progress = 0) => {
    setCurrentPhase(index)
    setPhases(prev =>
      prev.map((p, i) => (i === index ? { status, detail, progress } : p))
    )
  }

  const runWorkflow = async (form: UniversePrompt) => {
    try {
      // ── Phase 1: Universe Bible ────────────────────────────────────────
      setPhase(0, 'running', 'Calling Gemini to generate universe bible…')

      const bibleRes = await fetch('/api/bible', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const bibleData = await bibleRes.json()
      if (bibleData.error) throw new Error(bibleData.error)

      setBible(bibleData)
      setPhase(
        0, 'done',
        `${bibleData.characters.length} characters · ${bibleData.venues.length} venues · ${bibleData.videos.length} stories`,
        100
      )

      // ── Phase 2: Asset DB (local) ──────────────────────────────────────
      setPhase(1, 'running', 'Structuring asset database…')
      await sleep(400)
      const totalAssets = bibleData.characters.length + bibleData.venues.length + bibleData.props.length
      setPhase(1, 'done', `${totalAssets} assets indexed — Characters, Venues, Props, Video_Outlines`, 100)

      // ── Phase 3: Reference Images ──────────────────────────────────────
      const assetList = [
        ...bibleData.characters.map((c: SeriesBible['characters'][0]) => ({ name: c.name, type: 'character', prompt: c.image_prompt })),
        ...bibleData.venues.map((v: SeriesBible['venues'][0]) => ({ name: v.location_name, type: 'venue', prompt: v.image_prompt })),
        ...bibleData.props.map((p: SeriesBible['props'][0]) => ({ name: p.prop_name, type: 'prop', prompt: p.image_prompt })),
      ]

      const newRefImages: Record<string, string> = {}
      setPendingAssets(assetList.map(a => ({ name: a.name, type: a.type })))

      for (let i = 0; i < assetList.length; i++) {
        const asset = assetList[i]
        setPhase(2, 'running', `Generating ${asset.type}: "${asset.name}" (${i + 1} / ${assetList.length})`, (i / assetList.length) * 100)

        try {
          const submitRes = await fetch('/api/images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: asset.prompt }),
          })
          const submitData = await submitRes.json()
          if (!submitRes.ok || submitData.error) {
            throw new Error(submitData.error ?? `Image submit failed (${submitRes.status})`)
          }
          const { jobId } = submitData

          let url = ''
          let assetErr = ''
          for (let attempt = 0; attempt < 40 && !url && !assetErr; attempt++) {
            await sleep(3000)
            const pollRes = await fetch(`/api/images/${jobId}`)
            const pollData = await pollRes.json()
            if (!pollRes.ok || pollData.error) {
              assetErr = pollData.error ?? `Poll failed (${pollRes.status})`
              break
            }
            const { status, image_url, reason } = pollData
            if (status === 'done' && image_url) url = image_url
            else if (status === 'failed') {
              assetErr = reason ?? `Image generation failed for "${asset.name}"`
              break
            }
          }

          if (url) {
            newRefImages[asset.name] = url
            setRefImages(prev => ({ ...prev, [asset.name]: url }))
          } else {
            const msg = assetErr || `Timed out after 2 min for "${asset.name}"`
            setImageErrors(prev => ({ ...prev, [asset.name]: msg }))
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          setImageErrors(prev => ({ ...prev, [asset.name]: msg }))
        }
      }

      const imgCount = Object.keys(newRefImages).length
      const errCount = assetList.length - imgCount
      setPhase(2, 'done', `${imgCount} images generated${errCount > 0 ? ` · ${errCount} failed` : ''}`, 100)

      // ── Phase 4: Video Scripts ─────────────────────────────────────────
      const allScripts: VideoScript[] = []

      for (let i = 0; i < bibleData.videos.length; i++) {
        const video = bibleData.videos[i]
        setPhase(3, 'running', `Video ${video.video_num}: "${video.title}" (${i + 1} / ${bibleData.videos.length})`, (i / bibleData.videos.length) * 100)

        const scriptRes = await fetch('/api/scripts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ video, bible: bibleData, formula: form.episode_formula, videoLengthS: form.video_length_s }),
        })
        if (!scriptRes.ok) {
          const err = await scriptRes.json()
          throw new Error(err.error ?? 'Script generation failed')
        }

        const script = await scriptRes.json()
        if (script.error) throw new Error(script.error)
        allScripts.push(script)
        setScripts([...allScripts])
      }

      const totalScenes = allScripts.reduce((n, s) => n + s.scenes.length, 0)
      setPhase(3, 'done', `${totalScenes} video prompt${totalScenes !== 1 ? 's' : ''} written`, 100)

      // ── Phase 5: Reference URL Injection ──────────────────────────────
      setPhase(4, 'running', 'Assembling final video prompts with reference image URLs…')
      const injectedScripts = injectRefUrls(allScripts, newRefImages, bibleData)
      await sleep(300)
      setPhase(4, 'done', `${injectedScripts.flatMap(s => s.scenes).length} prompts assembled`, 100)

      // ── Phase 6: Video Generation ──────────────────────────────────────
      const allScenes = injectedScripts.flatMap(s => s.scenes)
      const newVideoUrls: Record<string, string> = {}

      for (let i = 0; i < allScenes.length; i++) {
        const scene = allScenes[i]
        const key = `video${scene.video_num}`
        const deadline = Date.now() + 10 * 60 * 1000
        let videoUrl = ''
        let lastFailReason = ''
        let attemptNum = 0

        while (Date.now() < deadline && !videoUrl) {
          attemptNum++
          const remaining = Math.round((deadline - Date.now()) / 1000)
          setPhase(
            5, 'running',
            `Video ${i + 1} / ${allScenes.length} — "${bibleData.videos[i]?.title}" · Attempt ${attemptNum} (${remaining}s left)`,
            (i / allScenes.length) * 100,
          )

          const submitRes = await fetch('/api/videos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: scene.final_prompt,
              image_urls: scene.grok_ref_images ?? [],
              duration: form.video_length_s,
              aspect_ratio: '9:16',
              resolution: '720p',
            }),
          })
          if (!submitRes.ok) {
            const err = await submitRes.json()
            throw new Error(err.error ?? `Video submission failed for ${key}`)
          }
          const { jobId } = await submitRes.json()

          while (Date.now() < deadline && !videoUrl) {
            await sleep(5000)
            const pollRes = await fetch(`/api/videos/${jobId}`)
            const { status, url, reason } = await pollRes.json()
            if (status === 'done' && url) {
              videoUrl = url
            } else if (status === 'failed') {
              lastFailReason = reason ?? 'Kie.ai reported state=fail'
              break
            }
          }
        }

        if (!videoUrl) {
          const msg = lastFailReason || 'Timed out after 10 minutes — check credits at kie.ai'
          setVideoErrors(prev => ({ ...prev, [key]: msg }))
          throw new Error(`${key} failed after ${attemptNum} attempt(s) — ${msg}`)
        }

        newVideoUrls[key] = videoUrl
        setVideoUrls(prev => ({ ...prev, [key]: videoUrl }))
      }

      setPhase(5, 'done', `${Object.keys(newVideoUrls).length} videos generated`, 100)

      // ── Save results ───────────────────────────────────────────────────
      localStorage.setItem(`vcg_${id}_result`, JSON.stringify({
        videoUrls: newVideoUrls,
        bible: bibleData,
        refImages: newRefImages,
        scripts: allScripts,
      }))

      const existing = getDramaEntry(id)
      upsertDramaEntry({
        id,
        title: bibleData.universe_title,
        genre: bibleData.genre,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        status: 'complete',
        clipCount: Object.keys(newVideoUrls).length,
        episodeCount: bibleData.videos.length,
      })

      setIsComplete(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      setPhases(prev =>
        prev.map((p, i) => (i === currentPhase ? { ...p, status: 'error', detail: message } : p))
      )
      const existing = getDramaEntry(id)
      if (existing) {
        upsertDramaEntry({ ...existing, status: 'error' })
      }
    }
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">
        <div className="text-center">
          <p className="text-lg mb-4">Session not found.</p>
          <button onClick={() => router.push('/')} className="text-orange-400 hover:text-orange-300">
            ← Start a new video set
          </button>
        </div>
      </div>
    )
  }

  const totalVideos = Object.keys(videoUrls).length

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/60 px-6 py-4 flex items-center gap-4 sticky top-0 z-10 bg-zinc-950/90 backdrop-blur">
        <button
          onClick={() => router.push('/')}
          className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
        >
          ← Dashboard
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-600">Generating Video Set</p>
          <p className="text-base font-bold text-white truncate">
            {bible?.universe_title || formData?.prompt?.slice(0, 50) || 'Untitled'}
          </p>
        </div>
        {isComplete && (
          <span className="text-xs font-mono text-green-400 bg-green-950/50 border border-green-900 px-3 py-1 rounded-full">
            Complete
          </span>
        )}
        {error && (
          <span className="text-xs font-mono text-red-400 bg-red-950/50 border border-red-900 px-3 py-1 rounded-full">
            Error
          </span>
        )}
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Completion banner */}
        {isComplete && bible && (
          <div className="bg-green-950/20 border border-green-900/60 rounded-xl p-6 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-2xl font-bold text-green-400">Videos Complete</p>
              <p className="text-zinc-400 text-sm mt-1">
                {bible.videos.length} video{bible.videos.length !== 1 ? 's' : ''} · {totalVideos} ready to download
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={async () => {
                  for (const [key, url] of Object.entries(videoUrls)) {
                    const filename = `${(bible?.universe_title ?? 'Video').replace(/\s+/g, '_')}_${key}.mp4`
                    await downloadVideo(url, filename)
                    await sleep(400)
                  }
                }}
                className="text-sm bg-green-800 hover:bg-green-700 text-green-100 px-5 py-2.5 rounded-lg font-semibold transition-colors"
              >
                ↓ Download All {totalVideos} Videos
              </button>
              <button
                onClick={() => router.push(`/drama/${id}`)}
                className="text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-5 py-2.5 rounded-lg transition-colors"
              >
                View Details →
              </button>
              <button
                onClick={() => router.push('/new')}
                className="text-sm bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-lg transition-colors font-semibold"
              >
                + New Set
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[260px,1fr] gap-8">
          {/* Phase list */}
          <div className="space-y-1">
            <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-600 mb-3 px-2">
              Workflow Phases
            </p>
            {PHASES.map((phase, i) => {
              const state = phases[i]
              const isActive = currentPhase === i
              return (
                <div
                  key={phase.id}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                    isActive ? 'bg-zinc-900 border border-zinc-800' : ''
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5 transition-colors ${
                      state.status === 'done'
                        ? 'bg-green-950/60 text-green-400 border border-green-800'
                        : state.status === 'running'
                        ? 'bg-orange-950/60 text-orange-400 border border-orange-800 animate-pulse'
                        : state.status === 'error'
                        ? 'bg-red-950/60 text-red-500 border border-red-800'
                        : 'bg-zinc-800/60 text-zinc-600 border border-zinc-700'
                    }`}
                  >
                    {state.status === 'done' ? '✓' : state.status === 'error' ? '✕' : phase.id}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-medium leading-tight ${
                        state.status === 'done'
                          ? 'text-zinc-300'
                          : state.status === 'running'
                          ? 'text-white'
                          : state.status === 'error'
                          ? 'text-red-400'
                          : 'text-zinc-600'
                      }`}
                    >
                      {phase.name}
                    </p>
                    {state.detail && (
                      <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed line-clamp-2">
                        {state.detail}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Main panel */}
          <div className="space-y-6 min-w-0">
            {/* Active phase card */}
            {currentPhase >= 0 && currentPhase < PHASES.length && (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-orange-400">
                    Phase {PHASES[currentPhase].id}
                  </span>
                  {phases[currentPhase].status === 'running' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                  )}
                </div>
                <h2 className="text-xl font-bold text-white mb-1">{PHASES[currentPhase].name}</h2>
                <p className="text-sm text-zinc-500 mb-5">{PHASES[currentPhase].desc}</p>

                {phases[currentPhase].status === 'running' && (
                  <div>
                    <div className="flex justify-between text-xs text-zinc-400 mb-2">
                      <span className="truncate pr-4">{phases[currentPhase].detail}</span>
                      <span className="flex-shrink-0">{Math.round(phases[currentPhase].progress)}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(2, phases[currentPhase].progress)}%` }}
                      />
                    </div>
                  </div>
                )}

                {phases[currentPhase].status === 'done' && (
                  <p className="text-sm text-green-400">✓ {phases[currentPhase].detail}</p>
                )}

                {phases[currentPhase].status === 'error' && (
                  <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-lg">
                    <p className="text-sm text-red-400 font-mono break-all">{phases[currentPhase].detail}</p>
                  </div>
                )}
              </div>
            )}

            {/* Error card */}
            {error && (
              <div className="bg-red-950/20 border border-red-900/60 rounded-xl p-6">
                <p className="font-semibold text-red-400 mb-2">Generation stopped</p>
                <p className="text-sm text-red-300/70 font-mono mb-4 break-all">{error}</p>
                <button
                  onClick={() => router.push('/')}
                  className="text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg transition-colors"
                >
                  ← Dashboard
                </button>
              </div>
            )}

            {/* Universe Bible preview */}
            {bible && (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6">
                <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500 mb-4">
                  Universe Bible
                </p>
                <div className="grid grid-cols-3 gap-4 mb-5 text-center">
                  <div className="bg-zinc-800/40 rounded-lg p-3">
                    <div className="text-2xl font-bold text-white">{bible.characters.length}</div>
                    <div className="text-[11px] text-zinc-500 font-mono mt-0.5">Characters</div>
                  </div>
                  <div className="bg-zinc-800/40 rounded-lg p-3">
                    <div className="text-2xl font-bold text-white">{bible.venues.length}</div>
                    <div className="text-[11px] text-zinc-500 font-mono mt-0.5">Venues</div>
                  </div>
                  <div className="bg-zinc-800/40 rounded-lg p-3">
                    <div className="text-2xl font-bold text-white">{bible.videos.length}</div>
                    <div className="text-[11px] text-zinc-500 font-mono mt-0.5">Stories</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {bible.characters.map(c => (
                    <div key={c.name} className="flex items-center gap-3 text-sm">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded font-mono flex-shrink-0 ${
                          c.role === 'protagonist'
                            ? 'bg-orange-950/50 text-orange-400 border border-orange-900/60'
                            : 'bg-zinc-800/50 text-zinc-500 border border-zinc-800'
                        }`}
                      >
                        {c.role}
                      </span>
                      <span className="font-semibold text-zinc-200">{c.name}</span>
                      <span className="text-zinc-500 text-xs truncate hidden sm:block">{c.personality}</span>
                    </div>
                  ))}
                </div>
                {bible.universe_description && (
                  <p className="text-sm text-zinc-500 mt-4 pt-4 border-t border-zinc-800 leading-relaxed">
                    {bible.universe_description}
                  </p>
                )}
              </div>
            )}

            {/* Reference images */}
            {pendingAssets.length > 0 && (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6">
                <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500 mb-4">
                  Reference Images ({Object.keys(refImages).length} / {pendingAssets.length})
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {pendingAssets.map(({ name, type }) => {
                    const url = refImages[name]
                    const err = imageErrors[name]
                    return (
                      <div key={name} className="aspect-square bg-zinc-800 rounded-lg overflow-hidden relative">
                        {url ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={name} className="w-full h-full object-cover" />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                              <p className="text-[10px] text-white font-medium truncate">{name}</p>
                            </div>
                          </>
                        ) : err ? (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-red-950/40 p-2">
                            <p className="text-[10px] text-red-400 font-mono text-center truncate w-full">✕ {name}</p>
                            <p className="text-[9px] text-red-300/60 font-mono text-center leading-tight line-clamp-3">{err}</p>
                          </div>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-zinc-800/60">
                            <div className="w-5 h-5 border-2 border-zinc-600 border-t-orange-400 rounded-full animate-spin" />
                            <p className="text-[9px] font-mono text-zinc-600 text-center px-1 truncate w-full text-center">{name}</p>
                            <p className="text-[9px] font-mono text-zinc-700">{type}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Scripts */}
            {scripts.length > 0 && (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6">
                <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500 mb-4">
                  Video Scripts ({scripts.length})
                </p>
                <div className="space-y-4">
                  {scripts.map(vs => (
                    vs.scenes.map(scene => (
                      <SceneCard
                        key={vs.video_num}
                        scene={scene}
                        videoTitle={bible?.videos.find(v => v.video_num === vs.video_num)?.title}
                      />
                    ))
                  ))}
                </div>
              </div>
            )}

            {/* Generated videos */}
            {(totalVideos > 0 || Object.keys(videoErrors).length > 0) && bible && (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6">
                <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500 mb-4">
                  Videos — {totalVideos} / {formData?.total_videos ?? 1} ready
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {bible.videos.map(v => {
                    const key = `video${v.video_num}`
                    const url = videoUrls[key]
                    const err = videoErrors[key]
                    if (url) {
                      return (
                        <VideoCard
                          key={v.video_num}
                          videoNum={v.video_num}
                          url={url}
                          universeTitle={bible.universe_title}
                          title={v.title}
                        />
                      )
                    }
                    if (err) {
                      return (
                        <div key={v.video_num} className="bg-red-950/30 border border-red-900/60 rounded-xl p-3 flex flex-col gap-1">
                          <p className="text-[11px] font-mono text-red-400 font-semibold">Video {v.video_num} Failed</p>
                          <p className="text-[10px] text-red-300/70 font-mono break-all leading-relaxed">{err}</p>
                        </div>
                      )
                    }
                    return null
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
