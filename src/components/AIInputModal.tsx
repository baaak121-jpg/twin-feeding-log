import { useEffect, useRef, useState } from 'react';
import { useAI, ParsedEntry } from '../hooks/useAI';
import { useAppStore } from '../store/appStore';

interface Props {
  onConfirm: (params: {
    time: string;
    baby: '1' | '2' | 'both';
    volume?: number;
    unit?: 'ml' | 'min';
    poop?: boolean;
  }) => void;
  onClose: () => void;
}

function getExamples(b1: string, b2: string) {
  return [
    `"${b1} 분유 120 먹였어"`,
    `"방금 ${b2} 똥 쌌어"  (응가, 배변도 OK)`,
    `"10시 반에 둘 다 분유 100"`,
    `"${b1}는 120, ${b2}는 110 먹였어"`,
    `"3분 전에 모유 15분 했어"`,
  ];
}

export default function AIInputModal({ onConfirm, onClose }: Props) {
  const { family, user } = useAppStore();
  const firstName  = family?.firstName  ?? '첫째';
  const secondName = family?.secondName ?? '둘째';
  const {
    isRecording, isProcessing, entries, transcript, error,
    startRecording, stopAndProcess, processText, purchaseCredits, reset,
    updateEntry, removeEntry,
  } = useAI();

  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [devText, setDevText] = useState('');
  const startedAtRef = useRef<number>(0);

  // 녹음 경과 시간 표시
  useEffect(() => {
    if (!isRecording) { setElapsed(0); return; }
    startedAtRef.current = Date.now();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 200);
    return () => clearInterval(id);
  }, [isRecording]);

  const handleMicTap = async () => {
    if (isRecording) await stopAndProcess();
    else await startRecording();
  };

  const handleConfirmAll = () => {
    if (!entries) return;
    for (const e of entries) {
      const params: Parameters<typeof onConfirm>[0] = {
        time: e.resolvedTime ?? '00:00',
        baby: e.baby,
        poop: e.poop,
      };
      if (e.unit && !e.poop) {
        params.unit = e.unit;
        if (e.volume != null) params.volume = e.volume;
      }
      onConfirm(params);
    }
    onClose();
  };

  const noCredits = !user || user.aiCredits <= 0;

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) { reset(); onClose(); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000,
    }} onClick={handleBackdrop}>
      <style>{`
        @keyframes aiPulseRing {
          0%   { box-shadow: 0 0 0 0 rgba(240,68,82,0.55); }
          100% { box-shadow: 0 0 0 26px rgba(240,68,82,0); }
        }
        @keyframes aiDotBlink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }
        @keyframes aiBar {
          0%   { transform: scaleY(0.3); }
          50%  { transform: scaleY(1); }
          100% { transform: scaleY(0.3); }
        }
      `}</style>

      <div style={{
        background: '#fff', borderRadius: '20px 20px 0 0',
        padding: '20px 20px 32px', width: '100%', maxWidth: 480,
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* ── 헤더 ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#191F28' }}>🎙 AI 음성 입력</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#6B7684', background: '#F2F4F6', padding: '4px 10px', borderRadius: 20 }}>
              {user?.aiCredits ?? 0}회 남음
            </span>
            <button onClick={() => { reset(); onClose(); }} style={{ background: 'none', border: 'none', fontSize: 22, color: '#8B95A1', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* ═════════════════ 결과 없을 때: 녹음 UI ═════════════════ */}
        {!entries && (
          <>
            {noCredits ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <p style={{ fontSize: 14, color: '#F04452', marginBottom: 16 }}>AI 크레딧이 없어요</p>
                {purchaseSuccess ? (
                  <p style={{ fontSize: 14, color: '#3182F6', fontWeight: 600 }}>구매 완료! 다시 시도해보세요.</p>
                ) : (
                  <button
                    onClick={() => purchaseCredits(() => setPurchaseSuccess(true))}
                    style={{
                      width: '100%', height: 52, borderRadius: 12, border: 'none',
                      background: '#3182F6', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                    }}
                  >10회 추가 구매</button>
                )}
              </div>
            ) : (
              <>
                {/* 녹음 상태 표시 영역 */}
                <div style={{
                  background: isRecording ? '#FFF1F2' : '#F8F9FA',
                  borderRadius: 16, padding: '28px 20px',
                  marginBottom: 16, textAlign: 'center',
                  transition: 'background 0.2s',
                }}>
                  {isRecording ? (
                    <>
                      {/* REC 배지 */}
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '5px 12px', borderRadius: 20,
                        background: '#F04452', color: '#fff',
                        fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
                        marginBottom: 14,
                      }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', animation: 'aiDotBlink 1s infinite' }} />
                        REC {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
                      </div>

                      {/* 파형 */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 44, marginBottom: 16 }}>
                        {Array.from({ length: 24 }).map((_, i) => (
                          <div key={i} style={{
                            width: 3, borderRadius: 2, background: '#F04452',
                            height: `${14 + (i % 3) * 10}px`,
                            transformOrigin: 'center',
                            animation: 'aiBar 0.8s infinite ease-in-out',
                            animationDelay: `${(i * 0.04) % 0.8}s`,
                          }} />
                        ))}
                      </div>

                      {/* 마이크 버튼 (종료용) */}
                      <button onClick={handleMicTap} style={{
                        width: 78, height: 78, borderRadius: '50%', border: 'none',
                        background: '#F04452', color: '#fff',
                        fontSize: 28, cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(240,68,82,0.35)',
                        animation: 'aiPulseRing 1.4s infinite',
                      }}>⏹</button>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#F04452', margin: '14px 0 0' }}>
                        한 번 더 탭하면 종료돼요
                      </p>
                    </>
                  ) : isProcessing ? (
                    <>
                      <div style={{
                        width: 78, height: 78, margin: '0 auto 14px',
                        borderRadius: '50%', background: '#E5E8EB',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 28,
                      }}>⏳</div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#6B7684', margin: 0 }}>
                        AI가 분석하고 있어요...
                      </p>
                    </>
                  ) : (
                    <>
                      <button onClick={handleMicTap} style={{
                        width: 78, height: 78, borderRadius: '50%', border: 'none',
                        background: '#3182F6', color: '#fff',
                        fontSize: 32, cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(49,130,246,0.35)',
                      }}>🎙</button>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#191F28', margin: '14px 0 2px' }}>
                        탭해서 말하기
                      </p>
                      <p style={{ fontSize: 12, color: '#8B95A1', margin: 0 }}>
                        녹음 후 한 번 더 탭하면 종료
                      </p>
                    </>
                  )}
                </div>

                {/* 에러 */}
                {error && (
                  <p style={{ fontSize: 13, color: '#F04452', textAlign: 'center', margin: '0 0 12px' }}>
                    {error}
                  </p>
                )}

                {/* DEV 전용: 텍스트 직접 입력 테스트 */}
                {import.meta.env.DEV && !isRecording && !isProcessing && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{
                      display: 'flex', gap: 6,
                      border: '1px dashed #3182F6', borderRadius: 10, padding: '8px 10px',
                      background: '#EBF3FF',
                    }}>
                      <input
                        value={devText}
                        onChange={(e) => setDevText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && processText(devText)}
                        placeholder='예) "첫째 분유 120, 둘째 똥"'
                        style={{
                          flex: 1, border: 'none', background: 'transparent',
                          fontSize: 13, outline: 'none', color: '#191F28',
                        }}
                      />
                      <button
                        onClick={() => processText(devText)}
                        disabled={!devText.trim() || isProcessing}
                        style={{
                          padding: '4px 10px', borderRadius: 7, border: 'none',
                          background: '#3182F6', color: '#fff',
                          fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                        }}
                      >파싱</button>
                    </div>
                    <p style={{ fontSize: 10, color: '#8B95A1', margin: '4px 4px 0', textAlign: 'right' }}>
                      🧪 DEV 전용 — 크레딧 차감 없음
                    </p>
                  </div>
                )}

                {/* 예시 문구 */}
                {!isRecording && !isProcessing && (
                  <div style={{
                    background: '#F8F9FA', borderRadius: 12,
                    padding: '12px 14px', marginBottom: 4,
                  }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#6B7684', margin: '0 0 8px' }}>
                      💡 이렇게 말해보세요
                    </p>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {getExamples(firstName, secondName).map((ex, i) => (
                        <li key={i} style={{ fontSize: 13, color: '#4E5968', lineHeight: 1.5 }}>
                          {ex}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ═════════════════ 결과 확인 및 편집 ═════════════════ */}
        {entries && (
          <>
            {transcript && (
              <div style={{
                background: '#F8F9FA', borderRadius: 10, padding: '10px 12px',
                marginBottom: 12, fontSize: 13, color: '#4E5968',
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#8B95A1', marginRight: 6 }}>인식됨</span>
                "{transcript}"
              </div>
            )}

            <p style={{ fontSize: 13, fontWeight: 700, color: '#191F28', margin: '0 0 8px' }}>
              아래 {entries.length}건을 기록할까요?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {entries.map((e, i) => (
                <EntryCard
                  key={i}
                  entry={e}
                  firstName={family?.firstName ?? '첫째'}
                  secondName={family?.secondName ?? '둘째'}
                  onChange={(patch) => updateEntry(i, patch)}
                  onRemove={() => removeEntry(i)}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={reset} style={{
                flex: 1, height: 50, borderRadius: 12, border: '1px solid #E5E8EB',
                background: '#fff', fontSize: 14, color: '#6B7684', cursor: 'pointer',
              }}>다시 녹음</button>
              <button onClick={handleConfirmAll} style={{
                flex: 2, height: 50, borderRadius: 12, border: 'none',
                background: '#3182F6', color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(49,130,246,0.35)',
              }}>
                ✓ {entries.length > 1 ? `${entries.length}건 모두 기록` : '기록하기'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── 개별 엔트리 카드 (시간/아기/종류 편집) ── */
function EntryCard({
  entry, firstName, secondName, onChange, onRemove,
}: {
  entry: ParsedEntry;
  firstName: string;
  secondName: string;
  onChange: (patch: Partial<ParsedEntry>) => void;
  onRemove: () => void;
}) {
  const typeLabel = entry.poop
    ? '💩 배변'
    : entry.unit === 'ml' ? '🍼 분유'
    : entry.unit === 'min' ? '🤱 모유' : '?';

  return (
    <div style={{
      border: '1px solid #E5E8EB', borderRadius: 12, padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#191F28' }}>{typeLabel}</span>
          {entry.volume != null && !entry.poop && (
            <span style={{ fontSize: 13, fontWeight: 700, color: '#191F28' }}>
              {entry.volume}{entry.unit === 'ml' ? 'mL' : '분'}
            </span>
          )}
        </div>
        <button onClick={onRemove} style={{
          background: 'none', border: 'none', fontSize: 16,
          color: '#8B95A1', cursor: 'pointer', padding: 4,
        }}>✕</button>
      </div>

      {/* 아기 선택 (오인식 대비) */}
      <div style={{ display: 'flex', gap: 6 }}>
        {([
          { key: '1',    label: firstName,  bg: '#E5F0FF', fg: '#2563EB' },
          { key: '2',    label: secondName, bg: '#FFE8EC', fg: '#D63956' },
          { key: 'both', label: '둘 다',     bg: '#F2F4F6', fg: '#4E5968' },
        ] as const).map((opt) => {
          const active = entry.baby === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onChange({ baby: opt.key })}
              style={{
                flex: 1, height: 32, borderRadius: 8,
                border: `1px solid ${active ? opt.fg : '#E5E8EB'}`,
                background: active ? opt.bg : '#fff',
                color: active ? opt.fg : '#6B7684',
                fontSize: 12, fontWeight: active ? 700 : 500,
                cursor: 'pointer',
              }}
            >{opt.label}</button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ fontSize: 11, color: '#8B95A1', fontWeight: 600, minWidth: 32 }}>시간</label>
        <input
          type="time"
          step={300}
          value={entry.resolvedTime ?? ''}
          onChange={(e) => onChange({ resolvedTime: e.target.value })}
          style={{
            flex: 1, height: 36, border: '1px solid #E5E8EB', borderRadius: 8,
            padding: '0 10px', fontSize: 13, outline: 'none',
          }}
        />
        {!entry.poop && entry.unit && (
          <input
            type="number"
            inputMode="numeric"
            value={entry.volume ?? ''}
            onChange={(e) => onChange({ volume: e.target.value ? parseInt(e.target.value) : null })}
            placeholder="양"
            style={{
              width: 78, height: 36, border: '1px solid #E5E8EB', borderRadius: 8,
              padding: '0 10px', fontSize: 13, outline: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'textfield',
            }}
          />
        )}
      </div>
    </div>
  );
}
