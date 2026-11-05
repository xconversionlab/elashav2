import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { StoreLayout } from '@/components/layout/StoreLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';

import { HomePage } from '@/pages/HomePage';
import { ShopPage } from '@/pages/ShopPage';
import { ProductDetailPage } from '@/pages/ProductDetailPage';
import { CollectionsPage } from '@/pages/CollectionsPage';
import { CollectionDetailPage } from '@/pages/CollectionDetailPage';
import { CartPage } from '@/pages/CartPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ForgotPasswordPage, ResetPasswordPage } from '@/pages/PasswordRecoveryPages';
import { AboutPage } from '@/pages/AboutPage';
import { ReturnPolicyPage } from '@/pages/ReturnPolicyPage';
import { SearchPage } from '@/pages/SearchPage';
import { CustomDesignPage } from '@/pages/CustomDesignPage';
import {
  AccountLayout,
  AccountProfilePage,
  AccountOrdersPage,
  AccountOrderDetailPage,
  AccountWishlistPage,
  AccountDesignsPage,
} from '@/pages/AccountPages';
import {
  AdminOverviewPage,
  AdminProductsPage,
  AdminInventoryPage,
  AdminOrdersPage,
  AdminCustomOrdersPage,
  AdminCustomersPage,
  AdminReviewsPage,
  AdminCollectionsPage,
  AdminSettingsPage,
} from '@/pages/AdminPages';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <BrowserRouter>
            <Routes>
              {/* Storefront */}
              <Route element={<StoreLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/shop" element={<ShopPage />} />
                <Route path="/shop/:slug" element={<ProductDetailPage />} />
                <Route path="/collections" element={<CollectionsPage />} />
                <Route path="/collections/:slug" element={<CollectionDetailPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/returns" element={<ReturnPolicyPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/custom" element={<CustomDesignPage />} />
                <Route path="/account" element={<AccountLayout />}>
                  <Route index element={<AccountProfilePage />} />
                  <Route path="orders" element={<AccountOrdersPage />} />
                  <Route path="orders/:id" element={<AccountOrderDetailPage />} />
                  <Route path="wishlist" element={<AccountWishlistPage />} />
                  <Route path="designs" element={<AccountDesignsPage />} />
                </Route>
              </Route>

              {/* Admin */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminOverviewPage />} />
                <Route path="products" element={<AdminProductsPage />} />
                <Route path="inventory" element={<AdminInventoryPage />} />
                <Route path="orders" element={<AdminOrdersPage />} />
                <Route path="custom-orders" element={<AdminCustomOrdersPage />} />
                <Route path="customers" element={<AdminCustomersPage />} />
                <Route path="reviews" element={<AdminReviewsPage />} />
                <Route path="collections" element={<AdminCollectionsPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}
