// Keyboard navigation and accessibility utilities

export interface KeyboardShortcuts {
  playPause: string[]
  stop: string[]
  edit: string[]
  restart: string[]
  flipHorizontal: string[]
  flipVertical: string[]
  increaseFontSize: string[]
  decreaseFontSize: string[]
  increaseOpacity: string[]
  decreaseOpacity: string[]
  nextWord: string[]
  previousWord: string[]
  jumpToStart: string[]
  jumpToEnd: string[]
  nextScript: string[]
  previousScript: string[]
  openScriptManager: string[]
  jumpToParagraph: string[]
  jumpToSentence: string[]
}

export const DEFAULT_KEYBOARD_SHORTCUTS: KeyboardShortcuts = {
  playPause: ['Space', 'Enter'],
  stop: ['Escape'],
  edit: ['e', 'E'],
  restart: ['r', 'R'],
  flipHorizontal: ['h', 'H'],
  flipVertical: ['v', 'V'],
  increaseFontSize: ['+', '='],
  decreaseFontSize: ['-', '_'],
  increaseOpacity: ['ArrowUp'],
  decreaseOpacity: ['ArrowDown'],
  nextWord: ['ArrowRight'],
  previousWord: ['ArrowLeft'],
  jumpToStart: ['Home'],
  jumpToEnd: ['End'],
  nextScript: ['PageDown'],
  previousScript: ['PageUp'],
  openScriptManager: ['m', 'M'],
  jumpToParagraph: ['p', 'P'],
  jumpToSentence: ['s', 'S']
}

export interface KeyboardEventHandlers {
  onPlayPause: () => void
  onStop: () => void
  onEdit: () => void
  onRestart: () => void
  onFlipHorizontal: () => void
  onFlipVertical: () => void
  onIncreaseFontSize: () => void
  onDecreaseFontSize: () => void
  onIncreaseOpacity: () => void
  onDecreaseOpacity: () => void
  onNextWord: () => void
  onPreviousWord: () => void
  onJumpToStart: () => void
  onJumpToEnd: () => void
  onNextScript: () => void
  onPreviousScript: () => void
  onOpenScriptManager: () => void
  onJumpToParagraph?: () => void
  onJumpToSentence?: () => void
}

export class KeyboardNavigationManager {
  private shortcuts: KeyboardShortcuts
  private handlers: Partial<KeyboardEventHandlers>
  private isEnabled: boolean = true
  private eventListener: ((event: KeyboardEvent) => void) | null = null

  constructor(shortcuts: KeyboardShortcuts = DEFAULT_KEYBOARD_SHORTCUTS) {
    this.shortcuts = shortcuts
    this.handlers = {}
  }

  setHandlers(handlers: Partial<KeyboardEventHandlers>): void {
    this.handlers = { ...this.handlers, ...handlers }
  }

  enable(): void {
    if (this.eventListener) return

    this.eventListener = (event: KeyboardEvent) => {
      if (!this.isEnabled) return

      // Don't trigger shortcuts when typing in input fields
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return
      }

      const key = event.key
      const isCtrl = event.ctrlKey || event.metaKey
      const isShift = event.shiftKey
      const isAlt = event.altKey

      // Handle modifier key combinations
      if (isCtrl || isAlt) {
        return // Let browser handle these
      }

      // Handle individual keys
      this.handleKeyPress(key, isShift, event)
    }

