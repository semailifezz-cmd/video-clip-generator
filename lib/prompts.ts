import type { UniversePrompt, SeriesBible, VideoOutline } from './types'

export const BIBLE_SYSTEM_PROMPT = `You are a professional children's video content creator specialising in cheerful, age-appropriate short-form videos for kids aged 5–12. Your response must be a raw JSON object and nothing else — no greeting, no explanation, no markdown, no code fences. Start your response with { and end with }. Any text outside the JSON object will break the pipeline.`

export function buildBiblePrompt(input: UniversePrompt): string {
  return `Create a shared universe for a collection of ${input.total_videos} independent short videos based on this prompt:

"${input.prompt}"

These videos share the same recurring characters, world, and locations — but each video tells a completely DIFFERENT, self-contained story. There is no continuing arc between videos.

Output this EXACT JSON schema (no deviations):
{
  "universe_title": "A creative title for this universe/world",
  "genre": "Kids Animation / Fun Adventure",
  "universe_description": "2-3 sentence description of the shared world, its feel, and what makes it magical and fun for kids",
  "characters": [
    {
      "name": "Full Name",
      "age": "7",
      "role": "protagonist",
      "physical_description": "Height, build, hair color/style, face features, skin tone. Friendly and appealing for a young audience. Very specific for image generation.",
      "personality": "Positive, age-appropriate personality traits — curious, kind, brave, playful, etc.",
      "outfit_style": "Bright, cheerful clothing style appropriate for a kids character",
      "image_prompt": "Bright cheerful portrait of a kids character, [exact physical description]. [outfit]. Vibrant colors. Friendly expression. 4K."
    }
  ],
  "venues": [
    {
      "location_name": "Venue Name",
      "style": "Bright, colorful, imaginative style suitable for young audiences",
      "lighting": "Warm, cheerful lighting",
      "time_of_day": "day/golden hour/magical twilight",
      "description": "Full location description — vibrant colors, friendly atmosphere",
      "image_prompt": "Bright colorful establishing shot, [detailed venue description]. Warm cheerful lighting. Kid-friendly composition. 4K."
    }
  ],
  "props": [
    {
      "prop_name": "Prop Name",
      "visual_desc": "Detailed visual description — colorful, whimsical, kid-friendly",
      "owner_character": "Character Name",
      "image_prompt": "Bright colorful product shot, [prop description on neutral surface]. Cheerful studio lighting. High detail."
    }
  ],
  "videos": [
    {
      "video_num": 1,
      "title": "Video Title",
      "summary": "2-3 sentence summary of this standalone story",
      "characters_featured": ["Name1", "Name2"],
      "venues_featured": ["Venue Name"],
      "key_plot_points": "Specific plot beats following the formula — intro, discovery, teamwork, happy ending"
    }
  ]
}

Requirements:
- Create exactly 3–4 main characters (one protagonist, rest supporting)
- Create 3–4 distinct colorful venues
- Create 2–3 fun recurring props
- Generate all ${input.total_videos} video story outlines
- Each video must be a STANDALONE story — different conflict, different adventure, same characters and world
- All content must be cheerful, age-appropriate, and safe for children aged 5–12
- No fear, danger, or dark themes — only positive, uplifting storytelling
- Make character physical descriptions very specific for image generation`
}

export const SCRIPT_SYSTEM_PROMPT = `You are a professional children's video content writer and cinematographer specialising in cheerful, age-appropriate short-form videos for kids aged 5–12. Your response must be a raw JSON array and nothing else — no greeting, no explanation, no markdown, no code fences. Start your response with [ and end with ]. Any text outside the JSON array will break the pipeline.`

export function buildScriptPrompt(
  video: VideoOutline,
  bible: SeriesBible,
  formula: string,
  videoLengthS: number
): string {
  const charList = bible.characters
    .map(c => `- ${c.name} (${c.role}, age ${c.age}): ${c.physical_description}`)
    .join('\n')
  const venueList = bible.venues
    .map(v => `- ${v.location_name}: ${v.description} | Lighting: ${v.lighting} | Time: ${v.time_of_day}`)
    .join('\n')

  return `Generate 1 complete video prompt for Video ${video.video_num}: "${video.title}"

This is a ${videoLengthS}-second standalone short-form video. The prompt must cover ALL formula steps in sequence as one cohesive story arc.

Story Summary: ${video.summary}
Key Plot Points: ${video.key_plot_points}
Characters featured: ${video.characters_featured.join(', ')}
Venues: ${video.venues_featured.join(', ')}

Full Character Database:
${charList}

Available Venues:
${venueList}

STORYTELLING FORMULA — The video must flow through all these steps:
${formula}

Output a JSON array with exactly 1 scene object:
[
  {
    "video_num": ${video.video_num},
    "clip_num": 1,
    "characters_used": ["Name1", "Name2"],
    "venue_used": "Exact Venue Name from the list above",
    "props_used": [],
    "character_expressions": {
      "Name1": "Describe how their expression evolves across the video — from the opening intro through to the joyful finale."
    },
    "character_actions": {
      "Name1": "Describe the character's key actions across the full video arc — intro, discovery, teamwork, celebration."
    },
    "camera_angle": "Describe the overall camera approach for the video — varied shots that suit the story arc.",
    "camera_movement": "Describe how the camera moves through the video — from establishing shots to intimate close-ups at the finale.",
    "atmosphere": "Overall cheerful mood and environmental texture across the full ${videoLengthS}-second video.",
    "color_ambience": "Vibrant, warm color palette — bright primary colors that evolve from the intro to a glowing, celebratory finale.",
    "raw_prompt": "Complete ${videoLengthS}-second cheerful video prompt. Describe the full story arc: the opening scene, the exciting discovery, the teamwork moment, and the joyful ending. Reference characters by NAME ONLY — never describe hair/eyes/clothing (reference images handle that). Make it vivid, warm, and fun for kids aged 5–12."
  }
]

Strict rules:
- Exactly 1 scene object covering the full ${videoLengthS}-second video
- All formula steps must be woven into the raw_prompt as a single flowing narrative
- ONLY reference characters by name — never describe appearance
- character_expressions and character_actions must cover every name in characters_used
- Keep everything cheerful, safe, and age-appropriate for kids`
}
