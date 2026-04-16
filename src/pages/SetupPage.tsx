import { useState } from 'react';
import { useFamily } from '../hooks/useFamily';
import { useAppStore } from '../store/appStore';

export default function SetupPage() {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [firstName, setFirstName] = useState('');
  const [secondName, setSecondName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const { createFamily, joinFamily, updateBabyNames, loading } = useFamily();
  const { user } = useAppStore();

  const urlParams = new URLSearchParams(window.location.search);
  const codeFromUrl = urlParams.get('invite') ?? '';

  const handleCreate = async () => {
    setError('');
    try {
      await createFamily();
      const first = firstName.trim() || '첫째';
      const second = secondName.trim() || '둘째';
      await updateBabyNames(first, second);
    } catch (e: unknown) {
      const msg = e instanceof Error
        ? e.message
        : (e as { message?: string })?.message ?? '그룹 생성에 실패했습니다';
      setError(msg);
    }
  };

  const handleJoin = async () => {
    const code = (inviteCode || codeFromUrl).trim();
    if (!code) {
      setError('초대 코드를 입력해주세요');
      return;
    }
    setError('');
    const ok = await joinFamily(code);
    if (!ok) setError('유효하지 않은 초대 코드입니다');
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 44,
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '0 12px',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    background: 'var(--bg)',
    color: 'var(--text-1)',
  };

  const btnStyle: React.CSSProperties = {
    width: '100%',
    height: 50,
    borderRadius: 8,
    border: 'none',
    background: loading ? 'var(--dim)' : 'var(--ink)',
    color: loading ? 'var(--dim-text)' : 'var(--ink-text)',
    fontSize: 15,
    fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    marginTop: 8,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '48px 24px 24px', background: 'var(--bg)' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🍼</div>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: 'var(--text-1)' }}>가족 그룹 설정</h1>
      <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 32px' }}>
        파트너와 함께 기록을 공유하세요
      </p>

      {/* Tab */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderBottom: '1px solid var(--border)' }}>
        {(['create', 'join'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, height: 40, border: 'none', background: 'none',
              fontWeight: tab === t ? 600 : 400,
              fontSize: 14,
              color: tab === t ? 'var(--text-1)' : 'var(--text-3)',
              borderBottom: tab === t ? '2px solid var(--ink)' : '2px solid transparent',
              marginBottom: -1,
              cursor: 'pointer',
            }}
          >
            {t === 'create' ? '새로 만들기' : '초대 받기'}
          </button>
        ))}
      </div>

      {tab === 'create' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>첫째 이름</label>
          <input
            style={inputStyle}
            placeholder="비우면 '첫째'로 설정"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>둘째 이름</label>
          <input
            style={inputStyle}
            placeholder="비우면 '둘째'로 설정"
            value={secondName}
            onChange={(e) => setSecondName(e.target.value)}
          />
          <button style={btnStyle} onClick={handleCreate} disabled={loading}>
            {loading ? '생성 중...' : '그룹 만들기'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {codeFromUrl ? (
            <p style={{ fontSize: 14, color: 'var(--c1)', fontWeight: 600 }}>
              초대 링크가 감지됐어요
            </p>
          ) : (
            <>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>초대 코드</label>
              <input
                style={inputStyle}
                placeholder="초대 코드를 입력하세요"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
              />
            </>
          )}
          <button style={btnStyle} onClick={handleJoin} disabled={loading}>
            {loading ? '참여 중...' : '그룹 참여하기'}
          </button>
        </div>
      )}

      {error && (
        <p style={{ marginTop: 12, fontSize: 13, color: 'var(--error)' }}>{error}</p>
      )}

      <p style={{ marginTop: 'auto', fontSize: 11, color: 'var(--text-3)', textAlign: 'center' }}>
        ID: {user?.id.slice(0, 8)}...
      </p>
    </div>
  );
}
