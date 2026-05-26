import { useRef, useCallback } from 'react'
import './ParticleBanner.css'

export default function ParticleBanner({ className = '', children }) {
  const glowRef = useRef(null)

  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    glowRef.current.style.setProperty('--gx', `${x}px`)
    glowRef.current.style.setProperty('--gy', `${y}px`)
    glowRef.current.style.opacity = '1'
  }, [])

  const handleMouseLeave = useCallback(() => {
    glowRef.current.style.opacity = '0'
  }, [])

  return (
    <div
      className={`pb-wrapper ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div ref={glowRef} className="pb-glow" />
      {children}
    </div>
  )
}
