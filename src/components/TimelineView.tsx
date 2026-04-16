import { useState } from 'react';
import { LogEntry } from '../hooks/useLogs';
import { useAppStore } from '../store/appStore';

interface Props {
  logs: LogEntry[];
  onDelete: (id: string, fromBaby?: '1' | '2') => void;
  onEditVolume: (id: string, volume: number) => void;
}

function formatEntry(log: LogEntry, baby: '1' | '2'): string | null {
  const active = log.baby === baby || log.baby === 'both';
  if (!active) return null;
  if (log.poop) return '💩';
  if (log.unit === 'nap') return `😴 ${log.volume ?? ''}분`;
  if (log.unit === 'ml')  return `🍼 ${log.volume ?? ''}mL`;
  if (log.unit === 'min') return `🤱 ${log.volume ?? ''}분`;
  return null;
}

export default function TimelineView({ logs, onDelete, onEditVolume }: Props) {
  const { family } = useAppStore();
  const firstName  = family?.firstName  ?? '첫째';
  const secondName = family?.secondName ?? '둘째';

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal,   setEditVal]   = useState('');

  // time → logs[]
  const byTime: Record<string, LogEntry[]> = {};
  for (const log of logs) {
    if (!byTime[log.time]) byTime[log.time] = [];
    byTime[log.time].push(log);
  }
  const times = Object.keys(byTime).sort();

  if (logs.length === 0) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-3)' }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
        <p style={{ fontSize: 14 }}>아직 기록이 없어요</p>
      </div>
    );
  }

  // 셀 렌더
  const renderCell = (log: LogEntry, b: '1' | '2') => {
    const active = log.baby === b || log.baby === 'both';
    if (!active) return null;

    const color = b === '1' ? 'var(--c1)' : 'var(--c2)';
    const bg    = b === '1' ? 'var(--c1-light)' : 'var(--c2-light)';
    const align = b === '1' ? 'flex-end' : 'flex-start';

    if (log.poop) {
      return (
        <button
          onClick={() => onDelete(log.id, b)}
          title="탭하여 삭제"
          style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', padding: 2 }}
        >💩</button>
      );
    }

    if (editingId === log.id && !log.poop) {
      return (
        <input
          autoFocus
          type="number"
          value={editVal}
          onChange={(e) => setEditVal(e.target.value)}
          onBlur={() => {
            const v = parseInt(editVal);
            if (!isNaN(v) && v > 0) onEditVolume(log.id, v);
            setEditingId(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const v = parseInt(editVal);
              if (!isNaN(v) && v > 0) onEditVolume(log.id, v);
              setEditingId(null);
            }
          }}
          style={{
            width: 58, height: 26, fontSize: 12, textAlign: 'center',
            border: `1.5px solid ${color}`, borderRadius: 5,
            padding: '0 4px', outline: 'none',
          }}
        />
      );
    }

    const label = formatEntry(log, b);
    if (!label) return null;

    return (
      <button
        onClick={() => { setEditingId(log.id); setEditVal(String(log.volume ?? '')); }}
        title="탭하여 수정"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <span style={{
          fontSize: 13, fontWeight: 600, color,
          background: bg, borderRadius: 5,
          padding: '3px 8px', display: 'inline-block',
        }}>{label}</span>
      </button>
    );
  };

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* 3-column header: 첫째 | 시간 | 둘째 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 56px 1fr',
        borderBottom: '2px solid var(--border)',
      }}>
        <div style={{ padding: '10px 0', textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--c1)', background: 'var(--c1-light)' }}>{firstName}</div>
        <div style={{ padding: '10px 0', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-3)', background: 'var(--bg-subtle)' }}>시간</div>
        <div style={{ padding: '10px 0', textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--c2)', background: 'var(--c2-light)' }}>{secondName}</div>
      </div>

      {times.map((t) => {
        const rowLogs = byTime[t];
        // 낮잠 여부 (배경 처리용)
        const hasNap = rowLogs.some(l => l.unit === 'nap');

        return (
          <div
            key={t}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 56px 1fr',
              borderBottom: '1px solid var(--border-subtle)',
              background: hasNap ? 'var(--nap-bg)' : undefined,
              minHeight: 44,
            }}
          >
            {/* 첫째 셀 */}
            <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 4, background: hasNap ? undefined : 'rgba(72,120,176,0.04)' }}>
              {rowLogs.map((log) => (
                <span key={log.id}>{renderCell(log, '1')}</span>
              ))}
            </div>

            {/* 시간 셀 */}
            <div style={{ padding: '8px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-subtle)', borderLeft: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>{t}</span>
                {rowLogs.map((log) => (
                  <button
                    key={log.id}
                    onClick={() => onDelete(log.id)}
                    style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--text-3)', cursor: 'pointer', lineHeight: 1, padding: '1px 4px' }}
                  >×</button>
                ))}
              </div>
            </div>

            {/* 둘째 셀 */}
            <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 4, background: hasNap ? undefined : 'rgba(188,79,103,0.04)' }}>
              {rowLogs.map((log) => (
                <span key={log.id}>{renderCell(log, '2')}</span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
