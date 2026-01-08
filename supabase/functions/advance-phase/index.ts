import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AdvancePhaseRequest {
  room_id: string
  player_id: string
  force?: boolean
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { room_id, player_id, force = false }: AdvancePhaseRequest = await req.json()

    if (!room_id || !player_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify player is in the room
    const { data: roomPlayer, error: rpError } = await supabase
      .from('room_players')
      .select('id, player_id')
      .eq('room_id', room_id)
      .eq('player_id', player_id)
      .single()

    if (rpError || !roomPlayer) {
      return new Response(
        JSON.stringify({ error: 'Player not in room' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get room to check if player is host (for force option)
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('host_id')
      .eq('id', room_id)
      .single()

    if (roomError || !room) {
      return new Response(
        JSON.stringify({ error: 'Room not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isHost = room.host_id === player_id

    // Get current game state
    const { data: gameState, error: gsError } = await supabase
      .from('game_state')
      .select('*')
      .eq('room_id', room_id)
      .single()

    if (gsError || !gameState) {
      return new Response(
        JSON.stringify({ error: 'Game not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get all players
    const { data: players, error: playersError } = await supabase
      .from('room_players')
      .select('id, is_alive, role, player_id')
      .eq('room_id', room_id)

    if (playersError || !players) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch players' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let newPhase = gameState.phase
    let newDayNumber = gameState.day_number
    let updates: Record<string, unknown> = {}

    if (gameState.phase === 'night') {
      // Check if all night actions are complete (or force)
      const alivePlayers = players.filter(p => p.is_alive)
      const hasMafia = alivePlayers.some(p => p.role === 'mafia')
      const hasDoctor = alivePlayers.some(p => p.role === 'doctor')
      const hasDetective = alivePlayers.some(p => p.role === 'detective')

      const mafiaActed = !hasMafia || gameState.mafia_target_id !== null
      const doctorActed = !hasDoctor || gameState.doctor_target_id !== null
      const detectiveActed = !hasDetective || gameState.detective_target_id !== null

      const allActed = mafiaActed && doctorActed && detectiveActed

      if (!allActed && !force) {
        return new Response(
          JSON.stringify({ error: 'Not all night actions complete' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (force && !isHost) {
        return new Response(
          JSON.stringify({ error: 'Only host can force advance' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Resolve night actions
      await resolveNightActions(supabase, room_id, gameState, players)

      newPhase = 'day_voting'
      updates = {
        mafia_target_id: null,
        doctor_target_id: null,
        detective_target_id: null,
        detective_result: null,
      }
    } else if (gameState.phase === 'day_voting') {
      // Check if all votes are in (or force)
      const alivePlayers = players.filter(p => p.is_alive)
      
      const { data: votes, error: votesError } = await supabase
        .from('votes')
        .select('*')
        .eq('room_id', room_id)
        .eq('day_number', gameState.day_number)

      if (votesError) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch votes' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const allVoted = (votes?.length || 0) >= alivePlayers.length

      if (!allVoted && !force) {
        return new Response(
          JSON.stringify({ error: 'Not all votes in' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (force && !isHost) {
        return new Response(
          JSON.stringify({ error: 'Only host can force advance' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Resolve voting
      await resolveVoting(supabase, room_id, votes || [])

      newPhase = 'night'
      newDayNumber = gameState.day_number + 1
      updates = {
        last_mafia_target_name: null,
        last_doctor_target_name: null,
        last_detective_target_name: null,
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Cannot advance from this phase' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check win conditions with fresh data
    const { data: freshPlayers } = await supabase
      .from('room_players')
      .select('id, is_alive, role')
      .eq('room_id', room_id)

    const alivePlayers = freshPlayers?.filter(p => p.is_alive) || []
    const aliveMafia = alivePlayers.filter(p => p.role === 'mafia')
    const aliveTown = alivePlayers.filter(p => p.role !== 'mafia')

    if (aliveMafia.length === 0) {
      await endGame(supabase, room_id, gameState.id, 'civilians')
      return new Response(
        JSON.stringify({ success: true, winner: 'civilians' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (aliveMafia.length >= aliveTown.length) {
      await endGame(supabase, room_id, gameState.id, 'mafia')
      return new Response(
        JSON.stringify({ success: true, winner: 'mafia' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update game state
    await supabase
      .from('game_state')
      .update({
        phase: newPhase,
        day_number: newDayNumber,
        phase_end_time: null,
        ...updates,
      })
      .eq('id', gameState.id)

    return new Response(
      JSON.stringify({ success: true, phase: newPhase }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in advance-phase:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// deno-lint-ignore no-explicit-any
async function resolveNightActions(
  supabase: SupabaseClient<any>,
  roomId: string,
  gameState: { mafia_target_id: string | null; doctor_target_id: string | null },
  players: Array<{ id: string; is_alive: boolean; role: string | null; player_id: string }>
) {
  const mafiaTarget = gameState.mafia_target_id
  const doctorTarget = gameState.doctor_target_id

  // Get player nicknames
  const playerIds = players.map(p => p.player_id)
  const { data: playerInfos } = await supabase
    .from('players')
    .select('id, nickname')
    .in('id', playerIds)

  const nicknameMap = new Map(playerInfos?.map((p: { id: string; nickname: string }) => [p.id, p.nickname]) || [])

  if (mafiaTarget && mafiaTarget !== doctorTarget) {
    // Kill the target
    await supabase
      .from('room_players')
      .update({ is_alive: false })
      .eq('id', mafiaTarget)

    const victim = players.find(p => p.id === mafiaTarget)
    if (victim) {
      const displayRole = victim.role === 'mafia' ? 'Mafia' : 'Civilian'
      const nickname = nicknameMap.get(victim.player_id) || 'Unknown'

      await supabase.from('messages').insert({
        room_id: roomId,
        content: `☠️ ${nickname} was found dead this morning. They were a ${displayRole}.`,
        is_system: true,
      })
    }
  } else if (mafiaTarget && mafiaTarget === doctorTarget) {
    await supabase.from('messages').insert({
      room_id: roomId,
      content: `🏥 Someone was attacked last night, but the Doctor saved them!`,
      is_system: true,
    })
  } else {
    await supabase.from('messages').insert({
      room_id: roomId,
      content: `The night passes peacefully. No one was killed.`,
      is_system: true,
    })
  }
}

// deno-lint-ignore no-explicit-any
async function resolveVoting(
  supabase: SupabaseClient<any>,
  roomId: string,
  votes: Array<{ target_id: string | null }>
) {
  const voteCounts: Record<string, number> = {}
  for (const vote of votes) {
    if (vote.target_id) {
      voteCounts[vote.target_id] = (voteCounts[vote.target_id] || 0) + 1
    }
  }

  let maxVotes = 0
  let eliminated: string | null = null
  let tiedPlayers: string[] = []

  for (const [targetId, count] of Object.entries(voteCounts)) {
    if (count > maxVotes) {
      maxVotes = count
      eliminated = targetId
      tiedPlayers = [targetId]
    } else if (count === maxVotes && maxVotes > 0) {
      tiedPlayers.push(targetId)
    }
  }

  const hasTie = tiedPlayers.length > 1

  if (eliminated && !hasTie && maxVotes > 0) {
    await supabase
      .from('room_players')
      .update({ is_alive: false })
      .eq('id', eliminated)

    const { data: victim } = await supabase
      .from('room_players')
      .select('id, role, player_id')
      .eq('id', eliminated)
      .single()

    if (victim) {
      const { data: playerInfo } = await supabase
        .from('players')
        .select('nickname')
        .eq('id', victim.player_id)
        .single()

      const displayRole = victim.role === 'mafia' ? 'Mafia' : 'Civilian'
      const nickname = playerInfo?.nickname || 'Unknown'

      await supabase.from('messages').insert({
        room_id: roomId,
        content: `⚖️ The town has spoken. ${nickname} has been eliminated. They were a ${displayRole}.`,
        is_system: true,
      })
    }
  } else if (hasTie) {
    await supabase.from('messages').insert({
      room_id: roomId,
      content: `⚖️ The vote ended in a tie. No one was eliminated.`,
      is_system: true,
    })
  } else {
    await supabase.from('messages').insert({
      room_id: roomId,
      content: `The vote was inconclusive. No one was eliminated.`,
      is_system: true,
    })
  }
}

// deno-lint-ignore no-explicit-any
async function endGame(
  supabase: SupabaseClient<any>,
  roomId: string,
  gameStateId: string,
  winner: 'mafia' | 'civilians'
) {
  await supabase
    .from('game_state')
    .update({
      phase: 'game_over',
      winner,
      phase_end_time: null,
    })
    .eq('id', gameStateId)

  await supabase
    .from('rooms')
    .update({ status: 'finished' })
    .eq('id', roomId)

  const winMessage = winner === 'mafia'
    ? '🔪 The Mafia has taken over the town! Mafia wins!'
    : '🎉 The town has eliminated all the Mafia! Civilians win!'

  await supabase.from('messages').insert({
    room_id: roomId,
    content: winMessage,
    is_system: true,
  })
}
