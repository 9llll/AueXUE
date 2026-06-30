import anchorPlugin from 'markdown-it-anchor'
import TaskLists from 'markdown-it-task-lists'
import MarkdownIt from 'markdown-it'

const CODE_FOLD_LINE_LIMIT = 10

let mdInstance: MarkdownIt | null = null

function slugify(input: string) {
  return encodeURIComponent(
    String(input)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-'),
  )
}

function extractLang(info: string) {
  return info
    .trim()
    .replace(/=(\d*)/, '')
    .replace(/:(no-)?line-numbers(\{| |$|=\d*).*/, '')
    .replace(/(-vue|\{| ).*$/, '')
    .replace(/^vue-html$/, 'template')
    .replace(/^ansi$/, '') || 'txt'
}

function encodeCopyPayload(text: string) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes)
    binary += String.fromCharCode(byte)
  return btoa(binary)
}

function setupPreWrapper(md: MarkdownIt) {
  const fence = md.renderer.rules.fence!
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    token.info = token.info
      .replace(/\[.*\]/, '')
      .replace(/ active$/, '')
      .replace(/ active /, ' ')

    const lang = extractLang(token.info)
    const code = fence(tokens, idx, options, env, self)
    const lineCount = token.content.trimEnd().split('\n').length
    const foldableAttr = lineCount > CODE_FOLD_LINE_LIMIT ? ' data-code-foldable' : ''
    const copyPayload = encodeCopyPayload(token.content.trimEnd())
    return `<div class="language-${lang}"${foldableAttr}><button type="button" title="Copy code" class="copy" data-clipboard="${copyPayload}"></button><span class="lang">${lang}</span>${code}<button class="code-block-unfold-btn"></button></div>`
  }
}

function getMarkdown() {
  if (mdInstance)
    return mdInstance

  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
  })

  md.set({
    highlight(str, lang) {
      const normalizedLang = extractLang(lang || 'txt')
      const escaped = md.utils.escapeHtml(str.trimEnd())
      return `<pre class="vp-code"><code class="language-${normalizedLang}">${escaped}</code></pre>`
    },
  })

  md.use(anchorPlugin, {
    slugify,
    getTokensText: (tokens) => {
      return tokens
        .filter(token => !['html_inline', 'emoji'].includes(token.type))
        .map(token => token.content)
        .join('')
    },
    permalink: anchorPlugin.permalink.linkInsideHeader({
      symbol: '&ZeroWidthSpace;',
      renderAttrs: (slug, state) => {
        const idx = state.tokens.findIndex((token) => {
          const id = token.attrs?.find(attr => attr[0] === 'id')
          return id && slug === id[1]
        })
        const title = state.tokens[idx + 1]?.content ?? slug
        return { 'aria-label': `Permalink to "${title}"` }
      },
    }),
  })

  md.use(TaskLists, { enabled: true })
  setupPreWrapper(md)
  mdInstance = md
  return mdInstance
}

export async function renderMarkdown(content: string) {
  return getMarkdown().render(content)
}

export function stripMarkdown(content: string) {
  return content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/[#>*_~\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
