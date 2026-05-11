import type { SeriesBible, VideoScript } from './types'

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function injectRefUrls(
  scripts: VideoScript[],
  refImages: Record<string, string>,
  bible: SeriesBible
): VideoScript[] {
  return scripts.map(video => ({
    ...video,
    scenes: video.scenes.map(scene => {
      const refs: string[] = []

      // Protagonist always first
      const protagonist = bible.characters.find(c => c.role === 'protagonist')
      if (protagonist && refImages[protagonist.name]) {
        refs.push(refImages[protagonist.name])
      }

      // Other characters in scene
      for (const charName of scene.characters_used) {
        const char = bible.characters.find(c => c.name === charName)
        if (char && refImages[char.name] && !refs.includes(refImages[char.name])) {
          refs.push(refImages[char.name])
        }
      }

      // Venue as last reference
      if (scene.venue_used && refImages[scene.venue_used] && refs.length < 6) {
        refs.push(refImages[scene.venue_used])
      }

      return {
        ...scene,
        final_prompt: scene.raw_prompt,
        grok_ref_images: refs.slice(0, 7),
      }
    }),
  }))
}
