import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { CartDrawer } from './CartDrawer';
import { SupportChatbot } from '@/components/ui/SupportChatbot';
import { PageTransition } from '@/components/motion/PageTransition';
import { CustomCursor } from '@/components/ui/CustomCursor';
import { ArtworkBackground } from '@/components/ui/ArtworkBackground';

export function StoreLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="artwork-site relative isolate min-h-screen">
      <ArtworkBackground />
      <div className="relative z-10 flex min-h-screen flex-col text-bone">
        <CustomCursor />
        <Header />
        <main className="flex-1 w-full min-w-0 overflow-x-hidden">
          <PageTransition>{children ?? <Outlet />}</PageTransition>
        </main>
        <Footer />
        <CartDrawer />
        <SupportChatbot />
      </div>
    </div>
  );
}
