import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, Mail, Phone, MapPin } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';

export function ReturnPolicyPage() {
  return (
    <div className="bg-dark min-h-screen text-bone py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-bone-muted hover:text-crimson-light transition-colors">
          <ArrowLeft className="h-4 w-4 text-crimson" /> Return to Home
        </Link>

        <Reveal>
          <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-crimson-light">Store Policies</span>
          <h1 className="mt-2 font-display text-4xl font-bold text-bone sm:text-5xl">Returns &amp; Exchanges Policy</h1>
          <p className="mt-3 text-xs sm:text-sm text-bone-muted">
            Last updated: October 2026 · ELASHA Artware &amp; Apparel
          </p>
        </Reveal>

        <div className="mt-10 space-y-8 text-xs sm:text-sm leading-relaxed text-bone-muted border-t border-charcoal-border pt-8">
          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-bone flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-crimson" /> 1. Prepaid Orders Only
            </h2>
            <p>
              ELASHA accepts prepaid orders only. Cash on Delivery (COD) is not available.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-bone">2. Reporting Damaged or Incorrect Products</h2>
            <p>
              If you receive an item that is defective, damaged in transit, or incorrect relative to your order receipt, please contact us:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-bone-muted/90">
              <li>Contact our support team at <a href="mailto:support@elasha.in" className="text-crimson-light font-semibold hover:underline">support@elasha.in</a> to report the issue.</li>
              <li>Include your Order Number and photos or other details that help explain the issue, if available.</li>
              <li>Our team will review the report and explain the next steps available for your case.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-bone">3. Eligibility &amp; Garment Condition</h2>
            <p>
              Return and exchange requests are reviewed individually. Contact our team to discuss your order and the issue:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-bone-muted/90">
              <li>Please describe the item's condition accurately so our team can assess the request.</li>
              <li>Share photos of the item and packaging if they help explain the issue.</li>
              <li>For custom artwork orders, contact our team for an individual review. We will confirm the available options after reviewing the details.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-bone">4. How to Request a Return or Exchange</h2>
            <p>
              Send an email to <a href="mailto:support@elasha.in" className="text-crimson-light font-semibold hover:underline">support@elasha.in</a> or call our team at <strong>+91 7022180410</strong> with your Order Number and details.
            </p>
            <p>
              Please contact our team before sending an item back so we can explain the applicable process.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-bone">5. Shipping Responsibility &amp; Refund Handling</h2>
            <p>
              If a return or exchange is approved, our team will confirm the return arrangements and any applicable shipping responsibility before proceeding.
            </p>
            <p>
              If a refund is approved, our team will confirm the applicable refund method and timing with you.
            </p>
          </section>

          <section className="border-t border-charcoal-border pt-6 space-y-4">
            <h2 className="font-display text-xl font-bold text-bone">6. Studio Contact Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-charcoal p-5 border border-charcoal-border rounded-sm">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-crimson shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-bone">Atelier Address</p>
                  <p className="mt-1 text-bone-muted">146/2, MG Road, Srinivasa Nagar, Avarampalayam, Coimbatore – 641006</p>
                  <a href="https://maps.app.goo.gl/gCWAee18JJwys5MWA" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[11px] font-bold uppercase tracking-wider text-crimson-light hover:underline">
                    View on Google Maps →
                  </a>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-crimson shrink-0" />
                  <div>
                    <p className="font-bold text-bone">Phone</p>
                    <a href="tel:7022180410" className="text-bone-muted hover:text-bone">7022180410</a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-crimson shrink-0" />
                  <div>
                    <p className="font-bold text-bone">Support Email</p>
                    <a href="mailto:support@elasha.in" className="text-bone-muted hover:text-bone">support@elasha.in</a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
