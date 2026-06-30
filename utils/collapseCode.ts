const EXPANDED_CLASS = 'code-block-expanded'
const FOLDABLE_CLASS = 'code-foldable'

let codeFoldLineLimit = 0

function getCodeElement(el: HTMLElement) {
  return el.querySelector('pre code') || el.querySelector('pre') || el.querySelector('code')
}

function countCodeLines(el: HTMLElement) {
  const code = getCodeElement(el)
  if (!code)
    return 0
  const text = code.textContent || ''
  if (!text)
    return 0
  return text.split('\n').length
}

function measureCollapsedHeight(el: HTMLElement, lineLimit: number) {
  const pre = el.querySelector('pre')
  if (!pre)
    return 0

  const code = pre.querySelector('code')
  const text = code?.textContent || pre.textContent || ''
  const sample = text.split('\n').slice(0, lineLimit).join('\n')

  const clone = pre.cloneNode(false) as HTMLElement
  const width = pre.offsetWidth || el.clientWidth
  clone.style.cssText = `position:absolute;visibility:hidden;left:-9999px;width:${width}px`

  if (code) {
    const codeClone = document.createElement('code')
    codeClone.className = code.className
    codeClone.textContent = sample
    clone.appendChild(codeClone)
  }
  else {
    clone.textContent = sample
  }

  document.body.appendChild(clone)
  const height = clone.offsetHeight
  document.body.removeChild(clone)
  return height
}

function getToggleButton(el: HTMLElement) {
  return el.querySelector<HTMLButtonElement>('button.code-block-unfold-btn')
}

function setButtonState(btn: HTMLButtonElement, expanded: boolean) {
  btn.textContent = ''
  btn.classList.toggle('is-expanded', expanded)
  btn.setAttribute('aria-label', expanded ? '收起代码' : '展开代码')
  btn.setAttribute('aria-expanded', String(expanded))
  btn.type = 'button'
}

function foldBlock(el: HTMLElement) {
  el.classList.add('folded')
  el.classList.remove(EXPANDED_CLASS)
  const maxHeight = el.dataset.foldMaxHeight
  if (maxHeight)
    el.style.maxHeight = `${maxHeight}px`

  const btn = getToggleButton(el)
  if (btn)
    setButtonState(btn, false)
}

function unfoldBlock(el: HTMLElement) {
  el.classList.remove('folded')
  el.classList.add(EXPANDED_CLASS)
  el.style.maxHeight = ''

  const btn = getToggleButton(el)
  if (btn)
    setButtonState(btn, true)
}

function prepareBlock(el: HTMLElement, lineLimit: number) {
  const btn = getToggleButton(el)
  if (!btn)
    return

  const lineCount = countCodeLines(el)
  if (lineCount <= lineLimit) {
    el.classList.remove(FOLDABLE_CLASS, 'folded', EXPANDED_CLASS)
    el.style.maxHeight = ''
    delete el.dataset.foldMaxHeight
    btn.hidden = true
    return
  }

  el.dataset.foldMaxHeight = String(measureCollapsedHeight(el, lineLimit))
  btn.hidden = false
  el.classList.add(FOLDABLE_CLASS)

  if (el.classList.contains(EXPANDED_CLASS)) {
    setButtonState(btn, true)
    el.style.maxHeight = ''
    return
  }

  foldBlock(el)
}

export function applyCodeBlockFold() {
  if (typeof document === 'undefined' || codeFoldLineLimit <= 0)
    return

  document.querySelectorAll<HTMLElement>('div[class*="language-"]').forEach((el) => {
    prepareBlock(el, codeFoldLineLimit)
  })
}

let initialized = false

export function initCodeBlockFold(lineLimit: number) {
  if (typeof document === 'undefined' || lineLimit <= 0)
    return

  codeFoldLineLimit = lineLimit

  if (!initialized) {
    initialized = true
    document.addEventListener('click', (event) => {
      const target = event.target
      if (!(target instanceof Element))
        return

      const btn = target.closest('button.code-block-unfold-btn')
      if (!(btn instanceof HTMLButtonElement))
        return

      const parent = btn.parentElement
      if (!(parent instanceof HTMLElement) || !parent.classList.contains(FOLDABLE_CLASS))
        return

      event.preventDefault()
      event.stopImmediatePropagation()

      if (parent.classList.contains(EXPANDED_CLASS))
        foldBlock(parent)
      else
        unfoldBlock(parent)
    }, true)
  }

  applyCodeBlockFold()
  requestAnimationFrame(() => applyCodeBlockFold())
}
