import { classic } from './classic'
import { pirate } from './pirate'
import { roman } from './roman'
import type { Theme, ThemeId } from './types'

export const THEMES: Record<ThemeId, Theme> = { classic, roman, pirate }
export const THEME_ORDER: ThemeId[] = ['classic', 'roman', 'pirate']
