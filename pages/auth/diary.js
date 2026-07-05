import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function DiaryAuth() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [returnUrl, setReturnUrl] = useState('/');

  useEffect(() => {
    // Get return URL from query parameter
    if (router.isReady && router.query.return) {
      setReturnUrl(decodeURIComponent(router.query.return));
    }
  }, [router.isReady, router.query]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/verify-diary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Password correct, force redirect
        window.location.href = returnUrl.startsWith('/') ? returnUrl : '/' + returnUrl;
      } else {
        setError(data.error || '密码错误');
        setPassword('');
        setLoading(false);
      }
    } catch (err) {
      setError('验证失败，请重试');
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>日记密码验证 - Utopia</title>
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-paper px-4">
        <div className="max-w-md w-full bg-chip border border-rule p-8 space-y-8">
          <div className="text-center">
            <div className="tk-meta !text-[0.65rem] mb-6">
              <span>UTOPIA</span>
              <span className="tk-leader" />
              <span>启封申请单</span>
            </div>
            <div
              className="mx-auto inline-block font-mono font-bold text-accent select-none"
              style={{
                transform: 'rotate(-8deg)',
                border: '2px solid rgb(var(--c-accent))',
                outline: '1px solid rgb(var(--c-accent))',
                outlineOffset: '3px',
                letterSpacing: '0.45em',
                padding: '10px 6px 10px 16px',
                opacity: 0.85,
              }}
            >
              加密
            </div>
            <h2 className="mt-8 text-2xl font-bold text-ink">
              日记已加密
            </h2>
            <p className="mt-2 text-sm text-ink2">
              此内容需要密码访问
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="sr-only">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-4 py-3 border border-rule placeholder-ink2/70 text-ink bg-paper focus:outline-none focus:border-ink transition-colors"
                placeholder="请输入密码"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="border border-accent bg-paper p-3">
                <p className="text-sm font-mono text-accent text-center">
                  {error}
                </p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-ink text-sm font-mono font-bold tracking-[0.3em] text-paper bg-ink hover:bg-accent hover:border-accent focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '验证中…' : 'UNLOCK · 启封'}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="text-sm text-ink2 hover:text-accent underline decoration-rule underline-offset-4 transition-colors"
              >
                返回首页
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
