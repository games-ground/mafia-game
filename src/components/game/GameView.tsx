import { useState, useEffect, useRef } from 'react';
import { Room, RoomPlayer, GameState, Vote, RoleType, Player } from '@/types/game';
import { cn } from '@/lib/utils';
import { PhaseHeader } from './PhaseHeader';
import { PlayerList } from './PlayerList';

import { VotingPanel } from './VotingPanel';
import { ChatPanel } from './ChatPanel';
import { RoleCard } from './RoleCard';
import { RoleDisplay } from './RoleDisplay';
import { SpectatorPanel } from './SpectatorPanel';
import { CountdownOverlay } from './CountdownOverlay';
import { PhaseTransition } from './PhaseTransition';
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
  showVotingCountdown?: boolean;
  onVotingCountdownComplete?: (shouldAdvance: boolean) => void;
  showNightCountdown?: boolean;
  onNightCountdownComplete?: (shouldAdvance: boolean) => void;
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
  showVotingCountdown,
  onVotingCountdownComplete,
  showNightCountdown,
  onNightCountdownComplete,
}: GameViewProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [showRole, setShowRole] = useState(true);
  const [showPhaseTransition, setShowPhaseTransition] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState<'night' | 'day'>('night');
  const prevPhaseRef = useRef(gameState.phase);

  const isNight = gameState.phase === 'night';
  const isVoting = gameState.phase === 'day_voting';
  const isAlive = currentRoomPlayer.is_alive;
  const role = currentRoomPlayer.role;

  // Reset selected target when phase changes
  useEffect(() => {
    setSelectedTarget(null);
  }, [gameState.phase]);

  // Detect phase changes and trigger transition animation
  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    const currentPhase = gameState.phase;
    
    // Only trigger on meaningful phase changes
    if (prevPhase !== currentPhase && currentPhase !== 'game_over' && currentPhase !== 'lobby') {
      const isTransitionToNight = currentPhase === 'night';
      const isTransitionToDay = currentPhase === 'day_discussion' || currentPhase === 'day_voting';
      
      if ((isTransitionToNight && prevPhase !== 'lobby') || 
          (isTransitionToDay && prevPhase === 'night')) {
        setTransitionPhase(isTransitionToNight ? 'night' : 'day');
        setShowPhaseTransition(true);
      }
    }
    
    prevPhaseRef.current = currentPhase;
  }, [gameState.phase]);

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

  // Check if current role has already acted based on gameState
  const hasActedThisNight = isNight && role && {
    mafia: gameState.mafia_target_id !== null,
    doctor: gameState.doctor_target_id !== null,
    detective: gameState.detective_target_id !== null,
    civilian: false,
  }[role];

  const canAct = isAlive && (
    (isNight && role && ['mafia', 'doctor', 'detective'].includes(role) && !hasActedThisNight) ||
    isVoting
  );

  const alivePlayers = roomPlayers.filter(p => p.is_alive);
  const isMafia = role === 'mafia';

  // Get phase-specific background class
  const getPhaseBackground = () => {
    if (isNight) return 'bg-gradient-night';
    if (gameState.phase === 'day_voting') return 'bg-gradient-voting';
    return 'bg-gradient-day';
  };

  return (
    <div className={cn(
      "min-h-screen relative transition-all duration-1000",
      getPhaseBackground()
    )}>
      {/* Phase-specific overlay effects */}
      <div className={cn(
        "fog-overlay transition-opacity duration-1000",
        isNight && "opacity-70"
      )} />
      
      {/* Night overlay with stars effect */}
      {isNight && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/30 via-transparent to-slate-950/50" />
        </div>
      )}
      
      {/* Day overlay with warm glow */}
      {!isNight && gameState.phase !== 'game_over' && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-transparent" />
        </div>
      )}
      
      {/* Phase Transition Animation */}
      {showPhaseTransition && (
        <PhaseTransition 
          phase={transitionPhase} 
          onComplete={() => setShowPhaseTransition(false)} 
        />
      )}

      {/* Night Countdown Overlay - show for all; only host advances */}
      {showNightCountdown && (
        <CountdownOverlay 
          seconds={3} 
          onComplete={() => onNightCountdownComplete?.(isHost)}
          message="All night actions complete!"
        />
      )}
      
      {/* Voting Countdown Overlay - show for all; only host advances */}
      {showVotingCountdown && (
        <CountdownOverlay 
          seconds={3} 
          onComplete={() => onVotingCountdownComplete?.(isHost)}
          message="All votes are in!"
        />
      )}
      
      {/* Role Reveal Overlay */}
      {showRole && role && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm animate-fade-in">
          <RoleCard role={role} onDismiss={() => setShowRole(false)} />
        </div>
      )}

      <div className="relative z-10 container mx-auto px-4 py-4 min-h-screen flex flex-col">
        {/* Phase Header - Always at top, no timer, no detective result */}
        <PhaseHeader
          phase={gameState.phase}
          dayNumber={gameState.day_number}
          timeLeft={0}
          showTimer={false}
          detectiveResult={null}
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
              gameState={gameState}
            />

            {isVoting && isAlive && (
              <VotingPanel
                hasVoted={!!selectedTarget}
                votes={votes}
                alivePlayers={alivePlayers}
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
              currentRole={role}
              isNight={isNight}
              isAlive={isAlive}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
