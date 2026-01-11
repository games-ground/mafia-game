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

interface EndGameRequest {
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

    const { room_id, host_player_id, browser_id }: EndGameRequest = await req.json()

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
        JSON.stringify({ error: 'Only the host can end the game' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (room.status !== 'playing') {
      return new Response(
        JSON.stringify({ error: 'Game is not in progress' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get game state
    const { data: gameState, error: gsError } = await supabase
      .from('game_state')
      .select('id')
      .eq('room_id', room_id)
      .single()

    if (gsError || !gameState) {
      return new Response(
        JSON.stringify({ error: 'Game state not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // End the game
    await supabase
      .from('game_state')
      .update({
        phase: 'game_over',
        winner: null,
        phase_end_time: null,
      })
      .eq('id', gameState.id)

    await supabase
      .from('rooms')
      .update({ status: 'finished' })
      .eq('id', room_id)

    await supabase.from('messages').insert({
      room_id,
      content: '🛑 The game has been ended by the host.',
      is_system: true,
    })

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in end-game:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
