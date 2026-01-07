import { RoleType, ROLE_INFO } from '@/types/game';
import { Skull, Shield, Search, Users, Eye, EyeOff, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface RoleDisplayProps {
  role: RoleType;
  isAlive: boolean;
}

const roleIcons = {
  mafia: Skull,
  doctor: Shield,
  detective: Search,
  civilian: Users,
};

export function RoleDisplay({ role, isAlive }: RoleDisplayProps) {
  const [isVisible, setIsVisible] = useState(true);
  const info = ROLE_INFO[role];
  
  // When hidden, use anonymous styling
  const Icon = isVisible ? roleIcons[role] : HelpCircle;
  
  // Role-specific styles (only applied when visible)
  const getRoleStyles = () => {
    if (!isVisible) {
      return {
        bg: 'bg-muted/30',
        text: 'text-muted-foreground',
        border: 'border-muted-foreground/20',
        badgeBg: 'bg-muted',
        badgeText: 'text-muted-foreground'
      };
    }
    
    switch (role) {
      case 'mafia':
        return {
          bg: 'bg-red-500/10',
          text: 'text-red-400',
          border: 'border-red-500/30',
          badgeBg: 'bg-red-500/20',
          badgeText: 'text-red-400'
        };
      case 'doctor':
        return {
          bg: 'bg-emerald-500/10',
          text: 'text-emerald-400',
          border: 'border-emerald-500/30',
          badgeBg: 'bg-emerald-500/20',
          badgeText: 'text-emerald-400'
        };
      case 'detective':
        return {
          bg: 'bg-blue-500/10',
          text: 'text-blue-400',
          border: 'border-blue-500/30',
          badgeBg: 'bg-blue-500/20',
          badgeText: 'text-blue-400'
        };
      default:
        return {
          bg: 'bg-gray-500/10',
          text: 'text-gray-400',
          border: 'border-gray-500/30',
          badgeBg: 'bg-gray-500/20',
          badgeText: 'text-gray-400'
        };
    }
  };

  const styles = getRoleStyles();

  return (
    <div className={cn(
      "rounded-xl p-2 sm:p-4 mt-2 sm:mt-4 border-2 transition-all duration-300",
      styles.bg,
      styles.border
    )}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className={cn("p-2 sm:p-3 rounded-full shrink-0", styles.badgeBg)}>
            <Icon className={cn("w-4 h-4 sm:w-6 sm:h-6", styles.text)} />
          </div>
          
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">Your Role</span>
            <div className="flex items-center gap-1 sm:gap-3 flex-wrap">
              <span className={cn("font-display text-base sm:text-xl font-bold uppercase tracking-wide", styles.text)}>
                {isVisible ? info.name : 'Hidden'}
              </span>
              {!isAlive && (
                <Badge variant="destructive" className="text-[10px] sm:text-xs px-1 py-0">
                  <Skull className="w-2 h-2 sm:w-3 sm:h-3 mr-0.5" />
                  Dead
                </Badge>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsVisible(!isVisible)}
          className={cn(
            "p-2 sm:p-3 rounded-full transition-colors shrink-0",
            isVisible 
              ? "hover:bg-secondary/50 text-muted-foreground hover:text-foreground" 
              : "bg-primary/10 text-primary hover:bg-primary/20"
          )}
          title={isVisible ? "Hide role" : "Show role"}
        >
          {isVisible ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>
      </div>

      {isVisible && (
        <p className="text-xs sm:text-sm text-muted-foreground mt-2 sm:mt-3 pl-8 sm:pl-16 hidden sm:block">
          {info.description}
        </p>
      )}
    </div>
  );
}
