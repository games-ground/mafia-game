import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, Moon, Sun } from 'lucide-react';
import { useSoundEffects } from '@/hooks/useSoundEffects';

type Phase = 'night' | 'day_discussion' | 'day_voting' | 'lobby' | 'game_over';

interface CountdownOverlayProps {
  seconds: number;
  onComplete: () => void;
  message?: string;
  countdownKey?: string;
  phase?: Phase;
}

export function CountdownOverlay({ 
  seconds, 
  onComplete, 
  message = "Phase ending",
  countdownKey,
  phase = 'night'
}: CountdownOverlayProps) {
  const [count, setCount] = useState(seconds);
  const [isWaitingForServer, setIsWaitingForServer] = useState(false);
  const hasCompletedRef = useRef(false);
  const countdownKeyRef = useRef(countdownKey);
  const onCompleteRef = useRef(onComplete);
  const { playSound } = useSoundEffects();
  
  // Keep onComplete ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Prevent re-counting if key hasn't changed
  useEffect(() => {
    if (countdownKey !== countdownKeyRef.current) {
      countdownKeyRef.current = countdownKey;
      setCount(seconds);
      setIsWaitingForServer(false);
      hasCompletedRef.current = false;
    }
  }, [countdownKey, seconds]);

  useEffect(() => {
    if (hasCompletedRef.current) return;
    
    if (count <= 0) {
      if (!isWaitingForServer) {
        setIsWaitingForServer(true);
        hasCompletedRef.current = true;
        onCompleteRef.current();
      }
      return;
    }

    // Play tick sound
    if (count <= 3) {
      playSound(count === 1 ? 'finalTick' : 'tick');
    }

    const timer = setTimeout(() => {
      setCount(c => c - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [count, isWaitingForServer, playSound]);

  // Phase-specific background colors (opaque)
  const getPhaseBackground = () => {
    switch (phase) {
      case 'night':
        return 'bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900';
      case 'day_voting':
        return 'bg-gradient-to-b from-amber-950 via-orange-950 to-amber-900';
      case 'day_discussion':
        return 'bg-gradient-to-b from-amber-100 via-orange-100 to-amber-200';
      default:
        return 'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900';
    }
  };

  const isNight = phase === 'night';
  const textColor = isNight || phase === 'day_voting' ? 'text-foreground' : 'text-slate-900';

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center animate-fade-in",
      getPhaseBackground()
    )}>
      {/* Phase icon */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2">
        {isNight ? (
          <Moon className={cn("w-12 h-12 text-indigo-300 opacity-50")} />
        ) : (
          <Sun className={cn("w-12 h-12", phase === 'day_voting' ? 'text-orange-300' : 'text-amber-500', "opacity-50")} />
        )}
      </div>

      <div className="text-center">
        <p className={cn("text-lg mb-4 opacity-80", textColor)}>{message}</p>
        {isWaitingForServer ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-16 h-16 text-primary animate-spin" />
            <p className={cn("opacity-80", textColor)}>Processing...</p>
          </div>
        ) : (
          <div 
            className={cn(
              "font-display text-9xl font-bold transition-all duration-300",
              textColor,
              count === 3 && "scale-100 opacity-100",
              count === 2 && "scale-110 opacity-100",
              count === 1 && "scale-125 animate-pulse"
            )}
          >
            {count}
          </div>
        )}
      </div>
    </div>
  );
}