    document.addEventListener('keydown', this.eventListener)
  }

  disable(): void {
    if (this.eventListener) {
      document.removeEventListener('keydown', this.eventListener)
      this.eventListener = null
    }
  }

  private handleKeyPress(key: string, isShift: boolean, event?: KeyboardEvent): void {
    const keyCombo = isShift ? key : key.toLowerCase()

    // Play/Pause
    if (this.shortcuts.playPause.includes(key) && this.handlers.onPlayPause) {
      event?.preventDefault()
      this.handlers.onPlayPause()
      return
    }

    // Stop
    if (this.shortcuts.stop.includes(key) && this.handlers.onStop) {
      event?.preventDefault()
      this.handlers.onStop()
      return
    }

    // Edit
    if (this.shortcuts.edit.includes(keyCombo) && this.handlers.onEdit) {
      event?.preventDefault()
      this.handlers.onEdit()
      return
    }

    // Restart
    if (this.shortcuts.restart.includes(keyCombo) && this.handlers.onRestart) {
      event?.preventDefault()
      this.handlers.onRestart()
      return
    }

    // Flip Horizontal
    if (this.shortcuts.flipHorizontal.includes(keyCombo) && this.handlers.onFlipHorizontal) {
      event?.preventDefault()
      this.handlers.onFlipHorizontal()
      return
    }

    // Flip Vertical
    if (this.shortcuts.flipVertical.includes(keyCombo) && this.handlers.onFlipVertical) {
      event?.preventDefault()
      this.handlers.onFlipVertical()
      return
    }

    // Font Size
    if (this.shortcuts.increaseFontSize.includes(key) && this.handlers.onIncreaseFontSize) {
      event?.preventDefault()
      this.handlers.onIncreaseFontSize()
      return
    }

    if (this.shortcuts.decreaseFontSize.includes(key) && this.handlers.onDecreaseFontSize) {
      event?.preventDefault()
      this.handlers.onDecreaseFontSize()
      return
    }

    // Opacity
    if (this.shortcuts.increaseOpacity.includes(key) && this.handlers.onIncreaseOpacity) {
      event?.preventDefault()
      this.handlers.onIncreaseOpacity()
      return
    }

    if (this.shortcuts.decreaseOpacity.includes(key) && this.handlers.onDecreaseOpacity) {
      event?.preventDefault()
      this.handlers.onDecreaseOpacity()
      return
    }

    // Navigation
    if (this.shortcuts.nextWord.includes(key) && this.handlers.onNextWord) {
      event?.preventDefault()
      this.handlers.onNextWord()
      return
    }

    if (this.shortcuts.previousWord.includes(key) && this.handlers.onPreviousWord) {
      event?.preventDefault()
      this.handlers.onPreviousWord()
      return
    }

    // Jump to start/end
    if (this.shortcuts.jumpToStart.includes(key) && this.handlers.onJumpToStart) {
      event?.preventDefault()
      this.handlers.onJumpToStart()
      return
    }

    if (this.shortcuts.jumpToEnd.includes(key) && this.handlers.onJumpToEnd) {
      event?.preventDefault()
      this.handlers.onJumpToEnd()
      return
    }

    // Script navigation
    if (this.shortcuts.nextScript.includes(key) && this.handlers.onNextScript) {
      event?.preventDefault()
      this.handlers.onNextScript()
      return
    }

    if (this.shortcuts.previousScript.includes(key) && this.handlers.onPreviousScript) {
      event?.preventDefault()
      this.handlers.onPreviousScript()
      return
    }

    if (this.shortcuts.openScriptManager.includes(keyCombo) && this.handlers.onOpenScriptManager) {
      event?.preventDefault()
      this.handlers.onOpenScriptManager()
      return
    }

    // Jump to paragraph
    if (this.shortcuts.jumpToParagraph.includes(keyCombo) && this.handlers.onJumpToParagraph) {
      event?.preventDefault()
      this.handlers.onJumpToParagraph()
      return
    }

    // Jump to sentence
    if (this.shortcuts.jumpToSentence.includes(keyCombo) && this.handlers.onJumpToSentence) {
      event?.preventDefault()
      this.handlers.onJumpToSentence()
      return
    }
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }

  destroy(): void {
    this.disable()
    this.handlers = {}
  }
}

// Accessibility utilities
export const addAriaLabels = (element: HTMLElement, label: string, description?: string): void => {
  element.setAttribute('aria-label', label)
  if (description) {
    element.setAttribute('aria-describedby', description)
  }
}

export const announceToScreenReader = (message: string): void => {
  const announcement = document.createElement('div')
  announcement.setAttribute('aria-live', 'polite')
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message
  
  document.body.appendChild(announcement)
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

// Focus management
export const trapFocus = (container: HTMLElement): void => {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  
  const firstElement = focusableElements[0] as HTMLElement
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

  container.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event?.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          event?.preventDefault()
          firstElement.focus()
        }
      }
    }
  })
}
