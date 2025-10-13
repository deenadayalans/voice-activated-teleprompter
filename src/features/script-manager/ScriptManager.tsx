import { useRef, useEffect } from "react"
import { useAppDispatch, useAppSelector } from "../../app/hooks"
import {
  selectScripts,
  selectSelectedScript,
  selectIsPanelOpen,
  selectIsLoading,
  selectError,
  setPanelOpen,
  addScript,
  removeScript,
  selectScript,
  setLoading,
  setError,
  clearError,
  type Script,
} from "./scriptManagerSlice"
import { setContent } from "../content/contentSlice"

export const ScriptManager = () => {
  const dispatch = useAppDispatch()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scripts = useAppSelector(selectScripts)
  const selectedScript = useAppSelector(selectSelectedScript)
  const isPanelOpen = useAppSelector(selectIsPanelOpen)
  const isLoading = useAppSelector(selectIsLoading)
  const error = useAppSelector(selectError)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    dispatch(setLoading(true))
    dispatch(clearError())

    try {
      const uploadedScripts: Script[] = []
      let fileNumber = 1
      
      for (const file of Array.from(files)) {
        if (file.type === "text/plain" || file.name.endsWith('.txt')) {
          const content = await file.text()
          const script = {
            id: `script-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: `${fileNumber}. ${file.name.replace('.txt', '')}`,
            content,
            lastModified: file.lastModified, // Store as timestamp
            filePath: file.name,
          }
          dispatch(addScript(script))
          uploadedScripts.push(script)
          fileNumber++
        }
      }
      
      // Automatically load the first uploaded script
      if (uploadedScripts.length > 0) {
        const firstScript = uploadedScripts[0]
        dispatch(selectScript(firstScript.id))
        dispatch(setContent(firstScript.content))
      }
    } catch (err) {
      dispatch(setError("Failed to load script files"))
      console.error("Error loading files:", err)
    } finally {
      dispatch(setLoading(false))
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleScriptSelect = (scriptId: string) => {
    dispatch(selectScript(scriptId))
    const script = scripts.find(s => s.id === scriptId)
    if (script) {
      dispatch(setContent(script.content))
    }
  }

  const handleScriptDelete = (scriptId: string) => {
    if (confirm("Are you sure you want to delete this script?")) {
      dispatch(removeScript(scriptId))
    }
  }

  const handleScriptSelectByNumber = (scriptNumber: number) => {
    // Find script by number (assuming scripts are ordered by upload sequence)
    const sortedScripts = [...scripts].sort((a, b) => {
      const aNum = parseInt(a.name.match(/^(\d+)\./)?.[1] || '0')
      const bNum = parseInt(b.name.match(/^(\d+)\./)?.[1] || '0')
      return aNum - bNum
    })
    
    const targetScript = sortedScripts[scriptNumber - 1]
    if (targetScript) {
      handleScriptSelect(targetScript.id)
    }
  }

  // Handle keyboard shortcuts for script selection
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle number keys 1-9
      if (event.key >= '1' && event.key <= '9') {
        const scriptNumber = parseInt(event.key)
        const sortedScripts = [...scripts].sort((a, b) => {
          const aNum = parseInt(a.name.match(/^(\d+)\./)?.[1] || '0')
          const bNum = parseInt(b.name.match(/^(\d+)\./)?.[1] || '0')
          return aNum - bNum
        })
        
        // Check if the requested script number exists
        if (scriptNumber <= sortedScripts.length) {
          const targetScript = sortedScripts[scriptNumber - 1]
          if (targetScript) {
            handleScriptSelect(targetScript.id)
          }
        }
      }
    }

    // Add event listener
    document.addEventListener('keydown', handleKeyPress)

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [scripts])

  const togglePanel = () => {
    dispatch(setPanelOpen(!isPanelOpen))
  }

  if (!isPanelOpen) {
    return (
      <button
        className="button is-primary is-small script-manager-toggle"
        onClick={togglePanel}
        title="Open Script Manager"
      >
        <span className="icon is-small">
          <i className="fa-solid fa-folder-open" />
        </span>
        <span>Scripts</span>
      </button>
    )
  }

  return (
    <div className="script-manager-panel">
      <div className="script-manager-header">
        <h3 className="title is-6">Script Manager</h3>
        <button
          className="delete is-small"
          onClick={togglePanel}
          title="Close Script Manager"
        />
      </div>

      <div className="script-manager-content">
        <div className="file-upload-section">
          <div className="file is-small">
            <label className="file-label">
              <input
                ref={fileInputRef}
                className="file-input"
                type="file"
                multiple
                accept=".txt,text/plain"
                onChange={handleFileUpload}
                disabled={isLoading}
              />
              <span className="file-cta">
                <span className="file-icon">
                  <i className="fa-solid fa-upload" />
                </span>
                <span className="file-label">
                  {isLoading ? "Loading..." : "Load Scripts"}
                </span>
              </span>
            </label>
          </div>
        </div>

        {error && (
          <div className="notification is-danger is-small">
            <button
              className="delete is-small"
              onClick={() => dispatch(clearError())}
            />
            {error}
          </div>
        )}

        <div className="scripts-list">
          {scripts.length === 0 ? (
            <div className="has-text-grey has-text-centered">
              <p>No scripts loaded</p>
              <p className="is-size-7">Upload .txt files to get started</p>
            </div>
          ) : (
            <>
              {scripts.length > 0 && (
                <div className="keyboard-shortcut-hint has-text-grey-light has-text-centered is-size-7">
                  💡 Press number keys (1-9) to quickly switch scripts
                </div>
              )}
              {scripts.map(script => (
              <div
                key={script.id}
                className={`script-item ${selectedScript?.id === script.id ? 'is-active' : ''}`}
                onClick={() => handleScriptSelect(script.id)}
              >
                <div className="script-info">
                  <div className="script-name">
                    {script.name.match(/^(\d+)\.\s*(.+)$/) ? (
                      <>
                        <span 
                          className="script-number"
                          onClick={(e) => {
                            e.stopPropagation()
                            const scriptNumber = parseInt(script.name.match(/^(\d+)\./)?.[1] || '0')
                            handleScriptSelectByNumber(scriptNumber)
                          }}
                          title="Click to open this script"
                        >
                          {script.name.match(/^(\d+)\.\s*(.+)$/)?.[1]}.
                        </span>
                        <span className="script-filename">
                          {script.name.match(/^(\d+)\.\s*(.+)$/)?.[2]}
                        </span>
                      </>
                    ) : (
                      script.name
                    )}
                  </div>
                  <div className="script-meta">
                    <small className="has-text-grey">
                      {new Date(script.lastModified).toLocaleDateString()}
                    </small>
                  </div>
                </div>
                <button
                  className="delete is-small"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleScriptDelete(script.id)
                  }}
                  title="Delete script"
                />
              </div>
            ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
