import type { NavItem } from '../node_modules/valaxy-theme-sakura/types/index'
import { iconSafelist as iconSafelistRaw, mainNavItems as mainNavItemsRaw } from './nav-icons.mjs'

export const mainNavItems = mainNavItemsRaw as NavItem[]
export const iconSafelist = iconSafelistRaw as string[]
