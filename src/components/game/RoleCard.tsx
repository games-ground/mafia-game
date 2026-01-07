import { RoleType, ROLE_INFO } from '@/types/game';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skull, Shield, Search, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface RoleCardProps {
  role: RoleType;
  onDismiss: () => void;
}

const roleIcons = {
  mafia: Skull,
  doctor: Shield,
  detective: Search,
  civilian: Users,
};

const roleStyles = {
  mafia: { border: 'border-mafia', bg: 'bg-mafia/20', text: 'text-mafia', glow: 'shadow-[0_0_60px_rgba(239,68,68,0.4)]' },
  doctor: { border: 'border-doctor', bg: 'bg-doctor/20', text: 'text-doctor', glow: 'shadow-[0_0_60px_rgba(16,185,129,0.4)]' },
  detective: { border: 'border-detective', bg: 'bg-detective/20', text: 'text-detective', glow: 'shadow-[0_0_60px_rgba(59,130,246,0.4)]' },
  civilian: { border: 'border-civilian', bg: 'bg-civilian/20', text: 'text-civilian', glow: 'shadow-[0_0_60px_rgba(156,163,175,0.4)]' },
};

export function RoleCard({ role, onDismiss }: RoleCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const Icon = roleIcons[role];
  const info = ROLE_INFO[role];
  const styles = roleStyles[role];

  // Trigger flip animation after mount
  useEffect(() => {
    const timeout = setTimeout(() => setIsFlipped(true), 300);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="perspective-1000 w-full max-w-md mx-4">
      <div className={cn(
        "relative w-full transition-transform duration-700 transform-style-3d",
        isFlipped && "rotate-y-180"
      )}>
        {/* Back of card (shown first) */}
        <div className="absolute inset-0 backface-hidden">
          <Card className="glass-card w-full border-2 border-accent/50 h-80 flex items-center justify-center">
            <CardContent className="text-center py-8">
              <div className="inline-flex p-6 rounded-full bg-accent/20 mb-4 animate-pulse">
                <Skull className="w-16 h-16 text-accent" />
              </div>
              <p className="font-display text-2xl text-muted-foreground tracking-widest">
                YOUR ROLE
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Front of card (role reveal) */}
        <div className="backface-hidden rotate-y-180">
          <Card className={cn(
            "glass-card w-full border-2 transition-shadow duration-500",
            styles.border,
            isFlipped && styles.glow
          )}>
            <CardContent className="pt-8 pb-6 text-center">
              <div className={cn(
                "inline-flex p-5 rounded-full mb-4 transition-transform duration-500",
                styles.bg,
                isFlipped && "scale-110"
              )}>
                <Icon className={cn("w-14 h-14", styles.text)} />
              </div>
              
              <h2 className={cn(
                "font-display text-4xl font-bold mb-3 tracking-wider uppercase",
                styles.text
              )}>
                {info.name}
              </h2>
              
              <p className="text-muted-foreground mb-6 font-body text-base">
                {info.description}
              </p>

              <Button onClick={onDismiss} className="hover-glow px-8">
                I Understand
              </Button>

              <p className="text-xs text-muted-foreground mt-4 italic">
                Keep your role secret!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
