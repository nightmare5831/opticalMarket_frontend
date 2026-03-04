export interface NavTab {
  label: string;
  path: string;
  icon?: string;
}

// Admin navigation tabs
export const ADMIN_TABS: NavTab[] = [
  { label: 'Products', path: '/admin/products', icon: 'Package' },
  { label: 'Users', path: '/admin/users', icon: 'Users' },
  { label: 'Orders', path: '/admin/orders', icon: 'ClipboardList' },
];

// Platform User navigation tabs
export const PLATFORM_USER_TABS: NavTab[] = [
  { label: 'Dashboard', path: '/platform', icon: 'LayoutDashboard' },
  { label: 'Products', path: '/platform/products', icon: 'Package' },
  { label: 'Collections', path: '/platform/collections', icon: 'FolderOpen' },
  { label: 'Sellers', path: '/platform/sellers', icon: 'Store' },
];

// Seller navigation tabs (common)
const SELLER_BASE_TABS: NavTab[] = [
  { label: 'Dashboard', path: '/seller', icon: 'LayoutDashboard' },
  { label: 'My Listings', path: '/seller/products', icon: 'Package' },
  { label: 'Categories', path: '/seller/categories', icon: 'Tags' },
  { label: 'Orders', path: '/seller/orders', icon: 'ClipboardList' },
  { label: 'Profile', path: '/seller/profile', icon: 'UserCircle' },
];

// Full-Service seller: read-only dashboard only
const FULL_SERVICE_TABS: NavTab[] = [
  { label: 'Dashboard', path: '/seller', icon: 'LayoutDashboard' },
  { label: 'Profile', path: '/seller/profile', icon: 'UserCircle' },
];

// B2C seller gets additional tabs to browse B2B products, cart, and purchases
const SELLER_B2C_EXTRA_TABS: NavTab[] = [
  { label: 'Shop', path: '/seller/shop', icon: 'Store' },
  { label: 'Cart', path: '/seller/cart', icon: 'ShoppingCart' },
  { label: 'My Purchases', path: '/seller/purchases', icon: 'Receipt' },
];

export const SELLER_TABS = SELLER_BASE_TABS;

// Customer/Buyer navigation tabs
export const CUSTOMER_TABS: NavTab[] = [
  { label: 'Products', path: '/buyer/products', icon: 'Package' },
  { label: 'Orders', path: '/buyer/orders', icon: 'ClipboardList' },
];

// Public navigation tabs (unauthenticated users)
export const PUBLIC_TABS: NavTab[] = [
  { label: 'Products', path: '/buyer/products', icon: 'Package' },
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
      return CUSTOMER_TABS;
    default:
      return PUBLIC_TABS;
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
      return '/';
    default:
      return '/buyer/products';
  }
};
