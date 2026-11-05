import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Star, CheckCircle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

interface Review {
  id: string;
  author_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export function ProductReviews({ productId }: { productId: string }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [authorName, setAuthorName] = useState(user?.email?.split('@')[0] ?? '');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [honeypot, setHoneypot] = useState(''); // Spam prevention

  const fetchReviews = useCallback(async () => {
    try {
      const { data, error: fetchErr } = await supabase
        .from('reviews')
        .select('id, author_name, rating, comment, created_at')
        .eq('product_id', productId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (!fetchErr && data) {
        setReviews(data as Review[]);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void fetchReviews();
  }, [fetchReviews]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (honeypot) return; // Silent rejection of spam bots
    if (!authorName.trim() || !comment.trim()) {
      setError('Please enter your name and a written review.');
      return;
    }
    if (comment.trim().length < 10) {
      setError('Please enter at least 10 characters for your feedback.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { error: insertErr } = await supabase.from('reviews').insert({
        product_id: productId,
        user_id: user?.id ?? null,
        author_name: authorName.trim(),
        rating,
        comment: comment.trim(),
        status: 'pending',
      });

      if (insertErr) throw insertErr;

      setSubmitted(true);
      setComment('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const averageRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="mt-16 border-t border-charcoal-border pt-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-charcoal-border/60 pb-6">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-crimson-light">Verified Feedback</span>
          <h2 className="mt-1 font-display text-2xl font-bold text-bone">Customer Reviews</h2>
        </div>
        {averageRating && (
          <div className="flex items-center gap-3 bg-charcoal px-4 py-2 border border-charcoal-border rounded-sm">
            <span className="font-mono text-xl font-bold text-bone">{averageRating}</span>
            <div className="flex text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn('h-4 w-4', i < Math.round(Number(averageRating)) ? 'fill-amber-400' : 'text-neutral-600')}
                />
              ))}
            </div>
            <span className="text-xs text-bone-muted">({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</span>
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Review List */}
        <div className="lg:col-span-7 space-y-6">
          {loading ? (
            <div className="skeleton h-24 w-full" />
          ) : reviews.length === 0 ? (
            <div className="border border-charcoal-border bg-charcoal/40 p-8 text-center rounded-sm">
              <MessageSquare className="mx-auto h-8 w-8 text-bone-muted/50 mb-2" />
              <p className="text-xs font-semibold text-bone">No reviews published yet</p>
              <p className="mt-1 text-[11px] text-bone-muted">Be the first to share your thoughts on this piece.</p>
            </div>
          ) : (
            reviews.map(rev => (
              <div key={rev.id} className="border border-charcoal-border bg-charcoal/50 p-5 rounded-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn('h-3.5 w-3.5', i < rev.rating ? 'fill-amber-400' : 'text-neutral-600')} />
                    ))}
                  </div>
                  <span className="text-[10px] text-bone-muted">
                    {new Date(rev.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-bone">{rev.comment}</p>
                <p className="text-[10px] font-semibold text-crimson-light">— {rev.author_name}</p>
              </div>
            ))
          )}
        </div>

        {/* Submit Form */}
        <div className="lg:col-span-5 bg-charcoal p-6 border border-charcoal-border rounded-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-bone border-b border-charcoal-border/80 pb-3">
            Write a Review
          </h3>

          {submitted ? (
            <div className="mt-4 border border-emerald-500/30 bg-emerald-950/20 p-4 rounded-sm text-emerald-400 space-y-2">
              <p className="flex items-center gap-2 font-bold text-xs"><CheckCircle className="h-4 w-4" /> Thank you for your feedback!</p>
              <p className="text-[11px] leading-relaxed text-emerald-300">
                Your review has been submitted and is pending studio moderation before publication.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <Input
                label="Your Name / Alias"
                required
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
                placeholder="e.g. Aditi M."
              />

              {/* Rating selection */}
              <div>
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-bone-muted">Rating</span>
                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const starVal = i + 1;
                    return (
                      <button
                        type="button"
                        key={starVal}
                        onClick={() => setRating(starVal)}
                        className="p-1 text-amber-400 hover:scale-110 transition-transform"
                      >
                        <Star className={cn('h-6 w-6', starVal <= rating ? 'fill-amber-400' : 'text-neutral-600')} />
                      </button>
                    );
                  })}
                  <span className="text-xs font-bold text-bone ml-2">{rating} / 5</span>
                </div>
              </div>

              <Textarea
                label="Written Feedback"
                required
                rows={4}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Share your thoughts on the fit, fabric quality, and print..."
              />

              {/* Honeypot field for anti-spam */}
              <input
                type="text"
                name="website_url"
                value={honeypot}
                onChange={e => setHoneypot(e.target.value)}
                className="hidden"
                tabIndex={-1}
                autoComplete="off"
              />

              {error && <p className="text-xs font-bold text-crimson-light bg-crimson/10 border border-crimson/30 p-2.5 rounded-sm">{error}</p>}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-crimson text-bone hover:bg-crimson-light font-bold text-xs uppercase tracking-widest py-3"
              >
                {submitting ? 'Submitting…' : 'Submit Review'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
