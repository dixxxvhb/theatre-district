import { useEffect, useRef, useState } from 'react'
import { GameCanvas } from './game/canvas/GameCanvas'

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setCanvasSize({ width: rect.width, height: rect.height })
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  return (
    <div className="w-screen h-screen bg-[#1a1a2e] flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="h-12 bg-[#16213e] border-b border-[#2a2a4e] flex items-center px-4 gap-6 shrink-0">
        <span className="text-[#d4a574] font-serif text-lg tracking-widest">
          BROADWAY TYCOON
        </span>
        <span className="text-[#a0a0b0] text-sm">Day 1</span>
        <span className="text-green-400 text-sm font-mono ml-auto">$500,000</span>
        <span className="text-[#a0a0b0] text-sm">REP 0</span>
      </div>

      {/* Main area: canvas + side panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Game canvas */}
        <div ref={containerRef} className="flex-1 overflow-hidden">
          {canvasSize.width > 0 && (
            <GameCanvas width={canvasSize.width} height={canvasSize.height} />
          )}
        </div>

        {/* Right panel placeholder */}
        <div className="w-72 bg-[#16213e] border-l border-[#2a2a4e] flex flex-col p-4 gap-3 shrink-0">
          <h2 className="text-[#eeeeee] font-serif text-base tracking-wide">
            Theater District
          </h2>
          <p className="text-[#a0a0b0] text-sm leading-relaxed">
            Welcome to Broadway Tycoon. Purchase a property to begin building your theater empire.
          </p>
          <button className="mt-auto w-full py-2.5 bg-[#e94560] hover:bg-[#c73050] text-white text-sm font-medium tracking-wide transition-colors">
            Buy Property
          </button>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="h-10 bg-[#16213e] border-t border-[#2a2a4e] flex items-center px-4 shrink-0">
        <span className="text-[#a0a0b0] text-xs">Phase: Main Menu</span>
        <div className="ml-auto flex gap-2">
          {['⏸', '▶', '▶▶', '▶▶▶'].map((label, i) => (
            <button
              key={i}
              className="px-2 py-0.5 text-xs text-[#a0a0b0] hover:text-[#eeeeee] hover:bg-[#2a2a4e] transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
