import { WhisperAPIRecognizer } from './whisper-api-recognizer'

type SubscriberFunction = (
  final_transcript: string,
  interim_transcript: string,
) => void

type ErrorSubscriberFunction = (error: string, errorCode: string) => void

export default class SpeechRecognizer {
  private recognizer: SpeechRecognition | null = null
  private whisperRecognizer: WhisperAPIRecognizer | null = null
  private subscribers: SubscriberFunction[] = []
  private errorSubscribers: ErrorSubscriberFunction[] = []
  private shouldListen: Boolean = false
  private restartTimeout: NodeJS.Timeout | null = null
  private maxRetries = 3
  private retryCount = 0
  private autoDetectAccent = true
  private useWhisperAPI = false

  constructor(language: string = "en-US", _accentKey?: string) {
    // Check for Whisper API key from environment variable or localStorage
    const whisperApiKey = import.meta.env.VITE_OPENAI_API_KEY || localStorage.getItem('whisper-api-key')
    console.log('SpeechRecognizer constructor - whisperApiKey found:', !!whisperApiKey)
    console.log('SpeechRecognizer constructor - language:', language)
    
    if (false && whisperApiKey && whisperApiKey !== 'your_api_key_here') {
      console.log('Using Whisper API for speech recognition')
      this.useWhisperAPI = true
      this.whisperRecognizer = new WhisperAPIRecognizer(whisperApiKey)
      this.setupWhisperSubscribers()
      return
    }
    
    console.log('Using Web Speech API for speech recognition')
    
    // Check if Web Speech API is available
    if (!('webkitSpeechRecognition' in window)) {
      console.error('Web Speech API not supported in this browser')
      this.handleError('Speech recognition not supported', 'not-supported')
      return
    }

    // Fallback to Web Speech API
    this.recognizer = new webkitSpeechRecognition()

    // Use automatic accent detection by default
    if (this.autoDetectAccent) {
      this.recognizer!.lang = language
      this.recognizer!.maxAlternatives = 5 // More alternatives for better detection
    } else {
      // Use default language settings
      this.recognizer!.lang = language
      this.recognizer!.maxAlternatives = 3
    }

    this.recognizer!.continuous = true
    this.recognizer!.interimResults = true
    
    console.log('Web Speech API recognizer configured:', {
      lang: this.recognizer!.lang,
      continuous: this.recognizer!.continuous,
      interimResults: this.recognizer!.interimResults,
      maxAlternatives: this.recognizer!.maxAlternatives
    })

    this.recognizer!.onresult = e => {
      console.log('Web Speech API result received:', e.results.length, 'results')
      let final_transcript = ""
      let interim_transcript = ""

      for (let i = e.resultIndex; i < e.results.length; ++i) {
        const result = e.results[i]
        const transcript = result[0].transcript

        if (result.isFinal) {
          final_transcript += transcript
          console.log('Final transcript:', transcript)
        } else {
          interim_transcript += transcript
          console.log('Interim transcript:', transcript)
        }
      }

      // Automatic accent detection
      if (this.autoDetectAccent && (final_transcript || interim_transcript)) {
        // Auto accent detection removed - using Whisper API or default settings
        this.updateRecognitionSettings('en-US')
      }

      // Reset retry count on successful recognition
      this.retryCount = 0

      for (let subscriber of this.subscribers) {
        subscriber(final_transcript, interim_transcript)
      }
    }

    this.recognizer!.onend = () => {
      if (this.shouldListen) {
        // Add a small delay before restarting to prevent rapid restarts
        this.restartTimeout = setTimeout(() => {
          try {
            this.recognizer!.start()
          } catch (error) {
            this.handleError("Restart failed", "restart-failed")
          }
        }, 100)
      }
    }

    this.recognizer!.onerror = (event) => {
      console.error('Web Speech API error:', event.error, event.type)
      this.handleError(event.error, event.type)
    }

    this.recognizer!.onnomatch = () => {
      // Silent handling - this is normal when no speech is detected
    }
  }

