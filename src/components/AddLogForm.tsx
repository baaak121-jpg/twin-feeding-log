import { useState } from 'react';
import { useAppStore } from '../store/appStore';

interface Props {
  onAdd: (params: {
    time: string;
    baby: '1' | '2' | 'both';
    volume?: number;
    unit?: 'ml' | 'min' | 'nap';
    poop?: boolean;
  }) => void;
  defaultTime?: string;
  defaultBaby?: '1' | '2' | 'both';
  defaultUnit?: 'ml' | 'min' | 'nap' | null;
  defaultVolume?: number | null;
  defaultPoop?: boolean;
  onClose?: () => void;
}

function nowHHMM() {
  const n = new Date();
  const h = n.getHours();
  const m = Math.round(n.getMinutes() / 5) * 5 % 60;
  const hh = h + (Math.round(n.getMinutes() / 5) * 5 === 60 ? 1 : 0);
  return `${String(hh % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function AddLogForm({
  onAdd, defaultTime, defaultBaby, defaultUnit, defaultVolume, defaultPoop, onClose,
}: Props) {
  const { family } = useAppStore();
  const firstName = family?.firstName ?? '첫째';
  const secondName = family?.secondName ?? '둘째';

  const [baby, setBaby] = useState<'1' | '2' | 'both'>(defaultBaby ?? '1');
  const [time, setTime] = useState(defaultTime ?? nowHHMM());
  const [unit, setUnit] = useState<'ml' | 'min' | 'nap' | null>(defaultUnit ?? null);
  const [volume, setVolume] = useState<string>(defaultVolume != null ? String(defaultVolume) : '');
  const [poop, setPoop] = useState(defaultPoop ?? false);

  const handleSubmit = () => {
    if (!poop && !unit) return;
    onAdd({
      time,
      baby,
      volume: volume ? parseInt(volume) : undefined,
      unit: unit ?? undefined,
      poop,
    });
    if (onClose) onClose();
  };

  const fieldLabel: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: 'var(--text-2)',
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em',
  };

  const babyBtn = (active: boolean, color: string): React.CSSProperties => ({
    flex: 1, height: 48,
    border: `1.5px solid ${active ? color : 'var(--border)'}`,
    borderRadius: 10, background: active ? color : 'var(--bg)',
    color: active ? '#fff' : 'var(--text-2)',
    fontWeight: active ? 700 : 500,
    fontSize: 15, cursor: 'pointer',
  });

  const typeBtn = (active: boolean, isPoopStyle = false): React.CSSProperties => ({
    flex: 1, height: 48,
    border: `1.5px solid ${active ? (isPoopStyle ? 'var(--c2-border)' : 'var(--c1-border)') : 'var(--border)'}`,
    borderRadius: 10,
    background: active ? (isPoopStyle ? 'var(--c2-light)' : 'var(--c1-light)') : 'var(--bg)',
    color: active ? (isPoopStyle ? 'var(--c2)' : 'var(--c1)') : 'var(--text-2)',
    fontWeight: active ? 700 : 500,
    fontSize: 14, cursor: 'pointer',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Baby */}
      <div>
        <div style={fieldLabel}>아이 선택</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={babyBtn(baby === '1', 'var(--c1)')} onClick={() => setBaby('1')}>{firstName}</button>
          <button style={babyBtn(baby === '2', 'var(--c2)')} onClick={() => setBaby('2')}>{secondName}</button>
          <button style={babyBtn(baby === 'both', 'var(--c-both)')} onClick={() => setBaby('both')}>둘 다</button>
        </div>
      </div>

      {/* Time */}
      <div>
        <div style={fieldLabel}>시간</div>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          style={{
            width: '100%', height: 48,
            border: '1.5px solid var(--border)',
            borderRadius: 10, padding: '0 14px',
            fontSize: 16, outline: 'none',
            boxSizing: 'border-box',
            color: 'var(--text-1)',
            background: 'var(--bg)',
          }}
        />
      </div>

      {/* Type */}
      <div>
        <div style={fieldLabel}>종류</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={typeBtn(unit === 'ml')} onClick={() => { setUnit('ml'); setPoop(false); }}>🍼 분유</button>
          <button style={typeBtn(unit === 'min')} onClick={() => { setUnit('min'); setPoop(false); }}>🤱 모유</button>
          <button style={typeBtn(unit === 'nap')} onClick={() => { setUnit('nap'); setPoop(false); }}>😴 낮잠</button>
          <button style={typeBtn(poop, true)} onClick={() => { setPoop(!poop); setUnit(null); }}>💩 배변</button>
        </div>
      </div>

      {/* Volume */}
      {(unit === 'ml' || unit === 'min' || unit === 'nap') && (
        <div>
          <div style={fieldLabel}>
            {unit === 'ml' ? '양 (mL)' : unit === 'min' ? '수유 시간 (분)' : '낮잠 시간 (분)'}
          </div>
          <input
            type="number"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            placeholder={unit === 'ml' ? '예: 120' : '예: 15'}
            style={{
              width: '100%', height: 48,
              border: '1.5px solid var(--border)',
              borderRadius: 10, padding: '0 14px',
              fontSize: 16, outline: 'none',
              color: 'var(--text-1)',
              background: 'var(--bg)',
              boxSizing: 'border-box',
              marginBottom: unit === 'ml' ? 10 : 0,
            }}
          />
          {unit === 'ml' && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[60, 80, 100, 120, 150].map((v) => (
                <button
                  key={v}
                  onClick={() => setVolume(String(v))}
                  style={{
                    height: 36, padding: '0 14px',
                    border: `1.5px solid ${volume === String(v) ? 'var(--c1-border)' : 'var(--border)'}`,
                    borderRadius: 8,
                    background: volume === String(v) ? 'var(--c1-light)' : 'var(--bg)',
                    color: volume === String(v) ? 'var(--c1)' : 'var(--text-2)',
                    fontSize: 14, cursor: 'pointer',
                    fontWeight: volume === String(v) ? 700 : 500,
                  }}
                >{v}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!poop && !unit}
        style={{
          height: 52, borderRadius: 10, border: 'none',
          background: (!poop && !unit) ? 'var(--dim)' : 'var(--ink)',
          color: (!poop && !unit) ? 'var(--dim-text)' : 'var(--ink-text)',
          fontSize: 16, fontWeight: 700,
          cursor: (!poop && !unit) ? 'not-allowed' : 'pointer',
        }}
      >
        기록 추가
      </button>
    </div>
  );
}
