// Script management system for multiple scripts

export interface Script {
  id: string
  name: string
  content: string
  createdAt: number
  updatedAt: number
  isActive: boolean
  order: number
}

export interface ScriptManagerState {
  scripts: Script[]
  currentScriptId: string | null
  isLoading: boolean
  error: string | null
}

export class ScriptManager {
  private scripts: Script[] = []
  public currentScriptId: string | null = null
  private storageKey = 'teleprompter-scripts'
  private listeners: ((state: ScriptManagerState) => void)[] = []

  constructor() {
    // Only load scripts if we're in a browser environment
    if (typeof window !== 'undefined') {
      this.loadScripts()
    }
  }

  // Script CRUD operations
  createScript(name: string, content: string = ''): string {
    const id = this.generateId()
    const now = Date.now()
    
    const script: Script = {
      id,
      name,
      content,
      createdAt: now,
      updatedAt: now,
      isActive: false,
      order: this.scripts.length
    }

    this.scripts.push(script)
    this.saveScripts()
    this.notifyListeners()
    
    return id
  }

  updateScript(id: string, updates: Partial<Pick<Script, 'name' | 'content'>>): boolean {
    const script = this.scripts.find(s => s.id === id)
    if (!script) return false

    if (updates.name !== undefined) script.name = updates.name
    if (updates.content !== undefined) script.content = updates.content
    script.updatedAt = Date.now()

    this.saveScripts()
    this.notifyListeners()
    return true
  }

  deleteScript(id: string): boolean {
    const index = this.scripts.findIndex(s => s.id === id)
    if (index === -1) return false

    this.scripts.splice(index, 1)
    
    // If deleted script was current, select another one
    if (this.currentScriptId === id) {
      this.currentScriptId = this.scripts.length > 0 ? this.scripts[0].id : null
    }

    this.saveScripts()
    this.notifyListeners()
    return true
  }

  getScript(id: string): Script | null {
    return this.scripts.find(s => s.id === id) || null
  }

  getAllScripts(): Script[] {
    return [...this.scripts].sort((a, b) => a.order - b.order)
  }

  getCurrentScript(): Script | null {
    if (!this.currentScriptId) return null
    return this.getScript(this.currentScriptId)
  }

  // Script navigation
  setCurrentScript(id: string): boolean {
    const script = this.getScript(id)
    if (!script) return false

    // Deactivate all scripts
    this.scripts.forEach(s => s.isActive = false)
    
    // Activate current script
    script.isActive = true
    this.currentScriptId = id

    this.saveScripts()
    this.notifyListeners()
    return true
  }

  getNextScript(): Script | null {
    if (!this.currentScriptId) return this.scripts[0] || null

    const currentIndex = this.scripts.findIndex(s => s.id === this.currentScriptId)
    if (currentIndex === -1) return this.scripts[0] || null

    const nextIndex = (currentIndex + 1) % this.scripts.length
    return this.scripts[nextIndex] || null
  }

  getPreviousScript(): Script | null {
    if (!this.currentScriptId) return this.scripts[this.scripts.length - 1] || null

    const currentIndex = this.scripts.findIndex(s => s.id === this.currentScriptId)
    if (currentIndex === -1) return this.scripts[this.scripts.length - 1] || null

    const prevIndex = currentIndex === 0 ? this.scripts.length - 1 : currentIndex - 1
    return this.scripts[prevIndex] || null
  }

  skipToNextScript(): boolean {
    const nextScript = this.getNextScript()
    if (!nextScript) return false

    return this.setCurrentScript(nextScript.id)
  }

  skipToPreviousScript(): boolean {
    const prevScript = this.getPreviousScript()
    if (!prevScript) return false

    return this.setCurrentScript(prevScript.id)
  }

  // Script reordering
  reorderScripts(scriptIds: string[]): boolean {
    const newOrder = scriptIds.map((id, index) => {
      const script = this.scripts.find(s => s.id === id)
      if (script) {
        script.order = index
        return script
      }
      return null
    }).filter(Boolean) as Script[]

    if (newOrder.length !== this.scripts.length) return false

    this.scripts = newOrder
    this.saveScripts()
    this.notifyListeners()
    return true
  }

  // Import/Export functionality
  exportScript(id: string): string | null {
    const script = this.getScript(id)
    if (!script) return null

    return JSON.stringify({
      name: script.name,
      content: script.content,
      exportedAt: Date.now()
    }, null, 2)
  }

  exportAllScripts(): string {
    return JSON.stringify({
      scripts: this.scripts.map(s => ({
        name: s.name,
        content: s.content,
        order: s.order
      })),
      exportedAt: Date.now()
    }, null, 2)
  }

  importScript(jsonData: string): string | null {
    try {
      const data = JSON.parse(jsonData)
      
      if (data.scripts && Array.isArray(data.scripts)) {
        // Import multiple scripts
        const importedIds: string[] = []
        data.scripts.forEach((scriptData: any) => {
          const id = this.createScript(scriptData.name, scriptData.content)
          importedIds.push(id)
        })
        return importedIds[0] || null
      } else {
        // Import single script
        const id = this.createScript(data.name, data.content)
        return id
      }
    } catch (error) {
      console.error('Failed to import script:', error)
      return null
    }
  }

  // State management
  subscribe(listener: (state: ScriptManagerState) => void): () => void {
    this.listeners.push(listener)
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  getState(): ScriptManagerState {
    return {
      scripts: this.getAllScripts(),
      currentScriptId: this.currentScriptId,
      isLoading: false,
      error: null
    }
  }

  // Import from .txt file
  async importTxtFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        if (content) {
          resolve(content)
        } else {
          reject(new Error('Failed to read file'))
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  // Export as .txt file
  exportAsTxt(script: Script): void {
    const blob = new Blob([script.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${script.name}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Persistence
  private loadScripts(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        console.warn('localStorage not available')
        return
      }
      
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const data = JSON.parse(stored)
        this.scripts = data.scripts || []
        this.currentScriptId = data.currentScriptId || null
      }
    } catch (error) {
      console.error('Failed to load scripts:', error)
      this.scripts = []
      this.currentScriptId = null
    }
  }

  private saveScripts(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        console.warn('localStorage not available')
        return
      }
      
      const data = {
        scripts: this.scripts,
        currentScriptId: this.currentScriptId,
        savedAt: Date.now()
      }
      localStorage.setItem(this.storageKey, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save scripts:', error)
    }
  }

  private notifyListeners(): void {
    const state = this.getState()
    this.listeners.forEach(listener => listener(state))
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
  }

  // Cleanup
  destroy(): void {
    this.listeners = []
    this.scripts = []
    this.currentScriptId = null
  }
}

// Global script manager instance
export const scriptManager = new ScriptManager()

