import { useMemo, useState, useRef, useEffect } from 'react';
import { LogEntry } from '../hooks/useLogs';
import { useAppStore } from '../store/appStore';

interface Props {
  logs: LogEntry[];
  onDelete: (id: string, fromBaby?: '1' | '2') => void;
  onEditVolume: (id: string, volume: number) => void;
}

function formatEntry(log: LogEntry, baby: '1' | '2'): { icon: string; val: string; unit: string } | null {
  const active = log.baby === baby || log.baby === 'both';
  if (!active) return null;
  if (log.poop) return { icon: '💩', val: '', unit: '' };
  if (log.unit === 'nap') return { icon: '😴', val: String(log.volume ?? ''), unit: '분' };
  if (log.unit === 'ml')  return { icon: '🍼', val: String(log.volume ?? ''), unit: 'mL' };
  if (log.unit === 'min') return { icon: '🤱', val: String(log.volume ?? ''), unit: '분' };
  return null;
}

export default function TimelineView({ logs, onDelete, onEditVolume }: Props) {
  const { family } = useAppStore();
  const firstName  = family?.firstName  ?? '첫째';
  const secondName = family?.secondName ?? '둘째';

  // 선택된 항목(탭해서 열린 것) — log id + which baby column (poop both 케이스 대응)
  const [selected, setSelected] = useState<{ id: string; b: '1' | '2' } | null>(null);
  const [editVal,  setEditVal]  = useState('');

  // 삭제 확인 모달 상태
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    b: '1' | '2';
    label: string;
  } | null>(null);

  // ── 요약 (현재 보여지는 날짜 기준) ──
  const summary = useMemo(() => {
    const s = { b1ml: 0, b1feeds: 0, b1poop: 0, b1nap: 0, b1min: 0, b2ml: 0, b2feeds: 0, b2poop: 0, b2nap: 0, b2min: 0 };
    for (const log of logs) {
      const b1 = log.baby === '1' || log.baby === 'both';
      const b2 = log.baby === '2' || log.baby === 'both';
      if (log.poop) {
        if (b1) s.b1poop++;
        if (b2) s.b2poop++;
      } else if (log.unit === 'nap') {
        if (b1) s.b1nap += log.volume ?? 0;
        if (b2) s.b2nap += log.volume ?? 0;
      } else if (log.unit === 'ml') {
        if (b1) { s.b1ml += log.volume ?? 0; s.b1feeds++; }
        if (b2) { s.b2ml += log.volume ?? 0; s.b2feeds++; }
      } else if (log.unit === 'min') {
        if (b1) { s.b1min += log.volume ?? 0; s.b1feeds++; }
        if (b2) { s.b2min += log.volume ?? 0; s.b2feeds++; }
      }
    }
    return s;
  }, [logs]);

  // time → logs[]
  const byTime: Record<string, LogEntry[]> = {};
  for (const log of logs) {
    if (!byTime[log.time]) byTime[log.time] = [];
    byTime[log.time].push(log);
  }
  const times = Object.keys(byTime).sort();

  // ── 요약 박스 (위) ──
  const SummaryCard = ({
    label, color, bg, ml, feeds, min, poop, nap,
  }: { label: string; color: string; bg: string; ml: number; feeds: number; min: number; poop: number; nap: number; }) => {
    const empty = !ml && !feeds && !min && !poop && !nap;
    return (
      <div style={{ background: bg, borderRadius: 10, padding: '10px 12px', flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 6 }}>{label}</div>
        {empty ? (
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>기록 없음</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', fontSize: 12, color: 'var(--text-1)', fontWeight: 500 }}>
            {ml > 0  && <span>🍼 {ml}mL ({feeds}회)</span>}
            {min > 0 && <span>🤱 {min}분</span>}
            {poop > 0 && <span>💩 {poop}회</span>}
            {nap > 0 && <span>😴 {nap}분</span>}
          </div>
        )}
      </div>
    );
  };

  // ── 셀 렌더 ──
  const renderCell = (log: LogEntry, b: '1' | '2') => {
    const e = formatEntry(log, b);
    if (!e) return null;

    const color = b === '1' ? 'var(--c1)' : 'var(--c2)';
    const bg    = b === '1' ? 'var(--c1-light)' : 'var(--c2-light)';
    const border = b === '1' ? 'var(--c1-border)' : 'var(--c2-border)';
    const isSelected = selected?.id === log.id && selected?.b === b;

    const requestDelete = (ev: React.MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      const label = log.poop ? '💩' : `${e.icon} ${log.volume ?? ''}${e.unit}`;
      setPendingDelete({ id: log.id, b, label });
      setSelected(null);
    };
    const handleSave = () => {
      const v = parseInt(editVal);
      if (!isNaN(v) && v > 0 && v !== log.volume) onEditVolume(log.id, v);
      setSelected(null);
    };

    if (isSelected) {
      if (log.poop) {
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: bg, border: `1.5px solid ${border}`, borderRadius: 6, padding: '3px 4px 3px 10px' }}>
            <span style={{ fontSize: 15 }}>💩</span>
            <button
              type="button"
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={requestDelete}
              aria-label="삭제"
              style={{ background: 'var(--error)', border: 'none', borderRadius: 5, minWidth: 28, height: 26, padding: '0 8px', fontSize: 14, cursor: 'pointer', color: '#fff', fontWeight: 700, lineHeight: 1 }}
            >×</button>
          </span>
        );
      }

      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: bg, border: `1.5px solid ${border}`, borderRadius: 6, padding: '3px 4px 3px 6px' }}>
          <span style={{ fontSize: 13 }}>{e.icon}</span>
          <AutoSelectInput
            value={editVal}
            onChange={(v) => setEditVal(v)}
            onSave={handleSave}
            onCancel={() => setSelected(null)}
            color={color}
          />
          <span style={{ fontSize: 11, color, fontWeight: 600 }}>{e.unit}</span>
          <button
            type="button"
            onMouseDown={(ev) => ev.preventDefault() /* input blur → 저장 충돌 방지 */}
            onClick={requestDelete}
            aria-label="삭제"
            style={{ background: 'var(--error)', border: 'none', borderRadius: 5, minWidth: 28, height: 26, padding: '0 8px', fontSize: 14, cursor: 'pointer', color: '#fff', fontWeight: 700, lineHeight: 1 }}
          >×</button>
        </span>
      );
    }

    const labelText = log.poop ? '💩' : `${e.icon} ${e.val}${e.unit}`;
    return (
      <button
        onClick={() => {
          setSelected({ id: log.id, b });
          setEditVal(String(log.volume ?? ''));
        }}
        title="탭하여 수정/삭제"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <span style={{
          fontSize: 13, fontWeight: 600, color,
          background: bg, borderRadius: 5,
          padding: '3px 8px', display: 'inline-block',
        }}>{labelText}</span>
      </button>
    );
  };

  return (
    <div style={{ paddingBottom: 24 }}>

      {/* ── 요약 ── */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 14px 12px' }}>
        <SummaryCard
          label={firstName} color="var(--c1)" bg="var(--c1-light)"
          ml={summary.b1ml} feeds={summary.b1feeds} min={summary.b1min}
          poop={summary.b1poop} nap={summary.b1nap}
        />
        <SummaryCard
          label={secondName} color="var(--c2)" bg="var(--c2-light)"
          ml={summary.b2ml} feeds={summary.b2feeds} min={summary.b2min}
          poop={summary.b2poop} nap={summary.b2nap}
        />
      </div>

      {logs.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
          <p style={{ fontSize: 14 }}>아직 기록이 없어요</p>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 56px 1fr',
            borderBottom: '2px solid var(--border)',
            borderTop: '1px solid var(--border-subtle)',
          }}>
            <div style={{ padding: '8px 0', textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--c1)', background: 'var(--c1-light)' }}>{firstName}</div>
            <div style={{ padding: '8px 0', textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', background: 'var(--bg-subtle)' }}>시간</div>
            <div style={{ padding: '8px 0', textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--c2)', background: 'var(--c2-light)' }}>{secondName}</div>
          </div>

          {times.map((t) => {
            const rowLogs = byTime[t];
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
                <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 4, background: hasNap ? undefined : 'rgba(72,120,176,0.04)' }}>
                  {rowLogs.map((log) => (
                    <span key={log.id}>{renderCell(log, '1')}</span>
                  ))}
                </div>

                <div style={{ padding: '8px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-subtle)', borderLeft: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>{t}</span>
                </div>

                <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 4, background: hasNap ? undefined : 'rgba(188,79,103,0.04)' }}>
                  {rowLogs.map((log) => (
                    <span key={log.id}>{renderCell(log, '2')}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ── 삭제 확인 모달 ── */}
      {pendingDelete && (
        <div
          onClick={() => setPendingDelete(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.32)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg)', borderRadius: 14, padding: '22px 20px 16px',
              width: '100%', maxWidth: 320, boxShadow: '0 10px 32px rgba(0,0,0,0.18)',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6, textAlign: 'center' }}>
              기록 삭제
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 18, textAlign: 'center', lineHeight: 1.5 }}>
              <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>{pendingDelete.label}</span> 기록을<br />
              정말 삭제할까요?
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                style={{
                  flex: 1, height: 44, borderRadius: 8,
                  border: '1.5px solid var(--border)', background: 'var(--bg)',
                  fontSize: 15, fontWeight: 600, color: 'var(--text-2)', cursor: 'pointer',
                }}
              >취소</button>
              <button
                type="button"
                onClick={() => {
                  onDelete(pendingDelete.id, pendingDelete.b);
                  setPendingDelete(null);
                }}
                style={{
                  flex: 1, height: 44, borderRadius: 8, border: 'none',
                  background: 'var(--error)', color: '#fff',
                  fontSize: 15, fontWeight: 700, cursor: 'pointer',
                }}
              >삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 마운트 시 기존 값 자동 전체 선택 → 바로 덮어쓰기 가능
function AutoSelectInput({ value, onChange, onSave, onCancel, color }: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  color: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.select();
  }, []);
  return (
    <input
      ref={ref}
      type="number"
      inputMode="numeric"
      value={value}
      onChange={(ev) => onChange(ev.target.value)}
      onBlur={onSave}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter')  { (ev.target as HTMLInputElement).blur(); }
        if (ev.key === 'Escape') { onCancel(); }
      }}
      style={{
        width: 44, height: 26, fontSize: 13, textAlign: 'center',
        border: `1px solid ${color}`, borderRadius: 4,
        padding: '0 4px', outline: 'none', color,
        background: 'var(--bg)', fontWeight: 700,
      }}
    />
  );
}
