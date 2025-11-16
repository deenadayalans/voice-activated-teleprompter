import { type TextElement, tokenize } from "./word-tokenizer"
import { levenshteinDistance } from "./levenshtein"

// Configurable speech matching algorithms
export interface MatchingConfig {
  algorithm: 'conservative' | 'fourWord' | 'balanced' | 'aggressive' | 'custom'
  minWords: number
  maxWords: number
  allowSingleWords: boolean
  smallWordsRequireMore: boolean
  similarityThreshold: number
  searchRangeMultiplier: number
  strictNextWord: boolean
  normalizeDiacritics: boolean
  ignorePunctuation: boolean
}

// Predefined configurations
export const MATCHING_CONFIGS: Record<string, MatchingConfig> = {
  conservative: {
    algorithm: 'conservative',
    minWords: 3,
    maxWords: 4,
    allowSingleWords: false,
    smallWordsRequireMore: true,
    similarityThreshold: 0.7,
    searchRangeMultiplier: 4,
    strictNextWord: false,
    normalizeDiacritics: true,
    ignorePunctuation: true,
  },
  fourWord: {
    algorithm: 'fourWord',
    minWords: 4,
    maxWords: 4,
    allowSingleWords: false,
    smallWordsRequireMore: true,
    similarityThreshold: 0.8,
    searchRangeMultiplier: 5,
    strictNextWord: false,
    normalizeDiacritics: true,
    ignorePunctuation: true,
  },
  balanced: {
    algorithm: 'balanced',
    minWords: 2,
    maxWords: 3,
    allowSingleWords: true,
    smallWordsRequireMore: true,
    similarityThreshold: 0.6,
    searchRangeMultiplier: 3,
    strictNextWord: false,
    normalizeDiacritics: true,
    ignorePunctuation: true,
  },
  aggressive: {
    algorithm: 'aggressive',
    minWords: 1,
    maxWords: 2,
    allowSingleWords: true,
    smallWordsRequireMore: false,
    similarityThreshold: 0.5,
    searchRangeMultiplier: 2,
    strictNextWord: false,
    normalizeDiacritics: true,
    ignorePunctuation: true,
  },
  custom: {
    algorithm: 'custom',
    minWords: 2,
    maxWords: 4,
    allowSingleWords: true,
    smallWordsRequireMore: true,
    similarityThreshold: 0.6,
    searchRangeMultiplier: 3,
    strictNextWord: false,
    normalizeDiacritics: true,
    ignorePunctuation: true,
  }
}

// Get current configuration from localStorage or default
export const getMatchingConfig = (): MatchingConfig => {
  const saved = localStorage.getItem('teleprompter-matching-config')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      // Merge over balanced to ensure new fields exist
      return { ...MATCHING_CONFIGS.balanced, ...parsed }
    } catch {
      return MATCHING_CONFIGS.balanced
    }
  }
  return MATCHING_CONFIGS.balanced
}

// Save configuration to localStorage
export const saveMatchingConfig = (config: MatchingConfig): void => {
  localStorage.setItem('teleprompter-matching-config', JSON.stringify(config))
}

