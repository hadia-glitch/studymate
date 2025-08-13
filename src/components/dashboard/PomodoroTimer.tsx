import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, RotateCcw, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

type TimerMode = "work" | "shortBreak" | "longBreak";

interface PomodoroSettings {
  workTime: number; // in minutes
  shortBreakTime: number;
  longBreakTime: number;
  sessionsUntilLongBreak: number;
}

const defaultSettings: PomodoroSettings = {
  workTime: 25,
  shortBreakTime: 5,
  longBreakTime: 15,
  sessionsUntilLongBreak: 4,
};

export const PomodoroTimer = () => {
  const [settings] = useState<PomodoroSettings>(defaultSettings);
  const [mode, setMode] = useState<TimerMode>("work");
  const [timeLeft, setTimeLeft] = useState(settings.workTime * 60); // in seconds
  const [isActive, setIsActive] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

  const getCurrentModeTime = useCallback(() => {
    switch (mode) {
      case "work":
        return settings.workTime * 60;
      case "shortBreak":
        return settings.shortBreakTime * 60;
      case "longBreak":
        return settings.longBreakTime * 60;
      default:
        return settings.workTime * 60;
    }
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
      const newSessionCount = sessionCount + 1;
      setSessionCount(newSessionCount);
      
      if (newSessionCount % settings.sessionsUntilLongBreak === 0) {
        setMode("longBreak");
        setTimeLeft(settings.longBreakTime * 60);
      } else {
        setMode("shortBreak");
        setTimeLeft(settings.shortBreakTime * 60);
      }
    } else {
      setMode("work");
      setTimeLeft(settings.workTime * 60);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => {
          if (time <= 1) {
            setIsActive(false);
            completeSession();
            return 0;
          }
          return time - 1;
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
      color: "timer-active",
      bgColor: "bg-primary/10",
      textColor: "text-primary",
    },
    shortBreak: {
      label: "Short Break",
      color: "timer-break",
      bgColor: "bg-warning/10",
      textColor: "text-warning",
    },
    longBreak: {
      label: "Long Break",
      color: "timer-long-break",
      bgColor: "bg-secondary/10",
      textColor: "text-secondary-dark",
    },
  };

  const currentMode = modeConfig[mode];

  return (
    <Card className={cn(
      "p-6 text-center space-y-6 transition-all duration-300",
      currentMode.bgColor,
      isActive && "animate-timer-pulse"
    )}>
      <div className="space-y-2">
        <h3 className={cn("text-lg font-semibold", currentMode.textColor)}>
          {currentMode.label}
        </h3>
        <p className="text-sm text-muted-foreground">
          Session {sessionCount + 1}
        </p>
      </div>

      <div className="relative">
        <div className={cn(
          "text-6xl font-mono font-bold mb-4 transition-colors",
          currentMode.textColor
        )}>
          {formatTime(timeLeft)}
        </div>
        
        <div className="w-full max-w-xs mx-auto">
          <Progress 
            value={progress} 
            className="h-2"
          />
        </div>
      </div>

      <div className="flex justify-center gap-3">
        {!isActive ? (
          <Button
            onClick={handleStart}
            variant="default"
            size="lg"
            className="bg-primary hover:bg-primary/90"
          >
            <Play className="h-5 w-5 mr-2" />
            Start
          </Button>
        ) : (
          <Button
            onClick={handlePause}
            variant="outline"
            size="lg"
          >
            <Pause className="h-5 w-5 mr-2" />
            Pause
          </Button>
        )}
        
        <Button
          onClick={handleReset}
          variant="outline"
          size="lg"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        
        <Button
          onClick={handleSkip}
          variant="outline"
          size="lg"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>Sessions completed: {sessionCount}</p>
        <p>Next: {mode === "work" ? 
          (sessionCount + 1) % settings.sessionsUntilLongBreak === 0 ? "Long Break" : "Short Break"
          : "Work Session"
        }</p>
      </div>
    </Card>
  );
};