import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getBrowserId, getNickname, setNickname as saveNickname } from '@/lib/browser-id';
import { Player } from '@/types/game';

export function usePlayer() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasStoredNickname, setHasStoredNickname] = useState(false);

  useEffect(() => {
    initializePlayer();
  }, []);

  async function initializePlayer() {
    const browserId = getBrowserId();
    const savedNickname = getNickname();
    
    // Check if user has a stored nickname (not default)
    setHasStoredNickname(!!savedNickname && savedNickname !== 'Anonymous');

    try {
      // Try to get existing player
      const { data: existingPlayer, error: fetchError } = await supabase
        .from('players')
        .select('*')
        .eq('browser_id', browserId)
        .single();

      if (existingPlayer) {
        setPlayer(existingPlayer as Player);
        // Update hasStoredNickname based on existing player
        setHasStoredNickname(existingPlayer.nickname !== 'Anonymous');
      } else if (fetchError?.code === 'PGRST116') {
        // Player doesn't exist, create one
        const { data: newPlayer, error: createError } = await supabase
          .from('players')
          .insert({
            browser_id: browserId,
            nickname: savedNickname || 'Anonymous',
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating player:', createError);
        } else {
          setPlayer(newPlayer as Player);
        }
      }
    } catch (error) {
      console.error('Error initializing player:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateNickname(nickname: string) {
    if (!player) return;

    saveNickname(nickname);
    setHasStoredNickname(nickname !== 'Anonymous');

    const { data, error } = await supabase
      .from('players')
      .update({ nickname })
      .eq('id', player.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating nickname:', error);
    } else {
      setPlayer(data as Player);
    }
  }

  return { player, loading, updateNickname, hasStoredNickname };
}
