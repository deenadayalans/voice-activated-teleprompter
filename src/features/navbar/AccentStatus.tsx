import React, { useState, useEffect } from 'react'
import { useAppSelector } from '../../app/hooks'
import { selectStatus } from './navbarSlice'

export const AccentStatus = () => {
  const [detectedAccent, setDetectedAccent] = useState('Detecting...')
  const [isVisible, setIsVisible] = useState(false)
  const status = useAppSelector(selectStatus)

  useEffect(() => {
    if (status === 'listening') {
      setIsVisible(true)
      
      // Simulate accent detection updates
      const interval = setInterval(() => {
        // In a real implementation, this would get the actual detected accent
        // from the speech recognizer
        const accents = [
          'Indian English (Hindi)',
          'American English',
          'British English',
          'Australian English',
          'Canadian English'
        ]
        
        const randomAccent = accents[Math.floor(Math.random() * accents.length)]
        setDetectedAccent(randomAccent)
      }, 3000)

      return () => clearInterval(interval)
    } else {
      setIsVisible(false)
    }
  }, [status])

  if (!isVisible) return null

  return (
    <div className="navbar-item">
      <div className="field">
        <div className="control">
          <div className="tags has-addons">
            <span className="tag is-dark is-small">
              <i className="fas fa-microphone-alt"></i>
            </span>
            <span className="tag is-info is-small">
              {detectedAccent}
            </span>
          </div>
        </div>
        <p className="help is-small has-text-grey">
          Auto-detected accent
        </p>
      </div>
    </div>
  )
}
