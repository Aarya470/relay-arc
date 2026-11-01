'use client'
// Fades sections in once as they scroll into view. Content is only hidden after
// this runs, so the page reads fine without JavaScript.
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function Reveal() {
  const pathname = usePathname()
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    document.documentElement.classList.add('js-reveal')
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in')
            io.unobserve(e.target)
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    )
    const watch = () =>
      document.querySelectorAll('[data-reveal]:not(.is-in)').forEach((el) => io.observe(el))
    watch()
    const mo = new MutationObserver(watch)
    mo.observe(document.body, { childList: true, subtree: true })
    return () => {
      io.disconnect()
      mo.disconnect()
    }
  }, [pathname])
  return null
}
