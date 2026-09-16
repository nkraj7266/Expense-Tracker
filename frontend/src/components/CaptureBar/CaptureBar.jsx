import { useEffect, useState } from 'react'
import MicIcon from '@mui/icons-material/Mic'
import useSpeechToText from '../../hooks/useSpeechToText'
import { parseExpense } from '../../api/expenses'
import ConfirmExpenseModal from '../ConfirmExpenseModal/ConfirmExpenseModal'
import './CaptureBar.css'

export default function CaptureBar({ onSaved }) {
  const [text, setText] = useState('')
  const [source, setSource] = useState('text')
  const [isParsing, setIsParsing] = useState(false)
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState(null)
  const { isSupported, isListening, transcript, error: speechError, start, stop } = useSpeechToText()

  useEffect(() => {
    if (transcript) {
      setText(transcript)
      setSource('voice')
    }
  }, [transcript])

  const handleMicClick = () => {
    if (isListening) {
      stop()
    } else {
      setText('')
      setError(null)
      start()
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!text.trim() || isParsing) return
    setIsParsing(true)
    setError(null)
    try {
      const parsed = await parseExpense(text.trim(), source)
      setDraft(parsed)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsParsing(false)
    }
  }

  const handleSaved = () => {
    setDraft(null)
    setText('')
    setSource('text')
    onSaved?.()
  }

  return (
    <div className="capture-bar">
      <form className="capture-bar__form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="capture-bar__input"
          placeholder='Try "Paid 450 for groceries at DMart today"'
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setSource('text')
          }}
        />
        {isSupported && (
          <button
            type="button"
            className={`capture-bar__mic${isListening ? ' capture-bar__mic--active' : ''}`}
            onClick={handleMicClick}
            aria-label={isListening ? 'Stop recording' : 'Start voice capture'}
            title={isListening ? 'Stop recording' : 'Start voice capture'}
          >
            <MicIcon fontSize="small" />
          </button>
        )}
        <button type="submit" className="capture-bar__submit" disabled={isParsing || !text.trim()}>
          {isParsing ? 'Parsing…' : 'Add'}
        </button>
      </form>
      {isListening && <p className="capture-bar__hint">Listening… speak your expense, then tap the mic to stop.</p>}
      {speechError && <p className="capture-bar__error">Voice input error: {speechError}</p>}
      {error && <p className="capture-bar__error">{error}</p>}
      {draft && (
        <ConfirmExpenseModal draft={draft} onClose={() => setDraft(null)} onSaved={handleSaved} />
      )}
    </div>
  )
}
