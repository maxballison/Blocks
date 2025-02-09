// components/CanvasView.tsx
import React, { useRef, useEffect } from 'react';

interface CanvasViewProps {
  width: number;
  height: number;
  drawingCommands: { cmd: string; args: number[]; color?: string }[];
}

const CanvasView: React.FC<CanvasViewProps> = ({ width, height, drawingCommands }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw all commands
    for (const { cmd, args, color } of drawingCommands) {
      ctx.fillStyle = color ?? '#000';

      if (cmd === 'circle') {
        const [x, y, r] = args;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (cmd === 'rectangle') {
        const [x, y, w, h] = args;
        ctx.fillRect(x, y, w, h);
      }
    }
  }, [width, height, drawingCommands]);

  return <canvas ref={canvasRef} width={width} height={height} />;
};

export default CanvasView;