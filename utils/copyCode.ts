let initialized = false

function isShellLanguage(className: string) {
  return /language-(shellscript|shell|bash|sh|zsh)/.test(className)
}

function decodeCopyPayload(encoded: string) {
  try {
    const binary = atob(encoded)
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  }
  catch {
    return ''
  }
}

function getCodeText(block: HTMLElement, button: HTMLButtonElement) {
  const encoded = button.dataset.clipboard
  if (encoded) {
    const decoded = decodeCopyPayload(encoded)
    if (decoded)
      return isShellLanguage(block.className)
        ? decoded.replace(/^ *(\$|>) /gm, '').trim()
        : decoded
  }

  const pre = block.querySelector('pre')
  if (!pre)
    return ''

  const lines = pre.querySelectorAll('span.line:not(.diff.remove)')
  let text = ''

  if (lines.length > 0) {
    lines.forEach(node => text += `${node.textContent || ''}\n`)
    text = text.slice(0, -1)
  }
  else {
    const code = pre.querySelector('code')
    text = (code?.textContent || pre.textContent || '').trimEnd()
  }

  if (isShellLanguage(block.className))
    text = text.replace(/^ *(\$|>) /gm, '').trim()

  return text
}

function copyTextSync(text: string) {
  const textarea = document.createElement('textarea')
  const previouslyFocusedElement = document.activeElement

  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  textarea.style.top = '0'
  textarea.style.opacity = '0'

  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  textarea.setSelectionRange(0, text.length)

  let copied = false
  try {
    copied = document.execCommand('copy')
  }
  catch {
    copied = false
  }

  document.body.removeChild(textarea)

  if (previouslyFocusedElement instanceof HTMLElement)
    previouslyFocusedElement.focus()

  return copied
}

function markCopied(button: HTMLButtonElement, timeoutIdMap: WeakMap<HTMLButtonElement, ReturnType<typeof setTimeout>>) {
  button.classList.add('copied')
  const previousTimeout = timeoutIdMap.get(button)
  if (previousTimeout)
    clearTimeout(previousTimeout)

  const timeoutId = setTimeout(() => {
    button.classList.remove('copied')
    button.blur()
    timeoutIdMap.delete(button)
  }, 2000)
  timeoutIdMap.set(button, timeoutId)
}

export function initCodeCopy() {
  if (typeof window === 'undefined' || initialized)
    return

  initialized = true
  const timeoutIdMap = new WeakMap<HTMLButtonElement, ReturnType<typeof setTimeout>>()

  window.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element))
      return

    const button = target.closest('button.copy')
    if (!(button instanceof HTMLButtonElement))
      return

    const block = button.parentElement
    if (!(block instanceof HTMLElement) || !block.matches('div[class*="language-"]'))
      return

    const text = getCodeText(block, button)
    if (!text)
      return

    event.preventDefault()
    event.stopImmediatePropagation()

    const copied = copyTextSync(text)
    if (copied) {
      markCopied(button, timeoutIdMap)
      return
    }

    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(text).then(() => {
        markCopied(button, timeoutIdMap)
      }).catch(() => {})
    }
  }, true)
}
