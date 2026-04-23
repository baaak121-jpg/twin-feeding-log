import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, DbLog } from '../lib/supabase';
import { useAppStore } from '../store/appStore';

export type LogEntry = DbLog;

export function useLogs() {
  const { family, currentDate } = useAppStore();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [allLogs, setAllLogs] = useState<Record<string, LogEntry[]>>({});

  // currentDate를 ref로 보관 → fetchLogs 재생성 안하면서도 최신값 사용
  const currentDateRef = useRef(currentDate);
  useEffect(() => { currentDateRef.current = currentDate; }, [currentDate]);

  // 실제 fetch 로직
  const fetchLogs = useCallback(async () => {
    if (!family) { setLogs([]); setAllLogs({}); return; }
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .eq('family_id', family.id)
      .order('time', { ascending: true });
    if (error) { console.warn('[useLogs] fetch error:', error.message); return; }
    if (!data) return;

    const grouped: Record<string, LogEntry[]> = {};
    for (const log of data) {
      if (!grouped[log.date]) grouped[log.date] = [];
      grouped[log.date].push(log as LogEntry);
    }
    setAllLogs(grouped);
    setLogs(
      (grouped[currentDateRef.current] ?? []).sort((a, b) => (a.time < b.time ? -1 : 1))
    );
  }, [family]);

  // family 또는 currentDate 바뀌면 refetch
  useEffect(() => { fetchLogs(); }, [fetchLogs, currentDate]);

  // 실시간 구독 (Realtime이 켜져 있으면 bonus로 동작, 꺼져도 mutation refetch로 커버)
  useEffect(() => {
    if (!family) return;
    const channel = supabase
      .channel(`logs:${family.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'logs',
        filter: `family_id=eq.${family.id}`,
      }, () => { fetchLogs(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [family, fetchLogs]);

  const addLog = useCallback(async (params: {
    time: string;
    baby: '1' | '2' | 'both';
    volume?: number;
    unit?: 'ml' | 'min';
    poop?: boolean;
  }) => {
    const { family: fam } = useAppStore.getState();
    const { currentDate: date } = useAppStore.getState();
    if (!fam) return;

    const payload = {
      family_id: fam.id,
      date,
      time: params.time,
      baby: params.baby,
      volume: params.volume ?? null,
      unit: params.unit ?? null,
      poop: params.poop ?? false,
    };

    // 같은 "종류(kind)"는 시간당 아기별로 하나만 존재해야 함
    // kind = 'poop' | 'ml' | 'min' | 'nap'
    const kind: string | null = params.poop ? 'poop' : (params.unit ?? null);

    // 같은 시간·같은 kind 레코드 조회
    let existQ = supabase
      .from('logs')
      .select('id, baby, poop, unit')
      .eq('family_id', fam.id)
      .eq('date', date)
      .eq('time', params.time);
    if (kind === 'poop') existQ = existQ.eq('poop', true);
    else if (kind) existQ = existQ.eq('poop', false).eq('unit', kind);
    const { data: existing } = await existQ;
    const rows = existing ?? [];

    if (params.baby === 'both') {
      // 'both' 입력: 같은 시간·같은 kind 의 모든 기존 레코드 삭제
      if (rows.length > 0) {
        await supabase.from('logs').delete().in('id', rows.map((r) => r.id));
      }
    } else {
      // '1' 또는 '2' 입력
      const other = params.baby === '1' ? '2' : '1';
      for (const r of rows) {
        if (r.baby === params.baby) {
          // 같은 아기의 같은 kind 중복 → 삭제(덮어쓰기)
          await supabase.from('logs').delete().eq('id', r.id);
        } else if (r.baby === 'both') {
          // 기존 'both' → 반대 아기로 전환(= 방금 선택 안 한 아기에겐 기록 유지)
          await supabase.from('logs').update({ baby: other }).eq('id', r.id);
        }
        // r.baby === other 인 경우: 다른 아기 기록은 그대로 유지
      }
    }

    await supabase.from('logs').insert(payload);
    await fetchLogs();
  }, [fetchLogs]);

  const updateLog = useCallback(async (id: string, updates: Partial<Pick<DbLog, 'volume' | 'time' | 'unit'>>) => {
    await supabase.from('logs').update(updates).eq('id', id);
    await fetchLogs();
  }, [fetchLogs]);

  const deleteLog = useCallback(async (id: string, fromBaby?: '1' | '2') => {
    const log = logs.find((l) => l.id === id);
    if (!log) return;

    if (log.baby === 'both' && fromBaby) {
      // 'both' 항목에서 한쪽만 삭제 → 반대편 아기로 변경
      const other = fromBaby === '1' ? '2' : '1';
      await supabase.from('logs').update({ baby: other }).eq('id', id);
    } else {
      await supabase.from('logs').delete().eq('id', id);
    }
    await fetchLogs();
  }, [logs, fetchLogs]);

  return { logs, allLogs, addLog, updateLog, deleteLog, fetchLogs };
}
