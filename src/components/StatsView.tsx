import { useMemo } from 'react';
import { LogEntry } from '../hooks/useLogs';
import { useAppStore } from '../store/appStore';

interface Props {
  allLogs: Record<string, LogEntry[]>;
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return days;
}

function dayLabel(dateStr: string) {
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getDate()}(${days[d.getDay()]})`;
}

interface DayStat {
  date: string;
  b1ml: number; b1min: number; b1feeds: number;
  b2ml: number; b2min: number; b2feeds: number;
  b1poop: number; b2poop: number;
  b1nap: number; b2nap: number;
}

export default function StatsView({ allLogs }: Props) {
  const { family } = useAppStore();
  const firstName = family?.firstName ?? '첫째';
  const secondName = family?.secondName ?? '둘째';
  const days = getLast7Days();

  const stats: DayStat[] = useMemo(() => days.map((date) => {
    const logs = allLogs[date] ?? [];
    const s: DayStat = { date, b1ml: 0, b1min: 0, b1feeds: 0, b2ml: 0, b2min: 0, b2feeds: 0, b1poop: 0, b2poop: 0, b1nap: 0, b2nap: 0 };
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
  }), [allLogs, days]);

  const maxMl = Math.max(...stats.map((s) => Math.max(s.b1ml, s.b2ml)), 1);

  const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{
      background: 'var(--bg-subtle)',
      borderRadius: 10, padding: '16px',
      marginBottom: 12,
      border: '1px solid var(--border-subtle)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div style={{ padding: '16px 20px 80px' }}>

      {/* Bar chart */}
      <Card title="분유량 (mL)">
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 90 }}>
          {stats.map((s) => (
            <div key={s.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: 72 }}>
                <div style={{ flex: 1, background: 'var(--c1)', borderRadius: '3px 3px 0 0', height: `${(s.b1ml / maxMl) * 100}%`, minHeight: s.b1ml > 0 ? 3 : 0, opacity: 0.75 }} />
                <div style={{ flex: 1, background: 'var(--c2)', borderRadius: '3px 3px 0 0', height: `${(s.b2ml / maxMl) * 100}%`, minHeight: s.b2ml > 0 ? 3 : 0, opacity: 0.75 }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{dayLabel(s.date)}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
          {[{ label: firstName, color: 'var(--c1)' }, { label: secondName, color: 'var(--c2)' }].map(({ label, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
              <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>{label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Today summary */}
      {stats[6] && (
        <Card title="오늘 요약">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: firstName, ml: stats[6].b1ml, feeds: stats[6].b1feeds, poop: stats[6].b1poop, nap: stats[6].b1nap, color: 'var(--c1)', bg: 'var(--c1-light)' },
              { label: secondName, ml: stats[6].b2ml, feeds: stats[6].b2feeds, poop: stats[6].b2poop, nap: stats[6].b2nap, color: 'var(--c2)', bg: 'var(--c2-light)' },
            ].map((b) => (
              <div key={b.label} style={{ background: b.bg, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: b.color, marginBottom: 8 }}>{b.label}</div>
                <div style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 2 }}>
                  {b.ml > 0 && <div>🍼 {b.ml}mL ({b.feeds}회)</div>}
                  {b.poop > 0 && <div>💩 {b.poop}회</div>}
                  {b.nap > 0 && <div>😴 {b.nap}분</div>}
                  {b.ml === 0 && b.poop === 0 && b.nap === 0 && (
                    <div style={{ color: 'var(--text-3)' }}>기록 없음</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 7-day table */}
      <Card title="7일 기록표">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ padding: '6px 8px', color: 'var(--text-3)', fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap' }}>날짜</th>
                {['분유mL', '수유분', '배변', '낮잠'].map((h) => (
                  <th key={h} style={{ padding: '6px 4px', color: 'var(--text-3)', fontWeight: 600, textAlign: 'center' }} colSpan={2}>{h}</th>
                ))}
              </tr>
              <tr>
                <th />
                {Array(4).fill(null).flatMap((_, i) => [
                  <th key={`${i}a`} style={{ padding: '2px 4px', color: 'var(--c1)', fontWeight: 600, textAlign: 'center', fontSize: 11 }}>{firstName[0]}</th>,
                  <th key={`${i}b`} style={{ padding: '2px 4px', color: 'var(--c2)', fontWeight: 600, textAlign: 'center', fontSize: 11 }}>{secondName[0]}</th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.date} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '7px 8px', color: 'var(--text-2)', whiteSpace: 'nowrap', fontSize: 12 }}>{dayLabel(s.date)}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'center', color: 'var(--c1)', fontWeight: 500 }}>{s.b1ml || '-'}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'center', color: 'var(--c2)', fontWeight: 500 }}>{s.b2ml || '-'}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'center', color: 'var(--c1)', fontWeight: 500 }}>{s.b1min || '-'}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'center', color: 'var(--c2)', fontWeight: 500 }}>{s.b2min || '-'}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'center', color: 'var(--c1)', fontWeight: 500 }}>{s.b1poop || '-'}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'center', color: 'var(--c2)', fontWeight: 500 }}>{s.b2poop || '-'}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'center', color: 'var(--c1)', fontWeight: 500 }}>{s.b1nap || '-'}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'center', color: 'var(--c2)', fontWeight: 500 }}>{s.b2nap || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
