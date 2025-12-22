import { useState, useEffect } from 'react';
import { Room, RoomPlayer, GameState, Vote, RoleType, Player } from '@/types/game';
import { PhaseHeader } from './PhaseHeader';
import { PlayerList } from './PlayerList';
import { NightActions } from './NightActions';
import { VotingPanel } from './VotingPanel';
import { ChatPanel } from './ChatPanel';
import { RoleCard } from './RoleCard';
import { RoleDisplay } from './RoleDisplay';
import { SpectatorPanel } from './SpectatorPanel';

interface GameViewProps {
  room: Room;
  roomPlayers: (RoomPlayer & { player: Player })[];
  currentRoomPlayer: RoomPlayer;
  gameState: GameState;
  votes: Vote[];
  onNightAction: (targetId: string, role: RoleType) => void;
  onVote: (targetId: string | null) => void;
  onAdvancePhase: () => void;
  isHost: boolean;
}

export function GameView({
  room,
  roomPlayers,
  currentRoomPlayer,
  gameState,
  votes,
  onNightAction,
  onVote,
  onAdvancePhase,
  isHost,
}: GameViewProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showRole, setShowRole] = useState(true);
  const [detectiveResult, setDetectiveResult] = useState<string | null>(null);

  const isNight = gameState.phase === 'night';
  const isVoting = gameState.phase === 'day_voting';
  const isAlive = currentRoomPlayer.is_alive;
  const role = currentRoomPlayer.role;

  // Check if timer should be shown
  const showTimer = room.night_mode === 'timed' || gameState.phase === 'day_voting';

  // Reset selected target when phase changes
  useEffect(() => {
    setSelectedTarget(null);
  }, [gameState.phase]);

  // Track detective result for immediate feedback
  useEffect(() => {
    if (role === 'detective' && gameState.detective_result) {
      setDetectiveResult(gameState.detective_result);
    }
  }, [gameState.detective_result, role]);

  // Clear detective result when entering a new night
  useEffect(() => {
    if (isNight && role === 'detective') {
      // Only clear if we're starting a new night (no target selected yet)
      if (!gameState.detective_target_id) {
        setDetectiveResult(null);
      }
    }
  }, [isNight, role, gameState.day_number, gameState.detective_target_id]);

  // Timer countdown
  useEffect(() => {
    if (!gameState.phase_end_time) {
      setTimeLeft(0);
      return;
    }

    const updateTimer = () => {
      const endTime = new Date(gameState.phase_end_time!).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0 && isHost) {
        onAdvancePhase();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [gameState.phase_end_time, isHost, onAdvancePhase]);

  // Hide role card after 5 seconds
  useEffect(() => {
    if (showRole) {
      const timeout = setTimeout(() => setShowRole(false), 5000);
      return () => clearTimeout(timeout);
    }
  }, []);

  const handleTargetSelect = (targetId: string) => {
    if (!isAlive) return;
    
    if (isNight && role && ['mafia', 'doctor', 'detective'].includes(role)) {
      setSelectedTarget(targetId);
      onNightAction(targetId, role);
    } else if (isVoting) {
      setSelectedTarget(targetId);
      onVote(targetId);
    }
  };

  const canAct = isAlive && (
    (isNight && role && ['mafia', 'doctor', 'detective'].includes(role)) ||
    isVoting
  );

  const alivePlayers = roomPlayers.filter(p => p.is_alive);
  const isMafia = role === 'mafia';

  return (
    <div className={`min-h-screen relative transition-all duration-1000 ${isNight ? 'bg-gradient-night' : 'bg-gradient-day'}`}>
      <div className="fog-overlay" />
      
      {/* Role Reveal Overlay */}
      {showRole && role && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm animate-fade-in">
          <RoleCard role={role} onDismiss={() => setShowRole(false)} />
        </div>
      )}

      <div className="relative z-10 container mx-auto px-4 py-4 min-h-screen flex flex-col">
        {/* Phase Header - Always at top */}
        <PhaseHeader
          phase={gameState.phase}
          dayNumber={gameState.day_number}
          timeLeft={timeLeft}
          showTimer={showTimer}
          detectiveResult={detectiveResult}
          role={role}
        />

        {/* Role Display - Collapsible */}
        {role && (
          <RoleDisplay role={role} isAlive={isAlive} />
        )}

        {/* Main Content Area - Adaptive based on phase */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          {/* Left: Main Action Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Player List with Actions */}
            <PlayerList
              players={roomPlayers}
              currentPlayerId={currentRoomPlayer.id}
              selectedTargetId={selectedTarget}
              votes={votes}
              phase={gameState.phase}
              canSelect={canAct}
              onSelect={handleTargetSelect}
              currentRole={role}
            />

            {/* Phase-specific instructions */}
            {isNight && isAlive && (
              <NightActions
                role={role}
                hasActed={!!selectedTarget}
              />
            )}

            {isVoting && isAlive && (
              <VotingPanel
                hasVoted={!!selectedTarget}
                votes={votes}
                alivePlayers={alivePlayers}
                showVoteCounts={room.show_vote_counts}
              />
            )}

            {/* Dead Player Spectator Mode */}
            {!isAlive && (
              <SpectatorPanel
                gameState={gameState}
                roomPlayers={roomPlayers}
                isNight={isNight}
              />
            )}
          </div>

          {/* Right: Chat */}
          <div className="lg:col-span-1">
            <ChatPanel
              roomId={room.id}
              currentRoomPlayerId={currentRoomPlayer.id}
              isMafia={isMafia}
              isNight={isNight}
              isAlive={isAlive}
            />
          </div>
        </div>
      </div>
    </div>
  );
}