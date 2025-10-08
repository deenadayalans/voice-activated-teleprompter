// Auto-save functionality for teleprompter content

export interface AutoSaveOptions {
  enabled: boolean
  interval: number // milliseconds
  maxRetries: number
  storageKey: string
}

export const DEFAULT_AUTO_SAVE_OPTIONS: AutoSaveOptions = {
  enabled: true,
  interval: 5000, // 5 seconds
  maxRetries: 3,
  storageKey: 'teleprompter-auto-save'
}

export interface SavedContent {
  content: string
  timestamp: number
  version: number
}

export class AutoSaveManager {
  private options: AutoSaveOptions
  private intervalId: NodeJS.Timeout | null = null
  private lastSavedContent: string = ''
  private isSaving: boolean = false

  constructor(options: Partial<AutoSaveOptions> = {}) {
    this.options = { ...DEFAULT_AUTO_SAVE_OPTIONS, ...options }
  }

  start(content: string): void {
    if (!this.options.enabled) return

    this.lastSavedContent = content
    this.save(content)
    
    this.intervalId = setInterval(() => {
      this.autoSave()
    }, this.options.interval)
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  save(content: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isSaving) {
        resolve(false)
        return
      }

      this.isSaving = true

      try {
        const savedContent: SavedContent = {
          content,
          timestamp: Date.now(),
          version: this.getVersion() + 1
        }

        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(this.options.storageKey, JSON.stringify(savedContent))
        } else {
          console.warn('localStorage not available for auto-save')
        }
        this.lastSavedContent = content
        this.isSaving = false
        
        console.log('Content auto-saved successfully')
        resolve(true)
      } catch (error) {
        console.error('Auto-save failed:', error)
        this.isSaving = false
        resolve(false)
      }
    })
  }

  private async autoSave(): Promise<void> {
    // This would be called with current content from the component
    // For now, we'll just ensure the last saved content is still valid
    if (this.lastSavedContent) {
      await this.save(this.lastSavedContent)
    }
  }

  load(): SavedContent | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        console.warn('localStorage not available for auto-save load')
        return null
      }
      
      const saved = localStorage.getItem(this.options.storageKey)
      if (saved) {
        return JSON.parse(saved) as SavedContent
      }
    } catch (error) {
      console.error('Failed to load auto-saved content:', error)
    }
    return null
  }

  clear(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(this.options.storageKey)
        this.lastSavedContent = ''
      } else {
        console.warn('localStorage not available for auto-save clear')
      }
    } catch (error) {
      console.error('Failed to clear auto-saved content:', error)
    }
  }

  hasUnsavedChanges(currentContent: string): boolean {
    return this.lastSavedContent !== currentContent
  }

  getLastSavedTime(): number | null {
    const saved = this.load()
    return saved ? saved.timestamp : null
  }

  private getVersion(): number {
    const saved = this.load()
    return saved ? saved.version : 0
  }

  updateContent(content: string): void {
    this.lastSavedContent = content
  }

  destroy(): void {
    this.stop()
  }
}

// Utility functions for content management
export const createBackup = (content: string): string => {
  const backup = {
    content,
    timestamp: Date.now(),
    id: Math.random().toString(36).substr(2, 9)
  }
  
  const backupKey = `teleprompter-backup-${backup.id}`
  localStorage.setItem(backupKey, JSON.stringify(backup))
  
  // Keep only last 5 backups
  const backupKeys = Object.keys(localStorage)
    .filter(key => key.startsWith('teleprompter-backup-'))
    .sort()
  
  if (backupKeys.length > 5) {
    const keysToRemove = backupKeys.slice(0, backupKeys.length - 5)
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }
  
  return backup.id
}

export const getBackup = (backupId: string): string | null => {
  try {
    const backup = localStorage.getItem(`teleprompter-backup-${backupId}`)
    if (backup) {
      const parsed = JSON.parse(backup)
      return parsed.content
    }
  } catch (error) {
    console.error('Failed to load backup:', error)
  }
  return null
}

export const exportContent = (content: string, filename: string = 'teleprompter-script.txt'): void => {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

export const importContent = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.txt,.md,.doc,.docx'
    
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (!file) {
        reject(new Error('No file selected'))
        return
      }
      
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        resolve(content)
      }
      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }
      reader.readAsText(file)
    }
    
    input.click()
  })
}

