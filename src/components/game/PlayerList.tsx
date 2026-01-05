import { useState } from 'react';
import { RoomPlayer, Vote, GamePhase, RoleType, Player, GameState } from '@/types/game';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skull, User, Check, Target, Shield, Search, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActionConfirmDialog } from './ActionConfirmDialog';

interface PlayerListProps {
  players: (RoomPlayer & { player: Player })[];
  currentPlayerId: string;
  selectedTargetId: string | null;
  votes: Vote[];
  phase: GamePhase;
  canSelect: boolean;
  onSelect: (playerId: string) => void;
  currentRole: RoleType | null;
  gameState?: GameState | null;
}

export function PlayerList({
  players,
  currentPlayerId,
  selectedTargetId,
  votes,
  phase,
  canSelect,
  onSelect,
  currentRole,
  gameState,
}: PlayerListProps) {
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; name: string } | null>(null);
  
  const isNight = phase === 'night';
  const isVoting = phase === 'day_voting';
  const isMafia = currentRole === 'mafia';

  // Check if the current role has already acted based on game state
  const hasAlreadyActed = isNight && gameState && currentRole && {
    mafia: gameState.mafia_target_id !== null,
    doctor: gameState.doctor_target_id !== null,
    detective: gameState.detective_target_id !== null,
    civilian: false,
  }[currentRole];

  // Track who has voted (for thumbs up display)
  const votersSet = new Set<string>();
  votes.forEach(v => {
    votersSet.add(v.voter_id);
  });

  // Filter targets based on role - mafia cannot target other mafia
  // Doctor CAN target themselves (self-save is allowed)
  const getSelectablePlayers = () => {
    if (isNight) {
      if (currentRole === 'mafia') {
        // Mafia can only target non-mafia players
        return players.filter(p => p.role !== 'mafia' && p.is_alive);
      } else if (currentRole === 'doctor') {
        // Doctor can save anyone including themselves
        return players.filter(p => p.is_alive);
      } else if (currentRole === 'detective') {
        // Detective can investigate anyone except themselves
        return players.filter(p => p.is_alive && p.id !== currentPlayerId);
      }
    }
    if (isVoting) {
      return players.filter(p => p.is_alive && p.id !== currentPlayerId);
    }
    return [];
  };

  const selectablePlayers = getSelectablePlayers();
  const selectableIds = new Set(selectablePlayers.map(p => p.id));

  // Disable selection if role has already acted this night
  const canActNow = canSelect && !hasAlreadyActed;

  const getActionButton = (player: RoomPlayer & { player: Player }) => {
    const isSelected = player.id === selectedTargetId || hasAlreadyActed;
    // Doctor can select themselves, so we check selectableIds which already accounts for this
    const isSelectable = canActNow && selectableIds.has(player.id);

    if (!player.is_alive) return null;
    if (!canActNow && !hasAlreadyActed) return null;
    if (!isSelectable && !hasAlreadyActed) return null;

    if (isNight && currentRole) {
      const actionConfig: Record<string, { label: string; icon: React.ReactNode; variant: string }> = {
        mafia: { label: 'Kill', icon: <Target className="w-4 h-4" />, variant: 'destructive' },
        doctor: { label: 'Save', icon: <Shield className="w-4 h-4" />, variant: 'default' },
        detective: { label: 'Check', icon: <Search className="w-4 h-4" />, variant: 'secondary' },
      };

      const config = actionConfig[currentRole];
      if (!config) return null;

      // If already acted, show "Done" badge without button
      if (hasAlreadyActed) {
        return (
          <Badge variant="secondary" className="bg-primary/20 text-primary">
            <Check className="w-3 h-3 mr-1" />
            Submitted
          </Badge>
        );
      }

      return (
        <Button
          size="sm"
          variant={isSelected ? 'default' : 'outline'}
          disabled={isSelected}
          onClick={(e) => {
            e.stopPropagation();
            setConfirmTarget({ id: player.id, name: player.player.nickname });
          }}
          className={cn(
            'min-w-[80px]',
            isSelected && 'bg-primary'
          )}
        >
          {isSelected ? (
            <>
              <Check className="w-4 h-4 mr-1" />
              Done
            </>
          ) : (
            <>
              {config.icon}
              <span className="ml-1">{config.label}</span>
            </>
          )}
        </Button>
      );
    }

    if (isVoting) {
      return (
        <Button
          size="sm"
          variant={isSelected ? 'default' : 'outline'}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(player.id);
          }}
          className="min-w-[80px]"
        >
          {isSelected ? (
            <>
              <Check className="w-4 h-4 mr-1" />
              Voted
            </>
          ) : (
            'Vote'
          )}
        </Button>
      );
    }

    return null;
  };

  const handleConfirmAction = () => {
    if (confirmTarget) {
      onSelect(confirmTarget.id);
      setConfirmTarget(null);
    }
  };

  return (
    <>
      <div className="glass-card rounded-lg p-4">
        <h3 className="font-display text-lg mb-4 flex items-center gap-2">
          <Target className="w-5 h-5" />
          Players
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 text-left">
                <th className="pb-3 font-display text-muted-foreground text-sm">Player</th>
                <th className="pb-3 font-display text-muted-foreground text-sm">Status</th>
                {isVoting && (
                  <th className="pb-3 font-display text-muted-foreground text-sm text-center">Voted</th>
                )}
                {canSelect && (
                  <th className="pb-3 font-display text-muted-foreground text-sm text-right">Action</th>
                )}
              </tr>
            </thead>
            <tbody>
            {players.map((player) => {
                const isMe = player.id === currentPlayerId;
                const isSelected = player.id === selectedTargetId;
                const isMafiaPartner = isNight && isMafia && player.role === 'mafia' && !isMe;
                const showAsMafia = isNight && isMafia && player.role === 'mafia';
                const hasVoted = votersSet.has(player.id);

                return (
                  <tr
                    key={player.id}
                    className={cn(
                      'border-b border-border/20 transition-colors',
                      !player.is_alive && 'opacity-50',
                      isSelected && 'bg-primary/10',
                      isMe && 'bg-accent/10',
                      isMafiaPartner && 'bg-mafia/5'
                    )}
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'font-body font-semibold',
                            !player.is_alive && 'line-through text-muted-foreground',
                            showAsMafia && 'text-mafia'
                          )}
                        >
                          {player.player.nickname}
                        </span>
                        {isMe && (
                          <Badge variant="outline" className="text-xs">
                            <User className="w-3 h-3 mr-1" />
                            You
                          </Badge>
                        )}
                        {isMafiaPartner && (
                          <Badge className="bg-mafia/20 text-mafia border-mafia/30 text-xs">
                            <Skull className="w-3 h-3 mr-1" />
                            Ally
                          </Badge>
                        )}
                        {showAsMafia && isMe && (
                          <Badge className="bg-mafia text-mafia-foreground text-xs">
                            Mafia
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {player.is_alive ? (
                        <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                          Alive
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-destructive/20 text-destructive border-destructive/30">
                          <Skull className="w-3 h-3 mr-1" />
                          Dead
                        </Badge>
                      )}
                    </td>
                    {isVoting && (
                      <td className="py-3 text-center">
                        {player.is_alive && hasVoted && (
                          <ThumbsUp className="w-4 h-4 text-success mx-auto" />
                        )}
                      </td>
                    )}
                    {canSelect && (
                      <td className="py-3 text-right">
                        {getActionButton(player)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {confirmTarget && currentRole && ['mafia', 'doctor', 'detective'].includes(currentRole) && (
        <ActionConfirmDialog
          open={!!confirmTarget}
          onOpenChange={(open) => !open && setConfirmTarget(null)}
          onConfirm={handleConfirmAction}
          role={currentRole}
          targetName={confirmTarget.name}
        />
      )}
    </>
  );
}
