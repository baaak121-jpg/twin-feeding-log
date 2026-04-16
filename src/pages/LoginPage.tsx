import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { login, loading, error } = useAuth();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      padding: '0 24px',
      background: '#fff',
    }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🍼</div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px', color: '#191F28' }}>
        쌍둥이 수유기록
      </h1>
      <p style={{ fontSize: 14, color: '#6B7684', margin: '0 0 48px', textAlign: 'center' }}>
        두 아이의 수유·낮잠·배변을 한눈에
      </p>

      <button
        onClick={login}
        disabled={loading}
        style={{
          width: '100%',
          maxWidth: 320,
          height: 52,
          borderRadius: 12,
          border: 'none',
          background: loading ? '#E5E8EB' : '#3182F6',
          color: '#fff',
          fontSize: 16,
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? '로그인 중...' : '토스로 로그인'}
      </button>

      {error && (
        <p style={{ marginTop: 16, fontSize: 13, color: '#F04452', textAlign: 'center' }}>
          {error}
        </p>
      )}
    </div>
  );
}
