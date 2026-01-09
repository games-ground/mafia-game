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
import { VotingSummary } from './VotingSummary';
import { Button } from '@/components/ui/button';
import { XCircle, Loader2 } from 'lucide-react';

interface GameViewProps {
  room: Room;
  roomPlayers: (RoomPlayer & { player: Player })[];
  currentRoomPlayer: RoomPlayer;
  gameState: GameState;
  votes: Vote[];
  onNightAction: (targetId: string, role: RoleType) => void;
  onVote: (targetId: string | null) => void;
  onAdvancePhase: () => void;
  onEndGame?: () => void;
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
  onEndGame,
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
  const [showVotingSummary, setShowVotingSummary] = useState(false);
  const [isAdvancingFromSummary, setIsAdvancingFromSummary] = useState(false);
  const [showSummaryCountdown, setShowSummaryCountdown] = useState(false);
  const [showNightTransitionCountdown, setShowNightTransitionCountdown] = useState(false);
  const [isWaitingForTransition, setIsWaitingForTransition] = useState(false);
  const prevPhaseRef = useRef(gameState.phase);
  const prevDayRef = useRef(gameState.day_number);
  const countdownKeyRef = useRef(`${gameState.phase}-${gameState.day_number}`);
  const votingSummaryShownForDayRef = useRef<number | null>(null);

  const isNight = gameState.phase === 'night';
  const isVoting = gameState.phase === 'day_voting';
  const isAlive = currentRoomPlayer.is_alive;
  const role = currentRoomPlayer.role;

  // Reset selected target when phase changes
  useEffect(() => {
    setSelectedTarget(null);
  }, [gameState.phase]);

  // Detect phase changes and trigger transition animation
  // Also sync voting summary visibility across all clients
  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    const prevDay = prevDayRef.current;
    const currentPhase = gameState.phase;
    const currentDay = gameState.day_number;
    
    // Handle phase transitions
    if (prevPhase !== currentPhase && currentPhase !== 'game_over' && currentPhase !== 'lobby') {
      const isTransitionToNight = currentPhase === 'night';
      const isTransitionToDay = currentPhase === 'day_discussion' || currentPhase === 'day_voting';
      
      // Clear ALL overlay states when phase actually changes - this syncs all clients
      setIsWaitingForTransition(false);
      setShowVotingSummary(false);
      setShowNightTransitionCountdown(false);
      setShowSummaryCountdown(false);
      setIsAdvancingFromSummary(false);
      
      if ((isTransitionToNight && prevPhase !== 'lobby') || 
          (isTransitionToDay && prevPhase === 'night')) {
        setTransitionPhase(isTransitionToNight ? 'night' : 'day');
        setShowPhaseTransition(true);
      }
    }
    
    // Reset voting summary tracking when day changes
    if (currentDay !== prevDay) {
      votingSummaryShownForDayRef.current = null;
    }
    
    prevPhaseRef.current = currentPhase;
    prevDayRef.current = currentDay;
  }, [gameState.phase, gameState.day_number]);

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

      {/* Waiting for server overlay - shows between countdown and phase transition */}
      {isWaitingForTransition && !showPhaseTransition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-16 h-16 text-primary animate-spin" />
            <p className="text-muted-foreground">Processing...</p>
          </div>
        </div>
      )}

      {/* Summary Countdown - 3-2-1 before showing voting summary */}
      {showSummaryCountdown && (
        <CountdownOverlay 
          seconds={3} 
          onComplete={() => {
            setShowSummaryCountdown(false);
            votingSummaryShownForDayRef.current = gameState.day_number;
            setShowVotingSummary(true);
          }}
          message="Tallying votes..."
          countdownKey={`summary-${gameState.day_number}`}
          phase="day_voting"
        />
      )}

      {/* Night Transition Countdown - 3-2-1 before transitioning to night */}
      {showNightTransitionCountdown && (
        <CountdownOverlay 
          seconds={3} 
          onComplete={() => {
            setShowNightTransitionCountdown(false);
            setShowVotingSummary(false);
            setIsWaitingForTransition(true);
            setIsAdvancingFromSummary(true);
            onVotingCountdownComplete?.(true);
          }}
          message="Night falls..."
          countdownKey={`night-transition-${gameState.day_number}`}
          phase="night"
        />
      )}

      {/* Voting Summary - show after summary countdown, host controls advance */}
      {showVotingSummary && !showNightTransitionCountdown && (
        <VotingSummary
          votes={votes}
          roomPlayers={roomPlayers}
          isHost={isHost}
          isAdvancing={isAdvancingFromSummary}
          onContinue={() => {
            setShowNightTransitionCountdown(true);
          }}
        />
      )}

      {/* Night Countdown Overlay - show for all; only host advances */}
      {showNightCountdown && !showVotingSummary && !showSummaryCountdown && !showNightTransitionCountdown && !isWaitingForTransition && (
        <CountdownOverlay 
          seconds={3} 
          onComplete={() => {
            setIsWaitingForTransition(true);
            onNightCountdownComplete?.(isHost);
          }}
          message="All night actions complete!"
          countdownKey={countdownKeyRef.current}
          phase="night"
        />
      )}
      
      {/* Voting Countdown Overlay - triggers summary countdown instead of direct summary */}
      {showVotingCountdown && !showVotingSummary && !showSummaryCountdown && !showNightTransitionCountdown && !isWaitingForTransition && votingSummaryShownForDayRef.current !== gameState.day_number && (
        <CountdownOverlay 
          seconds={3} 
          onComplete={() => setShowSummaryCountdown(true)}
          message="All votes are in!"
          countdownKey={countdownKeyRef.current}
          phase="day_voting"
        />
      )}
      
      {/* Role Reveal Overlay */}
      {showRole && role && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm animate-fade-in">
          <RoleCard role={role} onDismiss={() => setShowRole(false)} />
        </div>
      )}

      <div className="relative z-10 container mx-auto px-2 sm:px-4 py-2 sm:py-4 min-h-screen flex flex-col">
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
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-4 mt-2 sm:mt-4">
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
            
            {/* Host End Game Button */}
            {isHost && onEndGame && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEndGame}
                className="w-full mt-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <XCircle className="w-4 h-4 mr-2" />
                End Game
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
