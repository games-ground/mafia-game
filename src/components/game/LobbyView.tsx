import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Room, RoomPlayer, Player } from '@/types/game';
import { Copy, Crown, UserMinus, Users, Check, Loader2, Clock, DoorOpen, Link, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { GameConfig } from './GameConfig';
import { LoadingButton } from '@/components/ui/loading-button';
import { GameRulesSheet } from './GameRulesSheet';
import { cn } from '@/lib/utils';
import { VotingTimerConfig } from './VotingTimerConfig';
interface LobbyViewProps {
  room: Room;
  roomPlayers: (RoomPlayer & { player: Player })[];
  currentRoomPlayer: RoomPlayer | null;
  isHost: boolean;
  onToggleReady: () => Promise<void> | void;
  onKickPlayer: (roomPlayerId: string) => Promise<void> | void;
  onStartGame: () => Promise<void> | void;
  onLeave: () => void;
  onUpdateConfig: (config: Partial<Pick<Room, 'mafia_count' | 'doctor_count' | 'detective_count' | 'voting_duration'>>) => void;
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

  const copyRoomLink = async () => {
    const roomLink = `${window.location.origin}/room/${room.code}`;
    try {
      await navigator.clipboard.writeText(roomLink);
      toast.success('Room link copied!');
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = roomLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('Room link copied!');
    }
  };

  const shareRoom = async () => {
    const roomLink = `${window.location.origin}/room/${room.code}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my Mafia game!',
          text: `Join my Mafia game with code: ${room.code}`,
          url: roomLink,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      await copyRoomLink();
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
          {/* Room Code Header with Rules Button */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="flex justify-end mb-2">
              <GameRulesSheet />
            </div>
            <p className="text-muted-foreground text-sm mb-2 uppercase tracking-widest">Room Code</p>
            <button
              onClick={copyRoomCode}
              className="flex items-center justify-center gap-3 mx-auto group"
            >
              <span className="font-display text-4xl md:text-5xl font-bold text-foreground tracking-[0.3em] text-shadow-glow">
                {room.code}
              </span>
              <Copy className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
            
            {/* Share Options */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={copyRoomLink}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <Link className="w-4 h-4" />
                Copy Link
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={shareRoom}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            </div>
            
            <p className="text-muted-foreground text-xs mt-3">
              Share the code or link with friends to join
            </p>
          </div>

          {/* Players Card */}
          <Card className="glass-card mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display flex items-center gap-2">
                <Users className="w-5 h-5" />
                Players ({roomPlayers.length})
              </CardTitle>
              <Badge 
                variant={roomPlayers.length >= room.min_players ? 'default' : 'secondary'}
                className={cn(
                  roomPlayers.length >= room.min_players && "bg-success text-success-foreground"
                )}
              >
                {roomPlayers.length >= room.min_players ? 'Ready to start' : `Need ${room.min_players - roomPlayers.length} more`}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {roomPlayers.map((rp) => {
                  const isReady = rp.is_ready || rp.player_id === room.host_id;
                  return (
                  <div
                    key={rp.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-all",
                      isReady 
                        ? "bg-success/10 border-success/30" 
                        : "bg-secondary/50 border-border/50"
                    )}
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
                      {isReady ? (
                        <Badge className="bg-success/20 text-success border border-success/30 gap-1">
                          <Check className="w-3 h-3" />
                          Ready
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-muted-foreground border-muted-foreground/30">
                          <Clock className="w-3 h-3" />
                          Waiting
                        </Badge>
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
                )})}
              </div>
            </CardContent>
          </Card>

          {/* Host Configuration */}
          {isHost && (
            <>
              <GameConfig
                room={room}
                playerCount={roomPlayers.length}
                onUpdateConfig={onUpdateConfig}
              />
              <VotingTimerConfig
                room={room}
                onUpdateConfig={onUpdateConfig}
              />
            </>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
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
              <div className="flex gap-3">
                <LoadingButton
                  onClick={handleToggleReady}
                  variant={currentRoomPlayer?.is_ready ? 'outline' : 'default'}
                  loading={isReadyLoading}
                  loadingText={currentRoomPlayer?.is_ready ? 'Cancelling...' : 'Readying up...'}
                  className={cn(
                    "flex-1 transition-all",
                    currentRoomPlayer?.is_ready 
                      ? "border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50 hover:text-muted-foreground hover:bg-transparent" 
                      : "hover-glow"
                  )}
                  size="lg"
                >
                  {currentRoomPlayer?.is_ready ? 'Cancel Ready' : 'Ready Up'}
                </LoadingButton>
                
                <Button
                  variant="ghost"
                  onClick={onLeave}
                  size="lg"
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-4"
                  title="Leave Room"
                >
                  <DoorOpen className="w-5 h-5" />
                </Button>
              </div>
            )}
            
            {isHost && (
              <Button
                variant="ghost"
                onClick={onLeave}
                className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <DoorOpen className="w-4 h-4 mr-2" />
                Leave Room
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
