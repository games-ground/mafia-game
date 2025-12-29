import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CountdownOverlayProps {
  seconds: number;
  onComplete: () => void;
  message?: string;
}

export function CountdownOverlay({ seconds, onComplete, message = "Phase ending" }: CountdownOverlayProps) {
  const [count, setCount] = useState(seconds);

  useEffect(() => {
    if (count <= 0) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setCount(c => c - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [count, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="text-center">
        <p className="text-muted-foreground text-lg mb-4">{message}</p>
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
      </div>
    </div>
  );
}
