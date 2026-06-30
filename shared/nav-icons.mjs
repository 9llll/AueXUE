/** @typedef {{ text?: string, icon?: string, link?: string, locale?: string, items?: import('./nav-icons.mjs').NavItem[] }} NavItem */

/** 顶部/侧边栏导航（与 valaxy.config themeConfig 保持一致） */
export const mainNavItems = [
  {
    text: '首页',
    icon: 'i-ant-design:home-filled',
    link: '/',
  },
  {
    text: '文章',
    icon: 'i-ant-design:read-filled',
    link: '/categories',
    items: [
      { icon: 'i-ant-design:appstore-filled', locale: 'menu.categories', link: '/categories' },
      { icon: 'i-ant-design:container-filled', locale: 'menu.archives', link: '/archives' },
      { icon: 'i-ant-design:tags-filled', locale: 'menu.tags', link: '/tags' },
    ],
  },
  {
    text: '文件',
    icon: 'i-ant-design:file-text-filled',
    link: '/files',
  },
  {
    text: '管理',
    icon: 'i-ant-design:setting-filled',
    link: '/admin',
  },
  {
    text: '相册',
    icon: 'i-ant-design:picture-filled',
    link: '/gallery',
  },
  {
    text: '社交',
    icon: 'i-ant-design:team-outlined',
    link: '/links',
    items: [
      { text: '导航', icon: 'i-ant-design:compass-filled', link: '/navigation' },
      { text: '留言', icon: 'i-ant-design:message-filled', link: '/comment' },
      { text: '友链', icon: 'i-ant-design:global-outlined', link: '/links' },
    ],
  },
  {
    text: '关于',
    icon: 'i-ant-design:idcard-filled',
    link: '/about',
  },
]

/** @param {NavItem[]} items */
function collectNavIcons(items) {
  /** @type {string[]} */
  const icons = []
  for (const item of items) {
    if (item.icon)
      icons.push(item.icon)
    if (item.items?.length)
      icons.push(...collectNavIcons(item.items))
  }
  return icons
}

const socialIconSafelist = [
  'i-ri-rss-line',
  'i-ri-github-line',
  'i-ri-wechat-2-line',
  'i-ri-mail-line',
  'i-ri-train-line',
]

/** UnoCSS 生产构建 safelist：配置里的 icon 字符串不会被静态扫描到 */
export const iconSafelist = [
  ...collectNavIcons(mainNavItems),
  ...socialIconSafelist,
  'i-fa6-solid-quote-left',
  'i-fa6-solid-quote-right',
  'i-ri-menu-4-fill',
  'i-ri-search-line',
  'i-ri-moon-line',
  'i-ri-sun-line',
  'i-ri-translate-2',
]
