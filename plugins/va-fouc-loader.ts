import type { Plugin } from 'vite'

export interface VaFoucLoaderOptions {
  avatar?: string
  title?: string
  subtitle?: string
  primary?: string
}

function buildSiteName(options: VaFoucLoaderOptions) {
  const title = options.title?.trim()
  const subtitle = options.subtitle?.trim()

  if (title && subtitle)
    return `${title}-${subtitle}`

  return title || subtitle || ''
}

const FOUC_STYLE = '<style id="valaxy-fouc">body{opacity:0!important}</style>'

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildLoaderStyle(primary = '#E9CCCC') {
  const safePrimary = escapeHtml(primary)
  return `<style id="va-fouc-loader-style">
/* valaxy foucGuard 会隐藏 body，加载器在 body 内会不可见；仅隐藏 #app */
body { opacity: 1 !important; }
#app { opacity: 0 !important; visibility: hidden; }
#va-fouc-loader {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  background: #fff;
  transition: opacity 0.28s ease, visibility 0.28s ease;
}
html.dark #va-fouc-loader { background: #000; }
#va-fouc-loader.is-hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}
#va-fouc-loader__spinner {
  position: relative;
  width: 108px;
  height: 108px;
  display: flex;
  align-items: center;
  justify-content: center;
}
#va-fouc-loader__ring {
  position: absolute;
  inset: 0;
  border: 4px solid color-mix(in srgb, ${safePrimary} 22%, transparent);
  border-top-color: ${safePrimary};
  border-radius: 50%;
  animation: va-fouc-spin 0.75s linear infinite;
}
#va-fouc-loader__avatar {
  position: relative;
  z-index: 1;
  width: 92px;
  height: 92px;
  border-radius: 50%;
  object-fit: cover;
  background: color-mix(in srgb, ${safePrimary} 12%, transparent);
}
#va-fouc-loader__dots {
  display: flex;
  gap: 6px;
  align-items: center;
  height: 8px;
}
#va-fouc-loader__dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${safePrimary};
  opacity: 0.35;
  animation: va-fouc-bounce 1.1s ease-in-out infinite;
}
#va-fouc-loader__dots span:nth-child(2) { animation-delay: 0.15s; }
#va-fouc-loader__dots span:nth-child(3) { animation-delay: 0.3s; }
#va-fouc-loader__text {
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 14px;
  letter-spacing: 0.08em;
  color: color-mix(in srgb, ${safePrimary} 88%, #666);
  user-select: none;
}
@keyframes va-fouc-spin { to { transform: rotate(360deg); } }
@keyframes va-fouc-bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
  40% { transform: translateY(-5px); opacity: 1; }
}
</style>`
}

function buildLoaderMarkup(options: VaFoucLoaderOptions) {
  const avatar = options.avatar
    ? `<img id="va-fouc-loader__avatar" src="${escapeHtml(options.avatar)}" alt="" decoding="async" onerror="this.remove()">`
    : ''

  const text = escapeHtml(buildSiteName(options))

  return `<div id="va-fouc-loader" aria-hidden="true">
<div id="va-fouc-loader__spinner">
<div id="va-fouc-loader__ring"></div>
${avatar}
</div>
<div id="va-fouc-loader__dots"><span></span><span></span><span></span></div>
<div id="va-fouc-loader__text">${text}</div>
</div>`
}

const LOADER_SCRIPT = `<script>
;(function () {
  var HIDE_CLS = 'is-hidden'
  var LOADER_ID = 'va-fouc-loader'
  var FOUC_STYLE_ID = 'valaxy-fouc'
  var APP_ID = 'app'
  var hidden = false
  var pollTimer
  var startTime = Date.now()
  var MIN_SHOW = 480

  function removeFoucStyle() {
    var foucStyle = document.getElementById(FOUC_STYLE_ID)
    if (foucStyle) foucStyle.remove()
    document.body.style.opacity = ''
  }

  function revealApp() {
    var app = document.getElementById(APP_ID)
    if (!app) return
    app.style.opacity = ''
    app.style.visibility = ''
  }

  function hideLoader() {
    if (hidden) return
    hidden = true
    if (pollTimer) clearInterval(pollTimer)
    removeFoucStyle()
    revealApp()
    var loader = document.getElementById(LOADER_ID)
    if (!loader) return
    loader.classList.add(HIDE_CLS)
    setTimeout(function () {
      loader.remove()
      var style = document.getElementById('va-fouc-loader-style')
      if (style) style.remove()
    }, 300)
  }

  function vueMounted() {
    var app = document.getElementById(APP_ID)
    if (!app) return false
    return app.hasAttribute('data-v-app') || !!app.__vue_app__
  }

  function stylesReady() {
    if (!document.getElementById(FOUC_STYLE_ID)) return true
    var links = document.querySelectorAll('link[rel=\"stylesheet\"]')
    for (var i = 0; i < links.length; i++) {
      if (!links[i].sheet) return false
    }
    return true
  }

  function canHide() {
    if (!vueMounted()) return false
    var elapsed = Date.now() - startTime
    if (elapsed < MIN_SHOW) return false
    if (stylesReady()) return true
    // 样式长时间未就绪时兜底，避免等待 window.load（视频等资源会拖很久）
    return elapsed >= MIN_SHOW + 1800
  }

  function tryHide() {
    if (canHide())
      hideLoader()
  }

  function startPolling() {
    if (hidden || pollTimer) return
    var tries = 0
    pollTimer = setInterval(function () {
      tries++
      tryHide()
      if (hidden || tries >= 240) clearInterval(pollTimer)
    }, 50)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startPolling)
  }
  else {
    startPolling()
  }

  window.addEventListener('load', tryHide)

  setTimeout(function () {
    if (!hidden) hideLoader()
  }, 6000)
})()
<\/script>`

export function vaFoucLoader(options: VaFoucLoaderOptions = {}): Plugin {
  const loaderStyle = buildLoaderStyle(options.primary)
  const loaderMarkup = buildLoaderMarkup(options)
  const loaderHead = `${loaderStyle}<link rel="stylesheet" href="/generated-icons.css">${LOADER_SCRIPT}`

  return {
    name: 'va-fouc-loader',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (html.includes('id="va-fouc-loader"'))
          return html

        let next = html

        if (next.includes(FOUC_STYLE)) {
          next = next.replace(FOUC_STYLE, `${FOUC_STYLE}${loaderHead}`)
        }
        else {
          next = next.replace('<head>', `<head>${loaderHead}`)
        }

        return next.replace('<body>', `<body>${loaderMarkup}`)
      },
    },
  }
}
