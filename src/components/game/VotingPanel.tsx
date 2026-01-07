import { Vote, RoomPlayer, Player } from '@/types/game';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Vote as VoteIcon } from 'lucide-react';

interface VotingPanelProps {
  hasVoted: boolean;
  votes: Vote[];
  alivePlayers: (RoomPlayer & { player: Player })[];
}

export function VotingPanel({ hasVoted, votes, alivePlayers }: VotingPanelProps) {
  const votedCount = votes.length;
  const totalVoters = alivePlayers.length;

  return (
    <Card className="glass-card border-warning/30">
      <CardContent className="pt-4 sm:pt-6 pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            {hasVoted ? (
              <Check className="w-5 h-5 sm:w-6 sm:h-6 text-success shrink-0" />
            ) : (
              <VoteIcon className="w-5 h-5 sm:w-6 sm:h-6 text-warning animate-pulse shrink-0" />
            )}
            <div className="min-w-0">
              <p className="font-display font-bold text-warning text-sm sm:text-base">
                Town Vote
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {hasVoted ? 'Vote submitted' : 'Vote to eliminate'}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-display text-base sm:text-lg font-bold">{votedCount}/{totalVoters}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">votes</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
