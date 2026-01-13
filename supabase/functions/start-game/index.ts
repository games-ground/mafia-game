import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2'

// Get allowed origins from environment or use a sensible default
const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || ['https://lovable.dev', 'https://*.lovable.app']

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  
  // Check if origin matches allowed patterns
  const isAllowed = allowedOrigins.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$')
      return regex.test(origin)
    }
    return pattern === origin
  })
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

interface StartGameRequest {
  room_id: string
  host_player_id: string
  browser_id: string // Required for authentication
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { room_id, host_player_id, browser_id }: StartGameRequest = await req.json()

    if (!room_id || !host_player_id || !browser_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // SECURITY: Verify browser_id matches the host_player_id in the database
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id, browser_id')
      .eq('id', host_player_id)
      .single()

    if (playerError || !player) {
      return new Response(
        JSON.stringify({ error: 'Player not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (player.browser_id !== browser_id) {
      console.error('Browser ID mismatch - potential impersonation attempt')
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify room exists and caller is host
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', room_id)
      .single()

    if (roomError || !room) {
      return new Response(
        JSON.stringify({ error: 'Room not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (room.host_id !== host_player_id) {
      return new Response(
        JSON.stringify({ error: 'Only the host can start the game' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (room.status !== 'waiting') {
      return new Response(
        JSON.stringify({ error: 'Game already started' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get all players in the room
    const { data: players, error: playersError } = await supabase
      .from('room_players')
      .select('id, player_id, is_ready')
      .eq('room_id', room_id)

    if (playersError || !players) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch players' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify minimum player count
    if (players.length < room.min_players) {
      return new Response(
        JSON.stringify({ error: `Need at least ${room.min_players} players to start` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify all players are ready
    const allReady = players.every(p => p.is_ready || p.player_id === host_player_id)
    if (!allReady) {
      return new Response(
        JSON.stringify({ error: 'Not all players are ready' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Assign roles using cryptographic randomness
    const roles = assignRoles(players.length, {
      mafia_count: room.mafia_count,
      doctor_count: room.doctor_count,
      detective_count: room.detective_count,
    })

    // Shuffle players using crypto random
    const shuffledPlayers = [...players].sort(() => crypto.getRandomValues(new Uint32Array(1))[0] / 0xFFFFFFFF - 0.5)

    // Update each player's role
    for (let i = 0; i < shuffledPlayers.length; i++) {
      const { error: updateError } = await supabase
        .from('room_players')
        .update({ role: roles[i] })
        .eq('id', shuffledPlayers[i].id)

      if (updateError) {
        console.error('Error updating player role:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to assign roles' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Update room status
    const { error: roomUpdateError } = await supabase
      .from('rooms')
      .update({ status: 'playing' })
      .eq('id', room_id)

    if (roomUpdateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to update room status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create game state
    const { error: gameStateError } = await supabase
      .from('game_state')
      .insert({
        room_id,
        phase: 'night',
        day_number: 1,
        phase_end_time: null,
      })

    if (gameStateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to create game state' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Add system message
    await supabase.from('messages').insert({
      room_id,
      content: 'The game has begun! Night falls upon the town...',
      is_system: true,
    })

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in start-game:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function assignRoles(playerCount: number, config: { mafia_count: number; doctor_count: number; detective_count: number }): string[] {
  const roles: string[] = []
  
  const mafiaCount = Math.min(config.mafia_count, playerCount - 1)
  const doctorCount = Math.min(config.doctor_count, playerCount - mafiaCount)
  const detectiveCount = Math.min(config.detective_count, playerCount - mafiaCount - doctorCount)
  
  for (let i = 0; i < mafiaCount; i++) {
    roles.push('mafia')
  }
  for (let i = 0; i < doctorCount; i++) {
    roles.push('doctor')
  }
  for (let i = 0; i < detectiveCount; i++) {
    roles.push('detective')
  }
  while (roles.length < playerCount) {
    roles.push('civilian')
  }
  
  return roles
}
