'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getDramaInput, getDramaResult, getDramaEntry } from '@/lib/dramaStore'
import type { DramaEntry } from '@/lib/dramaStore'
import type { UniversePrompt, SeriesBible, VideoScript, ScenePrompt } from '@/lib/types'
import { sleep } from '@/lib/workflow'

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

type Tab = 'overview' | 'bible' | 'media' | 'settings'

function VideoCard({
  videoNum, url, seriesTitle,
}: {
  videoNum: number; url: string; seriesTitle: string
}) {
  const [downloading, setDownloading] = useState(false)
  const handleDownload = async () => {
    setDownloading(true)
    await downloadVideo(url, `${seriesTitle.replace(/\s+/g, '_')}_Video${videoNum}.mp4`)
    setDownloading(false)
  }
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
      <div className="relative bg-black" style={{ aspectRatio: '9/16' }}>
        <video src={url} controls playsInline className="w-full h-full object-contain" preload="metadata" />
      </div>
      <div className="p-3 flex items-center justify-between gap-2">
        <p className="text-xs font-mono text-zinc-300 font-semibold">Video {videoNum}</p>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 text-[11px] font-mono bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors"
        >
          {downloading ? '…' : '↓ MP4'}
        </button>
      </div>
    </div>
  )
}

function SceneCard({ scene }: { scene: ScenePrompt }) {
  return (
    <div className="bg-zinc-800/40 border border-zinc-700/30 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-mono bg-orange-950/50 text-orange-400 border border-orange-900/40 px-1.5 py-0.5 rounded">
          Scene {scene.clip_num}
        </span>
        <span className="text-[10px] font-mono text-zinc-600 ml-auto truncate max-w-[200px]">{scene.venue_used}</span>
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

export default function DramaDetail({ id }: { id: string }) {
  const router = useRouter()
  const [entry, setEntry] = useState<DramaEntry | null>(null)
  const [input, setInput] = useState<UniversePrompt | null>(null)
  const [bible, setBible] = useState<SeriesBible | null>(null)
  const [refImages, setRefImages] = useState<Record<string, string>>({})
  const [scripts, setScripts] = useState<VideoScript[]>([])
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({})
  const [notFound, setNotFound] = useState(false)
  const [tab, setTab] = useState<Tab>('overview')

  useEffect(() => {
    const e = getDramaEntry(id)
    const inp = getDramaInput(id)
    if (!inp) { setNotFound(true); return }

    setEntry(e)
    setInput(inp)

    const result = getDramaResult(id)
    if (result) {
      setBible(result.bible)
      setRefImages(result.refImages ?? {})
      setScripts(result.scripts ?? [])
      setVideoUrls(result.videoUrls ?? {})
    }
  }, [id])

  if (notFound) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">
        <div className="text-center">
          <p className="text-lg mb-4">Video set not found.</p>
          <button onClick={() => router.push('/')} className="text-orange-500 hover:text-orange-400">← Dashboard</button>
        </div>
      </div>
    )
  }

  const totalVideos = Object.keys(videoUrls).length
  const isComplete = entry?.status === 'complete'
  const seriesTitle = bible?.universe_title ?? input?.prompt?.slice(0, 40) ?? 'Untitled'

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'bible', label: 'Universe Bible' },
    { id: 'media', label: `Media (${totalVideos} videos)` },
    { id: 'settings', label: 'Input Settings' },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800/60 px-6 py-4 sticky top-0 z-10 bg-zinc-950/90 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button onClick={() => router.push('/')} className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors flex-shrink-0">
            ← Dashboard
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-600">Kids Animation</p>
            <p className="text-base font-bold text-white truncate">{seriesTitle}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {entry?.status === 'complete' && (
              <span className="text-xs font-mono text-green-400 bg-green-950/50 border border-green-900 px-3 py-1 rounded-full">Complete</span>
            )}
            {entry?.status === 'generating' && (
              <span className="text-xs font-mono text-yellow-400 bg-yellow-950/50 border border-yellow-900 px-3 py-1 rounded-full animate-pulse">Generating</span>
            )}
            {entry?.status === 'error' && (
              <span className="text-xs font-mono text-red-400 bg-red-950/50 border border-red-900 px-3 py-1 rounded-full">Stopped</span>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-zinc-800/60 px-6">
        <div className="max-w-6xl mx-auto flex gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-mono whitespace-nowrap transition-colors border-b-2 ${
                tab === t.id
                  ? 'text-white border-orange-500'
                  : 'text-zinc-500 border-transparent hover:text-zinc-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Overview tab */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Videos', value: bible?.videos.length ?? entry?.episodeCount ?? '—' },
                { label: 'Generated', value: totalVideos || '—' },
                { label: 'Characters', value: bible?.characters.length ?? '—' },
                { label: 'Venues', value: bible?.venues.length ?? '—' },
              ].map(s => (
                <div key={s.label} className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-white">{s.value}</div>
                  <div className="text-[11px] text-zinc-500 font-mono mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Universe description */}
            {bible?.universe_description && (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6">
                <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500 mb-3">Universe</p>
                <p className="text-zinc-300 leading-relaxed">{bible.universe_description}</p>
              </div>
            )}

            {/* Video list */}
            {bible && bible.videos.length > 0 && (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6">
                <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500 mb-4">
                  Videos ({bible.videos.length})
                </p>
                <div className="space-y-3">
                  {bible.videos.map(v => {
                    const hasVideo = !!videoUrls[`video${v.video_num}`]
                    return (
                      <div key={v.video_num} className="flex items-start gap-4 py-3 border-b border-zinc-800 last:border-0">
                        <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-xs font-mono text-zinc-400 flex-shrink-0 mt-0.5">
                          {v.video_num}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">{v.title}</p>
                          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{v.summary}</p>
                          <p className="text-[10px] font-mono text-zinc-600 mt-1">
                            {v.characters_featured.join(', ')}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-[10px] font-mono">
                          {hasVideo
                            ? <span className="text-green-400">✓ ready</span>
                            : <span className="text-zinc-600">pending</span>
                          }
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Resume generation CTA if still generating */}
            {entry?.status === 'generating' && (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-white">Generation in progress</p>
                  <p className="text-sm text-zinc-500 mt-0.5">Your videos are still being created.</p>
                </div>
                <button
                  onClick={() => router.push(`/generate/${id}`)}
                  className="flex-shrink-0 bg-orange-500 hover:bg-orange-400 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
                >
                  View Progress →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Bible tab */}
        {tab === 'bible' && bible && (
          <div className="space-y-6">
            {/* Characters */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6">
              <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500 mb-5">
                Characters ({bible.characters.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {bible.characters.map(c => (
                  <div key={c.name} className="bg-zinc-800/40 rounded-xl p-4 flex gap-4">
                    {refImages[c.name] && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-700">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={refImages[c.name]} alt={c.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-white text-sm">{c.name}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          c.role === 'protagonist' ? 'bg-orange-950/60 text-orange-400 border border-orange-900/60'
                          : 'bg-zinc-800 text-zinc-500'
                        }`}>
                          {c.role}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">{c.personality}</p>
                      <p className="text-[11px] text-zinc-600 mt-1">{c.physical_description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Venues */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6">
              <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500 mb-5">
                Venues ({bible.venues.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {bible.venues.map(v => (
                  <div key={v.location_name} className="bg-zinc-800/40 rounded-xl p-4 flex gap-4">
                    {refImages[v.location_name] && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-700">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={refImages[v.location_name]} alt={v.location_name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-white text-sm mb-1">{v.location_name}</p>
                      <p className="text-xs text-zinc-400">{v.style} · {v.lighting}</p>
                      <p className="text-[11px] text-zinc-600 mt-1 line-clamp-2">{v.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Props */}
            {bible.props.length > 0 && (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6">
                <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500 mb-4">Props ({bible.props.length})</p>
                <div className="space-y-2">
                  {bible.props.map(p => (
                    <div key={p.prop_name} className="flex items-start gap-3 py-2 border-b border-zinc-800 last:border-0">
                      <p className="text-sm font-semibold text-white w-40 flex-shrink-0">{p.prop_name}</p>
                      <p className="text-xs text-zinc-500">{p.visual_desc} — owned by {p.owner_character}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Media tab */}
        {tab === 'media' && (
          <div className="space-y-6">
            {/* Reference images */}
            {Object.keys(refImages).length > 0 && (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6">
                <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500 mb-4">
                  Reference Images ({Object.keys(refImages).length})
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-3">
                  {Object.entries(refImages).map(([name, url]) => (
                    <div key={name} className="aspect-square bg-zinc-800 rounded-lg overflow-hidden relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={name} className="w-full h-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <p className="text-[10px] text-white font-medium truncate">{name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Videos */}
            {totalVideos > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                    Generated Videos ({totalVideos})
                  </p>
                  <button
                    onClick={async () => {
                      for (const [key, url] of Object.entries(videoUrls)) {
                        await downloadVideo(url, `${seriesTitle.replace(/\s+/g, '_')}_${key}.mp4`)
                        await sleep(400)
                      }
                    }}
                    className="text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg transition-colors"
                  >
                    ↓ Download All {totalVideos} Videos
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {bible?.videos.map(v => {
                    const url = videoUrls[`video${v.video_num}`]
                    if (!url) return null
                    return (
                      <div key={v.video_num} className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
                        <div className="mb-3">
                          <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">Video {v.video_num}</p>
                          <h3 className="text-sm font-bold text-white mt-0.5">{v.title}</h3>
                          <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{v.summary}</p>
                        </div>
                        <VideoCard videoNum={v.video_num} url={url} seriesTitle={seriesTitle} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Scene scripts */}
            {scripts.length > 0 && (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6">
                <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500 mb-4">
                  Scene Scripts ({scripts.reduce((n, s) => n + s.scenes.length, 0)} scenes)
                </p>
                <div className="space-y-6">
                  {scripts.map(v => (
                    <div key={v.video_num}>
                      <p className="text-[11px] font-mono text-zinc-400 font-semibold mb-3 uppercase tracking-wider">Video {v.video_num}</p>
                      <div className="space-y-3">
                        {v.scenes.map(scene => (
                          <SceneCard key={scene.clip_num} scene={scene} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {totalVideos === 0 && Object.keys(refImages).length === 0 && (
              <div className="text-center py-16 text-zinc-600">
                <p className="font-mono text-sm">No media generated yet.</p>
                {entry?.status === 'generating' && (
                  <button onClick={() => router.push(`/generate/${id}`)} className="mt-4 text-yellow-500 hover:text-yellow-400 text-sm">
                    View generation progress →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Settings tab */}
        {tab === 'settings' && input && (
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 space-y-4">
            <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500 mb-2">Original Input</p>
            {[
              { label: 'Total Videos', value: String(input.total_videos) },
              { label: 'Video Length', value: `${input.video_length_s}s` },
            ].map(f => (
              <div key={f.label} className="grid grid-cols-[160px,1fr] gap-4 py-2 border-b border-zinc-800 last:border-0">
                <p className="text-xs font-mono text-zinc-500">{f.label}</p>
                <p className="text-sm text-zinc-300">{f.value || '—'}</p>
              </div>
            ))}
            <div className="py-2 border-b border-zinc-800">
              <p className="text-xs font-mono text-zinc-500 mb-1.5">Prompt</p>
              <p className="text-sm text-zinc-300 leading-relaxed">{input.prompt}</p>
            </div>
            <div className="pt-2">
              <p className="text-xs font-mono text-zinc-500 mb-2">Episode Formula</p>
              <pre className="text-xs text-zinc-400 font-mono whitespace-pre-wrap leading-relaxed bg-zinc-800/40 rounded-lg p-4">
                {input.episode_formula}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
