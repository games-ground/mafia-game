import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NightActionRequest {
  room_id: string
  room_player_id: string
  player_id: string // browser_id-linked player id for verification
  target_id: string
  action_type: 'kill' | 'protect' | 'investigate'
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

    const { room_id, room_player_id, player_id, target_id, action_type }: NightActionRequest = await req.json()

    if (!room_id || !room_player_id || !player_id || !target_id || !action_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the room_player belongs to the claimed player_id
    const { data: roomPlayer, error: rpError } = await supabase
      .from('room_players')
      .select('id, player_id, role, is_alive, room_id')
      .eq('id', room_player_id)
      .single()

    if (rpError || !roomPlayer) {
      return new Response(
        JSON.stringify({ error: 'Player not found' }),
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
        JSON.stringify({ error: 'Dead players cannot act' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify role matches action
    const roleActionMap: Record<string, string> = {
      kill: 'mafia',
      protect: 'doctor',
      investigate: 'detective',
    }

    if (roomPlayer.role !== roleActionMap[action_type]) {
      return new Response(
        JSON.stringify({ error: 'Invalid action for your role' }),
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

    // Verify phase is night
    if (gameState.phase !== 'night') {
      return new Response(
        JSON.stringify({ error: 'Night actions only allowed at night' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if player has already acted
    const targetField = {
      kill: 'mafia_target_id',
      protect: 'doctor_target_id',
      investigate: 'detective_target_id',
    }[action_type] as keyof typeof gameState

    if (gameState[targetField] !== null) {
      return new Response(
        JSON.stringify({ error: 'You have already acted this night' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify target is valid (alive player in the room)
    const { data: targetPlayer, error: targetError } = await supabase
      .from('room_players')
      .select('id, is_alive, role, player_id')
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
        JSON.stringify({ error: 'Cannot target dead players' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Mafia cannot target other mafia
    if (action_type === 'kill' && targetPlayer.role === 'mafia') {
      return new Response(
        JSON.stringify({ error: 'Mafia cannot kill other mafia' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get target player nickname for spectator mode
    const { data: targetPlayerInfo } = await supabase
      .from('players')
      .select('nickname')
      .eq('id', targetPlayer.player_id)
      .single()

    const nameField = {
      kill: 'last_mafia_target_name',
      protect: 'last_doctor_target_name',
      investigate: 'last_detective_target_name',
    }[action_type]

    // Update game state with the action
    const updateData: Record<string, string | null> = {
      [targetField]: target_id,
    }
    if (nameField && targetPlayerInfo) {
      updateData[nameField] = targetPlayerInfo.nickname
    }

    const { error: updateError } = await supabase
      .from('game_state')
      .update(updateData)
      .eq('id', gameState.id)

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to record action' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log the action
    await supabase.from('game_actions').insert({
      room_id,
      actor_id: room_player_id,
      action_type: `${roomPlayer.role}_action`,
      target_id,
      day_number: gameState.day_number,
      phase: gameState.phase,
    })

    // For detective, send immediate private result
    if (action_type === 'investigate') {
      const isMafia = targetPlayer.role === 'mafia'
      const resultMessage = isMafia
        ? `🔍 Your investigation reveals that ${targetPlayerInfo?.nickname} is MAFIA!`
        : `🔍 Your investigation reveals that ${targetPlayerInfo?.nickname} is NOT Mafia.`

      await supabase.from('messages').insert({
        room_id,
        content: resultMessage,
        is_system: true,
        is_mafia_only: false,
        role_type: 'detective',
      })
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in submit-night-action:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
