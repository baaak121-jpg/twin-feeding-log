import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/appStore';

interface Props {
  onAdd: (params: {
    time: string;
    baby: '1' | '2' | 'both';
    volume?: number;
    unit?: 'ml' | 'min' | 'nap';
    poop?: boolean;
  }) => void;
}

function nowHHMM() {
  const n = new Date();
  const raw = Math.round(n.getMinutes() / 5) * 5;
  const m = raw % 60;
  const hh = (n.getHours() + (raw === 60 ? 1 : 0)) % 24;
  return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

type FeedMode = 'ml' | 'min';
const FEED_ICONS: Record<FeedMode, string> = { ml: '🍼', min: '🤱' };
const QUICK_ML = [60, 80, 100, 120, 150];

export default function InlineInputBar({ onAdd }: Props) {
  const { family } = useAppStore();
  const firstName  = family?.firstName  ?? '첫째';
  const secondName = family?.secondName ?? '둘째';

  const [baby,     setBaby]    = useState<'1' | '2' | 'both'>('1');
  const [time,     setTime]    = useState(nowHHMM());
  const [feedMode, setFeedMode] = useState<FeedMode>('ml');
  const [feedOn,   setFeedOn]  = useState(false);
  const [napOn,    setNapOn]   = useState(false);
  const [poop,     setPoop]    = useState(false);
  const [volume,   setVolume]  = useState('');
  const [ddOpen,   setDdOpen]  = useState(false);
  const ddRef = useRef<HTMLDivElement>(null);

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) {
        setDdOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeUnit = napOn ? 'nap' : feedOn ? feedMode : undefined;
  const needsVolume = feedOn || napOn;
  const canSubmit   = poop || feedOn || napOn;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onAdd({ time, baby, volume: volume ? parseInt(volume) : undefined, unit: activeUnit, poop });
    setVolume('');
    setPoop(false);
    setFeedOn(false);
    setNapOn(false);
    setTime(nowHHMM());
  };

  const toggleFeed = () => {
    const next = !feedOn;
    setFeedOn(next);
    if (next) { setNapOn(false); setPoop(false); }
  };

  const toggleNap = () => {
    const next = !napOn;
    setNapOn(next);
    if (next) { setFeedOn(false); setPoop(false); }
  };

  const togglePoop = () => {
    const next = !poop;
    setPoop(next);
    if (next) { setFeedOn(false); setNapOn(false); }
  };

  const pickFeed = (mode: FeedMode) => {
    setFeedMode(mode);
    setFeedOn(true);
    setNapOn(false);
    setPoop(false);
    setDdOpen(false);
  };

  /* ── 스타일 ── */
  const babyBtn = (active: boolean, color: string): React.CSSProperties => ({
    flex: 1, height: 40,
    border: `1.5px solid ${active ? color : 'var(--border)'}`,
    borderRadius: 8,
    background: active ? color : 'var(--bg)',
    color: active ? '#fff' : 'var(--text-2)',
    fontWeight: active ? 700 : 500,
    fontSize: 14, cursor: 'pointer',
  });

  const modeActive = feedOn || napOn;
  const poopActive = poop;

  return (
    <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)', padding: '12px 16px 14px', flexShrink: 0 }}>

      {/* Row 1: 아이 선택 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button style={babyBtn(baby === '1',    'var(--c1)')}    onClick={() => setBaby('1')}>{firstName}</button>
        <button style={babyBtn(baby === '2',    'var(--c2)')}    onClick={() => setBaby('2')}>{secondName}</button>
        <button style={babyBtn(baby === 'both', 'var(--c-both)')} onClick={() => setBaby('both')}>둘 다</button>
      </div>

      {/* Row 2: 시간 + 용량 + [🍼▼|😴] + 💩 */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>

        {/* 시간 */}
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          style={{
            width: 86, height: 40, flexShrink: 0,
            border: '1.5px solid var(--border)', borderRadius: 8,
            padding: '0 6px', fontSize: 13, outline: 'none',
            color: 'var(--text-1)', background: 'var(--bg)',
          }}
        />

        {/* 용량 */}
        <input
          type="number"
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
          placeholder={feedOn && feedMode === 'ml' ? 'mL' : napOn || (feedOn && feedMode === 'min') ? '분' : '용량'}
          disabled={!needsVolume}
          style={{
            flex: 1, minWidth: 0, height: 40,
            border: '1.5px solid var(--border)', borderRadius: 8,
            padding: '0 10px', fontSize: 15, outline: 'none',
            color: needsVolume ? 'var(--text-1)' : 'var(--text-3)',
            background: needsVolume ? 'var(--bg)' : 'var(--bg-subtle)',
          }}
        />

        {/* [🍼▼ | 😴] 묶음 */}
        <div
          ref={ddRef}
          style={{
            display: 'flex', flexShrink: 0,
            border: `1.5px solid ${modeActive ? 'var(--c1-border)' : 'var(--border)'}`,
            borderRadius: 8, overflow: 'visible', position: 'relative',
            background: modeActive ? 'var(--c1-light)' : 'var(--bg)',
          }}
        >
          {/* 🍼 토글 */}
          <button
            onClick={toggleFeed}
            style={{
              height: 40, width: 34, border: 'none', borderRight: `1px solid ${modeActive ? 'var(--c1-border)' : 'var(--border)'}`,
              background: 'transparent', cursor: 'pointer',
              fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: feedOn ? 'var(--c1)' : 'var(--text-2)',
            }}
          >{FEED_ICONS[feedMode]}</button>

          {/* ▼ 드롭다운 */}
          <button
            onClick={() => setDdOpen(o => !o)}
            style={{
              height: 40, width: 18, border: 'none', borderRight: `1px solid ${modeActive ? 'var(--c1-border)' : 'var(--border)'}`,
              background: 'transparent', cursor: 'pointer',
              fontSize: 9, color: 'var(--text-3)', padding: 0,
            }}
          >▼</button>

          {/* 😴 낮잠 토글 */}
          <button
            onClick={toggleNap}
            style={{
              height: 40, width: 34, border: 'none',
              background: 'transparent', cursor: 'pointer',
              fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: napOn ? 'var(--c1)' : 'var(--text-2)',
            }}
          >😴</button>

          {/* 드롭다운 메뉴 */}
          {ddOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 8, overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 140,
            }}>
              {([['ml', '🍼', '분유 (mL)'], ['min', '🤱', '모유 (분)']] as const).map(([u, icon, label]) => (
                <button key={u} onClick={() => pickFeed(u as FeedMode)} style={{
                  display: 'block', width: '100%', padding: '11px 14px',
                  border: 'none', borderBottom: '1px solid var(--border-subtle)',
                  background: feedMode === u && feedOn ? 'var(--c1-light)' : 'var(--bg)',
                  color: feedMode === u && feedOn ? 'var(--c1)' : 'var(--text-1)',
                  fontSize: 13, textAlign: 'left', cursor: 'pointer', fontWeight: 500,
                }}>{icon} {label}</button>
              ))}
            </div>
          )}
        </div>

        {/* 💩 배변 */}
        <button
          onClick={togglePoop}
          style={{
            height: 40, width: 40, flexShrink: 0,
            border: `1.5px solid ${poopActive ? 'var(--c2-border)' : 'var(--border)'}`,
            borderRadius: 8,
            background: poopActive ? 'var(--c2-light)' : 'var(--bg)',
            cursor: 'pointer', fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >💩</button>
      </div>

      {/* 빠른 mL 선택 */}
      {feedOn && feedMode === 'ml' && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {QUICK_ML.map((v) => (
            <button key={v} onClick={() => setVolume(String(v))} style={{
              flex: 1, height: 34,
              border: `1.5px solid ${volume === String(v) ? 'var(--c1-border)' : 'var(--border)'}`,
              borderRadius: 7,
              background: volume === String(v) ? 'var(--c1-light)' : 'var(--bg)',
              color: volume === String(v) ? 'var(--c1)' : 'var(--text-2)',
              fontSize: 13, cursor: 'pointer', fontWeight: volume === String(v) ? 700 : 500,
            }}>{v}</button>
          ))}
        </div>
      )}

      {/* 기록 버튼 */}
      <button onClick={handleSubmit} disabled={!canSubmit} style={{
        width: '100%', height: 46, marginTop: 10,
        borderRadius: 10, border: 'none',
        background: canSubmit ? 'var(--ink)' : 'var(--dim)',
        color: canSubmit ? 'var(--ink-text)' : 'var(--dim-text)',
        fontSize: 15, fontWeight: 700,
        cursor: canSubmit ? 'pointer' : 'not-allowed',
      }}>기록 추가!</button>
    </div>
  );
}
