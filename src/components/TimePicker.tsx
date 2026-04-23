import { useAppStore } from '../store/appStore';

interface Props {
  value: string;           // "HH:MM" 24시간 형식
  onChange: (val: string) => void;
  height?: number;
}

function parse24(value: string): { h: number; m: number } {
  const [hh, mm] = value.split(':').map(Number);
  return { h: isNaN(hh) ? 0 : hh, m: isNaN(mm) ? 0 : mm };
}

function to24(h: number, m: number, ampm: 'AM' | 'PM'): string {
  let hour = h % 12;
  if (ampm === 'PM') hour += 12;
  return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function to12(h24: number): { hour: number; ampm: 'AM' | 'PM' } {
  const ampm: 'AM' | 'PM' = h24 < 12 ? 'AM' : 'PM';
  const hour = h24 % 12 === 0 ? 12 : h24 % 12;
  return { hour, ampm };
}

const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,10,...,55

const selectStyle: React.CSSProperties = {
  height: 40,
  border: '1.5px solid var(--border)',
  borderRadius: 8,
  background: 'var(--bg)',
  color: 'var(--text-1)',
  fontSize: 14,
  fontWeight: 500,
  outline: 'none',
  padding: '0 4px',
  appearance: 'none',
  WebkitAppearance: 'none',
  textAlign: 'center',
  cursor: 'pointer',
};

export default function TimePicker({ value, onChange, height = 40 }: Props) {
  const { timeFormat } = useAppStore();
  const { h, m } = parse24(value);

  const nearestM = MINUTES.reduce((prev, cur) =>
    Math.abs(cur - m) < Math.abs(prev - m) ? cur : prev, 0
  );

  if (timeFormat === '12h') {
    const { hour, ampm } = to12(h);

    const setHour = (newH: number) => onChange(to24(newH, nearestM, ampm));
    const setMin  = (newM: number) => onChange(to24(hour, newM, ampm));
    const setAmPm = (ap: 'AM' | 'PM') => onChange(to24(hour, nearestM, ap));

    return (
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', height, flexShrink: 0 }}>
        {/* 시 (1~12) */}
        <select
          value={hour}
          onChange={(e) => setHour(Number(e.target.value))}
          style={{ ...selectStyle, width: 52, height }}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <span style={{ color: 'var(--text-3)', fontWeight: 700, flexShrink: 0 }}>:</span>
        {/* 분 (00~55, 5분 간격) */}
        <select
          value={nearestM}
          onChange={(e) => setMin(Number(e.target.value))}
          style={{ ...selectStyle, width: 52, height }}
        >
          {MINUTES.map((v) => (
            <option key={v} value={v}>{String(v).padStart(2, '0')}</option>
          ))}
        </select>
        {/* AM/PM */}
        <select
          value={ampm}
          onChange={(e) => setAmPm(e.target.value as 'AM' | 'PM')}
          style={{ ...selectStyle, width: 56, height, fontSize: 13 }}
        >
          <option value="AM">오전</option>
          <option value="PM">오후</option>
        </select>
      </div>
    );
  }

  // 24시간 모드
  const setHour = (newH: number) =>
    onChange(`${String(newH).padStart(2, '0')}:${String(nearestM).padStart(2, '0')}`);
  const setMin = (newM: number) =>
    onChange(`${String(h).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', height, flexShrink: 0 }}>
      {/* 시 (0~23) */}
      <select
        value={h}
        onChange={(e) => setHour(Number(e.target.value))}
        style={{ ...selectStyle, width: 56, height }}
      >
        {Array.from({ length: 24 }, (_, i) => i).map((v) => (
          <option key={v} value={v}>{String(v).padStart(2, '0')}</option>
        ))}
      </select>
      <span style={{ color: 'var(--text-3)', fontWeight: 700, flexShrink: 0 }}>:</span>
      {/* 분 */}
      <select
        value={nearestM}
        onChange={(e) => setMin(Number(e.target.value))}
        style={{ ...selectStyle, width: 56, height }}
      >
        {MINUTES.map((v) => (
          <option key={v} value={v}>{String(v).padStart(2, '0')}</option>
        ))}
      </select>
    </div>
  );
}
