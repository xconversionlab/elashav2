import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AuthShell } from '@/components/auth/AuthShell';

const PASSWORD_RESET_REDIRECT = 'https://elasha-artwear-apparel.vercel.app/reset-password';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: PASSWORD_RESET_REDIRECT,
    });

    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage('If an account exists for that email, a password setup link has been sent. Check your inbox and spam folder.');
  }

  return (
    <AuthShell
      eyebrow="Account access"
      title={['Set your', <span key="em" className="font-display font-semibold text-crimson-light">password.</span>]}
      subtitle="We will email you a secure link so you can create a password for your ELASHA account."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Email Address" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} />
        {error && <p role="alert" className="border border-crimson/30 bg-crimson/10 p-3 text-xs font-bold text-crimson-light">{error}</p>}
        {message && <p role="status" className="border border-charcoal-border bg-charcoal p-3 text-xs leading-relaxed text-bone-muted">{message}</p>}
        <Button type="submit" disabled={loading} className="w-full bg-crimson py-3.5 text-xs font-bold uppercase tracking-widest text-bone hover:bg-crimson-light" size="lg">
          {loading ? 'Sending link…' : 'Email password link'}
        </Button>
      </form>
      <p className="mt-6 text-center text-xs text-bone-muted"><Link to="/login" className="font-bold text-crimson-light hover:text-bone">Back to sign in</Link></p>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setReady(Boolean(data.session));
        setChecking(false);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted && session) {
        setReady(true);
        setChecking(false);
      }
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Use a password with at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    navigate('/admin', { replace: true });
  }

  return (
    <AuthShell
      eyebrow="Secure account setup"
      title={['Create your', <span key="em" className="font-display font-semibold text-crimson-light">password.</span>]}
      subtitle="Choose a password you have not used elsewhere. After saving, you will be taken to the admin panel."
    >
      {checking ? (
        <p className="text-sm text-bone-muted">Checking your secure reset link…</p>
      ) : !ready ? (
        <div className="space-y-4">
          <p className="border border-charcoal-border bg-charcoal p-3 text-xs leading-relaxed text-bone-muted">This reset link is missing or has expired. Request a new one and open the latest email link.</p>
          <Link to="/forgot-password" className="inline-block text-xs font-bold uppercase tracking-wider text-crimson-light hover:text-bone">Request another link</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="New Password" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={event => setPassword(event.target.value)} />
          <Input label="Confirm Password" type="password" autoComplete="new-password" minLength={6} required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />
          {error && <p role="alert" className="border border-crimson/30 bg-crimson/10 p-3 text-xs font-bold text-crimson-light">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full bg-crimson py-3.5 text-xs font-bold uppercase tracking-widest text-bone hover:bg-crimson-light" size="lg">
            {loading ? 'Saving password…' : 'Set password and open admin'}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
