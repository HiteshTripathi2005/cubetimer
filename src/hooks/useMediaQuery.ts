import { useEffect, useState } from 'react'

/**
 * Subscribe to a CSS media query. Returns false when `matchMedia` is
 * unavailable (e.g. jsdom in tests), which keeps the app on its mobile shell
 * there — a safe, link-complete default.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches,
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(query)
    const onChange = () => setMatches(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])

  return matches
}
