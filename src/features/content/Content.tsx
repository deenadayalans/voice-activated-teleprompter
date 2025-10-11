import { useEffect, useLayoutEffect, useRef, useState } from "react"
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
  const [markerPosition, setMarkerPosition] = useState(() => {
    // Load saved position or default to 25%
    const saved = localStorage.getItem('teleprompter-marker-position')
    return saved ? parseFloat(saved) : 25
  })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [dragStartPosition, setDragStartPosition] = useState(0)

    const style = {
      fontSize: `140px`, // Larger font size for better readability
      padding: `0 ${margin}px`,
      marginLeft: `80px`, // Move text to the right to avoid marker overlap
    }

  const containerRef = useRef<null | HTMLDivElement>(null)
  const lastRef = useRef<null | HTMLDivElement>(null)
  const bottomSpacerRef = useRef<null | HTMLDivElement>(null)
  const lastScrollTop = useRef<number>(0)
  const maxScrollReached = useRef<number>(0)
  const isUserScrolling = useRef<boolean>(false)
  const userScrollTimeout = useRef<NodeJS.Timeout | null>(null)
  // Linear scroll animation refs
  const animFrameRef = useRef<number | null>(null)
  const animTargetRef = useRef<number>(0)
  const lastTsRef = useRef<number | null>(null)
  const SCROLL_SPEED_PX_PER_SEC = 450

        // Linear auto-scroll animation (video-like)
        const stopAnimation = () => {
          if (animFrameRef.current !== null) {
            cancelAnimationFrame(animFrameRef.current)
            animFrameRef.current = null
          }
          lastTsRef.current = null
        }

        const step = (ts: number) => {
          const container = containerRef.current
          if (!container) return stopAnimation()
          const target = animTargetRef.current
          const current = container.scrollTop
          if (target <= current + 0.5) return stopAnimation()

          const last = lastTsRef.current ?? ts
          const dt = Math.max(0, (ts - last) / 1000)
          lastTsRef.current = ts
          const maxStep = SCROLL_SPEED_PX_PER_SEC * dt
          const delta = Math.min(target - current, maxStep)
          container.scrollTop = current + delta
          animFrameRef.current = requestAnimationFrame(step)
        }

        const ensureAnimationTo = (desired: number) => {
          const container = containerRef.current
          if (!container) return
          // Forward-only target
          const forwardTarget = Math.max(container.scrollTop, desired)
          if (forwardTarget > animTargetRef.current + 0.5) {
            animTargetRef.current = forwardTarget
            if (animFrameRef.current === null) {
              animFrameRef.current = requestAnimationFrame(step)
            }
          }
        }

        useEffect(() => {
          const container = containerRef.current
          const activeEl = lastRef.current
          if (!container || !activeEl) return

          // Compute desired scroll so the active word sits just ABOVE the marker
          const containerRect = container.getBoundingClientRect()
          const activeRect = activeEl.getBoundingClientRect()
          const markerY = containerRect.top + (containerRect.height * (markerPosition / 100))
          const delta = activeRect.top - markerY
          const lineOffset = activeRect.height
          const desiredScroll = Math.max(0, container.scrollTop + delta + lineOffset)

          if (!isUserScrolling.current) {
            ensureAnimationTo(desiredScroll)
          }
        }, [finalTranscriptIndex, interimTranscriptIndex, markerPosition])

        // Cleanup animation on unmount
        useEffect(() => () => {
          if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current)
        }, [])

  // Track manual scrolling to allow user control
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const currentScroll = container.scrollTop
      
      // Detect user scrolling (not automatic)
      isUserScrolling.current = true
      
      // Clear previous timeout
      if (userScrollTimeout.current) {
        clearTimeout(userScrollTimeout.current)
      }
      
      // Set timeout to detect when user stops scrolling
      userScrollTimeout.current = setTimeout(() => {
        isUserScrolling.current = false
      }, 150) // 150ms after user stops scrolling
      
      // Update max scroll reached for user-initiated scrolling
      maxScrollReached.current = Math.max(maxScrollReached.current, currentScroll)
    }

    container.addEventListener('scroll', handleScroll)
    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (userScrollTimeout.current) {
        clearTimeout(userScrollTimeout.current)
      }
    }
  }, [])

  // Drag handlers for marker
  const handleMarkerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStartY(e.clientY)
    setDragStartPosition(markerPosition)
  }

  const handleMarkerMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    
    const containerHeight = containerRef.current.clientHeight
    const deltaY = e.clientY - dragStartY
    const deltaPercentage = (deltaY / containerHeight) * 100
    const newPosition = Math.max(0, Math.min(100, dragStartPosition + deltaPercentage))
    setMarkerPosition(newPosition)
  }

  const handleMarkerMouseUp = () => {
    setIsDragging(false)
  }

  // Global mouse events for dragging
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!containerRef.current) return
        
        const containerHeight = containerRef.current.clientHeight
        const deltaY = e.clientY - dragStartY
        const deltaPercentage = (deltaY / containerHeight) * 100
        const newPosition = Math.max(0, Math.min(100, dragStartPosition + deltaPercentage))
        setMarkerPosition(newPosition)
      }

      const handleGlobalMouseUp = () => {
        setIsDragging(false)
      }

      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove)
        document.removeEventListener('mouseup', handleGlobalMouseUp)
      }
    }
  }, [isDragging, dragStartY, dragStartPosition])

  // Save marker position to localStorage
  useEffect(() => {
    localStorage.setItem('teleprompter-marker-position', markerPosition.toString())
  }, [markerPosition])

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
        case 'r':
        case 'R':
          // Reset marker position to default (25%)
          event.preventDefault()
          setMarkerPosition(25)
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
        <main className="content-area" style={{ scrollBehavior: 'smooth' }}>
          {/* Reading marker - draggable and user-positioned */}
          <div 
            className={`reading-marker ${isDragging ? 'dragging' : ''}`}
            style={{ top: `${markerPosition}%` }}
            onMouseDown={handleMarkerMouseDown}
            onMouseMove={handleMarkerMouseMove}
            onMouseUp={handleMarkerMouseUp}
            title={`Reading position: ${Math.round(markerPosition)}% - Drag to adjust`}
          >
            {/* Position indicator */}
            <div className="marker-position-indicator">
              {Math.round(markerPosition)}%
            </div>
          </div>
      
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
          {textElements.map((textElement) => {
            const activeIndex = Math.max(finalTranscriptIndex, interimTranscriptIndex)
            const isActive = textElement.index === activeIndex
            const itemProps = isActive ? { ref: lastRef } : {}
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
                  textElement.index <= finalTranscriptIndex
                    ? "final-transcript"
                    : textElement.index <= interimTranscriptIndex
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
