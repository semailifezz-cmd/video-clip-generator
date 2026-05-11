export interface UniversePrompt {
  prompt: string
  total_videos: number
  video_length_s: number
  clip_length_s: number
  episode_formula: string
}

export interface Character {
  name: string
  age: string
  role: 'protagonist' | 'supporting'
  physical_description: string
  personality: string
  outfit_style: string
  image_prompt: string
  ref_image_url?: string
}

export interface Venue {
  location_name: string
  style: string
  lighting: string
  time_of_day: string
  description: string
  image_prompt: string
  ref_image_url?: string
}

export interface Prop {
  prop_name: string
  visual_desc: string
  owner_character: string
  image_prompt: string
  ref_image_url?: string
}

export interface VideoOutline {
  video_num: number
  title: string
  summary: string
  characters_featured: string[]
  venues_featured: string[]
  key_plot_points: string
}

export interface SeriesBible {
  universe_title: string
  genre: string
  universe_description: string
  characters: Character[]
  venues: Venue[]
  props: Prop[]
  videos: VideoOutline[]
}

export interface ScenePrompt {
  video_num: number
  clip_num: number
  characters_used: string[]
  venue_used: string
  props_used: string[]
  character_expressions?: Record<string, string>
  character_actions?: Record<string, string>
  camera_angle?: string
  camera_movement?: string
  atmosphere?: string
  color_ambience?: string
  raw_prompt: string
  final_prompt?: string
  grok_ref_images?: string[]
}

export interface VideoScript {
  video_num: number
  scenes: ScenePrompt[]
}

// Legacy aliases kept for dramaStore compatibility
export type EpisodeOutline = VideoOutline
export type EpisodeScript = VideoScript
