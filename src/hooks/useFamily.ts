import { useState, useCallback } from 'react';
import { getTossShareLink, share } from '@apps-in-toss/web-framework';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';

export function useFamily() {
  const [loading, setLoading] = useState(false);
  const { user, setFamily } = useAppStore();

  const createFamily = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 세션 확인
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[createFamily] session uid:', session?.user?.id, '/ store uid:', user.id);
      if (!session) throw new Error('세션 없음 — 앱을 재시작해 주세요');
      if (session.user.id !== user.id) throw new Error(`UID 불일치: session=${session.user.id.slice(0,8)} store=${user.id.slice(0,8)}`);

      const { data, error } = await supabase
        .from('families')
        .insert({ owner_id: user.id })
        .select()
        .single();

      if (error) {
        console.error('[createFamily] families insert error:', error);
        throw new Error(error.message);
      }

      await supabase.from('family_members').insert({
        family_id: data.id,
        user_id: user.id,
      });

      setFamily({
        id: data.id,
        inviteCode: data.invite_code,
        firstName: data.first_name,
        secondName: data.second_name,
      });
    } finally {
      setLoading(false);
    }
  }, [user, setFamily]);

  const joinFamily = useCallback(async (inviteCode: string) => {
    if (!user) return false;
    setLoading(true);
    try {
      const { data: fam, error } = await supabase
        .from('families')
        .select()
        .eq('invite_code', inviteCode)
        .single();

      if (error || !fam) return false;

      await supabase.from('family_members').upsert({
        family_id: fam.id,
        user_id: user.id,
      });

      setFamily({
        id: fam.id,
        inviteCode: fam.invite_code,
        firstName: fam.first_name,
        secondName: fam.second_name,
      });
      return true;
    } finally {
      setLoading(false);
    }
  }, [user, setFamily]);

  const updateBabyNames = useCallback(async (firstName: string, secondName: string) => {
    const { family, setFamily: sf } = useAppStore.getState();
    if (!family) return;
    const { error } = await supabase
      .from('families')
      .update({ first_name: firstName, second_name: secondName })
      .eq('id', family.id);

    if (!error) {
      sf({ ...family, firstName, secondName });
    }
  }, []);

  const shareInvite = useCallback(async () => {
    const { family } = useAppStore.getState();
    if (!family) return;
    try {
      const deepLink = `intoss://simplemilkpoop?invite=${family.inviteCode}`;
      const tossLink = await getTossShareLink(deepLink);
      await share({ message: `쌍둥이 수유기록 앱에 초대합니다! ${tossLink}` });
    } catch (e) {
      console.error('Share failed', e);
    }
  }, []);

  return { createFamily, joinFamily, updateBabyNames, shareInvite, loading };
}
