import { useState } from 'react';
import { useFamily } from '../hooks/useFamily';
import { useAppStore } from '../store/appStore';
import type { TimeFormat } from '../store/appStore';

interface Props {
  onClose: () => void;
}

export default function InviteModal({ onClose }: Props) {
  const { family, timeFormat, setTimeFormat } = useAppStore();
  const { shareInvite, updateBabyNames } = useFamily();
  const [sharing, setSharing] = useState(false);
  const [editingNames, setEditingNames] = useState(false);
  const [firstName, setFirstName] = useState(family?.firstName ?? '');
  const [secondName, setSecondName] = useState(family?.secondName ?? '');
  const [saved, setSaved] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    try {
      await shareInvite();
    } finally {
      setSharing(false);
    }
  };

  const handleSaveNames = async () => {
    await updateBabyNames(firstName.trim(), secondName.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setEditingNames(false);
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 24px 40px', width: '100%', maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#191F28' }}>설정</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#8B95A1', cursor: 'pointer' }}>×</button>
        </div>

        {/* Baby names */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#333D4B' }}>아이 이름</span>
            <button
              onClick={() => setEditingNames(!editingNames)}
              style={{ background: 'none', border: 'none', fontSize: 13, color: '#3182F6', cursor: 'pointer', fontWeight: 600 }}
            >
              {editingNames ? '취소' : '수정'}
            </button>
          </div>

          {editingNames ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="첫째 이름"
                  style={{ flex: 1, height: 44, border: '1px solid #E5E8EB', borderRadius: 10, padding: '0 12px', fontSize: 15, outline: 'none' }}
                />
                <input
                  value={secondName}
                  onChange={(e) => setSecondName(e.target.value)}
                  placeholder="둘째 이름"
                  style={{ flex: 1, height: 44, border: '1px solid #E5E8EB', borderRadius: 10, padding: '0 12px', fontSize: 15, outline: 'none' }}
                />
              </div>
              <button
                onClick={handleSaveNames}
                style={{ height: 44, borderRadius: 10, border: 'none', background: '#3182F6', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                {saved ? '저장됐어요!' : '저장'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12 }}>
              {[{ name: family?.firstName, color: '#3182F6', bg: '#EBF3FF', label: '첫째' },
                { name: family?.secondName, color: '#F04452', bg: '#FFF0F0', label: '둘째' }].map((b) => (
                <div key={b.label} style={{ flex: 1, background: b.bg, borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: b.color }}>{b.name || b.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 시간 표시 형식 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#333D4B', marginBottom: 10 }}>시간 표시 형식</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['24h', '12h'] as TimeFormat[]).map((fmt) => {
              const active = timeFormat === fmt;
              return (
                <button
                  key={fmt}
                  onClick={() => setTimeFormat(fmt)}
                  style={{
                    flex: 1, height: 44, borderRadius: 10, cursor: 'pointer',
                    border: `1.5px solid ${active ? '#3182F6' : '#E5E8EB'}`,
                    background: active ? '#EBF3FF' : '#fff',
                    color: active ? '#3182F6' : '#6B7684',
                    fontSize: 14, fontWeight: active ? 700 : 500,
                  }}
                >
                  {fmt === '24h' ? '24시간  (13:30)' : '12시간  (오후 1:30)'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Invite */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#333D4B', marginBottom: 8 }}>파트너 초대</div>
          <p style={{ fontSize: 13, color: '#6B7684', margin: '0 0 12px' }}>
            파트너와 함께 수유 기록을 공유해보세요.
          </p>

          <div style={{
            background: '#F8F9FA', borderRadius: 10, padding: '10px 14px',
            fontSize: 12, color: '#8B95A1', fontFamily: 'monospace',
            marginBottom: 12, wordBreak: 'break-all',
          }}>
            초대 코드: {family?.inviteCode}
          </div>

          <button
            onClick={handleShare}
            disabled={sharing}
            style={{
              width: '100%', height: 52, borderRadius: 12, border: 'none',
              background: sharing ? '#E5E8EB' : '#191F28',
              color: '#fff', fontSize: 15, fontWeight: 600, cursor: sharing ? 'wait' : 'pointer',
            }}
          >
            {sharing ? '공유 중...' : '파트너에게 초대 링크 보내기'}
          </button>
        </div>
      </div>
    </div>
  );
}
