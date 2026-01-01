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
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {hasVoted ? (
              <Check className="w-6 h-6 text-success" />
            ) : (
              <VoteIcon className="w-6 h-6 text-warning animate-pulse" />
            )}
            <div>
              <p className="font-display font-bold text-warning">
                Town Vote
              </p>
              <p className="text-sm text-muted-foreground">
                {hasVoted ? 'Vote submitted' : 'Select a player to vote for elimination'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-lg font-bold">{votedCount}/{totalVoters}</p>
            <p className="text-xs text-muted-foreground">votes cast</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
