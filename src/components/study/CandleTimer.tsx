import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Flame, Play, Pause, RotateCcw } from "lucide-react";

interface CandleTimerProps {
  duration?: number; // in minutes
  onComplete?: () => void;
}

export const CandleTimer = ({ duration = 25, onComplete }: CandleTimerProps) => {
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration * 60); // convert to seconds
  const [totalTime] = useState(duration * 60);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  const progress = ((totalTime - timeLeft) / totalTime) * 100;
  const candleHeight = Math.max(20, 200 - progress * 1.8); // Candle melts as time progresses

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsActive(false);
            onComplete?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawCandle = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Candle drawing remains unchanged
      const candleWidth = 40;
      const candleX = (canvas.width - candleWidth) / 2;
      const candleY = canvas.height - candleHeight - 20;

      const candleGradient = ctx.createLinearGradient(candleX, candleY, candleX + candleWidth, candleY);
      candleGradient.addColorStop(0, '#f4d1a7');
      candleGradient.addColorStop(0.5, '#e8c5a0');
      candleGradient.addColorStop(1, '#d4af8c');

      ctx.fillStyle = candleGradient;
      ctx.fillRect(candleX, candleY, candleWidth, candleHeight);

      ctx.fillStyle = '#2c1810';
      ctx.fillRect(candleX + candleWidth/2 - 1, candleY - 8, 2, 8);

      if (isActive) {
        const time = Date.now() * 0.005;
        const flameX = candleX + candleWidth/2;
        const flameY = candleY - 15;
        const flicker = Math.sin(time) * 2 + Math.sin(time * 1.5) * 1.5;

        const flameGradient = ctx.createRadialGradient(flameX, flameY + 5, 0, flameX, flameY, 8);
        flameGradient.addColorStop(0, '#ff6b35');
        flameGradient.addColorStop(0.4, '#f7931e');
        flameGradient.addColorStop(0.7, '#ffdc00');
        flameGradient.addColorStop(1, 'rgba(255, 220, 0, 0)');

        ctx.save();
        ctx.translate(flameX, flameY);
        ctx.scale(1 + flicker * 0.1, 1 + flicker * 0.15);

        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.quadraticCurveTo(-6, 0, -3, -10);
        ctx.quadraticCurveTo(0, -15, 3, -10);
        ctx.quadraticCurveTo(6, 0, 0, 5);
        ctx.closePath();
        ctx.fillStyle = flameGradient;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, 3);
        ctx.quadraticCurveTo(-3, -2, -1, -8);
        ctx.quadraticCurveTo(0, -10, 1, -8);
        ctx.quadraticCurveTo(3, -2, 0, 3);
        ctx.closePath();
        ctx.fillStyle = '#ffdc00';
        ctx.fill();

        ctx.restore();

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.shadowColor = '#ff6b35';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(flameX, flameY - 5, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 107, 53, 0.3)';
        ctx.fill();
        ctx.restore();
      }

      if (progress > 20) {
        ctx.fillStyle = 'rgba(244, 209, 167, 0.8)';
        for (let i = 0; i < Math.floor(progress / 10); i++) {
          const dropX = candleX + Math.random() * candleWidth;
          const dropY = candleY + candleHeight + Math.random() * 10;
          ctx.beginPath();
          ctx.arc(dropX, dropY, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const animate = () => {
      drawCandle();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isActive, candleHeight, progress]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => setIsActive(true);
  const handlePause = () => setIsActive(false);
  const handleReset = () => {
    setIsActive(false);
    setTimeLeft(totalTime);
  };

  return (
    <Card className="p-6 text-center bg-teal-50 border-2 border-teal-100">
      <div className="flex items-center justify-center gap-2 mb-4">
        <Flame className="h-5 w-5 text-teal-600" />
        <h3 className="font-semibold text-teal-600">Study Until The Candle Melts</h3>
      </div>
      
      <div className="relative mb-6">
        <canvas
          ref={canvasRef}
          width={140} // bigger to fit full candle
          height={260}
          className="mx-auto border border-teal-400 rounded-lg bg-teal-100"
        />
        
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-teal-200/90 backdrop-blur-sm rounded-full px-3 py-1 border border-teal-400">
          <span className="text-sm font-mono text-teal-600 font-semibold">
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      <div className="flex justify-center gap-2 mb-4">
        {!isActive ? (
          <Button
            onClick={handleStart}
            className="gap-2 bg-teal-600 hover:bg-teal-700 text-teal-300"
            disabled={timeLeft === 0}
          >
            <Play className="h-4 w-4" />
            Light Candle
          </Button>
        ) : (
          <Button
            onClick={handlePause}
            className="gap-2 bg-teal-600 hover:bg-teal-700 text-teal-300"
          >
            <Pause className="h-4 w-4" />
            Pause
          </Button>
        )}
        <Button
          onClick={handleReset}
          className="gap-2 bg-teal-500 hover:bg-teal-600 text-teal-300"
        >
          <RotateCcw className="h-4 w-4" /> Reset
        </Button>
      </div>

      <div className="text-xs text-teal-600">
        Focus deeply until the candle burns down completely
      </div>
    </Card>
  );
};
