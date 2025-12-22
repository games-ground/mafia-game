import { RoomPlayer, Vote, GamePhase, RoleType, Player } from '@/types/game';
import { Badge } from '@/components/ui/badge';
import { Skull, Target, Check, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlayerGridProps {
  players: (RoomPlayer & { player: Player })[];
  currentPlayerId: string;
  selectedTargetId: string | null;
  votes: Vote[];
  phase: GamePhase;
  canSelect: boolean;
  onSelect: (playerId: string) => void;
  currentRole: RoleType | null;
}

export function PlayerGrid({
  players,
  currentPlayerId,
  selectedTargetId,
  votes,
  phase,
  canSelect,
  onSelect,
  currentRole,
}: PlayerGridProps) {
  const isNight = phase === 'night';
  const isVoting = phase === 'day_voting';
  const isMafia = currentRole === 'mafia';

  // Count votes per player
  const voteCount: Record<string, number> = {};
  votes.forEach(v => {
    if (v.target_id) {
      voteCount[v.target_id] = (voteCount[v.target_id] || 0) + 1;
    }
  });

  // Filter targets based on role
  const getSelectablePlayers = () => {
    if (isNight) {
      if (currentRole === 'mafia') {
        // Mafia can only target non-mafia
        return players.filter(p => p.role !== 'mafia' && p.is_alive);
      } else if (currentRole === 'doctor' || currentRole === 'detective') {
        // Doctor and Detective can target anyone alive
        return players.filter(p => p.is_alive);
      }
    }
    if (isVoting) {
      // Can vote for anyone alive except self
      return players.filter(p => p.is_alive && p.id !== currentPlayerId);
    }
    return [];
  };

  const selectablePlayers = getSelectablePlayers();
  const selectableIds = new Set(selectablePlayers.map(p => p.id));

  return (
    <div className="glass-card rounded-lg p-4">
      <h3 className="font-display text-lg mb-4 flex items-center gap-2">
        <Target className="w-5 h-5" />
        Players
      </h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {players.map((player) => {
          const isMe = player.id === currentPlayerId;
          const isSelected = player.id === selectedTargetId;
          const isSelectable = canSelect && selectableIds.has(player.id) && !isMe;
          const votesReceived = voteCount[player.id] || 0;
          const showAsMafia = isNight && isMafia && player.role === 'mafia';

          return (
            <button
              key={player.id}
              onClick={() => isSelectable && onSelect(player.id)}
              disabled={!isSelectable}
              className={cn(
                'relative p-4 rounded-lg border transition-all text-left',
                player.is_alive 
                  ? 'bg-secondary/50 border-border/50' 
                  : 'bg-muted/30 border-muted opacity-50',
                isSelectable && 'hover:border-primary hover:bg-secondary cursor-pointer',
                isSelected && 'border-primary bg-primary/20 ring-2 ring-primary',
                isMe && 'ring-1 ring-accent/50',
                showAsMafia && 'border-mafia/50'
              )}
            >
              {/* Status Icons */}
              <div className="absolute top-2 right-2 flex gap-1">
                {isMe && (
                  <User className="w-4 h-4 text-primary" />
                )}
                {!player.is_alive && (
                  <Skull className="w-4 h-4 text-destructive" />
                )}
                {isSelected && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </div>

              {/* Player Info */}
              <div className="space-y-1">
                <p className={cn(
                  'font-body font-semibold truncate',
                  !player.is_alive && 'line-through text-muted-foreground',
                  showAsMafia && 'text-mafia'
                )}>
                  {player.player.nickname}
                </p>
                
                {/* Show role to mafia at night */}
                {showAsMafia && (
                  <Badge className="bg-mafia text-mafia-foreground text-xs">
                    Mafia
                  </Badge>
                )}

                {/* Vote count during voting */}
                {isVoting && votesReceived > 0 && player.is_alive && (
                  <Badge variant="destructive" className="text-xs">
                    {votesReceived} vote{votesReceived !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
