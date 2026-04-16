import { useState } from 'react';
import { useAI, ParsedLog } from '../hooks/useAI';
import { useAppStore } from '../store/appStore';

interface Props {
  onConfirm: (params: {
    time: string;
    baby: '1' | '2' | 'both';
    volume?: number;
    unit?: 'ml' | 'min' | 'nap';
    poop?: boolean;
  }) => void;
  onClose: () => void;
}

export default function AIInputModal({ onConfirm, onClose }: Props) {
  const { user } = useAppStore();
  const {
    isRecording, isProcessing, parsed, resolvedTime, hint,
    startRecording, stopAndProcess, purchaseCredits, reset,
    setParsed, setResolvedTime,
  } = useAI();

  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  const handleMicTap = async () => {
    if (isRecording) {
      await stopAndProcess();
    } else {
      await startRecording();
    }
  };

  const handleConfirm = () => {
    if (!parsed) return;
    const params: Parameters<typeof onConfirm>[0] = {
      time: resolvedTime,
      baby: parsed.baby,
      poop: parsed.poop,
    };
    if (parsed.unit && !parsed.poop) {
      params.unit = parsed.unit;
      if (parsed.volume != null) params.volume = parsed.volume;
    }
    onConfirm(params);
    onClose();
  };

  const noCredits = !user || user.aiCredits <= 0;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000,
    }}
      onClick={(e) => { if (e.target === e.currentTarget) { reset(); onClose(); } }}
    >
      <div style={{
        background: '#fff', borderRadius: '20px 20px 0 0',
        padding: '24px 24px 40px', width: '100%', maxWidth: 480,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#191F28' }}>AI 음성 입력</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#6B7684', background: '#F2F4F6', padding: '4px 10px', borderRadius: 20 }}>
              {user?.aiCredits ?? 0}회 남음
            </span>
            <button onClick={() => { reset(); onClose(); }} style={{ background: 'none', border: 'none', fontSize: 20, color: '#8B95A1', cursor: 'pointer' }}>×</button>
          </div>
        </div>

        {!parsed ? (
          <>
            {/* Hint text */}
            <p style={{ textAlign: 'center', fontSize: 14, color: '#6B7684', marginBottom: 32 }}>
              {hint}
            </p>

            {/* Waveform placeholder */}
            {isRecording && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 40, marginBottom: 24 }}>
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} style={{
                    width: 3, borderRadius: 2, background: '#F04452',
                    height: `${8 + Math.random() * 24}px`,
                    animation: 'bounce 0.6s infinite alternate',
                    animationDelay: `${i * 0.05}s`,
                  }} />
                ))}
              </div>
            )}

            {/* Mic button */}
            {noCredits ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: '#F04452', marginBottom: 16 }}>AI 크레딧이 없어요</p>
                {purchaseSuccess ? (
                  <p style={{ fontSize: 14, color: '#3182F6', fontWeight: 600 }}>구매 완료! 다시 시도해보세요.</p>
                ) : (
                  <button
                    onClick={() => purchaseCredits(() => setPurchaseSuccess(true))}
                    style={{
                      width: '100%', height: 52, borderRadius: 12, border: 'none',
                      background: '#3182F6', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    10회 추가 구매
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handleMicTap}
                disabled={isProcessing}
                style={{
                  width: 80, height: 80, borderRadius: '50%', border: 'none',
                  background: isRecording ? '#F04452' : isProcessing ? '#E5E8EB' : '#3182F6',
                  color: '#fff', fontSize: 32, cursor: isProcessing ? 'wait' : 'pointer',
                  display: 'block', margin: '0 auto',
                  boxShadow: isRecording ? '0 0 0 8px rgba(240,68,82,0.2)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {isProcessing ? '⏳' : isRecording ? '⏹' : '🎙'}
              </button>
            )}
          </>
        ) : (
          /* Parsed result */
          <div>
            <div style={{ background: '#F8F9FA', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <ParsedResult parsed={parsed} resolvedTime={resolvedTime} />
            </div>

            {/* Edit time */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7684', display: 'block', marginBottom: 6 }}>시간 수정</label>
              <input
                type="time"
                value={resolvedTime}
                onChange={(e) => setResolvedTime(e.target.value)}
                style={{ width: '100%', height: 44, border: '1px solid #E5E8EB', borderRadius: 10, padding: '0 12px', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => reset()} style={{ flex: 1, height: 48, borderRadius: 12, border: '1px solid #E5E8EB', background: '#fff', fontSize: 14, color: '#6B7684', cursor: 'pointer' }}>
                다시 녹음
              </button>
              <button onClick={handleConfirm} style={{ flex: 2, height: 48, borderRadius: 12, border: 'none', background: '#191F28', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                기록하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ParsedResult({ parsed, resolvedTime }: { parsed: ParsedLog; resolvedTime: string }) {
  const { family } = useAppStore();
  const babyLabel = parsed.baby === 'both'
    ? '둘 다'
    : parsed.baby === '1'
      ? (family?.firstName ?? '첫째')
      : (family?.secondName ?? '둘째');

  const typeLabel = parsed.poop
    ? '💩 배변'
    : parsed.unit === 'ml'
      ? '🍼 분유'
      : parsed.unit === 'min'
        ? '🤱 모유'
        : parsed.unit === 'nap'
          ? '😴 낮잠'
          : '?';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Row label="아이" value={babyLabel} />
      <Row label="시간" value={resolvedTime} />
      <Row label="종류" value={typeLabel} />
      {parsed.volume != null && (
        <Row label="양/시간" value={`${parsed.volume}${parsed.unit === 'ml' ? 'mL' : '분'}`} />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
      <span style={{ color: '#8B95A1' }}>{label}</span>
      <span style={{ fontWeight: 600, color: '#191F28' }}>{value}</span>
    </div>
  );
}
