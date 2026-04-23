import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { useLogs } from '../hooks/useLogs';
import { supabase } from '../lib/supabase';
import TimelineView from '../components/TimelineView';
import StatsView from '../components/StatsView';
import InlineInputBar from '../components/InlineInputBar';
import AIInputModal from '../components/AIInputModal';
import InviteModal from '../components/InviteModal';

function dateStr(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DUMMY_LOGS = [
  // 오늘
  { date: dateStr(0), time: '06:00', baby: '1' as const, volume: 120, unit: 'ml' as const },
  { date: dateStr(0), time: '06:10', baby: '2' as const, volume: 100, unit: 'ml' as const },
  { date: dateStr(0), time: '08:30', baby: 'both' as const, volume: 150, unit: 'ml' as const },
  { date: dateStr(0), time: '09:00', baby: '1' as const, poop: true },
  { date: dateStr(0), time: '10:00', baby: '1' as const, poop: true },
  { date: dateStr(0), time: '10:15', baby: '2' as const, volume: 110, unit: 'ml' as const },
  { date: dateStr(0), time: '12:00', baby: '1' as const, volume: 130, unit: 'ml' as const },
  { date: dateStr(0), time: '12:20', baby: '2' as const, volume: 120, unit: 'ml' as const },
  { date: dateStr(0), time: '14:00', baby: '2' as const, poop: true },
  { date: dateStr(0), time: '15:30', baby: 'both' as const, volume: 20, unit: 'min' as const },
  { date: dateStr(0), time: '17:00', baby: '1' as const, volume: 140, unit: 'ml' as const },
  { date: dateStr(0), time: '17:10', baby: '2' as const, volume: 130, unit: 'ml' as const },
  { date: dateStr(0), time: '19:30', baby: 'both' as const, poop: true },
  { date: dateStr(0), time: '21:00', baby: '1' as const, volume: 150, unit: 'ml' as const },
  { date: dateStr(0), time: '21:10', baby: '2' as const, volume: 140, unit: 'ml' as const },
  // 어제
  { date: dateStr(1), time: '06:30', baby: 'both' as const, volume: 120, unit: 'ml' as const },
  { date: dateStr(1), time: '09:00', baby: '1' as const, volume: 130, unit: 'ml' as const },
  { date: dateStr(1), time: '09:15', baby: '2' as const, volume: 110, unit: 'ml' as const },
  { date: dateStr(1), time: '10:30', baby: '1' as const, poop: true },
  { date: dateStr(1), time: '12:00', baby: 'both' as const, volume: 150, unit: 'ml' as const },
  { date: dateStr(1), time: '14:00', baby: '2' as const, poop: true },
  { date: dateStr(1), time: '15:00', baby: '2' as const, poop: true },
  { date: dateStr(1), time: '18:00', baby: 'both' as const, volume: 140, unit: 'ml' as const },
  { date: dateStr(1), time: '21:30', baby: '1' as const, volume: 160, unit: 'ml' as const },
  { date: dateStr(1), time: '21:40', baby: '2' as const, volume: 150, unit: 'ml' as const },
  // 2일 전
  { date: dateStr(2), time: '07:00', baby: 'both' as const, volume: 100, unit: 'ml' as const },
  { date: dateStr(2), time: '10:00', baby: '1' as const, volume: 120, unit: 'ml' as const },
  { date: dateStr(2), time: '10:15', baby: '2' as const, volume: 110, unit: 'ml' as const },
  { date: dateStr(2), time: '11:00', baby: 'both' as const, poop: true },
  { date: dateStr(2), time: '13:00', baby: 'both' as const, volume: 140, unit: 'ml' as const },
  { date: dateStr(2), time: '16:00', baby: '1' as const, volume: 30, unit: 'min' as const },
  { date: dateStr(2), time: '19:00', baby: 'both' as const, volume: 150, unit: 'ml' as const },
  { date: dateStr(2), time: '22:00', baby: '2' as const, volume: 120, unit: 'ml' as const },
  // 3~6일 전 (통계용 간단 데이터)
  ...([3, 4, 5, 6] as const).flatMap((d) => [
    { date: dateStr(d), time: '07:00', baby: 'both' as const, volume: 110 + d * 5, unit: 'ml' as const },
    { date: dateStr(d), time: '12:00', baby: '1' as const, volume: 130, unit: 'ml' as const },
    { date: dateStr(d), time: '12:10', baby: '2' as const, volume: 120, unit: 'ml' as const },
    { date: dateStr(d), time: '13:00', baby: '1' as const, poop: true },
    { date: dateStr(d), time: '18:00', baby: 'both' as const, volume: 140, unit: 'ml' as const },
    { date: dateStr(d), time: '22:00', baby: 'both' as const, volume: 150, unit: 'ml' as const },
  ]),
];

function dateLabel(dateStr: string): string {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yestStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  if (dateStr === todayStr) return '오늘';
  if (dateStr === yestStr) return '어제';
  const [, m, d] = dateStr.split('-');
  return `${parseInt(m)}월 ${parseInt(d)}일`;
}

function stepDate(dateStr: string, delta: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function MainPage() {
  const { view, setView, currentDate, setCurrentDate, user } = useAppStore();
  const { logs, allLogs, addLog, updateLog, deleteLog, fetchLogs } = useLogs();
  const [showAI,     setShowAI]     = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [testMode,   setTestMode]   = useState(false);
  const [seeding,    setSeeding]    = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try { await fetchLogs(); } finally { setRefreshing(false); }
  };

  const toggleTestMode = async () => {
    const { family: fam } = useAppStore.getState();
    if (!fam) return;
    setSeeding(true);
    try {
      if (!testMode) {
        // 테스트 모드 ON: 기존 데이터 전부 삭제 후 더미 삽입
        await supabase.from('logs').delete().eq('family_id', fam.id);
        await supabase.from('logs').insert(
          DUMMY_LOGS.map((l) => ({
            family_id: fam.id,
            date: l.date,
            time: l.time,
            baby: l.baby,
            volume: l.volume ?? null,
            unit: l.unit ?? null,
            poop: l.poop ?? false,
          }))
        );
        setTestMode(true);
      } else {
        // 테스트 모드 OFF: 더미 데이터 전부 삭제
        await supabase.from('logs').delete().eq('family_id', fam.id);
        setTestMode(false);
      }
      await fetchLogs();
    } finally {
      setSeeding(false);
    }
  };

  const today    = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const isToday  = currentDate === todayStr;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>

      {/* ── 헤더 ── */}
      <div style={{ flexShrink: 0, padding: '14px 20px 0', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img
              src="https://static.toss.im/appsintoss/29121/38f9c28b-983b-4fc7-9e56-464c480f26b9.png"
              alt="logo"
              style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover' }}
            />
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>간단 수유똥 기록</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {import.meta.env.DEV && (
              <button onClick={toggleTestMode} disabled={seeding} style={{
                background: testMode ? '#FFF3CD' : 'none',
                border: `1px solid ${testMode ? '#FFC107' : 'var(--border)'}`,
                borderRadius: 6, padding: '4px 8px',
                fontSize: 12,
                color: testMode ? '#856404' : 'var(--text-3)',
                cursor: 'pointer',
              }}>{seeding ? '...' : testMode ? '🧪 ON' : '🧪'}</button>
            )}
            <button onClick={handleRefresh} disabled={refreshing} aria-label="새로고침" style={{
              background: 'none', border: 'none', fontSize: 18,
              cursor: refreshing ? 'default' : 'pointer', padding: 4, color: 'var(--text-2)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              transform: refreshing ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.5s ease',
            }}>🔄</button>
            <button onClick={() => setShowInvite(true)} style={{
              background: 'none', border: 'none', fontSize: 20,
              cursor: 'pointer', padding: 4, color: 'var(--text-2)',
            }}>⚙️</button>
          </div>
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex' }}>
          {(['timeline', 'stats'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} style={{
              flex: 1, height: 40, border: 'none', background: 'none',
              fontSize: 14, fontWeight: view === v ? 700 : 500,
              color: view === v ? 'var(--text-1)' : 'var(--text-3)',
              borderBottom: view === v ? '2px solid var(--ink)' : '2px solid transparent',
              marginBottom: -1, cursor: 'pointer',
            }}>
              {v === 'timeline' ? '타임라인' : '통계'}
            </button>
          ))}
        </div>
      </div>

      {/* ── 탭 아래 전체 스크롤 영역 (입력바 · 날짜 · 목록/통계가 함께 스크롤) ── */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {view === 'timeline' && (
          <>
            <InlineInputBar onAdd={addLog} onAI={() => setShowAI(true)} />
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 20px', borderBottom: '1px solid var(--border-subtle)',
            }}>
              <button onClick={() => setCurrentDate(stepDate(currentDate, -1))} style={{
                background: 'none', border: 'none', fontSize: 22,
                color: 'var(--text-2)', cursor: 'pointer', padding: '2px 10px',
              }}>‹</button>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>{dateLabel(currentDate)}</span>
              <button onClick={() => setCurrentDate(stepDate(currentDate, 1))} disabled={isToday} style={{
                background: 'none', border: 'none', fontSize: 22,
                color: isToday ? 'var(--dim)' : 'var(--text-2)',
                cursor: isToday ? 'default' : 'pointer', padding: '2px 10px',
              }}>›</button>
            </div>
          </>
        )}

        {view === 'timeline'
          ? <TimelineView logs={logs} onDelete={deleteLog} onEditVolume={(id, vol) => updateLog(id, { volume: vol })} />
          : <StatsView allLogs={allLogs} />
        }
      </div>

      {/* 모달 */}
      {showAI     && <AIInputModal onConfirm={addLog} onClose={() => setShowAI(false)} />}
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </div>
  );
}
