import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlayer } from '@/hooks/usePlayer';
import { useRoom } from '@/hooks/useRoom';
import { useGameState } from '@/hooks/useGameState';
import { LobbyView } from '@/components/game/LobbyView';
import { GameView } from '@/components/game/GameView';
import { GameOverView } from '@/components/game/GameOverView';
import { NicknamePrompt } from '@/components/game/NicknamePrompt';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function Room() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { player, loading: playerLoading, updateNickname, hasStoredNickname } = usePlayer();
  const [showNicknamePrompt, setShowNicknamePrompt] = useState(false);
  const [nicknameSet, setNicknameSet] = useState(false);
  
  const { 
    room, 
    roomPlayers, 
    currentRoomPlayer, 
    loading: roomLoading, 
    error,
    joinRoom,
    leaveRoom,
    toggleReady,
    kickPlayer,
    updateRoomConfig,
  } = useRoom(code || null, player?.id || null);
  
  const { 
    gameState, 
    votes,
    loading: gameLoading,
    showVotingCountdown,
    showNightCountdown,
    startGame, 
    restartGame,
    submitNightAction,
    submitVote,
    advancePhase,
    endGame,
    handleVotingCountdownComplete,
    handleNightCountdownComplete,
  } = useGameState(room?.id || null, currentRoomPlayer?.id || null, room, roomPlayers);

  // Check if we need to show nickname prompt for direct room joins
  useEffect(() => {
    if (!playerLoading && player && room && !roomLoading) {
      // If already in room, don't need to do anything
      if (currentRoomPlayer) return;
      
      // If user doesn't have a stored nickname, prompt them
      if (!hasStoredNickname && !nicknameSet) {
        setShowNicknamePrompt(true);
      } else {
        // Auto-join with existing nickname
        joinRoom(code!, player.id);
      }
    }
  }, [player, room, currentRoomPlayer, roomLoading, playerLoading, hasStoredNickname, nicknameSet]);

  const handleNicknameSubmit = async (nickname: string) => {
    if (player) {
      await updateNickname(nickname);
      setNicknameSet(true);
      setShowNicknamePrompt(false);
      joinRoom(code!, player.id);
    }
  };

  if (playerLoading || roomLoading) {
    return (
      <div className="min-h-screen bg-gradient-dark relative">
        <div className="fog-overlay" />
        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            {/* Room Code Loading */}
            <div className="text-center mb-8 animate-fade-in">
              <p className="text-muted-foreground text-sm mb-2">ROOM CODE</p>
              <Skeleton className="h-12 w-48 mx-auto mb-2" />
              <Skeleton className="h-4 w-64 mx-auto" />
            </div>
            
            {/* Players Loading */}
            <Card className="glass-card mb-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Button Loading */}
            <div className="flex flex-col gap-3">
              <div className="w-full h-11 bg-primary/50 rounded-lg flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary-foreground" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-gradient-dark flex flex-col items-center justify-center gap-4">
        <p className="text-destructive font-display text-xl">{error || 'Room not found'}</p>
        <button 
          onClick={() => navigate('/')}
          className="text-muted-foreground hover:text-foreground underline"
        >
          Back to Home
        </button>
      </div>
    );
  }

  // Show nickname prompt for direct room joins
  if (showNicknamePrompt && player) {
    return (
      <NicknamePrompt
        currentNickname={player.nickname}
        onSubmit={handleNicknameSubmit}
      />
    );
  }

  const isHost = room.host_id === player?.id;
  
  // Check game status - room.status is the source of truth for whether we're in lobby or game
  // CRITICAL: isGameOver must also check room.status to ensure players return to lobby on restart
  const isInGame = room.status === 'playing' && gameState && gameState.phase !== 'lobby' && gameState.phase !== 'game_over';
  const isGameOver = room.status !== 'waiting' && gameState?.phase === 'game_over';

  if (isGameOver) {
    return (
      <GameOverView
        gameState={gameState}
        roomPlayers={roomPlayers}
        currentRoomPlayer={currentRoomPlayer}
        isHost={isHost}
        onLeave={() => {
          leaveRoom();
          navigate('/');
        }}
        onRestart={() => restartGame(roomPlayers, {
          mafia_count: room.mafia_count,
          doctor_count: room.doctor_count,
          detective_count: room.detective_count,
        }, player?.id)}
      />
    );
  }

  if (isInGame && currentRoomPlayer) {
    return (
      <GameView
        room={room}
        roomPlayers={roomPlayers}
        currentRoomPlayer={currentRoomPlayer}
        gameState={gameState!}
        votes={votes}
        onNightAction={submitNightAction}
        onVote={submitVote}
        onAdvancePhase={() => advancePhase(roomPlayers)}
        onEndGame={() => endGame(null)}
        isHost={isHost}
        showVotingCountdown={showVotingCountdown}
        onVotingCountdownComplete={handleVotingCountdownComplete}
        showNightCountdown={showNightCountdown}
        onNightCountdownComplete={handleNightCountdownComplete}
      />
    );
  }

  return (
    <LobbyView
      room={room}
      roomPlayers={roomPlayers}
      currentRoomPlayer={currentRoomPlayer}
      isHost={isHost}
      onToggleReady={toggleReady}
      onKickPlayer={kickPlayer}
      onStartGame={() => startGame(roomPlayers, {
        mafia_count: room.mafia_count,
        doctor_count: room.doctor_count,
        detective_count: room.detective_count,
      })}
      onLeave={() => {
        leaveRoom();
        navigate('/');
      }}
      onUpdateConfig={updateRoomConfig}
    />
  );
}
