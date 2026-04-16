import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setUser, setFamily } = useAppStore();

  const login = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 기존 세션 재사용 — StrictMode 이중 실행으로 인한 UID 불일치 방지
      const { data: { session: existing } } = await supabase.auth.getSession();

      let userId: string;
      if (existing?.user) {
        userId = existing.user.id;
      } else {
        const { data, error: authError } = await supabase.auth.signInAnonymously();
        if (authError) throw authError;
        if (!data.user) throw new Error('익명 로그인 실패');
        userId = data.user.id;
      }

      const tossUserKey = parseInt(userId.replace(/-/g, '').slice(0, 12), 16);

      // user 레코드 조회/생성
      const { data: existingUser } = await supabase
        .from('users')
        .select('ai_credits')
        .eq('id', userId)
        .maybeSingle();

      let aiCredits = 10;
      if (!existingUser) {
        await supabase.from('users').insert({
          id: userId,
          toss_user_key: tossUserKey,
          ai_credits: 10,
        });
      } else {
        aiCredits = existingUser.ai_credits;
      }

      setUser({ id: userId, tossUserKey, aiCredits });

      // 가족 그룹 조회
      const { data: member } = await supabase
        .from('family_members')
        .select('family_id, families(id, invite_code, first_name, second_name)')
        .eq('user_id', userId)
        .maybeSingle();

      if (member?.families) {
        const fam = member.families as unknown as {
          id: string; invite_code: string; first_name: string; second_name: string;
        };
        setFamily({
          id: fam.id,
          inviteCode: fam.invite_code,
          firstName: fam.first_name,
          secondName: fam.second_name,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '로그인 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }, [setUser, setFamily]);

  return { login, loading, error };
}
