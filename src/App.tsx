import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import { useAuth } from './hooks/useAuth';
import SetupPage from './pages/SetupPage';
import MainPage from './pages/MainPage';

export default function App() {
  const { user, family } = useAppStore();
  const { login, loading, error } = useAuth();

  useEffect(() => {
    login();
  }, []);

  if (loading) return null;

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16, padding: '0 24px' }}>
        <div style={{ fontSize: 32 }}>🍼</div>
        <p style={{ fontSize: 13, color: '#F04452', textAlign: 'center' }}>{error ?? '인증 실패'}</p>
        <button onClick={login} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#3182F6', color: '#fff', fontSize: 14, cursor: 'pointer' }}>
          다시 시도
        </button>
      </div>
    );
  }

  if (!family) return <SetupPage />;
  return <MainPage />;
}
