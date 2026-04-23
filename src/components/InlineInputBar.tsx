import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import TimePicker from './TimePicker';

interface Props {
  onAI?: () => void;
  resetTimeKey?: number;   // 바뀔 때마다 시간을 현재 시각으로 리셋
  onAdd: (params: {
    time: string;
    baby: '1' | '2' | 'both';
    volume?: number;
    unit?: 'ml' | 'min';
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

export default function InlineInputBar({ onAdd, onAI, resetTimeKey }: Props) {
  const { family } = useAppStore();
  const firstName  = family?.firstName  ?? '첫째';
  const secondName = family?.secondName ?? '둘째';

  const [baby,     setBaby]    = useState<'1' | '2' | 'both'>('1');
  const [time,     setTime]    = useState(nowHHMM());
  const [feedMode, setFeedMode] = useState<FeedMode>('ml');
  const [feedOn,   setFeedOn]  = useState(true);
  const [poop,     setPoop]    = useState(false);
  const [volume,   setVolume]  = useState('');
  const [ddOpen,   setDdOpen]  = useState(false);
  const ddRef = useRef<HTMLDivElement>(null);

  // 새로고침 시 시간을 현재 시각으로 리셋
  useEffect(() => {
    if (resetTimeKey !== undefined) setTime(nowHHMM());
  }, [resetTimeKey]);

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

  const activeUnit = feedOn ? feedMode : undefined;
  const needsVolume = feedOn;
  const hasVolume   = !!volume && parseInt(volume) > 0;
  // 수유는 용량이 1 이상일 때만 제출 가능
  const canSubmit   = poop || (feedOn && hasVolume);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onAdd({ time, baby, volume: volume ? parseInt(volume) : undefined, unit: activeUnit, poop });
    // 수유량은 유지, 똥만 리셋
    setPoop(false);
    setFeedOn(true);
    setTime(nowHHMM());
  };

  const toggleFeed = () => {
    const next = !feedOn;
    setFeedOn(next);
    if (next) setPoop(false);
  };

  const togglePoop = () => {
    const next = !poop;
    setPoop(next);
    if (next) setFeedOn(false);
  };

  const pickFeed = (mode: FeedMode) => {
    setFeedMode(mode);
    setFeedOn(true);
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

  const poopActive = poop;

  return (
    <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)', padding: '12px 16px 14px', flexShrink: 0 }}>

      {/* Row 1: 아이 선택 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button style={babyBtn(baby === '1',    'var(--c1)')}    onClick={() => setBaby('1')}>{firstName}</button>
        <button style={babyBtn(baby === '2',    'var(--c2)')}    onClick={() => setBaby('2')}>{secondName}</button>
        <button style={babyBtn(baby === 'both', 'var(--c-both)')} onClick={() => setBaby('both')}>둘 다</button>
      </div>

      {/* Row 2: 시간 + 용량(+단위) + [🍼▼] + 💩 */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>

        {/* 시간 */}
        <TimePicker value={time} onChange={setTime} height={40} />

        {/* 용량 (+ 우측 고정 단위) — 3자리 최적화 */}
        <div style={{
          flex: 1, minWidth: 108, height: 40,
          display: 'flex', alignItems: 'center',
          border: '1.5px solid var(--border)', borderRadius: 8,
          padding: '0 10px 0 12px',
          background: needsVolume ? 'var(--bg)' : 'var(--bg-subtle)',
        }}>
          <input
            type="number"
            inputMode="numeric"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder={needsVolume ? '0' : '용량'}
            disabled={!needsVolume}
            style={{
              flex: 1, minWidth: 0, height: '100%',
              border: 'none', background: 'transparent',
              padding: 0, fontSize: 16, outline: 'none',
              color: needsVolume ? 'var(--text-1)' : 'var(--text-3)',
              fontWeight: 600, fontVariantNumeric: 'tabular-nums',
              textAlign: 'right',
              WebkitAppearance: 'none',
              MozAppearance: 'textfield',
            }}
          />
          <span style={{
            marginLeft: 6, fontSize: 13, fontWeight: 600,
            color: needsVolume ? 'var(--text-2)' : 'var(--text-3)',
            minWidth: 22, textAlign: 'left',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {feedOn && feedMode === 'ml' ? 'mL' : feedOn && feedMode === 'min' ? '분' : ''}
          </span>
        </div>

        {/* [🍼▼] 수유 버튼 */}
        <div
          ref={ddRef}
          style={{
            display: 'flex', flexShrink: 0,
            border: `1.5px solid var(--border)`,
            borderRadius: 8, overflow: 'visible', position: 'relative',
            background: 'var(--bg)',
          }}
        >
          {/* 🍼 토글 */}
          <button
            onClick={toggleFeed}
            style={{
              height: 37, width: 34, border: 'none', borderRight: `1px solid var(--border)`,
              background: feedOn ? 'var(--c1-light)' : 'transparent', cursor: 'pointer',
              fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: feedOn ? 'var(--c1)' : 'var(--text-2)',
              borderTopLeftRadius: 6, borderBottomLeftRadius: 6,
            }}
          >{FEED_ICONS[feedMode]}</button>

          {/* ▼ 드롭다운 */}
          <button
            onClick={() => setDdOpen(o => !o)}
            style={{
              height: 37, width: 18, border: 'none',
              background: feedOn ? 'var(--c1-light)' : 'transparent', cursor: 'pointer',
              fontSize: 9, color: 'var(--text-3)', padding: 0,
              borderTopRightRadius: 6, borderBottomRightRadius: 6,
            }}
          >▼</button>

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

      {/* 기록 버튼 + AI 버튼 */}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button onClick={handleSubmit} disabled={!canSubmit} style={{
          flex: 1, height: 46,
          borderRadius: 10, border: 'none',
          background: canSubmit ? 'var(--ink)' : 'var(--dim)',
          color: canSubmit ? 'var(--ink-text)' : 'var(--dim-text)',
          fontSize: 15, fontWeight: 700,
          cursor: canSubmit ? 'pointer' : 'not-allowed',
        }}>기록 추가!</button>
        {onAI && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button onClick={onAI} style={{
              width: 46, height: 46,
              borderRadius: 10, border: '1.5px solid #3182F6',
              background: '#EBF3FF',
              fontSize: 20, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>🎙</button>
            {/* AI beta 뱃지 */}
            <div style={{
              position: 'absolute', bottom: -6, left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex', gap: 2, alignItems: 'center',
            }}>
              <span style={{
                fontSize: 8, fontWeight: 800, color: '#fff',
                background: '#3182F6', borderRadius: 3,
                padding: '1px 4px', lineHeight: 1.4, letterSpacing: 0.2,
              }}>AI</span>
              <span style={{
                fontSize: 7, fontWeight: 600, color: '#fff',
                background: '#8B95A1', borderRadius: 3,
                padding: '1px 4px', lineHeight: 1.4, letterSpacing: 0.2,
              }}>beta</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
