import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface CountdownOverlayProps {
  seconds: number;
  onComplete: () => void;
  message?: string;
  countdownKey?: string; // Unique key to prevent re-counting
}

export function CountdownOverlay({ 
  seconds, 
  onComplete, 
  message = "Phase ending",
  countdownKey 
}: CountdownOverlayProps) {
  const [count, setCount] = useState(seconds);
  const [isWaitingForServer, setIsWaitingForServer] = useState(false);
  const hasCompletedRef = useRef(false);
  const countdownKeyRef = useRef(countdownKey);

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
        onComplete();
      }
      return;
    }

    const timer = setTimeout(() => {
      setCount(c => c - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [count, onComplete, isWaitingForServer]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="text-center">
        <p className="text-muted-foreground text-lg mb-4">{message}</p>
        {isWaitingForServer ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-16 h-16 text-primary animate-spin" />
            <p className="text-muted-foreground">Processing...</p>
          </div>
        ) : (
          <div 
            className={cn(
              "font-display text-9xl font-bold transition-all duration-300",
              count === 3 && "text-warning scale-100",
              count === 2 && "text-warning scale-110",
              count === 1 && "text-destructive scale-125 animate-pulse"
            )}
          >
            {count}
          </div>
        )}
      </div>
    </div>
  );
}
