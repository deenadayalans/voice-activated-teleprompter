import { useState, useEffect } from "react"
import { useAppDispatch, useAppSelector } from "../../app/hooks"
import {
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
  clearError,
  setError,
  selectScripts,
  selectCurrentScriptId,
  selectError,
  selectIsScriptModalOpen,
  selectScriptCount,
  selectHasScripts,
  selectCanSkipNext,
  selectCanSkipPrevious,
} from "./scriptsSlice"
import { fileScriptManager } from "../../lib/file-script-manager"

export const ScriptManager = () => {
  const dispatch = useAppDispatch()
  const [editingScript, setEditingScript] = useState<{ id: string; name: string; content: string } | null>(null)
  const [newScriptName, setNewScriptName] = useState("")

  const scripts = useAppSelector(selectScripts)
  const currentScriptId = useAppSelector(selectCurrentScriptId)
  const error = useAppSelector(selectError)
  const isScriptModalOpen = useAppSelector(selectIsScriptModalOpen)
  const scriptCount = useAppSelector(selectScriptCount)
  const hasScripts = useAppSelector(selectHasScripts)
  const canSkipNext = useAppSelector(selectCanSkipNext)
  const canSkipPrevious = useAppSelector(selectCanSkipPrevious)

  // Initialize scripts on mount
  useEffect(() => {
    try {
      dispatch(initializeScripts())
    } catch (error) {
      console.error('Failed to initialize scripts:', error)
    }
  }, [dispatch])

  // Subscribe to script manager changes
  useEffect(() => {
    try {
      const unsubscribe = fileScriptManager.subscribe(() => {
        // Update Redux state when script manager changes
        dispatch(initializeScripts())
      })

      return unsubscribe
    } catch (error) {
      console.error('Failed to subscribe to script manager:', error)
    }
  }, [dispatch])

  const handleCreateScript = async () => {
    if (newScriptName.trim()) {
      try {
        await dispatch(createScript({ name: newScriptName.trim() })).unwrap()
        setNewScriptName("")
        dispatch(closeScriptModal())
      } catch (error) {
        console.error('Failed to create script:', error)
      }
    }
  }

  const handleEditScript = (script: any) => {
    setEditingScript({
      id: script.id,
      name: script.name,
      content: script.content
    })
    dispatch(openScriptModal())
  }

  const handleUpdateScript = async () => {
    if (editingScript) {
      try {
        await dispatch(updateScript({
          id: editingScript.id,
          updates: {
            name: editingScript.name,
            content: editingScript.content
          }
        })).unwrap()
        setEditingScript(null)
        dispatch(closeScriptModal())
      } catch (error) {
        console.error('Failed to update script:', error)
      }
    }
  }

  const handleDeleteScript = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this script?")) {
      try {
        await dispatch(deleteScript(id)).unwrap()
      } catch (error) {
        console.error('Failed to delete script:', error)
      }
    }
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.txt'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        try {
          const content = await fileScriptManager.importTxtFile(file)
          const scriptName = file.name.replace('.txt', '')
          
          // Use Redux action to create script
          await dispatch(createScript({ name: scriptName, content })).unwrap()
          // The createScript action already sets the current script, so we just close the modal
          dispatch(closeScriptModal())
        } catch (error) {
          console.error('Import error:', error)
          dispatch(setError('Failed to import .txt file'))
        }
      }
    }
    input.click()
  }

  const handleExport = (scriptId: string) => {
    const script = fileScriptManager.getScript(scriptId)
    if (script) {
      fileScriptManager.exportAsTxt(script)
    }
  }

  const handleExportAll = () => {
    const scripts = fileScriptManager.getAllScripts()
    scripts.forEach(script => {
      fileScriptManager.exportAsTxt(script)
    })
  }

  const handleLoadScripts = async () => {
    try {
      await dispatch(loadScriptsFromStorage()).unwrap()
    } catch (error) {
      console.error('Failed to load scripts:', error)
    }
  }

  const handleClearAllScripts = async () => {
    if (window.confirm("Are you sure you want to clear all scripts? This action cannot be undone.")) {
      try {
        await dispatch(clearAllScripts()).unwrap()
      } catch (error) {
        console.error('Failed to clear scripts:', error)
      }
    }
  }


  const handleCloseScriptManager = () => {
    const scriptManager = document.querySelector('.script-manager') as HTMLElement
    if (scriptManager) {
      scriptManager.style.display = 'none'
    }
  }

  return (
    <div className="script-manager">
      {/* Header with Close Button */}
      <div className="script-manager-header">
        <h3 className="title is-4">Script Manager</h3>
        <button
          className="button is-small is-outlined"
          onClick={handleCloseScriptManager}
          title="Close Script Manager"
        >
          <span className="icon">
            <i className="fa-solid fa-times"></i>
          </span>
          <span>Close</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="notification is-danger">
          <button className="delete" onClick={() => dispatch(clearError())}></button>
          {error}
        </div>
      )}

      {/* Script Navigation */}
      {hasScripts && (
        <div className="script-navigation">
          <div className="field is-grouped">
            <div className="control">
              <button
                className="button is-small"
                onClick={() => dispatch(skipToPreviousScript())}
                disabled={!canSkipPrevious}
                title="Previous Script"
              >
                <span className="icon">
                  <i className="fa-solid fa-chevron-left"></i>
                </span>
              </button>
            </div>
            <div className="control">
              <div className="select is-small">
                <select
                  value={currentScriptId || ""}
                  onChange={(e) => dispatch(setCurrentScript(e.target.value))}
                >
                  {scripts.map(script => (
                    <option key={script.id} value={script.id}>
                      {script.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="control">
              <button
                className="button is-small"
                onClick={() => dispatch(skipToNextScript())}
                disabled={!canSkipNext}
                title="Next Script"
              >
                <span className="icon">
                  <i className="fa-solid fa-chevron-right"></i>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Script Management Buttons */}
      <div className="script-actions">
        <div className="field is-grouped">
          <div className="control">
            <button
              className="button is-small"
              onClick={() => {
                setEditingScript(null)
                dispatch(openScriptModal())
              }}
              title="Create New Script"
            >
              <span className="icon">
                <i className="fa-solid fa-plus"></i>
              </span>
              <span>New Script</span>
            </button>
          </div>
          <div className="control">
            <button
              className="button is-small"
              onClick={handleImport}
              title="Import .txt File"
            >
              <span className="icon">
                <i className="fa-solid fa-upload"></i>
              </span>
              <span>Import .txt</span>
            </button>
          </div>
          <div className="control">
            <button
              className="button is-small"
              onClick={handleExportAll}
              disabled={!hasScripts}
              title="Export All Scripts as .txt Files"
            >
              <span className="icon">
                <i className="fa-solid fa-download"></i>
              </span>
              <span>Export All .txt</span>
            </button>
          </div>
          <div className="control">
            <button
              className="button is-small is-info"
              onClick={handleLoadScripts}
              title="Load Scripts from Storage"
            >
              <span className="icon">
                <i className="fa-solid fa-folder-open"></i>
              </span>
              <span>Load Scripts</span>
            </button>
          </div>
          <div className="control">
            <button
              className="button is-small is-warning"
              onClick={handleClearAllScripts}
              disabled={!hasScripts}
              title="Clear All Scripts"
            >
              <span className="icon">
                <i className="fa-solid fa-trash-can"></i>
              </span>
              <span>Clear All</span>
            </button>
          </div>
        </div>
      </div>

      {/* Script List */}
      {hasScripts && (
        <div className="script-list">
          <div className="box">
            <h4 className="title is-6">Scripts ({scriptCount})</h4>
            <div className="script-items">
                {scripts.map((script) => (
                <div
                  key={script.id}
                  className={`script-item ${script.id === currentScriptId ? 'is-active' : ''}`}
                  onClick={() => dispatch(setCurrentScript(script.id))}
                  style={{ cursor: 'pointer' }}
                  title="Click to select this script"
                >
                  <div className="script-info">
                    <div className="script-name">{script.name}</div>
                    <div className="script-meta">
                      Updated: {new Date(script.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="script-actions">
                    <button
                      className="button is-small is-outlined"
                      onClick={() => handleEditScript(script)}
                      title="Edit Script"
                    >
                      <span className="icon">
                        <i className="fa-solid fa-edit"></i>
                      </span>
                    </button>
                    <button
                      className="button is-small is-outlined"
                      onClick={() => handleExport(script.id)}
                      title="Export as .txt File"
                    >
                      <span className="icon">
                        <i className="fa-solid fa-download"></i>
                      </span>
                    </button>
                    <button
                      className="button is-small is-danger is-outlined"
                      onClick={() => handleDeleteScript(script.id)}
                      title="Delete Script"
                    >
                      <span className="icon">
                        <i className="fa-solid fa-trash"></i>
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Script Modal */}
      {isScriptModalOpen && (
        <div className="modal is-active">
          <div className="modal-background" onClick={() => dispatch(closeScriptModal())}></div>
          <div className="modal-card">
            <header className="modal-card-head">
              <p className="modal-card-title">
                {editingScript ? 'Edit Script' : 'Create New Script'}
              </p>
              <button
                className="delete"
                onClick={() => dispatch(closeScriptModal())}
              ></button>
            </header>
            <section className="modal-card-body">
              <div className="field">
                <label className="label">Script Name</label>
                <div className="control">
                  <input
                    className="input"
                    type="text"
                    value={editingScript?.name || newScriptName}
                    onChange={(e) => {
                      if (editingScript) {
                        setEditingScript({ ...editingScript, name: e.target.value })
                      } else {
                        setNewScriptName(e.target.value)
                      }
                    }}
                    placeholder="Enter script name"
                  />
                </div>
              </div>
              {editingScript && (
                <div className="field">
                  <label className="label">Script Content</label>
                  <div className="control">
                    <textarea
                      className="textarea"
                      rows={10}
                      value={editingScript.content}
                      onChange={(e) => setEditingScript({ ...editingScript, content: e.target.value })}
                      placeholder="Enter script content"
                    />
                  </div>
                </div>
              )}
            </section>
            <footer className="modal-card-foot">
              <button
                className="button is-success"
                onClick={editingScript ? () => handleUpdateScript() : () => handleCreateScript()}
              >
                {editingScript ? 'Update' : 'Create'}
              </button>
              <button
                className="button"
                onClick={() => dispatch(closeScriptModal())}
              >
                Cancel
              </button>
            </footer>
          </div>
        </div>
      )}

    </div>
  )
}

