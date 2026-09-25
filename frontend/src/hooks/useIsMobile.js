import { useEffect, useState } from 'react'

// Mirrors the app's --bp-mobile token (see styles/variables.css) — kept in sync manually
// since CSS custom properties can't be read inside a JS matchMedia query.
const QUERY = '(max-width: 640px)'

export default function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(QUERY).matches)

  useEffect(() => {
    const media = window.matchMedia(QUERY)
    const handleChange = (event) => setIsMobile(event.matches)
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  return isMobile
}
