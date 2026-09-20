import { useCallback, useEffect, useRef, useState } from 'react'

const SpeechRecognitionImpl =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

// Errors that mean the mic/permission itself is broken - retrying would just loop forever.
const FATAL_ERRORS = new Set(['not-allowed', 'audio-capture', 'service-not-allowed'])

export default function useSpeechToText() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)
  const shouldListenRef = useRef(false)
  // Chrome's engine can end a "continuous" session on its own (silence/network
  // timeout); these track text across such an internal restart so it isn't lost.
  const committedTranscriptRef = useRef('')
  const latestSessionTextRef = useRef('')
  const restartTimeoutRef = useRef(null)

  const isSupported = Boolean(SpeechRecognitionImpl)

  useEffect(() => {
    if (!isSupported) return undefined

    const recognition = new SpeechRecognitionImpl()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-IN'

    recognition.onresult = (event) => {
      let text = ''
      for (let i = 0; i < event.results.length; i += 1) {
        text += event.results[i][0].transcript
      }
      latestSessionTextRef.current = text
      setTranscript(committedTranscriptRef.current ? `${committedTranscriptRef.current} ${text}` : text)
    }

    recognition.onerror = (event) => {
      setError(event.error)
      if (FATAL_ERRORS.has(event.error)) {
        shouldListenRef.current = false
      }
      // Other errors (e.g. "no-speech", "network") are followed by onend,
      // which restarts the session below if the user hasn't stopped it.
    }

    recognition.onend = () => {
      if (shouldListenRef.current) {
        const carry = latestSessionTextRef.current.trim()
        // Only commit if this isn't a re-hearing of what we already captured -
        // Chrome frequently replays the tail of the last phrase into the next
        // session if restarted instantly, which otherwise duplicates it.
        if (carry && !committedTranscriptRef.current.endsWith(carry)) {
          committedTranscriptRef.current = committedTranscriptRef.current
            ? `${committedTranscriptRef.current} ${carry}`
            : carry
        }
        latestSessionTextRef.current = ''
        // Small delay lets the engine release its audio buffer before the next
        // session starts, so it doesn't immediately re-transcribe the same audio.
        restartTimeoutRef.current = setTimeout(() => {
          try {
            recognition.start()
          } catch {
            // Engine refused to restart (e.g. torn down during unmount) - stop cleanly below.
            setIsListening(false)
          }
        }, 300)
        return
      }
      setIsListening(false)
    }

    recognitionRef.current = recognition
    return () => {
      shouldListenRef.current = false
      clearTimeout(restartTimeoutRef.current)
      recognition.stop()
    }
  }, [isSupported])

  const start = useCallback(() => {
    if (!recognitionRef.current) return
    setError(null)
    setTranscript('')
    committedTranscriptRef.current = ''
    latestSessionTextRef.current = ''
    shouldListenRef.current = true
    setIsListening(true)
    recognitionRef.current.start()
  }, [])

  const stop = useCallback(() => {
    shouldListenRef.current = false
    clearTimeout(restartTimeoutRef.current)
    recognitionRef.current?.stop()
  }, [])

  return { isSupported, isListening, transcript, error, start, stop }
}
