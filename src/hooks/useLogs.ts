import { useState, useEffect, useCallback } from 'react';
import { supabase, DbLog } from '../lib/supabase';
import { useAppStore } from '../store/appStore';

export type LogEntry = DbLog;

export function useLogs() {
  const { family, currentDate } = useAppStore();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [allLogs, setAllLogs] = useState<Record<string, LogEntry[]>>({});

  // 실시간 구독: 현재 날짜 로그
  useEffect(() => {
    if (!family) { setLogs([]); return; }

    const fetchLogs = async () => {
      const { data } = await supabase
        .from('logs')
        .select('*')
        .eq('family_id', family.id)
        .order('time', { ascending: true });
      if (data) {
        const grouped: Record<string, LogEntry[]> = {};
        for (const log of data) {
          if (!grouped[log.date]) grouped[log.date] = [];
          grouped[log.date].push(log as LogEntry);
        }
        setAllLogs(grouped);
        setLogs((grouped[currentDate] ?? []).sort((a, b) => a.time < b.time ? -1 : 1));
      }
    };

    fetchLogs();

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
  }, [family, currentDate]);

  const addLog = useCallback(async (params: {
    time: string;
    baby: '1' | '2' | 'both';
    volume?: number;
    unit?: 'ml' | 'min' | 'nap';
    poop?: boolean;
  }) => {
    const { family: fam } = useAppStore.getState();
    const { currentDate: date } = useAppStore.getState();
    if (!fam) return;

    // 같은 시간·타입 중복 제거 (upsert 방식)
    const existQuery = supabase
      .from('logs')
      .select('id')
      .eq('family_id', fam.id)
      .eq('date', date)
      .eq('time', params.time)
      .eq('baby', params.baby)
      .eq('poop', params.poop ?? false);

    if (!params.poop && params.unit) {
      existQuery.eq('unit', params.unit);
    }

    const { data: existing } = await existQuery.maybeSingle();

    const payload = {
      family_id: fam.id,
      date,
      time: params.time,
      baby: params.baby,
      volume: params.volume ?? null,
      unit: params.unit ?? null,
      poop: params.poop ?? false,
    };

    if (existing?.id) {
      await supabase.from('logs').update(payload).eq('id', existing.id);
    } else {
      await supabase.from('logs').insert(payload);
    }
  }, []);

  const updateLog = useCallback(async (id: string, updates: Partial<Pick<DbLog, 'volume' | 'time' | 'unit'>>) => {
    await supabase.from('logs').update(updates).eq('id', id);
  }, []);

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
  }, [logs]);

  return { logs, allLogs, addLog, updateLog, deleteLog };
}
