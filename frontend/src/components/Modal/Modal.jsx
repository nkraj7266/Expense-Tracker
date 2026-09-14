import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import './Modal.css'

export default function Modal({ isOpen, onClose, title, children, className = '', closeOnOverlayClick = true }) {
  useEffect(() => {
    if (!isOpen) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleOverlayMouseDown = (event) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) onClose?.()
  }

  return createPortal(
    <div className="modal__overlay" onMouseDown={handleOverlayMouseDown}>
      <div className={`modal ${className}`.trim()} role="dialog" aria-modal="true" aria-label={title}>
        {title && (
          <div className="modal__header">
            <h2>{title}</h2>
          </div>
        )}
        <div className="modal__body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
