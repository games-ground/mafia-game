import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameState, RoomPlayer, RoleType, Vote, Player, Room } from '@/types/game';
import { getBrowserId } from '@/lib/browser-id';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function useGameState(roomId: string | null, currentRoomPlayerId: string | null, room?: Room | null, roomPlayers?: (RoomPlayer & { player: Player })[], playerId?: string | null) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);

  const [showVotingCountdown, setShowVotingCountdown] = useState(false);
  const [showNightCountdown, setShowNightCountdown] = useState(false);

  const advancingPhaseRef = useRef(false);

  const fetchGameState = useCallback(async () => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('game_state')
      .select('*')
      .eq('room_id', roomId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching game state:', error);
    }

    setGameState(data as GameState | null);
    setLoading(false);
  }, [roomId]);

  const fetchVotes = useCallback(async () => {
    if (!roomId || !gameState) return;

    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('room_id', roomId)
      .eq('day_number', gameState.day_number);

    if (error) {
      console.error('Error fetching votes:', error);
      return;
    }

    setVotes(data as Vote[]);
  }, [roomId, gameState?.day_number]);

  useEffect(() => {
    fetchGameState();
  }, [fetchGameState]);

  useEffect(() => {
    if (gameState?.phase === 'day_voting') {
      fetchVotes();
    }
  }, [gameState?.phase, fetchVotes]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`game-${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_state', filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setGameState(payload.new as GameState);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes', filter: `room_id=eq.${roomId}` },
        () => fetchVotes()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchVotes]);

  // Check if all night actions are complete based on game_state targets
  const checkNightActionsComplete = useCallback(async (): Promise<boolean> => {
    if (!gameState || gameState.phase !== 'night' || !roomId) return false;

    const { data: alivePlayers, error } = await supabase
      .from('room_players')
      .select('role')
      .eq('room_id', roomId)
      .eq('is_alive', true);

    if (error || !alivePlayers) return false;

    const hasMafia = alivePlayers.some(p => p.role === 'mafia');
    const hasDoctor = alivePlayers.some(p => p.role === 'doctor');
    const hasDetective = alivePlayers.some(p => p.role === 'detective');

    const mafiaActed = !hasMafia || gameState.mafia_target_id !== null;
    const doctorActed = !hasDoctor || gameState.doctor_target_id !== null;
    const detectiveActed = !hasDetective || gameState.detective_target_id !== null;

    return mafiaActed && doctorActed && detectiveActed;
  }, [gameState, roomId]);

  // Track whether we've already triggered the night countdown for this phase
  const nightCountdownTriggeredRef = useRef(false);

  // Reset the trigger ref when phase changes
  useEffect(() => {
    nightCountdownTriggeredRef.current = false;
  }, [gameState?.phase, gameState?.day_number]);

  // Check night actions complete whenever game state changes (targets are set)
  useEffect(() => {
    if (gameState?.phase !== 'night' || showNightCountdown || advancingPhaseRef.current || nightCountdownTriggeredRef.current) {
      return;
    }

    const hasAnyTarget = gameState.mafia_target_id !== null || 
                         gameState.doctor_target_id !== null || 
                         gameState.detective_target_id !== null;
    
    if (!hasAnyTarget) return;

    checkNightActionsComplete().then(allComplete => {
      if (allComplete && !nightCountdownTriggeredRef.current) {
        nightCountdownTriggeredRef.current = true;
        setShowNightCountdown(true);
      }
    });
  }, [gameState?.phase, gameState?.mafia_target_id, gameState?.doctor_target_id, gameState?.detective_target_id, showNightCountdown, checkNightActionsComplete]);

  // SECURE: Start game via edge function with browser_id authentication
  async function startGame(roomPlayers: (RoomPlayer & { player: Player })[], roomConfig: { mafia_count: number; doctor_count: number; detective_count: number }) {
    if (!roomId || !playerId) return;

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/start-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          host_player_id: playerId,
          browser_id: getBrowserId(),
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        console.error('Error starting game:', result.error);
      }
    } catch (error) {
      console.error('Error starting game:', error);
    }
  }

  // SECURE: Submit night action via edge function with browser_id authentication
  async function submitNightAction(targetId: string, role: RoleType) {
    if (!gameState || !currentRoomPlayerId || !playerId) return;

    const actionType = {
      mafia: 'kill',
      doctor: 'protect',
      detective: 'investigate',
    }[role] as 'kill' | 'protect' | 'investigate';

    if (!actionType) return;

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/submit-night-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: gameState.room_id,
          room_player_id: currentRoomPlayerId,
          player_id: playerId,
          browser_id: getBrowserId(),
          target_id: targetId,
          action_type: actionType,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        console.error('Error submitting night action:', result.error);
      }
    } catch (error) {
      console.error('Error submitting night action:', error);
    }
  }

  // SECURE: Submit vote via edge function with browser_id authentication
  async function submitVote(targetId: string | null) {
    if (!gameState || !currentRoomPlayerId || !playerId) return;

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/submit-vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: gameState.room_id,
          room_player_id: currentRoomPlayerId,
          player_id: playerId,
          browser_id: getBrowserId(),
          target_id: targetId,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        console.error('Error submitting vote:', result.error);
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
    }
  }

  // SECURE: Advance phase via edge function with browser_id authentication
  async function advancePhase(roomPlayers: (RoomPlayer & { player: Player })[], force: boolean = false) {
    if (!gameState || !roomId || !playerId) return;
    
    if (advancingPhaseRef.current) {
      console.log('Already advancing phase, skipping');
      return;
    }
    advancingPhaseRef.current = true;

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/advance-phase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          player_id: playerId,
          browser_id: getBrowserId(),
          force,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        console.error('Error advancing phase:', result.error);
      }
    } catch (error) {
      console.error('Error advancing phase:', error);
    } finally {
      advancingPhaseRef.current = false;
    }
  }

  // SECURE: End game via edge function with browser_id authentication
  async function endGame(winner: 'mafia' | 'civilians' | null) {
    if (!roomId || !playerId) return;

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/end-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          host_player_id: playerId,
          browser_id: getBrowserId(),
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        console.error('Error ending game:', result.error);
      }
    } catch (error) {
      console.error('Error ending game:', error);
    }
  }

  async function restartGame(roomPlayers: (RoomPlayer & { player: Player })[], roomConfig: { mafia_count: number; doctor_count: number; detective_count: number }, hostPlayerId?: string) {
    if (!roomId || !hostPlayerId) return;

    // Use secure RPC to reset everything in a single DB transaction
    const { error } = await supabase.rpc('restart_game', {
      p_host_player_id: hostPlayerId,
      p_room_id: roomId,
    });

    if (error) {
      console.error('Error restarting game:', error);
      return;
    }

    // Clear local state immediately
    setGameState(null);
    setVotes([]);
    setShowVotingCountdown(false);
    setShowNightCountdown(false);
    advancingPhaseRef.current = false;
    nightCountdownTriggeredRef.current = false;
  }

  // Check if all alive players have voted
  const allVotesIn = useMemo(() => {
    if (!gameState || gameState.phase !== 'day_voting' || !roomPlayers) return false;
    const alivePlayers = roomPlayers.filter(p => p.is_alive);
    return votes.length >= alivePlayers.length;
  }, [gameState, roomPlayers, votes]);

  // Trigger countdown when all votes are in
  useEffect(() => {
    if (allVotesIn && gameState?.phase === 'day_voting' && !showVotingCountdown && !advancingPhaseRef.current) {
      setShowVotingCountdown(true);
    }
  }, [allVotesIn, gameState?.phase, showVotingCountdown]);

  // Reset countdowns on phase change
  useEffect(() => {
    setShowVotingCountdown(false);
    setShowNightCountdown(false);
  }, [gameState?.phase, gameState?.day_number]);

  const handleVotingCountdownComplete = useCallback(async (shouldAdvance: boolean) => {
    setShowVotingCountdown(false);
    if (!shouldAdvance) return;
    if (!roomPlayers || advancingPhaseRef.current) return;
    await advancePhase(roomPlayers);
  }, [roomPlayers, advancePhase]);

  const handleNightCountdownComplete = useCallback(async (shouldAdvance: boolean) => {
    setShowNightCountdown(false);
    if (!shouldAdvance) return;
    if (!roomPlayers || advancingPhaseRef.current) return;
    await advancePhase(roomPlayers);
  }, [roomPlayers, advancePhase]);

  return {
    gameState,
    votes,
    loading,
    showVotingCountdown,
    showNightCountdown,
    allVotesIn,
    startGame,
    restartGame,
    submitNightAction,
    submitVote,
    advancePhase,
    endGame,
    handleVotingCountdownComplete,
    handleNightCountdownComplete,
    refetch: fetchGameState,
  };
}
