import { useState, useEffect } from 'react'

export const WhisperConfig = () => {
  const [isConfigured, setIsConfigured] = useState(false)
  const [hasEnvKey, setHasEnvKey] = useState(false)

  useEffect(() => {
    // Check for environment variable first
    const envKey = import.meta.env.VITE_OPENAI_API_KEY
    if (envKey && envKey !== 'your_api_key_here') {
      setHasEnvKey(true)
      setIsConfigured(true)
      return
    }
    
    // Fallback to localStorage
    const savedKey = localStorage.getItem('whisper-api-key')
    if (savedKey) {
      setIsConfigured(true)
    }
  }, [])

  // Only show status if configured
  if (!isConfigured) {
    return null
  }

  return (
    <div className="navbar-item">
      <div className="field">
        <div className="control">
          <div className="tags has-addons">
            <span className="tag is-success is-small">
              <i className="fas fa-check"></i>
            </span>
            <span className="tag is-info is-small">
              Whisper API Active {hasEnvKey ? '(ENV)' : '(Manual)'}
            </span>
          </div>
        </div>
        <p className="help is-small has-text-grey">
          Enhanced accuracy enabled {hasEnvKey ? '(from .env file)' : '(from manual setup)'}
        </p>
      </div>
    </div>
  )
}