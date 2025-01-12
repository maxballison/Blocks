// components/CanvasView.tsx
import React, { useEffect, useRef } from 'react';

interface DrawingCommand {
  cmd: string;
  args: number[];
  color?: string;  // <--- we now support an optional color
}

interface CanvasViewProps {
  width: number;
  height: number;
  drawingCommands: DrawingCommand[];
}

const CanvasView: React.FC<CanvasViewProps> = ({ width, height, drawingCommands }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Clear the entire canvas
    ctx.clearRect(0, 0, width, height);

    // Draw each command
    drawingCommands.forEach(command => {
      // If a color was specified, use it; otherwise fallback to e.g. 'blue'
      ctx.fillStyle = command.color ?? 'blue';

      if (command.cmd === 'circle') {
        // circle(x, y, r)
        const [x, y, r] = command.args;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (command.cmd === 'rectangle') {
        // rectangle(x, y, w, h)
        const [x, y, w, h] = command.args;
        ctx.fillRect(x, y, w, h);
      }
    });
  }, [width, height, drawingCommands]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        border: '1px solid #666',
        backgroundColor: '#fff',
      }}
    />
  );
};

export default CanvasView;