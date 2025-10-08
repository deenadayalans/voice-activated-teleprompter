import type { AppThunk } from "./store"
import { start, stop } from "../features/navbar/navbarSlice"
import {
  setFinalTranscriptIndex,
  setInterimTranscriptIndex,
} from "../features/content/contentSlice"
import SpeechRecognizer from "../lib/speech-recognizer"
import { computeSpeechRecognitionTokenIndex } from "../lib/speech-matcher"

let speechRecognizer: SpeechRecognizer | null = null

export const startTeleprompter = (): AppThunk => (dispatch, getState) => {
  try {
    dispatch(start())

    const { language } = getState().navbar
    speechRecognizer = new SpeechRecognizer(language)

    // Add error handling for critical errors only
    speechRecognizer.onerror((error: string, errorCode: string) => {
      if (errorCode === 'audio-capture' || errorCode === 'not-allowed' || errorCode === 'network') {
        console.error("Speech recognition error:", error, errorCode)
        // Note: setError is not available in navbarSlice, so we'll just log the error
      }
      // Other errors (no-speech, aborted) are handled silently by the recognizer
    })

    speechRecognizer.onresult(
      (final_transcript: string, interim_transcript: string) => {
        const {
          textElements,
          finalTranscriptIndex: lastFinalTranscriptIndex,
        } = getState().content

        if (final_transcript !== "") {
          const finalTranscriptIndex = computeSpeechRecognitionTokenIndex(
            final_transcript,
            textElements,
            lastFinalTranscriptIndex,
          )
          
          // Only advance if we've made meaningful progress
          if (finalTranscriptIndex > lastFinalTranscriptIndex) {
            dispatch(setFinalTranscriptIndex(finalTranscriptIndex))
          }
        }

        if (interim_transcript !== "") {
          const interimTranscriptIndex = computeSpeechRecognitionTokenIndex(
            interim_transcript,
            textElements,
            lastFinalTranscriptIndex,
          )
          dispatch(setInterimTranscriptIndex(interimTranscriptIndex))
        }
      },
    )

    speechRecognizer.start()
  } catch (error) {
    console.error("Failed to start teleprompter:", error)
    dispatch(stop())
  }
}

export const stopTeleprompter = (): AppThunk => dispatch => {
  if (speechRecognizer !== null) {
    speechRecognizer.destroy()
    speechRecognizer = null
  }

  dispatch(stop())
}

export const changeLanguage = (language: string): AppThunk => () => {
  if (speechRecognizer !== null) {
    speechRecognizer.setLanguage(language)
  }
}
