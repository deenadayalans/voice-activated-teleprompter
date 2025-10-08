import { useEffect, useLayoutEffect, useRef } from "react"
import { escape } from "html-escaper"
import { useAppDispatch, useAppSelector } from "../../app/hooks"
import { setContent, setFinalTranscriptIndex, setInterimTranscriptIndex } from "./contentSlice"

import {
  selectStatus,
  selectHorizontallyFlipped,
  selectVerticallyFlipped,
  selectMargin,
  selectOpacity,
  selectScrollOffset,
} from "../navbar/navbarSlice"

import {
  selectRawText,
  selectTextElements,
  selectFinalTranscriptIndex,
  selectInterimTranscriptIndex,
} from "./contentSlice"

export const Content = () => {
  const dispatch = useAppDispatch()

  const status = useAppSelector(selectStatus)
  const margin = useAppSelector(selectMargin)
  const opacity = useAppSelector(selectOpacity)
  const scrollOffset = useAppSelector(selectScrollOffset)
  const horizontallyFlipped = useAppSelector(selectHorizontallyFlipped)
  const verticallyFlipped = useAppSelector(selectVerticallyFlipped)
  const rawText = useAppSelector(selectRawText)
  const textElements = useAppSelector(selectTextElements)
  const finalTranscriptIndex = useAppSelector(selectFinalTranscriptIndex)
  const interimTranscriptIndex = useAppSelector(selectInterimTranscriptIndex)

    const style = {
      fontSize: `100px`, // Large font size to fit exactly 6 lines
      padding: `0 ${margin}px`,
      marginLeft: `80px`, // Move text to the right to avoid marker overlap
    }

  const containerRef = useRef<null | HTMLDivElement>(null)
  const lastRef = useRef<null | HTMLDivElement>(null)
  const bottomSpacerRef = useRef<null | HTMLDivElement>(null)

        useEffect(() => {
          if (containerRef.current) {
            if (lastRef.current) {
              // Position the active line at the reading marker (second line of 6)
              const containerHeight = containerRef.current.clientHeight
              const markerPosition = containerHeight * 0.25 // 25% from top (second line of 6)
              const targetScrollTop = Math.max(lastRef.current.offsetTop - markerPosition, 0)
              
              containerRef.current.scrollTo({
                top: targetScrollTop,
                behavior: "smooth",
              })
            } else {
              containerRef.current.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
          }
        })

  // Keyboard shortcuts for skip functionality
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not in editing mode
      if (status === 'editing') return
      
      switch (event.key) {
        case 'ArrowRight':
        case ' ':
          // Skip to next word
          event.preventDefault()
          const nextWordIndex = Math.min(finalTranscriptIndex + 1, textElements[textElements.length - 1]?.index || 0)
          dispatch(setFinalTranscriptIndex(nextWordIndex))
          dispatch(setInterimTranscriptIndex(nextWordIndex))
          console.log(`Skipped to next word: ${nextWordIndex}`)
          break
          
        case 'ArrowDown':
          // Skip to next sentence
          event.preventDefault()
          const nextSentenceIndex = findNextSentence(finalTranscriptIndex)
          dispatch(setFinalTranscriptIndex(nextSentenceIndex))
          dispatch(setInterimTranscriptIndex(nextSentenceIndex))
          console.log(`Skipped to next sentence: ${nextSentenceIndex}`)
          break
          
        case 'ArrowUp':
          // Skip to next paragraph
          event.preventDefault()
          const nextParagraphIndex = findNextParagraph(finalTranscriptIndex)
          dispatch(setFinalTranscriptIndex(nextParagraphIndex))
          dispatch(setInterimTranscriptIndex(nextParagraphIndex))
          console.log(`Skipped to next paragraph: ${nextParagraphIndex}`)
          break
          
        case 'Home':
          // Skip to beginning
          event.preventDefault()
          dispatch(setFinalTranscriptIndex(0))
          dispatch(setInterimTranscriptIndex(0))
          console.log('Skipped to beginning')
          break
          
        case 'End':
          // Skip to end
          event.preventDefault()
          const endIndex = textElements[textElements.length - 1]?.index || 0
          dispatch(setFinalTranscriptIndex(endIndex))
          dispatch(setInterimTranscriptIndex(endIndex))
          console.log(`Skipped to end: ${endIndex}`)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [dispatch, status, textElements.length, finalTranscriptIndex])

  // Helper function to find next sentence
  const findNextSentence = (currentIndex: number): number => {
    for (let i = 0; i < textElements.length; i++) {
      const element = textElements[i]
      if (element.index > currentIndex && element.type === "DELIMITER" && /[.!?]/.test(element.value)) {
        return element.index
      }
    }
    return textElements[textElements.length - 1]?.index || 0
  }

  // Helper function to find next paragraph
  const findNextParagraph = (currentIndex: number): number => {
    for (let i = 0; i < textElements.length; i++) {
      const element = textElements[i]
      if (element.index > currentIndex && element.type === "DELIMITER" && element.value.includes('\n\n')) {
        return element.index
      }
    }
    return textElements[textElements.length - 1]?.index || 0
  }

  useLayoutEffect(() => {
    if (!containerRef.current || !bottomSpacerRef.current) {
      return
    }

    const containerHeight = containerRef.current.clientHeight
    bottomSpacerRef.current.style.height = `${scrollOffset + containerHeight}px`
  }, [scrollOffset, textElements.length])

  return (
    <main className="content-area">
      {/* Reading marker - fixed position at top */}
      <div className="reading-marker" />
      
      {status === "editing" ? (
        <textarea
          className="content"
          style={style}
          value={rawText}
          onChange={e => dispatch(setContent(e.target.value || ""))}
        />
      ) : (
        <div
          className="content"
          ref={containerRef}
          style={{
            ...style,
            opacity: opacity / 100,
            transform: `scale(${horizontallyFlipped ? "-1" : "1"}, ${verticallyFlipped ? "-1" : "1"})`,
          }}
          title="Click any word to skip to it. Use arrow keys: → next word, ↓ next sentence, ↑ next paragraph, Home/End for start/end"
        >
          {textElements.map((textElement, index, array) => {
            const itemProps =
              interimTranscriptIndex > 0 &&
              index === Math.min(interimTranscriptIndex + 2, array.length - 1)
                ? { ref: lastRef }
                : {}
            return (
              <span
                key={textElement.index}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  // Skip to the clicked word and mark everything before it as completed
                  console.log(`Clicking word: index=${textElement.index}, value="${textElement.value}", currentIndex=${finalTranscriptIndex}`)
                  dispatch(setFinalTranscriptIndex(textElement.index))
                  dispatch(setInterimTranscriptIndex(textElement.index))
                  console.log(`Skipped to word ${textElement.index}: "${textElement.value}"`)
                }}
                className={
                  finalTranscriptIndex > 0 &&
                  textElement.index <= finalTranscriptIndex + 1
                    ? "final-transcript"
                    : interimTranscriptIndex > 0 &&
                        textElement.index <= interimTranscriptIndex + 1
                      ? "interim-transcript"
                      : "has-text-white"
                }
                {...itemProps}
                dangerouslySetInnerHTML={{
                  __html: escape(textElement.value).replace(/\n/g, "<br>"),
                }}
              />
            )
          })}
          <div
            aria-hidden="true"
            ref={bottomSpacerRef}
            style={{ height: 0, flexShrink: 0 }}
          />
        </div>
      )}
    </main>
  )
}