// Normalize string for robust matching across accents/punctuation
const normalizeForMatching = (s: string, config: MatchingConfig): string => {
  let out = s.toLowerCase()
  if (config.normalizeDiacritics) {
    out = out.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  }
  if (config.ignorePunctuation) {
    // Keep letters, numbers, whitespace, apostrophes and hyphens
    out = out.replace(/[^\p{L}\p{N}\s'\-]/gu, '')
  }
  // Collapse multiple spaces
  out = out.replace(/\s+/g, ' ').trim()
  return out
}
export const computeSpeechRecognitionTokenIndex = (
  recognized: string,
  reference: TextElement[],
  lastRecognizedTokenIndex: number,
  isInterim: boolean = false,
) => {
  const config = getMatchingConfig()
  // Tokenize the recognized input:
  const recognized_tokens = tokenize(recognized).filter(
    element => element.type === "TOKEN",
  )

  if (recognized_tokens.length === 0) {
    return lastRecognizedTokenIndex
  }

  // Determine the immediate next reference token
  const nextRefIndex = Math.max(0, lastRecognizedTokenIndex + 1)
  const nextRefToken = reference.find(t => t.index === nextRefIndex && t.type === "TOKEN")

  // Strict mode: only move forward when the immediate next token matches
  if (config.strictNextWord) {
    if (recognized_tokens.length >= 1 && nextRefToken) {
      const spoken = normalizeForMatching(recognized_tokens[recognized_tokens.length - 1].value, config)
      const ref = normalizeForMatching(nextRefToken.value, config)
      if (ref === spoken) {
        return nextRefIndex
      }
      if (isInterim && (ref.startsWith(spoken) || spoken.startsWith(ref))) {
        // For interim, highlight the next word when partially spoken
        return nextRefIndex
      }
    }
    return lastRecognizedTokenIndex
  }

  // Handle single words based on configuration
  if (recognized_tokens.length === 1) {
    if (!config.allowSingleWords) {
      return lastRecognizedTokenIndex
    }
    
    const singleWord = recognized_tokens[0].value.toLowerCase()
    const commonStartWords = ['hello', 'hi', 'good', 'welcome', 'thank', 'yes', 'no']
    const isAtStart = lastRecognizedTokenIndex <= 2
    
    // Only allow single word matches for very common words at the start
    if (!commonStartWords.includes(singleWord) || !isAtStart) {
      return lastRecognizedTokenIndex
    }
  }

  // Handle small words based on configuration
  if (recognized_tokens.length === 2 && config.smallWordsRequireMore) {
    const words = recognized_tokens.map(token => token.value.toLowerCase())
    const smallWords = ['to', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'for', 'with', 'by', 'of', 'a', 'an']
    
    // If either word is a small word, require more words
    if (words.some(word => smallWords.includes(word))) {
      return lastRecognizedTokenIndex
    }
  }

  // Convert the tokens back to a string:
  const comparison_string = normalizeForMatching(
    recognized_tokens
      .reduce(
        (accumulator, currentToken) => accumulator + " " + currentToken.value,
        "",
      ),
    config
  )

  if (lastRecognizedTokenIndex < 0) {
    lastRecognizedTokenIndex = 0
  }

  // Configurable search range
  const searchRange = Math.min(
    recognized_tokens.length * config.searchRangeMultiplier + 15,
    reference.length - lastRecognizedTokenIndex
  )
  
  const reference_tokens = reference
    .slice(
      lastRecognizedTokenIndex,
      lastRecognizedTokenIndex + searchRange,
    )
    .filter(element => element.type === "TOKEN")

  if (reference_tokens.length === 0) {
    return lastRecognizedTokenIndex
  }

  // Multi-strategy matching for better accuracy - prioritize 2-3 word phrases
  // Build tail phrases from recognized tokens (use the last up to maxWords)
  const maxPhrase = Math.min(config.maxWords, recognized_tokens.length)
  const minPhrase = Math.max(2, config.minWords)
  
  for (let k = maxPhrase; k >= minPhrase; k--) {
    const tailTokens = recognized_tokens.slice(-k)
    const tailPhrase = tailTokens.map(t => t.value).join(' ').toLowerCase()
    
    // Strategy 1: Exact phrase match (k words)
    for (let i = 0; i <= reference_tokens.length - k; i++) {
      const refSlice = reference_tokens.slice(i, i + k)
      const refPhrase = normalizeForMatching(refSlice.map(t => t.value).join(' '), config)
      if (refPhrase === tailPhrase) {
        // Advance to the end of the matched phrase (not the start)
        return refSlice[k - 1].index
      }
    }
    
    // Strategy 2: Contains (lenient) phrase match
    for (let i = 0; i <= reference_tokens.length - k; i++) {
      const refSlice = reference_tokens.slice(i, i + k)
      const refPhrase = normalizeForMatching(refSlice.map(t => t.value).join(' '), config)
      if (refPhrase.includes(tailPhrase) || tailPhrase.includes(refPhrase)) {
        return refSlice[k - 1].index
      }
    }
  }

  // Strategy 3: Levenshtein distance with improved scoring
  const distances: number[] = []
  const scores: { distance: number; index: number; similarity: number }[] = []

  for (let i = 0; i <= reference_tokens.length; i++) {
    const reference_substring = normalizeForMatching(
      reference_tokens
        .slice(0, i)
        .reduce(
          (accumulator, currentToken) => accumulator + " " + currentToken.value,
          "",
        ),
      config
    )
    
    if (reference_substring.length > 0) {
      const distance = levenshteinDistance(comparison_string, reference_substring)
      const similarity = 1 - (distance / Math.max(comparison_string.length, reference_substring.length))
      
      distances.push(distance)
      scores.push({
        distance,
        index: i,
        similarity
      })
    }
  }

  if (distances.length > 0) {
    // Find the best match based on configurable similarity threshold
    const minDistance = Math.min(...distances)
    const bestMatches = scores.filter(score => 
      score.distance === minDistance && 
      score.similarity >= config.similarityThreshold
    )
    
    if (bestMatches.length > 0) {
      const bestMatch = bestMatches[0]
      const token = reference_tokens[Math.max(0, bestMatch.index - 1)]
      const nextIndex = token ? token.index : lastRecognizedTokenIndex
      if (nextIndex > lastRecognizedTokenIndex) return nextIndex
    }
  }

  // Strategy 4: 2-3 word phrase partial matching for better recognition
  const recognizedWords = comparison_string.split(/\s+/)
  
  // Only proceed if we have at least 2 words
  if (recognizedWords.length >= 2) {
    for (let i = 0; i <= reference_tokens.length - recognizedWords.length; i++) {
      const referenceWords = normalizeForMatching(
        reference_tokens
          .slice(i, i + recognizedWords.length)
          .map(token => token.value)
          .join(' '),
        config
      ).split(/\s+/)
      
      let matchCount = 0
      for (let j = 0; j < Math.min(recognizedWords.length, referenceWords.length); j++) {
        if (referenceWords[j].includes(recognizedWords[j]) || 
            recognizedWords[j].includes(referenceWords[j])) {
          matchCount++
        }
      }
      
      // For 2+ word phrases, require at least 2 words to match
      if (matchCount >= 2) {
        const endTok = reference_tokens[i + Math.min(recognizedWords.length, referenceWords.length) - 1]
        return endTok.index
      }
    }
  }

  // Strategy 5: strict next-word progression (single word) — only if it matches the immediate next token
  if (recognized_tokens.length >= 1) {
    const spoken = normalizeForMatching(recognized_tokens[recognized_tokens.length - 1].value, config)
    if (nextRefToken && normalizeForMatching(nextRefToken.value, config) === spoken) {
      return nextRefIndex
    }
    // For interim, highlight partial of next word
    if (isInterim && nextRefToken) {
      const ref = normalizeForMatching(nextRefToken.value, config)
      if (ref.startsWith(spoken) || spoken.startsWith(ref)) {
        return nextRefIndex
      }
    }
  }

  return lastRecognizedTokenIndex
}
