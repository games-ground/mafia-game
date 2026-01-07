import { GamePhase, RoleType } from '@/types/game';
import { Moon, Sun, Vote, Skull } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhaseHeaderProps {
  phase: GamePhase;
  dayNumber: number;
  timeLeft: number;
  showTimer: boolean;
  detectiveResult: string | null;
  role: RoleType | null;
}

export function PhaseHeader({
  phase,
  dayNumber,
  timeLeft,
  showTimer,
  detectiveResult,
  role,
}: PhaseHeaderProps) {
  const phaseInfo = {
    night: { 
      icon: Moon, 
      label: 'Night', 
      subtitle: 'Special roles perform their actions',
      bgClass: 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900',
      iconBg: 'bg-indigo-900/50',
      textClass: 'text-indigo-300',
      borderClass: 'border-indigo-500/30'
    },
    day_discussion: { 
      icon: Sun, 
      label: 'Discussion', 
      subtitle: 'Discuss and find the mafia',
      bgClass: 'bg-gradient-to-r from-amber-900/50 via-orange-800/50 to-amber-900/50',
      iconBg: 'bg-amber-800/50',
      textClass: 'text-amber-300',
      borderClass: 'border-amber-500/30'
    },
    day_voting: { 
      icon: Vote, 
      label: 'Voting', 
      subtitle: 'Vote to eliminate a suspect',
      bgClass: 'bg-gradient-to-r from-orange-900/50 via-yellow-800/50 to-orange-900/50',
      iconBg: 'bg-orange-800/50',
      textClass: 'text-orange-300',
      borderClass: 'border-orange-500/30'
    },
    lobby: { 
      icon: Sun, 
      label: 'Lobby', 
      subtitle: 'Waiting for players',
      bgClass: 'bg-secondary',
      iconBg: 'bg-muted',
      textClass: 'text-muted-foreground',
      borderClass: 'border-border'
    },
    game_over: { 
      icon: Skull, 
      label: 'Game Over', 
      subtitle: 'The game has ended',
      bgClass: 'bg-gradient-to-r from-red-950 via-destructive/30 to-red-950',
      iconBg: 'bg-destructive/30',
      textClass: 'text-destructive',
      borderClass: 'border-destructive/30'
    },
  };

  const current = phaseInfo[phase];
  const Icon = current.icon;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  return (
    <div className={cn(
      "rounded-xl p-2 sm:p-4 border-2 transition-all duration-500",
      current.bgClass,
      current.borderClass
    )}>
      <div className="flex items-center justify-between gap-2">
        {/* Phase Info */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className={cn("p-2 sm:p-3 rounded-full shrink-0", current.iconBg)}>
            <Icon className={cn("w-4 h-4 sm:w-6 sm:h-6", current.textClass)} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <span className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">Day {dayNumber}</span>
              <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">•</span>
              <h2 className={cn("font-display text-sm sm:text-lg font-bold uppercase tracking-wider", current.textClass)}>
                {current.label}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{current.subtitle}</p>
          </div>
        </div>

        {/* Timer - only show if showTimer is true */}
        {showTimer && phase !== 'lobby' && phase !== 'game_over' && (
          <div className="text-center shrink-0">
            <p className={cn(
              "font-display text-lg sm:text-2xl font-bold tabular-nums",
              timeLeft <= 10 ? 'text-destructive animate-pulse' : current.textClass
            )}>
              {formatTime(timeLeft)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}