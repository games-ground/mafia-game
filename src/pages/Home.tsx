import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePlayer } from '@/hooks/usePlayer';
import { useAuth } from '@/hooks/useAuth';
import { useRoom } from '@/hooks/useRoom';
import { Skull, Users, Pencil, Check, X, LogOut, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

export default function Home() {
  const navigate = useNavigate();
  const { player, loading, updateNickname, isAuthenticated } = usePlayer();
  const { profile, signInWithGoogle, signOut, loading: authLoading } = useAuth();
  const { createRoom, joinRoom } = useRoom(null, player?.id || null);
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSetNickname = async () => {
    if (!nickname.trim()) return;
    await updateNickname(nickname.trim());
  };

  const handleSaveNickname = async () => {
    if (!editNickname.trim() || editNickname.trim() === player?.nickname) {
      setIsEditing(false);
      return;
    }
    await updateNickname(editNickname.trim());
    setIsEditing(false);
  };

  const handleStartEditing = () => {
    setEditNickname(player?.nickname || '');
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditNickname('');
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

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      toast.error('Failed to sign in with Google');
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="animate-pulse text-foreground font-display text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark relative overflow-hidden">
      <div className="fog-overlay" />
      
      {/* Auth Status - Top Right */}
      <div className="absolute top-4 right-4 z-20">
        {isAuthenticated && profile ? (
          <div className="flex items-center gap-3 glass-card px-3 py-2 rounded-lg">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                {profile.display_name?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-foreground hidden sm:inline">
              {profile.display_name || profile.email}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="glass-card border-border hover:bg-primary/10"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isSigningIn ? 'Signing in...' : 'Sign in'}
          </Button>
        )}
      </div>
      
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
              {player?.nickname === 'Anonymous' ? 'Enter Your Name' : (
                <div className="flex items-center justify-center gap-2">
                  {isEditing ? (
                    <div className="flex items-center gap-2 w-full">
                      <Input
                        value={editNickname}
                        onChange={(e) => setEditNickname(e.target.value)}
                        className="text-center text-lg"
                        maxLength={20}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveNickname();
                          if (e.key === 'Escape') handleCancelEditing();
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleSaveNickname}
                        className="text-success hover:text-success hover:bg-success/10 shrink-0"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCancelEditing}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span>Welcome, {player?.nickname}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleStartEditing}
                        className="text-muted-foreground hover:text-foreground h-8 w-8"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {player?.nickname === 'Anonymous' ? (
              <div className="space-y-4">
                <Input
                  placeholder="Your game nickname..."
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
                  Continue as Guest
                </Button>
                
                {!isAuthenticated && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">or</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      onClick={handleGoogleSignIn}
                      disabled={isSigningIn}
                      className="w-full border-border hover:bg-primary/10"
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      {isSigningIn ? 'Signing in...' : 'Continue with Google'}
                    </Button>
                    
                    <p className="text-xs text-muted-foreground text-center">
                      Sign in to save your stats and access future premium features
                    </p>
                  </>
                )}
              </div>
            ) : (
              <>
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