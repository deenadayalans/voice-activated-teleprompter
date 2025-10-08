import type { PayloadAction } from "@reduxjs/toolkit"
import { createAppSlice } from "../../app/createAppSlice"
import { fileScriptManager, type Script, type ScriptManagerState } from "../../lib/file-script-manager"

export interface ScriptsSliceState extends ScriptManagerState {
  isScriptModalOpen: boolean
  isImportModalOpen: boolean
  isExportModalOpen: boolean
}

const initialState: ScriptsSliceState = {
  scripts: [],
  currentScriptId: null,
  isLoading: false,
  error: null,
  isScriptModalOpen: false,
  isImportModalOpen: false,
  isExportModalOpen: false,
}

export const scriptsSlice = createAppSlice({
  name: "scripts",

  initialState,

  reducers: create => ({
    // Initialize with empty state
    initializeScripts: create.reducer(state => {
      // Start with empty scripts
      state.scripts = []
      state.currentScriptId = null
      state.error = null
    }),

    // Load scripts from storage
    loadScriptsFromStorage: create.asyncThunk(
      async () => {
        await fileScriptManager.loadScriptsFromStorage()
        return fileScriptManager.getState()
      },
      {
        fulfilled: (state, action) => {
          state.scripts = action.payload.scripts
          state.currentScriptId = action.payload.currentScriptId
          state.error = null
        },
        rejected: (state, action) => {
          state.error = action.error.message || "Failed to load scripts"
        }
      }
    ),

    // Clear all scripts
    clearAllScripts: create.asyncThunk(
      async () => {
        await fileScriptManager.clearAllScripts()
        return fileScriptManager.getState()
      },
      {
        fulfilled: (state, action) => {
          state.scripts = action.payload.scripts
          state.currentScriptId = action.payload.currentScriptId
          state.error = null
        },
        rejected: (state, action) => {
          state.error = action.error.message || "Failed to clear scripts"
        }
      }
    ),

    // Script CRUD operations
    createScript: create.asyncThunk(
      async (payload: { name: string; content?: string }) => {
        const id = await fileScriptManager.createScript(payload.name, payload.content || '')
        return { id, state: fileScriptManager.getState() }
      },
      {
        fulfilled: (state, action) => {
          state.scripts = action.payload.state.scripts
          state.currentScriptId = action.payload.id
          state.error = null
        },
        rejected: (state, action) => {
          state.error = action.error.message || "Failed to create script"
        }
      }
    ),

    updateScript: create.asyncThunk(
      async (payload: { id: string; updates: Partial<Pick<Script, 'name' | 'content'>> }) => {
        const success = await fileScriptManager.updateScript(payload.id, payload.updates)
        if (!success) {
          throw new Error("Failed to update script")
        }
        return fileScriptManager.getState()
      },
      {
        fulfilled: (state, action) => {
          state.scripts = action.payload.scripts
          state.currentScriptId = action.payload.currentScriptId
          state.error = null
        },
        rejected: (state, action) => {
          state.error = action.error.message || "Failed to update script"
        }
      }
    ),

    deleteScript: create.asyncThunk(
      async (scriptId: string) => {
        const success = await fileScriptManager.deleteScript(scriptId)
        if (!success) {
          throw new Error("Failed to delete script")
        }
        return fileScriptManager.getState()
      },
      {
        fulfilled: (state, action) => {
          state.scripts = action.payload.scripts
          state.currentScriptId = action.payload.currentScriptId
          state.error = null
        },
        rejected: (state, action) => {
          state.error = action.error.message || "Failed to delete script"
        }
      }
    ),

    // Script navigation
    setCurrentScript: create.reducer((state, action: PayloadAction<string>) => {
      const success = fileScriptManager.setCurrentScript(action.payload)
      if (success) {
        state.currentScriptId = action.payload
        state.error = null
      } else {
        state.error = "Failed to set current script"
      }
    }),

    skipToNextScript: create.reducer(state => {
      const success = fileScriptManager.skipToNextScript()
      if (success) {
        state.currentScriptId = fileScriptManager.currentScriptId
        state.error = null
      } else {
        state.error = "No next script available"
      }
    }),

    skipToPreviousScript: create.reducer(state => {
      const success = fileScriptManager.skipToPreviousScript()
      if (success) {
        state.currentScriptId = fileScriptManager.currentScriptId
        state.error = null
      } else {
        state.error = "No previous script available"
      }
    }),


    // Modal management
    openScriptModal: create.reducer(state => {
      state.isScriptModalOpen = true
    }),

    closeScriptModal: create.reducer(state => {
      state.isScriptModalOpen = false
    }),

    openImportModal: create.reducer(state => {
      state.isImportModalOpen = true
    }),

    closeImportModal: create.reducer(state => {
      state.isImportModalOpen = false
    }),

    openExportModal: create.reducer(state => {
      state.isExportModalOpen = true
    }),

    closeExportModal: create.reducer(state => {
      state.isExportModalOpen = false
    }),

    // Error handling
    setError: create.reducer((state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    }),

    clearError: create.reducer(state => {
      state.error = null
    }),

  }),

  selectors: {
    selectScripts: state => state.scripts,
    selectCurrentScriptId: state => state.currentScriptId,
    selectCurrentScript: state => {
      if (!state.currentScriptId) return null
      return state.scripts.find(s => s.id === state.currentScriptId) || null
    },
    selectIsLoading: state => state.isLoading,
    selectError: state => state.error,
    selectIsScriptModalOpen: state => state.isScriptModalOpen,
    selectIsImportModalOpen: state => state.isImportModalOpen,
    selectIsExportModalOpen: state => state.isExportModalOpen,
    selectScriptCount: state => state.scripts.length,
    selectHasScripts: state => state.scripts.length > 0,
    selectCanSkipNext: state => {
      if (!state.currentScriptId) return state.scripts.length > 1
      const currentIndex = state.scripts.findIndex(s => s.id === state.currentScriptId)
      return currentIndex < state.scripts.length - 1
    },
    selectCanSkipPrevious: state => {
      if (!state.currentScriptId) return state.scripts.length > 1
      const currentIndex = state.scripts.findIndex(s => s.id === state.currentScriptId)
      return currentIndex > 0
    },
  },
})

// Action creators
export const {
  initializeScripts,
  loadScriptsFromStorage,
  clearAllScripts,
  createScript,
  updateScript,
  deleteScript,
  setCurrentScript,
  skipToNextScript,
  skipToPreviousScript,
  openScriptModal,
  closeScriptModal,
  openImportModal,
  closeImportModal,
  openExportModal,
  closeExportModal,
  setError,
  clearError,
} = scriptsSlice.actions

// Selectors
export const {
  selectScripts,
  selectCurrentScriptId,
  selectCurrentScript,
  selectIsLoading,
  selectError,
  selectIsScriptModalOpen,
  selectIsImportModalOpen,
  selectIsExportModalOpen,
  selectScriptCount,
  selectHasScripts,
  selectCanSkipNext,
  selectCanSkipPrevious,
} = scriptsSlice.selectors

