import { RoleType, ROLE_INFO } from '@/types/game';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Target } from 'lucide-react';

interface NightActionsProps {
  role: RoleType | null;
  hasActed: boolean;
}

export function NightActions({ role, hasActed }: NightActionsProps) {
  if (!role || !['mafia', 'doctor', 'detective'].includes(role)) {
    return (
      <Card className="glass-card">
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground italic">
            🌙 The night is quiet. Wait for dawn...
          </p>
        </CardContent>
      </Card>
    );
  }

  const actionText = {
    mafia: 'Choose someone to eliminate',
    doctor: 'Choose someone to protect',
    detective: 'Choose someone to investigate',
  }[role];

  return (
    <Card className={`glass-card border-${ROLE_INFO[role].color}/30`}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          {hasActed ? (
            <Check className={`w-6 h-6 text-${ROLE_INFO[role].color}`} />
          ) : (
            <Target className={`w-6 h-6 text-${ROLE_INFO[role].color} animate-pulse`} />
          )}
          <div>
            <p className={`font-display font-bold text-${ROLE_INFO[role].color}`}>
              {ROLE_INFO[role].name} Action
            </p>
            <p className="text-sm text-muted-foreground">
              {hasActed ? 'Target selected. Waiting for dawn...' : actionText}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
