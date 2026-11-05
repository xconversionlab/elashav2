import { useState } from 'react';
import { MessageSquare, X, Send, MessageCircle, Mail, HelpCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  options?: { label: string; action: () => void }[];
}

const FAQ_KNOWLEDGE_BASE = [
  {
    keywords: ['size', 'sizing', 'fit', 'measurement', 'chart', 'xxl', 'xs'],
    answer: 'Available sizes are XS, S, M, L, XL, and XXL where listed on the product page. Fit may vary by style. Contact our studio team if you are unsure which size to choose.',
  },
  {
    keywords: ['ship', 'delivery', 'dispatch', 'courier', 'track', 'time', 'cost', 'charge'],
    answer: 'We do not want to quote an unconfirmed shipping fee or delivery date. Please contact support@elasha.in or WhatsApp +91 7022180410 for the current shipping details.',
  },
  {
    keywords: ['return', 'exchange', 'refund', 'damage', 'defective', 'policy'],
    answer: 'If an item arrives damaged or incorrect, contact support@elasha.in with your order number and photos if available. Our team will review the case and explain the available next steps. A return, exchange or refund is not confirmed until our team responds.',
  },
  {
    keywords: ['custom', 'design', 'atelier', 'upload', 'logo', 'print', 'my own'],
    answer: 'Our Custom Atelier allows you to upload PNG, JPG or WebP artwork (up to 25 MB), select your style and size, and position artwork on the front and back of your garment before ordering.',
  },
  {
    keywords: ['payment', 'cod', 'cash', 'prepaid', 'card', 'upi', 'razorpay'],
    answer: 'ELASHA orders are prepaid only; Cash on Delivery is not available. Available online payment methods will be shown at checkout when the payment gateway is active.',
  },
  {
    keywords: ['fabric', 'material', 'cotton', 'quality', 'gsm', 'heavyweight'],
    answer: 'Please refer to each product page for confirmed fabric and care details. For information that is not listed, contact our studio team.',
  },
];

