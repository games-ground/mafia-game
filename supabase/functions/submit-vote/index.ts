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

interface VoteRequest {
  room_id: string
  room_player_id: string
  player_id: string
  browser_id: string // Required for authentication
  target_id: string | null
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

    const { room_id, room_player_id, player_id, browser_id, target_id }: VoteRequest = await req.json()

    if (!room_id || !room_player_id || !player_id || !browser_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // SECURITY: Verify browser_id matches the player_id in the database
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id, browser_id')
      .eq('id', player_id)
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

    // Verify the room_player belongs to the claimed player_id
    const { data: roomPlayer, error: rpError } = await supabase
      .from('room_players')
      .select('id, player_id, is_alive, room_id')
      .eq('id', room_player_id)
      .single()

    if (rpError || !roomPlayer) {
      return new Response(
        JSON.stringify({ error: 'Room player not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify player identity
    if (roomPlayer.player_id !== player_id) {
      return new Response(
        JSON.stringify({ error: 'Player identity mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify player is in the correct room
    if (roomPlayer.room_id !== room_id) {
      return new Response(
        JSON.stringify({ error: 'Player not in this room' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify player is alive
    if (!roomPlayer.is_alive) {
      return new Response(
        JSON.stringify({ error: 'Dead players cannot vote' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    // Verify phase is day_voting
    if (gameState.phase !== 'day_voting') {
      return new Response(
        JSON.stringify({ error: 'Voting only allowed during day voting phase' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If target is not null, verify target is valid
    if (target_id !== null) {
      const { data: targetPlayer, error: targetError } = await supabase
        .from('room_players')
        .select('id, is_alive')
        .eq('id', target_id)
        .eq('room_id', room_id)
        .single()

      if (targetError || !targetPlayer) {
        return new Response(
          JSON.stringify({ error: 'Target not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!targetPlayer.is_alive) {
        return new Response(
          JSON.stringify({ error: 'Cannot vote for dead players' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Upsert vote
    const { error: voteError } = await supabase
      .from('votes')
      .upsert({
        room_id,
        voter_id: room_player_id,
        target_id,
        day_number: gameState.day_number,
      }, {
        onConflict: 'room_id,voter_id,day_number',
      })

    if (voteError) {
      return new Response(
        JSON.stringify({ error: 'Failed to record vote' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in submit-vote:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