  private handleError(error: string, errorCode: string): void {
    // Notify error subscribers
    for (let subscriber of this.errorSubscribers) {
      subscriber(error, errorCode)
    }

    // Handle specific error types
    if (errorCode === 'aborted' || errorCode === 'no-speech') {
      // These are common and not critical - just restart silently
      if (this.shouldListen && this.retryCount < this.maxRetries) {
        this.retryCount++
        setTimeout(() => {
          try {
            if (this.recognizer) {
              this.recognizer.start()
            }
          } catch (restartError) {
            // Silent restart failed - continue silently
          }
        }, 1000)
      }
    } else if (errorCode === 'audio-capture' || errorCode === 'not-allowed') {
      // These are critical errors - stop trying
      this.shouldListen = false
    }
  }

  private setupWhisperSubscribers(): void {
    if (!this.whisperRecognizer) return

    this.whisperRecognizer.onresult((final: string, interim: string) => {
      this.subscribers.forEach(subscriber => {
        subscriber(final, interim)
      })
    })

    this.whisperRecognizer.onerror((error: string, errorCode: string) => {
      this.handleError(error, errorCode)
    })
  }

  async start(): Promise<void> {
    console.log('SpeechRecognizer start() called')
    console.log('useWhisperAPI:', this.useWhisperAPI)
    console.log('whisperRecognizer exists:', !!this.whisperRecognizer)
    console.log('recognizer exists:', !!this.recognizer)
    
    this.shouldListen = true
    this.retryCount = 0
    
    if (this.useWhisperAPI && this.whisperRecognizer) {
      try {
        console.log('Starting Whisper API recognizer...')
        await this.whisperRecognizer.start()
        console.log('Whisper API recognizer started successfully')
      } catch (error) {
        console.error('Whisper API start failed:', error)
        this.handleError("Whisper start failed", "whisper-start-failed")
      }
    } else {
      try {
        console.log('Starting Web Speech API recognizer...')
        this.recognizer!.start()
        console.log('Web Speech API recognizer started successfully')
        
        // Add a timeout to check if recognition is working
        setTimeout(() => {
          console.log('Speech recognition status check - should be listening:', this.shouldListen)
        }, 2000)
      } catch (error) {
        console.error('Web Speech API start failed:', error)
        this.handleError("Start failed", "start-failed")
      }
    }
  }

  stop(): void {
    this.shouldListen = false
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout)
      this.restartTimeout = null
    }
    
    if (this.useWhisperAPI && this.whisperRecognizer) {
      this.whisperRecognizer.stop()
    } else if (this.recognizer) {
      this.recognizer.stop()
    }
  }

  onresult(subscriber: SubscriberFunction): void {
    this.subscribers.push(subscriber)
  }

  onerror(subscriber: ErrorSubscriberFunction): void {
    this.errorSubscribers.push(subscriber)
  }

  setLanguage(language: string): void {
    const wasListening = this.shouldListen
    if (wasListening) {
      this.stop()
    }
    if (this.recognizer) {
      this.recognizer.lang = language
    }
    if (wasListening) {
      this.start()
    }
  }

  private updateRecognitionSettings(detectedAccent: string): void {
    // Accent configuration removed - using default settings
    console.log('Accent detection:', detectedAccent, '- using default Web Speech API settings')
  }

  getDetectedAccent(): string {
    if (this.useWhisperAPI && this.whisperRecognizer) {
      return this.whisperRecognizer.getDetectedAccent()
    }
    return 'en-US' // Default accent
  }

  resetAccentDetection(): void {
    if (this.useWhisperAPI && this.whisperRecognizer) {
      // Whisper handles accent detection internally
      return
    }
    // Accent detection reset - handled by Whisper API or default settings
  }

  isUsingWhisperAPI(): boolean {
    return this.useWhisperAPI
  }

  destroy(): void {
    this.stop()
    if (this.whisperRecognizer) {
      this.whisperRecognizer.destroy()
    }
    this.subscribers = []
    this.errorSubscribers = []
  }
}
