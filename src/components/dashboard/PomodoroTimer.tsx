import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, RotateCcw, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

type TimerMode = "work" | "shortBreak";

interface PomodoroSettings {
  workTime: number; // in minutes
  shortBreakTime: number;
}

export const PomodoroTimer = () => {
  const [settings, setSettings] = useState<PomodoroSettings>({
    workTime: 25,
    shortBreakTime: 5,
  });
  const [mode, setMode] = useState<TimerMode>("work");
  const [timeLeft, setTimeLeft] = useState(settings.workTime * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

  const getCurrentModeTime = useCallback(() => {
    return mode === "work" ? settings.workTime * 60 : settings.shortBreakTime * 60;
  }, [mode, settings]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStart = () => setIsActive(true);
  const handlePause = () => setIsActive(false);
  const handleReset = () => {
    setIsActive(false);
    setTimeLeft(getCurrentModeTime());
  };
  const handleSkip = () => {
    setIsActive(false);
    completeSession();
  };

  const completeSession = () => {
    if (mode === "work") {
      setMode("shortBreak");
      setTimeLeft(settings.shortBreakTime * 60);
      setSessionCount((c) => c + 1);
    } else {
      setMode("work");
      setTimeLeft(settings.workTime * 60);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            setIsActive(false);
            completeSession();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  const progress = ((getCurrentModeTime() - timeLeft) / getCurrentModeTime()) * 100;

  const modeConfig = {
    work: {
      label: "Work Session",
      textColor: "text-teal-600",
      bgColor: "bg-teal-200",
    },
    shortBreak: {
      label: "Break",
      textColor: "text-teal-500",
      
      bgColor: "bg-teal-100",
    },
  };

  const currentMode = modeConfig[mode];

  return (
    <Card className={cn(
      "p-6 text-center space-y-6 transition-all duration-300 border-2 border-teal-100 bg-teal-50 rounded-lg",
      
    )}>
      {/* Timer Settings */}
      <div className="flex justify-center gap-4 mb-4">
        <div className="space-y-1">
          <label className="text-sm font-semibold text-teal-600">Study Duration </label>
          <input 
            type="number"
            min={1}
            value={settings.workTime}
            onChange={(e) => {
              const val = Number(e.target.value);
              setSettings((s) => ({ ...s, workTime: val }));
              if (mode === "work") setTimeLeft(val * 60);
            }}
            className="w-20 text-center border border-teal-400 rounded-md bg-teal-200 text-teal-600 hover:border-teal-700"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold text-teal-600">Break Duration </label>
          <input
            type="number"
            min={1}
            value={settings.shortBreakTime}
            onChange={(e) => {
              const val = Number(e.target.value);
              setSettings((s) => ({ ...s, shortBreakTime: val }));
              if (mode === "shortBreak") setTimeLeft(val * 60);
            }}
            className="w-20 text-center border border-teal-400 rounded-md bg-teal-200 text-teal-600 hover:border-teal-700"
          />
        </div>
      </div>

      {/* Timer Display */}
      <div className="space-y-2">
        <h3 className={cn("text-lg font-semibold", currentMode.textColor)}>
          {currentMode.label}
        </h3>
        <p className="text-sm text-muted-foreground">Session {sessionCount + 1}</p>
        <div className={cn("text-6xl font-mono font-bold mb-4 transition-colors", currentMode.textColor)}>
          {formatTime(timeLeft)}
        </div>
        <div className="w-full max-w-xs mx-auto">
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3">
        {!isActive ? (
          <Button onClick={handleStart} className="bg-teal-600 hover:bg-teal-700 text-teal-200 hover:text-teal-200  flex items-center gap-2">
            <Play className="h-5 w-5" /> Start
          </Button>
        ) : (
          <Button onClick={handlePause} variant="outline" className="bg-teal-600 hover:bg-teal-700 hover:text-teal-200 text-teal-200 flex items-center gap-2">
            <Pause className="h-5 w-5" /> Pause
          </Button>
        )}
        <Button onClick={handleReset} variant="outline" className="bg-teal-600 hover:bg-teal-700 hover:text-teal-200  text-teal-200 flex items-center gap-2">
          <RotateCcw className="h-4 w-4" /> Reset
        </Button>
        <Button onClick={handleSkip} variant="outline" className="bg-teal-600 hover:bg-teal-700 hover:text-teal-200 text-teal-200 flex items-center gap-2">
          <SkipForward className="h-4 w-4" /> Swap
        </Button>
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>Sessions completed: {sessionCount}</p>
        <p>Next: {mode === "work" ? "Break" : "Work Session"}</p>
      </div>
    </Card>
  );
};
