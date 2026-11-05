import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AuthShell } from '@/components/auth/AuthShell';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await signIn(email, password);
    if (error) {
      setError(error);
      setLoading(false);
    } else {
      const state = location.state as { from?: { pathname?: string; search?: string; hash?: string } } | null;
      const from = state?.from;
      const returnTo = from?.pathname && from.pathname.startsWith('/') && !from.pathname.startsWith('//')
        ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
        : '/account';
      navigate(returnTo, { replace: true });
    }
  }

  return (
    <AuthShell
      eyebrow="Your ELASHA Account"
      title={['Welcome', <span key="em" className="font-display font-semibold text-crimson-light">back.</span>]}
      subtitle="Sign in to track atelier orders, manage saved pieces, and revisit custom designs."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Email Address" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
        <Input label="Password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
        {error && <p className="text-xs font-bold text-crimson-light bg-crimson/10 border border-crimson/30 p-3 rounded-sm">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full bg-crimson text-bone hover:bg-crimson-light font-bold text-xs uppercase tracking-widest py-3.5" size="lg">
          {loading ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>
      <div className="mt-5 flex flex-col items-center gap-3 text-xs text-bone-muted">
        <Link to="/forgot-password" className="font-bold text-crimson-light hover:text-bone transition-colors">
          Set or reset your password
        </Link>
        <p>
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-bold text-crimson-light hover:text-bone transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