export function SupportChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [handoffContext, setHandoffContext] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'bot',
      text: 'Welcome to ELASHA Artware & Apparel Studio. How can we assist you today?',
    },
  ]);

  function addBotResponse(text: string, options?: { label: string; action: () => void }[]) {
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), sender: 'bot', text, options },
    ]);
  }

  function handleSelectTopic(topicKey: string) {
    if (topicKey === 'sizing') {
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: 'Sizing & Fit Guide' }]);
      setTimeout(() => {
        addBotResponse(FAQ_KNOWLEDGE_BASE[0].answer, [
          { label: 'Custom Atelier', action: () => handleSelectTopic('custom') },
          { label: 'Speak to Human Support', action: () => handleSelectTopic('human') },
        ]);
      }, 300);
    } else if (topicKey === 'shipping') {
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: 'Shipping & Delivery' }]);
      setTimeout(() => {
        addBotResponse(FAQ_KNOWLEDGE_BASE[1].answer, [
          { label: 'Return Policy', action: () => handleSelectTopic('returns') },
          { label: 'Speak to Human Support', action: () => handleSelectTopic('human') },
        ]);
      }, 300);
    } else if (topicKey === 'returns') {
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: 'Returns & Exchanges' }]);
      setTimeout(() => {
        addBotResponse(FAQ_KNOWLEDGE_BASE[2].answer, [
          { label: 'Speak to Human Support', action: () => handleSelectTopic('human') },
        ]);
      }, 300);
    } else if (topicKey === 'custom') {
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: 'Custom T-Shirt Atelier' }]);
      setTimeout(() => {
        addBotResponse(FAQ_KNOWLEDGE_BASE[3].answer, [
          { label: 'Open Custom Designer', action: () => { window.location.href = '/custom'; } },
          { label: 'Speak to Human Support', action: () => handleSelectTopic('human') },
        ]);
      }, 300);
    } else if (topicKey === 'human') {
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: 'Speak to Studio Team' }]);
      setTimeout(() => {
        addBotResponse(
          'Our studio team is available on WhatsApp and Email. Clicking WhatsApp will open WhatsApp on your phone or computer to message us directly at +91 7022180410.'
        );
      }, 300);
    }
  }

  function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const query = inputText.trim();
    if (!query) return;

    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: query }]);
    setHandoffContext(query);
    setInputText('');

    setTimeout(() => {
      const lower = query.toLowerCase();
      const matched = FAQ_KNOWLEDGE_BASE.find(faq => faq.keywords.some(k => lower.includes(k)));

      if (matched) {
        addBotResponse(matched.answer, [
          { label: 'Speak to Studio Team on WhatsApp', action: () => handleSelectTopic('human') },
        ]);
      } else {
        addBotResponse(
          "I couldn't find an exact answer for that query. Would you like to connect directly with our studio team on WhatsApp or Email?",
          [
            { label: 'Chat on WhatsApp (7022180410)', action: () => handleSelectTopic('human') },
            { label: 'Email Support (support@elasha.in)', action: () => { window.location.href = 'mailto:support@elasha.in?subject=ELASHA%20Customer%20Inquiry'; } },
          ]
        );
      }
    }, 400);
  }

  const whatsappMessage = handoffContext.trim()
    ? `Hello ELASHA Studio, I have a question: "${handoffContext.trim()}"`
    : 'Hello ELASHA Studio, I have a question about an order or product.';
  const whatsappUrl = `https://wa.me/917022180410?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="fixed bottom-5 right-5 z-50 font-sans">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-3 bg-crimson hover:bg-crimson-light text-bone px-4 py-3 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 border border-crimson-light/40"
          aria-label="Open Support Assistant"
        >
          <MessageSquare className="h-5 w-5 text-bone" />
          <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Studio Assistant</span>
        </button>
      ) : (
        <div className="w-[92vw] max-w-sm sm:w-96 bg-charcoal border border-charcoal-border rounded-sm shadow-2xl flex flex-col h-[520px] overflow-hidden">
          {/* Header */}
          <div className="bg-dark p-4 border-b border-charcoal-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <p className="text-xs font-bold text-bone uppercase tracking-wider">ELASHA Studio Support</p>
                <p className="text-[10px] text-bone-muted">Prepaid Artwear &amp; Atelier Help</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-bone-muted hover:text-bone p-1"
              aria-label="Close Chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={cn('flex flex-col space-y-2', msg.sender === 'user' ? 'items-end' : 'items-start')}
              >
                <div
                  className={cn(
                    'p-3 max-w-[85%] rounded-sm leading-relaxed',
                    msg.sender === 'user'
                      ? 'bg-crimson text-bone font-medium'
                      : 'bg-dark-surface border border-charcoal-border text-bone-muted'
                  )}
                >
                  {msg.text}
                </div>

                {/* Quick actions/options if provided */}
                {msg.options && msg.options.length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-1 w-full max-w-[85%]">
                    {msg.options.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={opt.action}
                        className="text-left text-[11px] font-semibold text-crimson-light border border-crimson/40 bg-crimson/10 hover:bg-crimson/20 p-2 rounded-sm transition-colors flex items-center justify-between"
                      >
                        <span>{opt.label}</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Quick Topic Buttons if conversation is fresh */}
            {messages.length === 1 && (
              <div className="space-y-2 pt-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-bone-muted flex items-center gap-1">
                  <HelpCircle className="h-3 w-3 text-crimson" /> Suggested Topics
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    onClick={() => handleSelectTopic('sizing')}
                    className="text-left text-[11px] text-bone bg-charcoal-light hover:bg-charcoal border border-charcoal-border p-2 rounded-sm transition-colors"
                  >
                    ✦ Sizing &amp; Fit Guide (XS–XXL)
                  </button>
                  <button
                    onClick={() => handleSelectTopic('shipping')}
                    className="text-left text-[11px] text-bone bg-charcoal-light hover:bg-charcoal border border-charcoal-border p-2 rounded-sm transition-colors"
                  >
                    ✦ Shipping &amp; Delivery Times
                  </button>
                  <button
                    onClick={() => handleSelectTopic('returns')}
                    className="text-left text-[11px] text-bone bg-charcoal-light hover:bg-charcoal border border-charcoal-border p-2 rounded-sm transition-colors"
                  >
                    ✦ Returns &amp; Defect Policy
                  </button>
                  <button
                    onClick={() => handleSelectTopic('custom')}
                    className="text-left text-[11px] text-bone bg-charcoal-light hover:bg-charcoal border border-charcoal-border p-2 rounded-sm transition-colors"
                  >
                    ✦ Custom T-Shirt Atelier Uploads
                  </button>
                </div>
              </div>
            )}

            {/* Direct Human Handoff Banner */}
            <div className="mt-4 border-t border-charcoal-border pt-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-bone-muted">Direct Studio Handoff</p>
              <div className="grid grid-cols-1 gap-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs p-2.5 rounded-sm transition-colors shadow-md"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp (+91 7022180410)
                </a>
                <a
                  href="mailto:support@elasha.in?subject=ELASHA%20Support%20Request"
                  className="flex items-center justify-center gap-2 border border-charcoal-border bg-dark hover:bg-charcoal text-bone font-bold text-xs p-2.5 rounded-sm transition-colors"
                >
                  <Mail className="h-4 w-4 text-crimson" /> Email support@elasha.in
                </a>
              </div>
            </div>
          </div>

          {/* Footer input */}
          <form onSubmit={handleSendMessage} className="p-3 bg-dark border-t border-charcoal-border flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Type your question…"
              className="flex-1 bg-charcoal border border-charcoal-border px-3 py-2 text-xs text-bone outline-none focus:border-crimson rounded-sm placeholder:text-bone-muted/50"
            />
            <button
              type="submit"
              className="bg-crimson hover:bg-crimson-light text-bone p-2 rounded-sm transition-colors"
              aria-label="Send Message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
