import { Application, extend } from '@pixi/react'
import { Container, Graphics, Text } from 'pixi.js'
import { useCallback } from 'react'

// Extend PixiJS components for @pixi/react
extend({ Container, Graphics, Text })

interface GameCanvasProps {
  width: number
  height: number
}

export function GameCanvas({ width, height }: GameCanvasProps) {
  const draw = useCallback((g: InstanceType<typeof Graphics>) => {
    g.clear()

    // Background
    g.rect(0, 0, width, height)
    g.fill(0x1a1a2e)

    // Placeholder grid lines
    g.setStrokeStyle({ width: 1, color: 0x2a2a4e })
    const cellSize = 32
    for (let x = 0; x < width; x += cellSize) {
      g.moveTo(x, 0)
      g.lineTo(x, height)
    }
    for (let y = 0; y < height; y += cellSize) {
      g.moveTo(0, y)
      g.lineTo(width, y)
    }
    g.stroke()

    // Center stage placeholder
    const cx = width / 2
    const cy = height / 2
    g.rect(cx - 120, cy - 80, 240, 160)
    g.fill(0x6b3fa0)

    // Stage label bg
    g.rect(cx - 60, cy - 14, 120, 28)
    g.fill(0x4a2a80)
  }, [width, height])

  return (
    <Application
      width={width}
      height={height}
      background={0x1a1a2e}
      antialias
    >
      <pixiGraphics draw={draw} />
      <pixiText
        text="BROADWAY TYCOON"
        x={width / 2}
        y={height / 2}
        anchor={0.5}
        style={{
          fontFamily: 'serif',
          fontSize: 14,
          fill: 0xd4a574,
          letterSpacing: 2,
        }}
      />
    </Application>
  )
}
