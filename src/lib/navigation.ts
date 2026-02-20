export interface NavTab {
  label: string;
  path: string;
  icon?: string;
}

// Admin navigation tabs
export const ADMIN_TABS: NavTab[] = [
  { label: 'Products', path: '/admin/products' },
  { label: 'Users', path: '/admin/users' },
  { label: 'Orders', path: '/admin/orders' },
];

// Platform User navigation tabs
export const PLATFORM_USER_TABS: NavTab[] = [
  { label: 'Dashboard', path: '/platform' },
  { label: 'Products', path: '/platform/products' },
  { label: 'Collections', path: '/platform/collections' },
  { label: 'Sellers', path: '/platform/sellers' },
];

// Seller navigation tabs (common)
const SELLER_BASE_TABS: NavTab[] = [
  { label: 'Dashboard', path: '/seller' },
  { label: 'My Listings', path: '/seller/products' },
  { label: 'Categories', path: '/seller/categories' },
  { label: 'Orders', path: '/seller/orders' },
  { label: 'Profile', path: '/seller/profile' },
];

// Full-Service seller: read-only dashboard only
const FULL_SERVICE_TABS: NavTab[] = [
  { label: 'Dashboard', path: '/seller' },
  { label: 'Profile', path: '/seller/profile' },
];

// B2C seller gets additional tabs to browse B2B products, cart, and purchases
const SELLER_B2C_EXTRA_TABS: NavTab[] = [
  { label: 'Shop', path: '/seller/shop' },
  { label: 'Cart', path: '/seller/cart' },
  { label: 'My Purchases', path: '/seller/purchases' },
];

export const SELLER_TABS = SELLER_BASE_TABS;

// Customer/Buyer navigation tabs
export const CUSTOMER_TABS: NavTab[] = [
  { label: 'Products', path: '/buyer/products' },
  { label: 'Orders', path: '/buyer/orders' },
];

// Get navigation tabs based on user role, status, and sellerType
export const getNavigationTabs = (role: string | undefined, status?: string, sellerType?: string): NavTab[] => {
  switch (role) {
    case 'ADMIN':
      return ADMIN_TABS;
    case 'PLATFORM_USER':
      return PLATFORM_USER_TABS;
    case 'SELLER': {
      if (sellerType === 'FULL_SERVICE') {
        return FULL_SERVICE_TABS;
      }
      let tabs = [...SELLER_BASE_TABS];
      if (status === 'PENDING') {
        tabs = tabs.filter(tab => tab.path !== '/seller/orders');
      }
      if (sellerType === 'B2C_MERCHANT' && status !== 'PENDING') {
        tabs = [...tabs, ...SELLER_B2C_EXTRA_TABS];
      }
      return tabs;
    }
    case 'CUSTOMER':
    default:
      return CUSTOMER_TABS;
  }
};

// Get home path based on user role
export const getHomePath = (role: string | undefined): string => {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'PLATFORM_USER':
      return '/platform';
    case 'SELLER':
      return '/seller';
    case 'CUSTOMER':
    default:
      return '/';
  }
};
