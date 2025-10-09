// Auto accent detection removed - Whisper API handles accents internally

type SubscriberFunction = (
  final_transcript: string,
  interim_transcript: string,
) => void

type ErrorSubscriberFunction = (error: string, errorCode: string) => void

export class WhisperAPIRecognizer {
  private apiKey: string
  private baseUrl: string = 'https://api.openai.com/v1/audio/transcriptions'
  private subscribers: SubscriberFunction[] = []
  private errorSubscribers: ErrorSubscriberFunction[] = []
  private isListening = false // Track listening state (used for cleanup)
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private stream: MediaStream | null = null
  private processingInterval: NodeJS.Timeout | null = null
  private detectedAccent = 'en-US-general'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async start(): Promise<void> {
    console.log('WhisperAPIRecognizer start() called')
    try {
      console.log('Requesting microphone access...')
      // Get microphone access with basic settings for better compatibility
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      console.log('Microphone access granted')

      // Set up MediaRecorder for audio capture with fallback
      let mimeType = 'audio/webm'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4'
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/wav'
        }
      }
      
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: mimeType
      })

      this.audioChunks = []
      this.isListening = true

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      // Start recording
      this.mediaRecorder.start(2000) // Process every 2 seconds for better accuracy

      // Start processing audio chunks
      this.startProcessing()

    } catch (error) {
      console.error('Failed to start Whisper recognition:', error)
      this.handleError('Failed to start', 'start-failed')
      throw error
    }
  }

  stop(): void {
    this.isListening = false
    
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop()
    }

    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }
  }

  private startProcessing(): void {
    this.processingInterval = setInterval(async () => {
      if (this.audioChunks.length > 0) {
        await this.processAudio()
      }
    }, 2000) // Process every 2 seconds
  }

  private async processAudio(): Promise<void> {
    if (this.audioChunks.length === 0) return

    try {
      // Create audio blob
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' })
      this.audioChunks = []

      // Check if audio blob is large enough (at least 1KB)
      if (audioBlob.size < 1024) {
        console.log('Audio chunk too small, skipping:', audioBlob.size, 'bytes')
        return
      }
      
      console.log('Processing audio chunk:', audioBlob.size, 'bytes, type:', audioBlob.type)

      // Convert to WAV format for Whisper API
      const wavBlob = await this.convertToWav(audioBlob)
      
      // Send to Whisper API
      const transcript = await this.transcribeWithWhisper(wavBlob)
      
      if (transcript) {
        // Automatic accent detection
        // Whisper API handles accent detection internally
        this.detectedAccent = 'whisper-api'

        // Notify subscribers
        this.subscribers.forEach(subscriber => {
          subscriber(transcript, '') // Whisper provides final results
        })
      }

    } catch (error) {
      console.error('Failed to process audio:', error)
      this.handleError('Processing failed', 'processing-failed')
    }
  }

  private async convertToWav(audioBlob: Blob): Promise<Blob> {
    try {
      // For now, let's try sending the original blob with a different filename
      // Whisper API should handle various formats
      return audioBlob
    } catch (error) {
      console.error('Audio conversion failed:', error)
      return audioBlob
    }
  }

  private async transcribeWithWhisper(audioBlob: Blob): Promise<string | null> {
    try {
      // Convert audio to WAV format for better Whisper API compatibility
      const wavBlob = await this.convertToWav(audioBlob)
      
      const formData = new FormData()
      formData.append('file', wavBlob, 'audio.webm')
      formData.append('model', 'whisper-1')
      formData.append('language', 'en') // English only for now
      formData.append('response_format', 'json')
      formData.append('temperature', '0.0') // Deterministic results

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Whisper API error details:', errorText)
        throw new Error(`Whisper API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const result = await response.json()
      return result.text || null

    } catch (error) {
      console.error('Whisper API error:', error)
      this.handleError('API error', 'api-error')
      return null
    }
  }

  private handleError(error: string, errorCode: string): void {
    this.errorSubscribers.forEach(subscriber => {
      subscriber(error, errorCode)
    })
  }

  onresult(callback: SubscriberFunction): void {
    this.subscribers.push(callback)
  }

  onerror(callback: ErrorSubscriberFunction): void {
    this.errorSubscribers.push(callback)
  }

  setLanguage(_language: string): void {
    // Whisper API language setting
    // This would be used in the API call
  }

  getDetectedAccent(): string {
    return this.detectedAccent
  }

  destroy(): void {
    this.stop()
    this.subscribers = []
    this.errorSubscribers = []
  }
}
