import { useEffect, useRef, useState } from 'react'
import MicIcon from '@mui/icons-material/Mic'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import useSpeechToText from '../../hooks/useSpeechToText'
import { parseExpense, parseExpenseImage } from '../../api/expenses'
import ConfirmExpenseModal from '../ConfirmExpenseModal/ConfirmExpenseModal'
import BatchConfirmModal from '../BatchConfirmModal/BatchConfirmModal'
import './CaptureBar.css'

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024
const MAX_IMAGE_NOTE_LENGTH = 500

export default function CaptureBar({ onSaved }) {
  const [text, setText] = useState('')
  const [source, setSource] = useState('text')
  const [isParsing, setIsParsing] = useState(false)
  const [isParsingImage, setIsParsingImage] = useState(false)
  const [draft, setDraft] = useState(null)
  const [batchDrafts, setBatchDrafts] = useState(null)
  const [pendingImage, setPendingImage] = useState(null)
  const [imageNote, setImageNote] = useState('')
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)
  const { isSupported, isListening, transcript, error: speechError, start, stop } = useSpeechToText()
  const isBusy = isParsing || isParsingImage || Boolean(pendingImage)

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

  const handleParsed = (items) => {
    if (!items || items.length === 0) return
    if (items.length > 1) {
      setBatchDrafts(items)
    } else {
      setDraft(items[0])
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!text.trim() || isBusy) return
    setIsParsing(true)
    setError(null)
    try {
      const parsed = await parseExpense(text.trim(), source)
      handleParsed(parsed)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsParsing(false)
    }
  }

  const handleImageFile = (file) => {
    if (!file || isBusy) return
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError('Image must be JPEG, PNG, or WEBP')
      return
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError('Image must be smaller than 8MB')
      return
    }
    setError(null)
    setImageNote('')
    setPendingImage(file)
  }

  const handleImageInputChange = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    handleImageFile(file)
  }

  const handlePaste = (event) => {
    const item = Array.from(event.clipboardData?.items || []).find((i) => i.type.startsWith('image/'))
    if (!item) return
    const file = item.getAsFile()
    if (file) {
      event.preventDefault()
      handleImageFile(file)
    }
  }

  const handleImageCancel = () => {
    setPendingImage(null)
    setImageNote('')
  }

  const handleImageSubmit = async (event) => {
    event.preventDefault()
    if (!pendingImage || isParsingImage) return
    setIsParsingImage(true)
    setError(null)
    try {
      const parsed = await parseExpenseImage(pendingImage, imageNote.trim() || undefined)
      handleParsed(parsed)
      setPendingImage(null)
      setImageNote('')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsParsingImage(false)
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
          placeholder='Try "Paid 450 for groceries at DMart today", or paste/attach a screenshot'
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setSource('text')
          }}
          onPaste={handlePaste}
        />
        {isSupported && (
          <button
            type="button"
            className={`capture-bar__mic${isListening ? ' capture-bar__mic--active' : ''}`}
            onClick={handleMicClick}
            disabled={isBusy}
            aria-label={isListening ? 'Stop recording' : 'Start voice capture'}
            title={isListening ? 'Stop recording' : 'Start voice capture'}
          >
            <MicIcon fontSize="small" />
          </button>
        )}
        <button
          type="button"
          className="capture-bar__image"
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy}
          aria-label="Add expense from screenshot"
          title="Add expense from screenshot"
        >
          <PhotoCameraIcon fontSize="small" />
        </button>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          ref={fileInputRef}
          onChange={handleImageInputChange}
          className="capture-bar__file-input"
        />
        <button type="submit" className="capture-bar__submit" disabled={isBusy || !text.trim()}>
          {isParsing ? 'Parsing…' : 'Add'}
        </button>
      </form>
      {isListening && <p className="capture-bar__hint">Listening… speak your expense, then tap the mic to stop.</p>}
      {speechError && <p className="capture-bar__error">Voice input error: {speechError}</p>}
      {error && <p className="capture-bar__error">{error}</p>}
      {pendingImage && (
        <form className="capture-bar__image-note" onSubmit={handleImageSubmit}>
          <span className="capture-bar__image-filename" title={pendingImage.name}>
            <PhotoCameraIcon fontSize="inherit" /> {pendingImage.name}
          </span>
          <input
            type="text"
            className="capture-bar__image-note-input"
            placeholder='Add a note (optional) — e.g. "split 3 ways, my share is 200"'
            value={imageNote}
            onChange={(event) => setImageNote(event.target.value)}
            maxLength={MAX_IMAGE_NOTE_LENGTH}
            autoFocus
          />
          <button type="button" onClick={handleImageCancel} disabled={isParsingImage}>
            Cancel
          </button>
          <button type="submit" className="capture-bar__image-note-submit" disabled={isParsingImage}>
            {isParsingImage ? 'Reading…' : 'Add expense'}
          </button>
        </form>
      )}
      {draft && (
        <ConfirmExpenseModal draft={draft} onClose={() => setDraft(null)} onSaved={handleSaved} />
      )}
      {batchDrafts && (
        <BatchConfirmModal
          drafts={batchDrafts}
          onClose={() => {
            setBatchDrafts(null)
            setText('')
            setSource('text')
          }}
          onSaved={() => onSaved?.()}
        />
      )}
    </div>
  )
}
