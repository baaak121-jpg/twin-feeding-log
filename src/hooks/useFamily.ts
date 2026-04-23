import { useState, useCallback } from 'react';
import { getTossShareLink, share } from '@apps-in-toss/web-framework';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';

export function useFamily() {
  const [loading, setLoading] = useState(false);
  const { user, setUser, setFamily } = useAppStore();

  const createFamily = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 세션 확인 — 불일치 시 세션 UID를 진실의 소스로 삼아 스토어 재정렬
      let { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { data, error: authError } = await supabase.auth.signInAnonymously();
        if (authError) throw authError;
        session = data.session;
      }
      if (!session) throw new Error('세션 없음 — 앱을 재시작해 주세요');

      const sessionUid = session.user.id;
      if (sessionUid !== user.id) {
        console.warn('[createFamily] UID 재정렬:', user.id.slice(0, 8), '→', sessionUid.slice(0, 8));
        // users 레코드 존재 확인 후 스토어 갱신
        const { data: existingUser } = await supabase
          .from('users')
          .select('ai_credits')
          .eq('id', sessionUid)
          .maybeSingle();
        const tossUserKey = parseInt(sessionUid.replace(/-/g, '').slice(0, 12), 16);
        if (!existingUser) {
          await supabase.from('users').insert({
            id: sessionUid,
            toss_user_key: tossUserKey,
            ai_credits: 10,
          });
        }
        setUser({
          id: sessionUid,
          tossUserKey,
          aiCredits: existingUser?.ai_credits ?? 10,
        });
      }

      const effectiveUid = sessionUid;

      const { data, error } = await supabase
        .from('families')
        .insert({ owner_id: effectiveUid })
        .select()
        .single();

      if (error) {
        console.error('[createFamily] families insert error:', error);
        throw new Error(error.message);
      }

      await supabase.from('family_members').insert({
        family_id: data.id,
        user_id: effectiveUid,
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
  }, [user, setUser, setFamily]);

  const joinFamily = useCallback(async (inviteCode: string) => {
    if (!user) return false;
    setLoading(true);
    try {
      // 세션 UID 재정렬
      let { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { data, error: authError } = await supabase.auth.signInAnonymously();
        if (authError) throw authError;
        session = data.session;
      }
      if (!session) return false;
      const effectiveUid = session.user.id;
      if (effectiveUid !== user.id) {
        const tossUserKey = parseInt(effectiveUid.replace(/-/g, '').slice(0, 12), 16);
        const { data: existingUser } = await supabase
          .from('users').select('ai_credits').eq('id', effectiveUid).maybeSingle();
        if (!existingUser) {
          await supabase.from('users').insert({ id: effectiveUid, toss_user_key: tossUserKey, ai_credits: 10 });
        }
        setUser({ id: effectiveUid, tossUserKey, aiCredits: existingUser?.ai_credits ?? 10 });
      }

      const { data: fam, error } = await supabase
        .from('families')
        .select()
        .eq('invite_code', inviteCode)
        .single();

      if (error || !fam) return false;

      await supabase.from('family_members').upsert({
        family_id: fam.id,
        user_id: effectiveUid,
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
  }, [user, setUser, setFamily]);

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
