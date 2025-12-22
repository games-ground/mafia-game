import { RoleType, ROLE_INFO } from '@/types/game';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skull, Shield, Search, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  mafia: { border: 'border-mafia', bg: 'bg-mafia/20', text: 'text-mafia' },
  doctor: { border: 'border-doctor', bg: 'bg-doctor/20', text: 'text-doctor' },
  detective: { border: 'border-detective', bg: 'bg-detective/20', text: 'text-detective' },
  civilian: { border: 'border-civilian', bg: 'bg-civilian/20', text: 'text-civilian' },
};

export function RoleCard({ role, onDismiss }: RoleCardProps) {
  const Icon = roleIcons[role];
  const info = ROLE_INFO[role];
  const styles = roleStyles[role];

  return (
    <Card className={cn("glass-card max-w-md w-full mx-4 border-2 animate-slide-up", styles.border)}>
      <CardContent className="pt-8 pb-6 text-center">
        <div className={cn("inline-flex p-4 rounded-full mb-4", styles.bg)}>
          <Icon className={cn("w-12 h-12", styles.text)} />
        </div>
        
        <h2 className={cn("font-display text-3xl font-bold mb-2", styles.text)}>
          {info.name}
        </h2>
        
        <p className="text-muted-foreground mb-6 font-body">
          {info.description}
        </p>

        <Button onClick={onDismiss} className="hover-glow">
          I Understand
        </Button>

        <p className="text-xs text-muted-foreground mt-4">
          Keep your role secret!
        </p>
      </CardContent>
    </Card>
  );
}
