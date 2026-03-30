import React, { useEffect, useRef } from 'react';

interface RRIntervalWaveformProps {
  isConnected: boolean;
  heartRate: number;
  rrIntervals?: number[]; // Added to accept real live data
}

export function RRIntervalWaveform({
  isConnected,
  heartRate,
  rrIntervals = []
}: RRIntervalWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const rrIntervalsRef = useRef<number[]>([]);

  // 1. Data Ingestion Effect: Push incoming live RR data into our rolling buffer
  useEffect(() => {
    if (!isConnected) {
      rrIntervalsRef.current = []; // Clear the graph if disconnected
      return;
    }

    if (rrIntervals.length > 0) {
      // Append the newest beats to the buffer
      rrIntervalsRef.current.push(...rrIntervals);
      
      // Keep only the last 30 intervals visible on the chart
      if (rrIntervalsRef.current.length > 30) {
        rrIntervalsRef.current = rrIntervalsRef.current.slice(-30);
      }
    }
  }, [rrIntervals, isConnected]);

  // 2. Render Effect: Handle the canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isConnected) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Properly resize canvas and handle high-DPI/Retina screens
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    // We use the raw rect width/height for CSS-pixel accurate drawing
    const width = rect.width;
    const height = rect.height;

    const drawRRIntervals = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw horizontal grid lines
      ctx.strokeStyle = 'rgba(0, 217, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let y = 0; y < height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const data = rrIntervalsRef.current;
      
      // Don't draw the line graph until we have at least 2 points to connect
      if (data.length < 2) {
        ctx.fillStyle = 'rgba(156, 163, 175, 0.8)';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillText('Waiting for RR data...', 5, 15);
        return;
      }

      // Find min/max for dynamic scaling
      const minRR = Math.min(...data);
      const maxRR = Math.max(...data);
      const range = maxRR - minRR || 100; // Fallback range to prevent division by zero
      const padding = 20;

      // Setup gradient for the line graph
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(0, 217, 255, 0.9)');
      gradient.addColorStop(1, 'rgba(0, 217, 255, 0.4)');
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(0, 217, 255, 0.6)';
      ctx.shadowBlur = 6;
      
      // Draw RR interval line graph
      ctx.beginPath();
      data.forEach((interval, index) => {
        const x = (index / (data.length - 1)) * width;
        const normalizedY = (interval - minRR) / range;
        const y = height - padding - normalizedY * (height - 2 * padding);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Draw data points (dots)
      ctx.fillStyle = '#00d9ff';
      ctx.shadowBlur = 0;
      data.forEach((interval, index) => {
        const x = (index / (data.length - 1)) * width;
        const normalizedY = (interval - minRR) / range;
        const y = height - padding - normalizedY * (height - 2 * padding);
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Y-axis labels
      ctx.fillStyle = 'rgba(156, 163, 175, 0.8)';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(`${maxRR.toFixed(0)}ms`, 5, 15);
      ctx.fillText(`${minRR.toFixed(0)}ms`, 5, height - 5);
      ctx.fillText('RR Intervals', width - 80, 15);
    };

    const animate = () => {
      drawRRIntervals();
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isConnected]); // Re-run canvas setup only if connection status changes

  return (
    <div className="w-full h-40 relative overflow-hidden bg-medical-bg-secondary border border-medical-grid rounded-lg">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          imageRendering: 'crisp-edges'
        }} 
      />
      
      {!isConnected && (
        <div className="absolute inset-0 flex items-center justify-center bg-medical-bg/80">
          <p className="text-medical-red font-mono text-sm">SIGNAL LOST</p>
        </div>
      )}
    </div>
  );
}