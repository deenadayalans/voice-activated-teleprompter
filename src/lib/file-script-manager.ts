export interface Script {
  id: string
  name: string
  content: string
  filename: string
  createdAt: number
  updatedAt: number
}

export interface ScriptManagerState {
  scripts: Script[]
  currentScriptId: string | null
  isLoading: boolean
  error: string | null
}

export class FileScriptManager {
  private scripts: Script[] = []
  public currentScriptId: string | null = null
  private listeners: ((state: ScriptManagerState) => void)[] = []

  constructor() {
    // Start with empty scripts - don't auto-load from localStorage
    this.scripts = []
    this.currentScriptId = null
  }

  // Script CRUD operations
  async createScript(name: string, content: string = ''): Promise<string> {
    const id = this.generateId()
    const now = Date.now()
    const scriptNumber = this.getNextScriptNumber()
    const filename = `script_${scriptNumber}.txt`
    
    const script: Script = {
      id,
      name,
      content,
      filename,
      createdAt: now,
      updatedAt: now
    }

    this.scripts.push(script)
    this.currentScriptId = id
    await this.saveScriptToFile(script)
    this.notifyListeners()
    
    return id
  }

  async updateScript(id: string, updates: Partial<Pick<Script, 'name' | 'content'>>): Promise<boolean> {
    const scriptIndex = this.scripts.findIndex(s => s.id === id)
    if (scriptIndex === -1) return false

    const script = this.scripts[scriptIndex]
    
    // Create a new script object instead of modifying the existing one
    const updatedScript: Script = {
      ...script,
      name: updates.name !== undefined ? updates.name : script.name,
      content: updates.content !== undefined ? updates.content : script.content,
      updatedAt: Date.now()
    }
    
    // Replace the script in the array
    this.scripts[scriptIndex] = updatedScript
    await this.saveScriptToFile(updatedScript)
    this.notifyListeners()
    
    return true
  }

  async deleteScript(id: string): Promise<boolean> {
    const index = this.scripts.findIndex(s => s.id === id)
    if (index === -1) return false

    const script = this.scripts[index]
    
    // Delete the file
    await this.deleteScriptFile(script.filename)
    
    this.scripts.splice(index, 1)
    
    if (this.currentScriptId === id) {
      this.currentScriptId = this.scripts.length > 0 ? this.scripts[0].id : null
    }
    
    this.notifyListeners()
    return true
  }

  getScript(id: string): Script | null {
    return this.scripts.find(s => s.id === id) || null
  }

  getAllScripts(): Script[] {
    return [...this.scripts]
  }

  setCurrentScript(id: string): boolean {
    const script = this.scripts.find(s => s.id === id)
    if (!script) return false
    
    this.currentScriptId = id
    this.notifyListeners()
    return true
  }

  getCurrentScript(): Script | null {
    return this.currentScriptId ? this.getScript(this.currentScriptId) : null
  }

  // Navigation
  skipToNextScript(): boolean {
    if (this.scripts.length === 0) return false
    
    const currentIndex = this.scripts.findIndex(s => s.id === this.currentScriptId)
    const nextIndex = (currentIndex + 1) % this.scripts.length
    
    this.currentScriptId = this.scripts[nextIndex].id
    this.notifyListeners()
    return true
  }

  skipToPreviousScript(): boolean {
    if (this.scripts.length === 0) return false
    
    const currentIndex = this.scripts.findIndex(s => s.id === this.currentScriptId)
    const prevIndex = currentIndex === 0 ? this.scripts.length - 1 : currentIndex - 1
    
    this.currentScriptId = this.scripts[prevIndex].id
    this.notifyListeners()
    return true
  }

  // File operations using localStorage as file system
  private async saveScriptToFile(script: Script): Promise<void> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        console.warn('localStorage not available')
        return
      }
      
      // Save script content to localStorage with filename as key
      const fileKey = `script_file_${script.filename}`
      const fileData = {
        content: script.content,
        name: script.name,
        filename: script.filename,
        createdAt: script.createdAt,
        updatedAt: script.updatedAt
      }
      
      localStorage.setItem(fileKey, JSON.stringify(fileData))
      console.log(`Saved script to file: ${script.filename}`)
    } catch (error) {
      console.error('Failed to save script to file:', error)
      throw error
    }
  }

  private async deleteScriptFile(filename: string): Promise<void> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        console.warn('localStorage not available')
        return
      }
      
      const fileKey = `script_file_${filename}`
      localStorage.removeItem(fileKey)
      console.log(`Deleted script file: ${filename}`)
    } catch (error) {
      console.error('Failed to delete script file:', error)
      throw error
    }
  }


  // Import/Export functionality
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

  exportAsTxt(script: Script): void {
    const blob = new Blob([script.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = script.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Utility functions
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  private getNextScriptNumber(): number {
    const existingNumbers = this.scripts
      .map(s => {
        const match = s.filename.match(/script_(\d+)\.txt/)
        return match ? parseInt(match[1]) : 0
      })
      .filter(n => n > 0)
    
    if (existingNumbers.length === 0) return 1
    
    return Math.max(...existingNumbers) + 1
  }

  // Manual script loading and clearing
  async loadScriptsFromStorage(): Promise<void> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        console.warn('localStorage not available')
        return
      }
      
      console.log('Loading scripts from files...')
      
      // Load all script files from localStorage
      const scriptFiles: Script[] = []
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('script_file_')) {
          try {
            const fileData = JSON.parse(localStorage.getItem(key) || '{}')
            if (fileData.content !== undefined) {
              const script: Script = {
                id: this.generateId(),
                name: fileData.name || 'Untitled Script',
                content: fileData.content || '',
                filename: fileData.filename || key.replace('script_file_', ''),
                createdAt: fileData.createdAt || Date.now(),
                updatedAt: fileData.updatedAt || Date.now()
              }
              scriptFiles.push(script)
            }
          } catch (error) {
            console.warn(`Failed to parse script file ${key}:`, error)
          }
        }
      }
      
      // Sort scripts by filename (script_1.txt, script_2.txt, etc.)
      scriptFiles.sort((a, b) => {
        const aNum = parseInt(a.filename.match(/script_(\d+)\.txt/)?.[1] || '0')
        const bNum = parseInt(b.filename.match(/script_(\d+)\.txt/)?.[1] || '0')
        return aNum - bNum
      })
      
      this.scripts = scriptFiles
      
      // Set current script to first one if available
      if (this.scripts.length > 0) {
        this.currentScriptId = this.scripts[0].id
      }
      
      console.log(`Loaded ${this.scripts.length} scripts`)
      this.notifyListeners()
    } catch (error) {
      console.error('Failed to load scripts:', error)
    }
  }

  async clearAllScripts(): Promise<void> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        console.warn('localStorage not available')
        return
      }
      
      // Delete all script files from localStorage
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('script_file_')) {
          keysToRemove.push(key)
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key))
      
      // Clear in-memory scripts
      this.scripts = []
      this.currentScriptId = null
      
      console.log('Cleared all scripts')
      this.notifyListeners()
    } catch (error) {
      console.error('Failed to clear scripts:', error)
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

  private notifyListeners(): void {
    const state = this.getState()
    this.listeners.forEach(listener => listener(state))
  }
}

// Export singleton instance
export const fileScriptManager = new FileScriptManager()
