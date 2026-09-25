import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import useIsMobile from '../../hooks/useIsMobile'
import { DURATION_BASE, DURATION_FAST, EASE_STANDARD } from '../../lib/motion'
import './Modal.css'

export default function Modal({ isOpen, onClose, title, children, className = '', closeOnOverlayClick = true }) {
  const isMobile = useIsMobile()
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (!isOpen) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleOverlayMouseDown = (event) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) onClose?.()
  }

  const panelOffset = prefersReducedMotion ? 0 : isMobile ? '100%' : 8

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal__overlay"
          onMouseDown={handleOverlayMouseDown}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DURATION_FAST, ease: EASE_STANDARD }}
        >
          <motion.div
            className={`modal ${className}`.trim()}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: panelOffset }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: panelOffset }}
            transition={{ duration: DURATION_BASE, ease: EASE_STANDARD }}
          >
            {title && (
              <div className="modal__header">
                <h2>{title}</h2>
              </div>
            )}
            <div className="modal__body">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
