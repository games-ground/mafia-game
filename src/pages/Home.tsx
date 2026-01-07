import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePlayer } from '@/hooks/usePlayer';
import { useRoom } from '@/hooks/useRoom';
import { Skull, Users } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const { player, loading, updateNickname } = usePlayer();
  const { createRoom, joinRoom } = useRoom(null, player?.id || null);
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSetNickname = async () => {
    if (!nickname.trim()) return;
    await updateNickname(nickname.trim());
  };

  const handleCreateRoom = async () => {
    if (!player) return;
    setIsCreating(true);
    setError(null);

    const code = await createRoom(player.id);
    if (code) {
      navigate(`/room/${code}`);
    } else {
      setError('Failed to create room');
    }
    setIsCreating(false);
  };

  const handleJoinRoom = async () => {
    if (!player || !roomCode.trim()) return;
    setIsJoining(true);
    setError(null);

    const success = await joinRoom(roomCode.trim().toUpperCase(), player.id);
    if (success) {
      navigate(`/room/${roomCode.trim().toUpperCase()}`);
    } else {
      setError('Failed to join room');
    }
    setIsJoining(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="animate-pulse text-foreground font-display text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark relative overflow-hidden">
      <div className="fog-overlay" />
      
      <div className="relative z-10 container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-screen">
        {/* Logo */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex items-center justify-center mb-4">
            <Skull className="w-16 h-16 text-primary animate-pulse-slow" />
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold text-foreground text-shadow-glow tracking-widest">
            MAFIA
          </h1>
          <p className="text-muted-foreground text-lg mt-2 font-body italic">
            Trust no one. Survive the night.
          </p>
        </div>

        {/* Main Card */}
        <Card className="w-full max-w-md glass-card animate-slide-up">
          <CardHeader>
            <CardTitle className="font-display text-center text-xl">
              {player?.nickname === 'Anonymous' ? 'Enter Your Name' : `Welcome, ${player?.nickname}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {player?.nickname === 'Anonymous' ? (
              <div className="space-y-4">
                <Input
                  placeholder="Your nickname..."
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                  maxLength={20}
                />
                <Button 
                  onClick={handleSetNickname} 
                  className="w-full hover-glow"
                  disabled={!nickname.trim()}
                >
                  Continue
                </Button>
              </div>
            ) : (
              <>
                {/* Rename option */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border/50">
                  <Input
                    placeholder="Change nickname..."
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground flex-1 text-sm"
                    maxLength={20}
                  />
                  <Button
                    onClick={handleSetNickname}
                    variant="ghost"
                    size="sm"
                    disabled={!nickname.trim() || nickname.trim() === player?.nickname}
                    className="shrink-0"
                  >
                    Rename
                  </Button>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleCreateRoom}
                    disabled={isCreating}
                    className="w-full hover-glow flex items-center gap-2"
                    size="lg"
                  >
                    <Users className="w-5 h-5" />
                    {isCreating ? 'Creating...' : 'Create Room'}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">or</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Room code..."
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      className="bg-input border-border text-foreground placeholder:text-muted-foreground uppercase tracking-widest"
                      maxLength={6}
                    />
                    <Button
                      onClick={handleJoinRoom}
                      disabled={isJoining || !roomCode.trim()}
                      variant="secondary"
                      className="hover-glow"
                    >
                      {isJoining ? '...' : 'Join'}
                    </Button>
                  </div>
                </div>

                {error && (
                  <p className="text-destructive text-sm text-center">{error}</p>
                )}

              </>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-8 text-muted-foreground text-sm font-body">
          4-12 players • Private rooms • Real-time multiplayer
        </p>
      </div>
    </div>
  );
}
