import { GameState, RoomPlayer, Player } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Skull, Home, RotateCcw } from 'lucide-react';

interface GameOverViewProps {
  gameState: GameState;
  roomPlayers: (RoomPlayer & { player: Player })[];
  currentRoomPlayer: RoomPlayer | null;
  isHost: boolean;
  onLeave: () => void;
  onRestart: () => void;
}

export function GameOverView({
  gameState,
  roomPlayers,
  currentRoomPlayer,
  isHost,
  onLeave,
  onRestart,
}: GameOverViewProps) {
  const isMafiaWin = gameState.winner === 'mafia';
  const playerWon = currentRoomPlayer && (
    (isMafiaWin && currentRoomPlayer.role === 'mafia') ||
    (!isMafiaWin && currentRoomPlayer.role !== 'mafia')
  );

  const mafia = roomPlayers.filter(p => p.role === 'mafia');
  const town = roomPlayers.filter(p => p.role !== 'mafia');

  return (
    <div className={`min-h-screen relative ${isMafiaWin ? 'bg-gradient-night' : 'bg-gradient-day'}`}>
      <div className="fog-overlay" />
      
      <div className="relative z-10 container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-screen">
        {/* Result */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex justify-center mb-4">
            {isMafiaWin ? (
              <Skull className="w-20 h-20 text-mafia animate-pulse-slow" />
            ) : (
              <Trophy className="w-20 h-20 text-accent animate-pulse-slow" />
            )}
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-2 text-shadow-glow">
            {isMafiaWin ? 'MAFIA WINS' : 'TOWN WINS'}
          </h1>
          <p className="text-lg text-muted-foreground">
            {isMafiaWin 
              ? 'The Mafia has taken control of the town...'
              : 'Justice prevails! All Mafia have been eliminated.'}
          </p>
        </div>

        {/* Personal Result */}
        {currentRoomPlayer && (
          <Card className={`glass-card mb-8 max-w-md w-full ${playerWon ? 'border-accent' : 'border-destructive'}`}>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-display font-bold">
                {playerWon ? '🎉 You Won!' : '💀 You Lost'}
              </p>
              <p className="text-muted-foreground mt-2">
                You were a <span className={`font-bold text-${currentRoomPlayer.role}`}>
                  {currentRoomPlayer.role?.charAt(0).toUpperCase()}{currentRoomPlayer.role?.slice(1)}
                </span>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Role Reveal */}
        <div className="grid md:grid-cols-2 gap-4 w-full max-w-2xl mb-8">
          <Card className="glass-card border-mafia/50">
            <CardHeader>
              <CardTitle className="font-display text-mafia flex items-center gap-2">
                <Skull className="w-5 h-5" />
                The Mafia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mafia.map(p => (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className={p.is_alive ? 'text-foreground' : 'text-muted-foreground line-through'}>
                      {p.player.nickname}
                    </span>
                    {!p.is_alive && <Badge variant="destructive" className="text-xs">Dead</Badge>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-doctor/50">
            <CardHeader>
              <CardTitle className="font-display text-doctor flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                The Town
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {town.map(p => (
                  <div key={p.id} className="flex items-center justify-between">
                    <span className={p.is_alive ? 'text-foreground' : 'text-muted-foreground line-through'}>
                      {p.player.nickname}
                    </span>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {p.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4">
          {isHost && (
            <Button onClick={onRestart} size="lg" variant="secondary" className="hover-glow">
              <RotateCcw className="w-5 h-5 mr-2" />
              Play Again
            </Button>
          )}
          <Button onClick={onLeave} size="lg" className="hover-glow">
            <Home className="w-5 h-5 mr-2" />
            Back to Home
          </Button>
        </div>
        
        {!isHost && (
          <p className="text-sm text-muted-foreground mt-4">
            Waiting for host to restart the game...
          </p>
        )}
      </div>
    </div>
  );
}
