import { useState, useEffect } from 'react';
import { Vote, RoomPlayer, Player } from '@/types/game';
import { Skull, Check, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSoundEffects } from '@/hooks/useSoundEffects';

interface VotingSummaryProps {
  votes: Vote[];
  roomPlayers: (RoomPlayer & { player: Player })[];
  isHost: boolean;
  onContinue: () => void;
  isAdvancing: boolean;
}

export function VotingSummary({ 
  votes, 
  roomPlayers, 
  isHost, 
  onContinue,
  isAdvancing 
}: VotingSummaryProps) {
  const [animationStage, setAnimationStage] = useState<'enter' | 'results' | 'ready'>('enter');
  const { playSound } = useSoundEffects();

  useEffect(() => {
    // Play vote result sound
    playSound('voteResult');
    
    const enterTimeout = setTimeout(() => setAnimationStage('results'), 500);
    const readyTimeout = setTimeout(() => setAnimationStage('ready'), 1500);
    
    return () => {
      clearTimeout(enterTimeout);
      clearTimeout(readyTimeout);
    };
  }, [playSound]);

  // Count votes for each player
  const voteCounts: Record<string, number> = {};
  for (const vote of votes) {
    if (vote.target_id) {
      voteCounts[vote.target_id] = (voteCounts[vote.target_id] || 0) + 1;
    }
  }

  // Find who was eliminated
  let maxVotes = 0;
  let eliminatedId: string | null = null;
  let tiedPlayers: string[] = [];

  for (const [targetId, count] of Object.entries(voteCounts)) {
    if (count > maxVotes) {
      maxVotes = count;
      eliminatedId = targetId;
      tiedPlayers = [targetId];
    } else if (count === maxVotes && maxVotes > 0) {
      tiedPlayers.push(targetId);
    }
  }

  const hasTie = tiedPlayers.length > 1;
  const eliminatedPlayer = !hasTie && eliminatedId ? roomPlayers.find(p => p.id === eliminatedId) : null;
  const alivePlayers = roomPlayers.filter(p => p.is_alive);

  // Sort players by vote count
  const sortedPlayers = [...alivePlayers].sort((a, b) => {
    return (voteCounts[b.id] || 0) - (voteCounts[a.id] || 0);
  });

  return (
    <div className={cn(
      "fixed inset-0 z-[55] flex items-center justify-center",
      "transition-opacity duration-500",
      animationStage === 'enter' ? "opacity-0" : "opacity-100"
    )}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-orange-950 via-amber-900/90 to-slate-950 backdrop-blur-sm" />
      
      <div className={cn(
        "relative z-10 w-full max-w-md mx-4 transition-all duration-500",
        animationStage === 'enter' && "scale-90 opacity-0",
        animationStage === 'results' && "scale-100 opacity-100",
        animationStage === 'ready' && "scale-100 opacity-100"
      )}>
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="font-display text-2xl sm:text-3xl text-amber-200 uppercase tracking-widest mb-2">
            Voting Results
          </h2>
          <div className="h-1 w-24 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent mx-auto" />
        </div>

        {/* Results */}
        <div className="glass-card p-4 rounded-xl mb-6 max-h-[40vh] overflow-y-auto">
          {sortedPlayers.map((player, index) => {
            const voteCount = voteCounts[player.id] || 0;
            const isEliminated = !hasTie && player.id === eliminatedId;
            
            return (
              <div
                key={player.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg mb-2 last:mb-0",
                  "transition-all duration-300",
                  isEliminated && "bg-destructive/20 border border-destructive/40",
                  !isEliminated && "bg-secondary/30"
                )}
                style={{ 
                  transitionDelay: `${index * 100}ms`,
                  opacity: animationStage === 'enter' ? 0 : 1,
                  transform: animationStage === 'enter' ? 'translateX(-20px)' : 'translateX(0)'
                }}
              >
                <div className="flex items-center gap-3">
                  {isEliminated ? (
                    <Skull className="w-5 h-5 text-destructive" />
                  ) : (
                    <Users className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className={cn(
                    "font-body font-medium",
                    isEliminated && "text-destructive line-through"
                  )}>
                    {player.player.nickname}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "font-display text-lg",
                    voteCount > 0 ? "text-warning" : "text-muted-foreground"
                  )}>
                    {voteCount}
                  </span>
                  <span className="text-xs text-muted-foreground">votes</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary message */}
        <div className={cn(
          "text-center mb-6 transition-all duration-500",
          animationStage !== 'ready' && "opacity-0 translate-y-4"
        )}>
          {eliminatedPlayer ? (
            <p className="text-lg text-amber-200">
              <span className="text-destructive font-bold">{eliminatedPlayer.player.nickname}</span> has been eliminated
            </p>
          ) : hasTie ? (
            <p className="text-lg text-amber-200">
              The vote ended in a <span className="text-warning font-bold">tie</span>. No one was eliminated.
            </p>
          ) : (
            <p className="text-lg text-amber-200">
              No one received enough votes. <span className="text-muted-foreground">The town spares everyone.</span>
            </p>
          )}
        </div>

        {/* Continue button for host */}
        <div className={cn(
          "flex justify-center transition-all duration-500",
          animationStage !== 'ready' && "opacity-0"
        )}>
          {isHost ? (
            <Button
              onClick={onContinue}
              disabled={isAdvancing}
              size="lg"
              className="hover-glow min-w-[200px]"
            >
              {isAdvancing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting Night...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Start Night Phase
                </>
              )}
            </Button>
          ) : (
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Waiting for host to continue...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}