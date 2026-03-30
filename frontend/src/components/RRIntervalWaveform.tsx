import React, { useEffect, useRef } from 'react';
interface RRIntervalWaveformProps {
  isConnected: boolean;
  heartRate: number;
}
export function RRIntervalWaveform({
  isConnected,
  heartRate
}: RRIntervalWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const rrIntervalsRef = useRef<number[]>([]);
  const timeRef = useRef(0);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isConnected) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resizeCanvas();
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;
    // Calculate average RR interval from heart rate
    // RR interval (ms) = 60000 / HR (bpm)
    const avgRRInterval = 60000 / heartRate;
    // Generate RR intervals with natural variability (HRV)
    const generateRRInterval = () => {
      // Add ±50ms variation for realistic HRV
      const variation = (Math.random() - 0.5) * 100;
      return avgRRInterval + variation;
    };
    const drawRRIntervals = () => {
      ctx.clearRect(0, 0, width, height);
      // Add new RR interval every ~800ms (simulating beat detection)
      if (timeRef.current % 0.8 < 0.016) {
        rrIntervalsRef.current.push(generateRRInterval());
        // Keep only last 30 intervals visible
        if (rrIntervalsRef.current.length > 30) {
          rrIntervalsRef.current.shift();
        }
      }
      if (rrIntervalsRef.current.length < 2) return;
      // Draw grid lines
      ctx.strokeStyle = 'rgba(0, 217, 255, 0.1)';
      ctx.lineWidth = 1;
      // Horizontal grid lines
      for (let y = 0; y < height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      // Find min/max for scaling
      const minRR = Math.min(...rrIntervalsRef.current);
      const maxRR = Math.max(...rrIntervalsRef.current);
      const range = maxRR - minRR || 100;
      const padding = 20;
      // Draw RR interval line graph
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(0, 217, 255, 0.9)');
      gradient.addColorStop(1, 'rgba(0, 217, 255, 0.4)');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(0, 217, 255, 0.6)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      rrIntervalsRef.current.forEach((interval, index) => {
        const x = index / (rrIntervalsRef.current.length - 1) * width;
        const normalizedY = (interval - minRR) / range;
        const y = height - padding - normalizedY * (height - 2 * padding);
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      // Draw data points
      ctx.fillStyle = '#00d9ff';
      rrIntervalsRef.current.forEach((interval, index) => {
        const x = index / (rrIntervalsRef.current.length - 1) * width;
        const normalizedY = (interval - minRR) / range;
        const y = height - padding - normalizedY * (height - 2 * padding);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      // Draw labels
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(156, 163, 175, 0.8)';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(`${maxRR.toFixed(0)}ms`, 5, 15);
      ctx.fillText(`${minRR.toFixed(0)}ms`, 5, height - 5);
      ctx.fillText('RR Intervals', width - 80, 15);
    };
    const animate = () => {
      timeRef.current += 1 / 60;
      drawRRIntervals();
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isConnected, heartRate]);
  return (
    <div className="w-full h-40 relative overflow-hidden bg-medical-bg-secondary border border-medical-grid rounded-lg">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          imageRendering: 'crisp-edges'
        }} />
      

      {!isConnected &&
      <div className="absolute inset-0 flex items-center justify-center bg-medical-bg/80">
          <p className="text-medical-red font-mono text-sm">SIGNAL LOST</p>
        </div>
      }
    </div>);

}