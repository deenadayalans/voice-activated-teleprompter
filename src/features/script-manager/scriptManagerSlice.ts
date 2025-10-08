import type { PayloadAction } from "@reduxjs/toolkit"
import { createAppSlice } from "../../app/createAppSlice"

export interface Script {
  id: string
  name: string
  content: string
  lastModified: Date
  filePath?: string
}

export interface ScriptManagerSliceState {
  scripts: Script[]
  selectedScriptId: string | null
  isPanelOpen: boolean
  isLoading: boolean
  error: string | null
}

const initialState: ScriptManagerSliceState = {
  scripts: [],
  selectedScriptId: null,
  isPanelOpen: false,
  isLoading: false,
  error: null,
}

export const scriptManagerSlice = createAppSlice({
  name: "scriptManager",

  initialState,

  reducers: create => ({
    setPanelOpen: create.reducer((state, action: PayloadAction<boolean>) => {
      state.isPanelOpen = action.payload
    }),

    addScript: create.reducer((state, action: PayloadAction<Script>) => {
      state.scripts.push(action.payload)
      state.selectedScriptId = action.payload.id
    }),

    updateScript: create.reducer((state, action: PayloadAction<Script>) => {
      const index = state.scripts.findIndex(script => script.id === action.payload.id)
      if (index !== -1) {
        state.scripts[index] = action.payload
      }
    }),

    removeScript: create.reducer((state, action: PayloadAction<string>) => {
      state.scripts = state.scripts.filter(script => script.id !== action.payload)
      if (state.selectedScriptId === action.payload) {
        state.selectedScriptId = state.scripts.length > 0 ? state.scripts[0].id : null
      }
    }),

    selectScript: create.reducer((state, action: PayloadAction<string>) => {
      state.selectedScriptId = action.payload
    }),

    setLoading: create.reducer((state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    }),

    setError: create.reducer((state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    }),

    clearError: create.reducer(state => {
      state.error = null
    }),
  }),

  selectors: {
    selectScripts: state => state.scripts,
    selectSelectedScript: state => 
      state.scripts.find(script => script.id === state.selectedScriptId) || null,
    selectIsPanelOpen: state => state.isPanelOpen,
    selectIsLoading: state => state.isLoading,
    selectError: state => state.error,
  },
})

export const {
  setPanelOpen,
  addScript,
  updateScript,
  removeScript,
  selectScript,
  setLoading,
  setError,
  clearError,
} = scriptManagerSlice.actions

export const {
  selectScripts,
  selectSelectedScript,
  selectIsPanelOpen,
  selectIsLoading,
  selectError,
} = scriptManagerSlice.selectors
