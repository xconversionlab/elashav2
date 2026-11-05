import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AuthShell } from '@/components/auth/AuthShell';

export function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error, needsConfirmation } = await signUp(email, password, firstName, lastName);
    if (error) {
      setError(error);
      setLoading(false);
    } else if (needsConfirmation) {
      setMessage('Account created. Check your email to confirm your address, then sign in.');
      setLoading(false);
    } else {
      navigate('/account');
    }
  }

  return (
    <AuthShell
      eyebrow="Join the Atelier"
      title={['Create', <span key="em" className="font-display font-semibold text-crimson-light">account.</span>]}
      subtitle="Track limited series orders, save wishlists, and design custom artwear pieces."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name" required value={firstName} onChange={e => setFirstName(e.target.value)} />
          <Input label="Last Name" required value={lastName} onChange={e => setLastName(e.target.value)} />
        </div>
        <Input label="Email Address" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
        <Input label="Password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
        {error && <p className="text-xs font-bold text-crimson-light bg-crimson/10 border border-crimson/30 p-3 rounded-sm">{error}</p>}
        {message && <p className="text-xs text-bone-muted bg-charcoal p-3 border border-charcoal-border rounded-sm">{message}</p>}
        <Button type="submit" disabled={loading} className="w-full bg-crimson text-bone hover:bg-crimson-light font-bold text-xs uppercase tracking-widest py-3.5" size="lg">
          {loading ? 'Creating account…' : 'Create Account'}
        </Button>
      </form>
      <p className="mt-6 text-center text-xs text-bone-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-crimson-light hover:text-bone transition-colors">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
