import './CategoryIcon.css'

const ICONS = {
  utensils: (
    <>
      <path d="M7 2v7a1 1 0 0 0 2 0V2" />
      <path d="M8 9v13" />
      <path d="M16 2c-1.4 0-2.5 2.2-2.5 5s1.1 5 2.5 5" />
      <path d="M16 12v10" />
    </>
  ),
  'shopping-cart': (
    <>
      <circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18" cy="20" r="1.4" fill="currentColor" stroke="none" />
      <path d="M2.5 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 8H6" />
    </>
  ),
  car: (
    <>
      <path d="M3 13l1.5-4.5A2 2 0 0 1 6.4 7h11.2a2 2 0 0 1 1.9 1.5L21 13" />
      <rect x="3" y="13" width="18" height="5" rx="1.5" />
      <circle cx="7.5" cy="18.5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="18.5" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  bag: (
    <>
      <path d="M6 8h12l1 12.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  film: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5v7l6-3.5-6-3.5Z" fill="currentColor" stroke="none" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 2h12v20l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4V2Z" />
      <path d="M9 7h6M9 11h6M9 15h4" />
    </>
  ),
  heart: <path d="M12 21s-7-4.35-9.5-8.5C.7 9 2 5.5 5.5 5c2-.3 3.7.8 4.5 2.3C10.8 5.8 12.5 4.7 14.5 5c3.5.5 4.8 4 3 7.5C19 16.65 12 21 12 21Z" />,
  plane: (
    <>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
    </>
  ),
  book: (
    <>
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v16H6.5A2.5 2.5 0 0 0 4 20.5V4.5Z" />
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    </>
  ),
  home: (
    <>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </>
  ),
  sparkles: (
    <>
      <path
        d="M12 2l1.8 4.6L18 8l-4.2 1.6L12 14l-1.8-4.4L6 8l4.2-1.4L12 2Z"
        fill="currentColor"
        stroke="none"
      />
      <path d="M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" fill="currentColor" stroke="none" />
    </>
  ),
  'dots-horizontal': (
    <>
      <circle cx="6" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
}

export default function CategoryIcon({ icon, color = '#6B7280', size = 20, className = '' }) {
  const glyph = ICONS[icon] || ICONS['dots-horizontal']

  return (
    <span className={`category-icon ${className}`.trim()} style={{ '--category-icon-color': color }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {glyph}
      </svg>
    </span>
  )
}
