import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { completeOAuth, type OAuthProvider } from '@/shared/api';
import { setSession } from '@/shared/lib/auth';
import { Spinner } from '@/shared/ui';

function isOAuthProvider(value: string | undefined): value is OAuthProvider {
  return value === 'google' || value === 'gitlab';
}

export function OAuthCallbackPage() {
  const { provider } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOAuthProvider(provider)) {
      setError('Неизвестный OAuth-провайдер.');
      return;
    }

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const stateKey = `taskflow.oauth.state.${provider}`;
    const expectedState = sessionStorage.getItem(stateKey);
    sessionStorage.removeItem(stateKey);

    if (!code || !state || !expectedState || state !== expectedState) {
      setError('Не удалось подтвердить OAuth-запрос. Попробуйте войти ещё раз.');
      return;
    }

    completeOAuth(provider, code)
      .then((tokens) => {
        setSession(tokens.access_token, tokens.refresh_token);
        navigate('/dashboard', { replace: true });
      })
      .catch(() => setError('Не удалось войти через OAuth. Попробуйте ещё раз.'));
  }, [navigate, provider, searchParams]);

  return (
    <main className="loading-page" aria-live="polite">
      {error ? (
        <div>
          <h1>Ошибка OAuth</h1>
          <p>{error}</p>
          <button type="button" onClick={() => navigate('/login', { replace: true })}>
            Вернуться ко входу
          </button>
        </div>
      ) : (
        <div>
          <Spinner />
          <p>Завершаем вход…</p>
        </div>
      )}
    </main>
  );
}
