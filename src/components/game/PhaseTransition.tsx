import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhaseTransitionProps {
  phase: 'night' | 'day';
  onComplete: () => void;
}

export function PhaseTransition({ phase, onComplete }: PhaseTransitionProps) {
  const [animationStage, setAnimationStage] = useState<'enter' | 'hold' | 'exit'>('enter');

  useEffect(() => {
    // Enter stage
    const enterTimeout = setTimeout(() => {
      setAnimationStage('hold');
    }, 600);

    // Hold stage
    const holdTimeout = setTimeout(() => {
      setAnimationStage('exit');
    }, 1800);

    // Exit and complete
    const completeTimeout = setTimeout(() => {
      onComplete();
    }, 2400);

    return () => {
      clearTimeout(enterTimeout);
      clearTimeout(holdTimeout);
      clearTimeout(completeTimeout);
    };
  }, [onComplete]);

  const isNight = phase === 'night';

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] flex items-center justify-center pointer-events-none",
        "transition-opacity duration-500",
        animationStage === 'enter' && "opacity-100",
        animationStage === 'hold' && "opacity-100",
        animationStage === 'exit' && "opacity-0"
      )}
    >
      {/* Background overlay with gradient animation */}
      <div
        className={cn(
          "absolute inset-0 transition-all duration-700",
          isNight
            ? "bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950"
            : "bg-gradient-to-b from-amber-200 via-orange-100 to-yellow-50"
        )}
        style={{
          opacity: animationStage === 'exit' ? 0 : 0.95,
        }}
      />

      {/* Animated stars for night */}
      {isNight && (
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white animate-pulse"
              style={{
                width: Math.random() * 3 + 1,
                height: Math.random() * 3 + 1,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                opacity: animationStage === 'enter' ? 0 : 0.8,
                transition: 'opacity 0.5s ease-in',
              }}
            />
          ))}
        </div>
      )}

      {/* Sun rays for day */}
      {!isNight && (
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-gradient-to-b from-yellow-300/40 to-transparent"
              style={{
                width: 4,
                height: '50%',
                left: '50%',
                top: '0',
                transformOrigin: '50% 100%',
                transform: `translateX(-50%) rotate(${i * 30}deg)`,
                opacity: animationStage === 'hold' ? 0.6 : 0,
                transition: 'opacity 0.5s ease-in-out',
              }}
            />
          ))}
        </div>
      )}

      {/* Central icon with animation */}
      <div
        className={cn(
          "relative z-10 flex flex-col items-center gap-4 transition-all duration-500",
          animationStage === 'enter' && "scale-50 opacity-0",
          animationStage === 'hold' && "scale-100 opacity-100",
          animationStage === 'exit' && "scale-150 opacity-0"
        )}
      >
        <div
          className={cn(
            "relative p-6 rounded-full",
            isNight
              ? "bg-indigo-800/50 shadow-[0_0_60px_20px_rgba(99,102,241,0.4)]"
              : "bg-amber-400/50 shadow-[0_0_60px_20px_rgba(251,191,36,0.5)]"
          )}
        >
          {isNight ? (
            <Moon className="w-16 h-16 text-indigo-200" />
          ) : (
            <Sun className="w-16 h-16 text-amber-600" />
          )}
        </div>
        
        <h2
          className={cn(
            "font-display text-3xl md:text-4xl font-bold tracking-widest uppercase",
            isNight ? "text-indigo-100" : "text-amber-800"
          )}
        >
          {isNight ? 'Night Falls' : 'Dawn Breaks'}
        </h2>
        
        <p
          className={cn(
            "font-body text-lg",
            isNight ? "text-indigo-300" : "text-amber-700"
          )}
        >
          {isNight ? 'The town sleeps...' : 'A new day begins'}
        </p>
      </div>

      {/* Horizon line effect */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-32",
          isNight
            ? "bg-gradient-to-t from-slate-950 to-transparent"
            : "bg-gradient-to-t from-orange-200/50 to-transparent"
        )}
      />
    </div>
  );
}