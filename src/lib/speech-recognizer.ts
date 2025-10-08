type SubscriberFunction = (
  final_transcript: string,
  interim_transcript: string,
) => void

type ErrorSubscriberFunction = (error: string, errorCode: string) => void

export default class SpeechRecognizer {
  private recognizer: SpeechRecognition
  private subscribers: SubscriberFunction[] = []
  private errorSubscribers: ErrorSubscriberFunction[] = []
  private shouldListen: Boolean = false
  private restartTimeout: NodeJS.Timeout | null = null
  private maxRetries = 3
  private retryCount = 0

  constructor(language: string = "en-US") {
    this.recognizer = new webkitSpeechRecognition()

    this.recognizer.lang = language
    this.recognizer.continuous = true
    this.recognizer.interimResults = true
    this.recognizer.maxAlternatives = 3 // Get multiple recognition alternatives

    this.recognizer.onresult = e => {
      let final_transcript = ""
      let interim_transcript = ""

      for (let i = e.resultIndex; i < e.results.length; ++i) {
        const result = e.results[i]
        const transcript = result[0].transcript

        if (result.isFinal) {
          final_transcript += transcript
        } else {
          interim_transcript += transcript
        }
      }

      // Reset retry count on successful recognition
      this.retryCount = 0

      for (let subscriber of this.subscribers) {
        subscriber(final_transcript, interim_transcript)
      }
    }

    this.recognizer.onend = () => {
      if (this.shouldListen) {
        // Add a small delay before restarting to prevent rapid restarts
        this.restartTimeout = setTimeout(() => {
          try {
            this.recognizer.start()
          } catch (error) {
            this.handleError("Restart failed", "restart-failed")
          }
        }, 100)
      }
    }

    this.recognizer.onerror = (event) => {
      this.handleError(event.error, event.type)
    }

    this.recognizer.onnomatch = () => {
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
            this.recognizer.start()
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

  start(): void {
    this.shouldListen = true
    this.retryCount = 0
    try {
      this.recognizer.start()
    } catch (error) {
      this.handleError("Start failed", "start-failed")
    }
  }

  stop(): void {
    this.shouldListen = false
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout)
      this.restartTimeout = null
    }
    this.recognizer.stop()
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
    this.recognizer.lang = language
    if (wasListening) {
      this.start()
    }
  }

  destroy(): void {
    this.stop()
    this.subscribers = []
    this.errorSubscribers = []
  }
}
