import React, { useEffect, useRef } from 'react';
interface ECGWaveformProps {
  isConnected: boolean;
  heartRate?: number; // BPM - controls wave speed and spacing
}
export function ECGWaveform({ isConnected, heartRate = 72 }: ECGWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const timeRef = useRef(0);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isConnected) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Set canvas size to match container
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resizeCanvas();
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;
    const baseline = height / 2;
    // Calculate wave spacing based on heart rate
    // 60 BPM = 1 beat per second, 120 BPM = 2 beats per second
    const beatsPerSecond = heartRate / 60;
    const pixelsPerSecond = 100; // Speed of wave scrolling
    const pixelsPerBeat = pixelsPerSecond / beatsPerSecond;
    const drawECGWave = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      // Set up gradient stroke
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(0, 217, 255, 0.8)');
      gradient.addColorStop(1, 'rgba(0, 217, 255, 0.3)');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(0, 217, 255, 0.6)';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      // Draw continuous ECG pattern
      const offset = time * pixelsPerSecond % pixelsPerBeat;
      const startX = -offset;
      for (let x = startX; x < width + pixelsPerBeat; x += pixelsPerBeat) {
        // Add slight natural variation (±5% amplitude)
        const variation = 0.95 + Math.random() * 0.1;
        // P wave (small bump before QRS)
        const px1 = x + pixelsPerBeat * 0.1;
        const px2 = x + pixelsPerBeat * 0.2;
        ctx.lineTo(px1, baseline - 8 * variation);
        ctx.lineTo(px2, baseline);
        // PR segment (flat)
        const prEnd = x + pixelsPerBeat * 0.35;
        ctx.lineTo(prEnd, baseline);
        // QRS complex (sharp spike - the main heartbeat)
        const qx = x + pixelsPerBeat * 0.38;
        const rx = x + pixelsPerBeat * 0.42;
        const sx = x + pixelsPerBeat * 0.46;
        const qrsEnd = x + pixelsPerBeat * 0.5;
        ctx.lineTo(qx, baseline + 5 * variation); // Q dip
        ctx.lineTo(rx, baseline - 40 * variation); // R spike (main peak)
        ctx.lineTo(sx, baseline + 8 * variation); // S dip
        ctx.lineTo(qrsEnd, baseline);
        // ST segment (flat)
        const stEnd = x + pixelsPerBeat * 0.6;
        ctx.lineTo(stEnd, baseline);
        // T wave (medium bump after QRS)
        const tx1 = x + pixelsPerBeat * 0.7;
        const tx2 = x + pixelsPerBeat * 0.8;
        ctx.lineTo(tx1, baseline - 12 * variation);
        ctx.lineTo(tx2, baseline);
        // TP segment (flat until next beat)
        const nextBeat = x + pixelsPerBeat;
        ctx.lineTo(nextBeat, baseline);
      }
      ctx.stroke();
    };
    const animate = () => {
      timeRef.current += 1 / 60; // Increment time (assuming 60fps)
      drawECGWave(timeRef.current);
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
    <div className="w-full h-32 relative overflow-hidden ecg-grid-bg border-y border-medical-grid">
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