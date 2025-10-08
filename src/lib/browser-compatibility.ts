// Browser compatibility detection and fallback utilities

export interface BrowserCapabilities {
  speechRecognition: boolean
  webkitSpeechRecognition: boolean
  isChrome: boolean
  isFirefox: boolean
  isSafari: boolean
  isEdge: boolean
  isMobile: boolean
  hasMicrophone: boolean
}

export const detectBrowserCapabilities = (): BrowserCapabilities => {
  const userAgent = navigator.userAgent.toLowerCase()
  
  return {
    speechRecognition: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
    webkitSpeechRecognition: 'webkitSpeechRecognition' in window,
    isChrome: /chrome/.test(userAgent) && !/edg/.test(userAgent),
    isFirefox: /firefox/.test(userAgent),
    isSafari: /safari/.test(userAgent) && !/chrome/.test(userAgent),
    isEdge: /edg/.test(userAgent),
    isMobile: /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent),
    hasMicrophone: navigator.mediaDevices && 'getUserMedia' in navigator.mediaDevices
  }
}

export const getBrowserRecommendation = (capabilities: BrowserCapabilities): string => {
  if (capabilities.speechRecognition) {
    return "Your browser supports speech recognition. You can use the voice-activated teleprompter."
  }
  
  if (capabilities.isChrome) {
    return "Chrome browser detected. Speech recognition should work. If it doesn't, please check your microphone permissions."
  }
  
  if (capabilities.isFirefox) {
    return "Firefox detected. Speech recognition is not fully supported. Please use Chrome for the best experience."
  }
  
  if (capabilities.isSafari) {
    return "Safari detected. Speech recognition support is limited. Please use Chrome for the best experience."
  }
  
  if (capabilities.isEdge) {
    return "Edge detected. Speech recognition support varies. Please use Chrome for the best experience."
  }
  
  return "Your browser may not support speech recognition. Please use Chrome for the best experience."
}

export const checkMicrophonePermission = async (): Promise<boolean> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach(track => track.stop()) // Stop the stream immediately
    return true
  } catch (error) {
    console.error("Microphone permission denied:", error)
    return false
  }
}

export const requestMicrophonePermission = async (): Promise<boolean> => {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true })
    return true
  } catch (error) {
    console.error("Failed to get microphone permission:", error)
    return false
  }
}

// Fallback input methods when speech recognition is not available
export interface FallbackInputMethods {
  keyboardNavigation: boolean
  touchGestures: boolean
  manualScrolling: boolean
}

export const getFallbackInputMethods = (capabilities: BrowserCapabilities): FallbackInputMethods => {
  return {
    keyboardNavigation: true, // Always available
    touchGestures: capabilities.isMobile,
    manualScrolling: true // Always available
  }
}

