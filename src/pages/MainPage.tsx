import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { useLogs } from '../hooks/useLogs';
import TimelineView from '../components/TimelineView';
import StatsView from '../components/StatsView';
import InlineInputBar from '../components/InlineInputBar';
import AIInputModal from '../components/AIInputModal';
import InviteModal from '../components/InviteModal';

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
  const { logs, allLogs, addLog, updateLog, deleteLog } = useLogs();
  const [showAI,     setShowAI]     = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const today    = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const isToday  = currentDate === todayStr;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>

      {/* ── 헤더 ── */}
      <div style={{ flexShrink: 0, padding: '14px 20px 0', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>🍼 쌍둥이 수유기록</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {user && (
              <button onClick={() => setShowAI(true)} style={{
                background: 'none', border: '1px solid var(--border)',
                borderRadius: 8, padding: '5px 12px',
                fontSize: 13, color: 'var(--c1)', cursor: 'pointer', fontWeight: 600,
              }}>🎙 AI {user.aiCredits}</button>
            )}
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

      {/* ── 입력 영역 (타임라인만) ── */}
      {view === 'timeline' && (
        <InlineInputBar onAdd={addLog} />
      )}

      {/* ── 날짜 네비 (타임라인만) ── */}
      {view === 'timeline' && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 20px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0,
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
      )}

      {/* ── 스크롤 콘텐츠 ── */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
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
