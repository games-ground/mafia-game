import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlayer } from '@/hooks/usePlayer';
import { useRoom } from '@/hooks/useRoom';
import { useGameState } from '@/hooks/useGameState';
import { LobbyView } from '@/components/game/LobbyView';
import { GameView } from '@/components/game/GameView';
import { GameOverView } from '@/components/game/GameOverView';
import { NicknamePrompt } from '@/components/game/NicknamePrompt';

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
    startGame, 
    submitNightAction,
    submitVote,
    advancePhase,
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
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="animate-pulse text-foreground font-display text-2xl">Loading...</div>
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
  const isInGame = room.status === 'playing' && gameState && gameState.phase !== 'lobby';

  if (gameState?.phase === 'game_over') {
    return (
      <GameOverView
        gameState={gameState}
        roomPlayers={roomPlayers}
        currentRoomPlayer={currentRoomPlayer}
        onLeave={() => {
          leaveRoom();
          navigate('/');
        }}
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
        isHost={isHost}
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
        night_mode: room.night_mode,
        night_duration: room.night_duration,
        day_duration: room.day_duration,
      })}
      onLeave={() => {
        leaveRoom();
        navigate('/');
      }}
      onUpdateConfig={updateRoomConfig}
    />
  );
}
