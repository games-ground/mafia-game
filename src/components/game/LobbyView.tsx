import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Room, RoomPlayer, Player, NightMode } from '@/types/game';
import { Copy, Crown, UserMinus, Users, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { GameConfig } from './GameConfig';
import { LoadingButton } from '@/components/ui/loading-button';

interface LobbyViewProps {
  room: Room;
  roomPlayers: (RoomPlayer & { player: Player })[];
  currentRoomPlayer: RoomPlayer | null;
  isHost: boolean;
  onToggleReady: () => Promise<void> | void;
  onKickPlayer: (roomPlayerId: string) => Promise<void> | void;
  onStartGame: () => Promise<void> | void;
  onLeave: () => void;
  onUpdateConfig: (config: Partial<Pick<Room, 'mafia_count' | 'doctor_count' | 'detective_count' | 'night_mode' | 'night_duration' | 'day_duration'>>) => void;
}

export function LobbyView({
  room,
  roomPlayers,
  currentRoomPlayer,
  isHost,
  onToggleReady,
  onKickPlayer,
  onStartGame,
  onLeave,
  onUpdateConfig,
}: LobbyViewProps) {
  const [isReadyLoading, setIsReadyLoading] = useState(false);
  const [isStartLoading, setIsStartLoading] = useState(false);
  const [kickingPlayerId, setKickingPlayerId] = useState<string | null>(null);
  
  const handleToggleReady = async () => {
    setIsReadyLoading(true);
    try {
      await onToggleReady();
    } finally {
      setIsReadyLoading(false);
    }
  };
  
  const handleStartGame = async () => {
    setIsStartLoading(true);
    try {
      await onStartGame();
    } finally {
      setIsStartLoading(false);
    }
  };
  
  const handleKickPlayer = async (roomPlayerId: string) => {
    setKickingPlayerId(roomPlayerId);
    try {
      await onKickPlayer(roomPlayerId);
    } finally {
      setKickingPlayerId(null);
    }
  };
  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      toast.success('Room code copied!');
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = room.code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('Room code copied!');
    }
  };

  const allReady = roomPlayers.length >= room.min_players && 
    roomPlayers.every(rp => rp.is_ready || rp.player_id === room.host_id);
  
  const canStart = isHost && allReady;

  return (
    <div className="min-h-screen bg-gradient-dark relative">
      <div className="fog-overlay" />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Room Code Header */}
          <div className="text-center mb-8 animate-fade-in">
            <p className="text-muted-foreground text-sm mb-2">ROOM CODE</p>
            <button
              onClick={copyRoomCode}
              className="flex items-center justify-center gap-3 mx-auto group"
            >
              <span className="font-display text-4xl md:text-5xl font-bold text-foreground tracking-[0.3em] text-shadow-glow">
                {room.code}
              </span>
              <Copy className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
            <p className="text-muted-foreground text-sm mt-2">
              Share this code with friends to join
            </p>
          </div>

          {/* Players Card */}
          <Card className="glass-card mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display flex items-center gap-2">
                <Users className="w-5 h-5" />
                Players ({roomPlayers.length})
              </CardTitle>
              <Badge variant={roomPlayers.length >= room.min_players ? 'default' : 'secondary'}>
                {roomPlayers.length >= room.min_players ? 'Ready to start' : `Need ${room.min_players - roomPlayers.length} more`}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {roomPlayers.map((rp) => (
                  <div
                    key={rp.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      {rp.player_id === room.host_id && (
                        <Crown className="w-4 h-4 text-accent" />
                      )}
                      <span className="font-body text-foreground">
                        {rp.player.nickname}
                      </span>
                      {rp.player_id === currentRoomPlayer?.player_id && (
                        <Badge variant="outline" className="text-xs">You</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {rp.is_ready || rp.player_id === room.host_id ? (
                        <Badge className="bg-success text-success-foreground">
                          <Check className="w-3 h-3 mr-1" />
                          Ready
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Waiting</Badge>
                      )}
                      {isHost && rp.player_id !== room.host_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleKickPlayer(rp.id)}
                          disabled={kickingPlayerId === rp.id}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          {kickingPlayerId === rp.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <UserMinus className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Host Configuration */}
          {isHost && (
            <GameConfig
              room={room}
              playerCount={roomPlayers.length}
              onUpdateConfig={onUpdateConfig}
            />
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {isHost ? (
              <LoadingButton
                onClick={handleStartGame}
                disabled={!canStart}
                loading={isStartLoading}
                loadingText="Starting..."
                className="w-full hover-glow"
                size="lg"
              >
                {canStart ? 'Start Game' : roomPlayers.length < room.min_players ? `Need ${room.min_players - roomPlayers.length} more player${room.min_players - roomPlayers.length > 1 ? 's' : ''}` : 'Waiting for players to ready up...'}
              </LoadingButton>
            ) : !currentRoomPlayer ? (
              <LoadingButton
                loading={true}
                loadingText="Joining room..."
                className="w-full"
                size="lg"
                disabled
              >
                Joining...
              </LoadingButton>
            ) : (
              <LoadingButton
                onClick={handleToggleReady}
                variant={currentRoomPlayer?.is_ready ? 'secondary' : 'default'}
                loading={isReadyLoading}
                loadingText={currentRoomPlayer?.is_ready ? 'Cancelling...' : 'Readying up...'}
                className="w-full hover-glow"
                size="lg"
              >
                {currentRoomPlayer?.is_ready ? 'Cancel Ready' : 'Ready Up'}
              </LoadingButton>
            )}
            
            <Button
              variant="ghost"
              onClick={onLeave}
              className="text-muted-foreground hover:text-destructive"
            >
              Leave Room
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
