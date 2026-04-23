import { useMemo, useState } from 'react';
import { LogEntry } from '../hooks/useLogs';
import { useAppStore } from '../store/appStore';

interface Props {
  allLogs: Record<string, LogEntry[]>;
}

function getWeekDays(weekOffset: number): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i - weekOffset * 7);
    days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return days;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayLabel(dateStr: string) {
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getDate()}(${days[d.getDay()]})`;
}

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

function rangeLabel(days: string[]) {
  const fmt = (s: string) => {
    const d = new Date(s);
    return `${d.getMonth() + 1}.${d.getDate()}(${DOW[d.getDay()]})`;
  };
  return `${fmt(days[0])}~${fmt(days[6])}`;
}

function rangeLabelFull(start: string, end: string) {
  const fmt = (s: string) => {
    const d = new Date(s);
    return `${d.getMonth() + 1}월 ${d.getDate()}일(${DOW[d.getDay()]})`;
  };
  return `${fmt(start)} ~ ${fmt(end)}`;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

interface DayStat {
  date: string;
  b1ml: number; b1min: number; b1feeds: number;
  b2ml: number; b2min: number; b2feeds: number;
  b1poop: number; b2poop: number;
}

const BAR_H    = 96;
const BAR_W    = 9;
const LABEL_GAP = 3;

const BarColumn = ({ b1, b2, max }: { b1: number; b2: number; max: number }) => {
  const pct1   = max > 0 ? Math.min((b1 / max) * 100, 100) : 0;
  const pct2   = max > 0 ? Math.min((b2 / max) * 100, 100) : 0;
  const bar1Px = (BAR_H * pct1) / 100;
  const bar2Px = (BAR_H * pct2) / 100;

  const lane = (val: number, barPx: number, pct: number, color: string) => (
    <div style={{ flex: 1, position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ width: BAR_W, height: `${pct}%`, minHeight: val > 0 ? 2 : 0, background: color, borderRadius: '2px 2px 0 0', transition: 'height 0.25s' }} />
      {val > 0 && (
        <span style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          bottom: barPx + LABEL_GAP,
          fontSize: 9, fontWeight: 700, color,
          fontVariantNumeric: 'tabular-nums', lineHeight: 1,
          whiteSpace: 'nowrap',
          transition: 'bottom 0.25s', pointerEvents: 'none',
        }}>{val}</span>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', height: BAR_H, alignItems: 'flex-end', gap: 0, padding: '0 3px' }}>
      {lane(b1, bar1Px, pct1, 'var(--c1)')}
      {lane(b2, bar2Px, pct2, 'var(--c2)')}
    </div>
  );
};

type MetricKey = 'ml' | 'min' | 'poop';

export default function StatsView({ allLogs }: Props) {
  const { family } = useAppStore();
  const firstName  = family?.firstName  ?? '첫째';
  const secondName = family?.secondName ?? '둘째';

  const [weekOffset, setWeekOffset] = useState(0);
  const [collapsed, setCollapsed]   = useState<Record<MetricKey, boolean>>({ ml: false, min: false, poop: false });

  const days = getWeekDays(weekOffset);
  const today = todayStr();

  const stats: DayStat[] = useMemo(() => days.map((date) => {
    const logs = allLogs[date] ?? [];
    const s: DayStat = { date, b1ml: 0, b1min: 0, b1feeds: 0, b2ml: 0, b2min: 0, b2feeds: 0, b1poop: 0, b2poop: 0 };
    for (const log of logs) {
      const b1 = log.baby === '1' || log.baby === 'both';
      const b2 = log.baby === '2' || log.baby === 'both';
      if (log.poop) {
        if (b1) s.b1poop++;
        if (b2) s.b2poop++;
      } else if (log.unit === 'ml') {
        if (b1) { s.b1ml += log.volume ?? 0; s.b1feeds++; }
        if (b2) { s.b2ml += log.volume ?? 0; s.b2feeds++; }
      } else if (log.unit === 'min') {
        if (b1) { s.b1min += log.volume ?? 0; s.b1feeds++; }
        if (b2) { s.b2min += log.volume ?? 0; s.b2feeds++; }
      }
    }
    return s;
  }), [allLogs, days]);

  // 어제까지의 데이터로 일평균 계산
  const avgDays = stats.filter(s => s.date < today);
  const n = avgDays.length || 1;

  const avg = {
    b1ml:    Math.round(avgDays.reduce((a, s) => a + s.b1ml, 0) / n),
    b1min:   Math.round(avgDays.reduce((a, s) => a + s.b1min, 0) / n),
    b1feeds: round1(avgDays.reduce((a, s) => a + s.b1feeds, 0) / n),
    b1poop:  round1(avgDays.reduce((a, s) => a + s.b1poop, 0) / n),
    b2ml:    Math.round(avgDays.reduce((a, s) => a + s.b2ml, 0) / n),
    b2min:   Math.round(avgDays.reduce((a, s) => a + s.b2min, 0) / n),
    b2feeds: round1(avgDays.reduce((a, s) => a + s.b2feeds, 0) / n),
    b2poop:  round1(avgDays.reduce((a, s) => a + s.b2poop, 0) / n),
  };

  const metrics: { key: MetricKey; title: string; unit: string; get: (s: DayStat) => { b1: number; b2: number } }[] = [
    { key: 'ml',   title: '🍼 분유',  unit: 'mL', get: (s) => ({ b1: s.b1ml,   b2: s.b2ml }) },
    { key: 'min',  title: '🤱 모유',  unit: '분', get: (s) => ({ b1: s.b1min,  b2: s.b2min }) },
    { key: 'poop', title: '💩 배변',  unit: '회', get: (s) => ({ b1: s.b1poop, b2: s.b2poop }) },
  ];

  const colGrid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    columnGap: 6,
  };

  const navBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--bg)', cursor: 'pointer',
    fontSize: 13, fontWeight: 600, color: 'var(--text-2)',
  };

  return (
    <div style={{ padding: '14px 16px 80px', display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── 주 네비게이션 ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button style={navBtn} onClick={() => setWeekOffset(o => o + 1)}>
          <span>◀</span><span>이전 주</span>
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{rangeLabel(days)}</span>
        <button
          style={{ ...navBtn, opacity: weekOffset === 0 ? 0.35 : 1, cursor: weekOffset === 0 ? 'default' : 'pointer' }}
          onClick={() => weekOffset > 0 && setWeekOffset(o => o - 1)}
          disabled={weekOffset === 0}
        >
          <span>다음 주</span><span>▶</span>
        </button>
      </div>

      {/* ── 일평균 요약 테이블 ── */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border-subtle)', borderRadius: 10, overflow: 'hidden' }}>
        {/* 헤더 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', background: 'var(--bg-subtle)' }}>
          <div style={{ padding: '9px 0', textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--c1)' }}>{firstName}</div>
          <div style={{ padding: '9px 16px', textAlign: 'center', fontSize: 12, fontWeight: 500, color: 'var(--text-3)' }}>구분</div>
          <div style={{ padding: '9px 0', textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--c2)' }}>{secondName}</div>
        </div>
        {/* 구분선 */}
        <div style={{ height: 1, background: 'var(--border-subtle)' }} />
        {/* 데이터 행 */}
        {[
          {
            label: '일평균 분유량',
            b1: avg.b1ml > 0 ? `${avg.b1ml}ml (${avg.b1feeds}회)` : '-',
            b2: avg.b2ml > 0 ? `${avg.b2ml}ml (${avg.b2feeds}회)` : '-',
          },
          {
            label: '일평균 모유량',
            b1: avg.b1min > 0 ? `${avg.b1min}분 (${avg.b1feeds}회)` : '-',
            b2: avg.b2min > 0 ? `${avg.b2min}분 (${avg.b2feeds}회)` : '-',
          },
          {
            label: '일평균 똥 횟수',
            b1: avg.b1poop > 0 ? `${avg.b1poop}회` : '-',
            b2: avg.b2poop > 0 ? `${avg.b2poop}회` : '-',
          },
        ].map((row, i) => (
          <div key={i}>
            <div style={{ height: 1, background: 'var(--border-subtle)' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', padding: '11px 0' }}>
              <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--c1)', fontVariantNumeric: 'tabular-nums' }}>{row.b1}</div>
              <div style={{ padding: '0 12px', textAlign: 'center', fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{row.label}</div>
              <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--c2)', fontVariantNumeric: 'tabular-nums' }}>{row.b2}</div>
            </div>
          </div>
        ))}
        {/* 당구장 주석 */}
        <div style={{ padding: '5px 12px 8px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', textAlign: 'right' }}>
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
            ※ {avgDays.length > 0
              ? rangeLabelFull(avgDays[0].date, avgDays[avgDays.length - 1].date)
              : rangeLabelFull(days[0], days[5])
            }의 평균
          </span>
        </div>
      </div>

      {/* ── 범례 ── */}
      <div style={{ display: 'flex', gap: 14, padding: '0 2px' }}>
        {[{ label: firstName, color: 'var(--c1)' }, { label: secondName, color: 'var(--c2)' }].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
            <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── 지표별 카드 ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {metrics.map((m) => {
          const vals = stats.flatMap((s) => [m.get(s).b1, m.get(s).b2]).filter((v) => v > 0);
          const peak = vals.length > 0 ? Math.max(...vals) : 0;
          const max  = Math.max(peak * 1.3, 1);
          const isCollapsed = collapsed[m.key];

          return (
            <div key={m.key} style={{ background: 'var(--bg)', border: '1px solid var(--border-subtle)', borderRadius: 10, overflow: 'hidden' }}>
              {/* 접기 헤더 */}
              <button
                onClick={() => setCollapsed(prev => ({ ...prev, [m.key]: !prev[m.key] }))}
                style={{
                  width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '11px 14px', border: 'none',
                  background: isCollapsed ? 'var(--bg-subtle)' : 'var(--bg)',
                  cursor: 'pointer', borderBottom: isCollapsed ? 'none' : '1px solid var(--border-subtle)',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{m.title}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{m.unit}</span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                    background: isCollapsed ? 'var(--border)' : 'var(--bg-subtle)',
                    border: '1px solid var(--border)',
                    fontSize: 14, fontWeight: 900, lineHeight: 1,
                    color: isCollapsed ? 'var(--text-1)' : 'var(--text-2)',
                  }}>{isCollapsed ? '+' : '−'}</span>
                </div>
              </button>

              {/* 그래프 본체 */}
              {!isCollapsed && (
                <div style={{ padding: '8px 12px 10px' }}>
                  <div style={{ background: 'var(--bg-subtle)', borderRadius: 4, padding: '4px 2px 0' }}>
                    <div style={colGrid}>
                      {stats.map((s) => {
                        const v = m.get(s);
                        return <BarColumn key={s.date} b1={v.b1} b2={v.b2} max={max} />;
                      })}
                    </div>
                  </div>
                  <div style={{ ...colGrid, marginTop: 6 }}>
                    {stats.map((s) => (
                      <div key={s.date} style={{ fontSize: 11, color: 'var(--text-2)', textAlign: 'center', fontWeight: 500 }}>
                        {dayLabel(s.date)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
