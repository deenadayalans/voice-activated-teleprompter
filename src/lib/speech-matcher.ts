import { type TextElement, tokenize } from "./word-tokenizer"
import { levenshteinDistance } from "./levenshtein"

// Enhanced speech matching algorithm with 2-3 word phrase matching for error-proof recognition
// This prevents false matches from single words that repeat throughout the script
// For small words like "to", "the", "and", requires 3-word matching for better accuracy
export const computeSpeechRecognitionTokenIndex = (
  recognized: string,
  reference: TextElement[],
  lastRecognizedTokenIndex: number,
) => {
  // Tokenize the recognized input:
  const recognized_tokens = tokenize(recognized).filter(
    element => element.type === "TOKEN",
  )

  if (recognized_tokens.length === 0) {
    return lastRecognizedTokenIndex
  }

  // For single words, be more conservative and only match if it's a very common word
  // or if we're at the beginning of the script
  if (recognized_tokens.length === 1) {
    const singleWord = recognized_tokens[0].value.toLowerCase()
    
    // Only allow single word matches for very common words at the start
    const commonStartWords = ['hello', 'hi', 'good', 'welcome', 'thank', 'yes', 'no']
    const isAtStart = lastRecognizedTokenIndex <= 2
    
    if (!commonStartWords.includes(singleWord) || !isAtStart) {
      return lastRecognizedTokenIndex
    }
  }

  // For 2-word phrases with small words, require 3-word matching for better accuracy
  if (recognized_tokens.length === 2) {
    const words = recognized_tokens.map(token => token.value.toLowerCase())
    const smallWords = ['to', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'for', 'with', 'by', 'of', 'a', 'an']
    
    // If either word is a small word, require 3-word matching
    if (words.some(word => smallWords.includes(word))) {
      return lastRecognizedTokenIndex
    }
  }

  // Convert the tokens back to a string:
  const comparison_string = recognized_tokens
    .reduce(
      (accumulator, currentToken) => accumulator + " " + currentToken.value,
      "",
    )
    .replace(/\s+/, " ")
    .trim()

  if (lastRecognizedTokenIndex < 0) {
    lastRecognizedTokenIndex = 0
  }

  // Enhanced search range - look ahead more intelligently
  const searchRange = Math.min(
    recognized_tokens.length * 3 + 15, // More generous range
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

  // Strategy 1: Exact 2-3 word phrase matching (highest priority)
  // Use the full recognized phrase length (2-3 words) for exact matching
  const phraseLength = recognized_tokens.length
  
  for (let i = 0; i <= reference_tokens.length - phraseLength; i++) {
    const reference_substring = reference_tokens
      .slice(i, i + phraseLength)
      .reduce(
        (accumulator, currentToken) => accumulator + " " + currentToken.value,
        "",
      )
      .replace(/\s+/, " ")
      .trim()
    
    if (reference_substring.toLowerCase() === comparison_string.toLowerCase()) {
      return reference_tokens[i].index
    }
  }

  // Strategy 2: 2-3 word phrase contains matching (high priority)
  for (let i = 0; i <= reference_tokens.length - phraseLength; i++) {
    const reference_substring = reference_tokens
      .slice(i, i + phraseLength)
      .reduce(
        (accumulator, currentToken) => accumulator + " " + currentToken.value,
        "",
      )
      .replace(/\s+/, " ")
      .trim()
    
    if (reference_substring.toLowerCase().includes(comparison_string.toLowerCase()) ||
        comparison_string.toLowerCase().includes(reference_substring.toLowerCase())) {
      return reference_tokens[i].index
    }
  }

  // Strategy 3: Levenshtein distance with improved scoring
  const distances: number[] = []
  const scores: { distance: number; index: number; similarity: number }[] = []

  for (let i = 0; i <= reference_tokens.length; i++) {
    const reference_substring = reference_tokens
      .slice(0, i)
      .reduce(
        (accumulator, currentToken) => accumulator + " " + currentToken.value,
        "",
      )
      .replace(/\s+/, " ")
      .trim()
    
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
    // Find the best match based on similarity threshold
    const minDistance = Math.min(...distances)
    const bestMatches = scores.filter(score => 
      score.distance === minDistance && 
      score.similarity >= 0.6 // 60% similarity threshold
    )
    
    if (bestMatches.length > 0) {
      const bestMatch = bestMatches[0]
      const token = reference_tokens[bestMatch.index - 1]
      if (token && token.index > lastRecognizedTokenIndex) {
        return token.index
      }
    }
  }

  // Strategy 4: 2-3 word phrase partial matching for better recognition
  const recognizedWords = comparison_string.toLowerCase().split(/\s+/)
  
  // Only proceed if we have at least 2 words
  if (recognizedWords.length >= 2) {
    for (let i = 0; i <= reference_tokens.length - recognizedWords.length; i++) {
      const referenceWords = reference_tokens
        .slice(i, i + recognizedWords.length)
        .map(token => token.value.toLowerCase())
      
      let matchCount = 0
      for (let j = 0; j < Math.min(recognizedWords.length, referenceWords.length); j++) {
        if (referenceWords[j].includes(recognizedWords[j]) || 
            recognizedWords[j].includes(referenceWords[j])) {
          matchCount++
        }
      }
      
      // For 2+ word phrases, require at least 2 words to match
      if (matchCount >= 2) {
        return reference_tokens[i].index
      }
    }
  }

  return lastRecognizedTokenIndex
}
