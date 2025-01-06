// components/CanvasView.tsx
import React, { useEffect, useRef } from 'react';

interface CanvasViewProps {
  width: number;
  height: number;
  drawingCommands: { cmd: string; args: number[] }[];
}

const CanvasView: React.FC<CanvasViewProps> = ({ width, height, drawingCommands }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw
    drawingCommands.forEach(command => {
      if (command.cmd === 'circle') {
        const [x, y, r] = command.args;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = 'blue';
        ctx.fill();
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