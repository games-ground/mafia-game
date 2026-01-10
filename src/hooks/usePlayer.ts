import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getBrowserId, getNickname, setNickname as saveNickname } from '@/lib/browser-id';
import { Player } from '@/types/game';
import { useAuth } from './useAuth';

export function usePlayer() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasStoredNickname, setHasStoredNickname] = useState(false);
  const { user, profile, isAuthenticated } = useAuth();

  useEffect(() => {
    initializePlayer();
  }, [user, profile]);

  async function initializePlayer() {
    const browserId = getBrowserId();
    const savedNickname = getNickname();
    
    // Check if user has a stored nickname (not default)
    setHasStoredNickname(!!savedNickname && savedNickname !== 'Anonymous');

    try {
      // Try to get existing player by browser_id
      const { data: existingPlayer, error: fetchError } = await supabase
        .from('players')
        .select('*')
        .eq('browser_id', browserId)
        .single();

      if (existingPlayer) {
        // If user is authenticated and player doesn't have profile_id, link them
        if (isAuthenticated && profile && !existingPlayer.profile_id) {
          const { data: updatedPlayer, error: updateError } = await supabase
            .from('players')
            .update({ 
              profile_id: profile.id,
              // Only update nickname if it's still "Anonymous"
              ...(existingPlayer.nickname === 'Anonymous' && profile.display_name 
                ? { nickname: profile.display_name } 
                : {})
            })
            .eq('id', existingPlayer.id)
            .select()
            .single();

          if (updateError) {
            console.error('Error linking profile:', updateError);
            setPlayer(existingPlayer as Player);
          } else {
            setPlayer(updatedPlayer as Player);
            // Update hasStoredNickname
            setHasStoredNickname(updatedPlayer.nickname !== 'Anonymous');
          }
        } else {
          setPlayer(existingPlayer as Player);
          setHasStoredNickname(existingPlayer.nickname !== 'Anonymous');
        }
      } else if (fetchError?.code === 'PGRST116') {
        // Player doesn't exist, create one
        // Use profile display name if authenticated, otherwise saved nickname
        const initialNickname = (isAuthenticated && profile?.display_name) 
          ? profile.display_name 
          : (savedNickname || 'Anonymous');

        const { data: newPlayer, error: createError } = await supabase
          .from('players')
          .insert({
            browser_id: browserId,
            nickname: initialNickname,
            profile_id: profile?.id || null,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating player:', createError);
        } else {
          setPlayer(newPlayer as Player);
          setHasStoredNickname(initialNickname !== 'Anonymous');
          if (initialNickname !== 'Anonymous') {
            saveNickname(initialNickname);
          }
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

  return { player, loading, updateNickname, hasStoredNickname, isAuthenticated };
}