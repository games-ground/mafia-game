import { Vote, RoomPlayer, Player } from '@/types/game';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Vote as VoteIcon, EyeOff } from 'lucide-react';

interface VotingPanelProps {
  hasVoted: boolean;
  votes: Vote[];
  alivePlayers: (RoomPlayer & { player: Player })[];
  showVoteCounts?: boolean;
}

export function VotingPanel({ hasVoted, votes, alivePlayers, showVoteCounts = true }: VotingPanelProps) {
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
            {showVoteCounts ? (
              <>
                <p className="font-display text-lg font-bold">{votedCount}/{totalVoters}</p>
                <p className="text-xs text-muted-foreground">votes cast</p>
              </>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <EyeOff className="w-4 h-4" />
                <p className="text-xs">Votes hidden</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}