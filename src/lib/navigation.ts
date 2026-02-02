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

// Seller navigation tabs (common)
const SELLER_BASE_TABS: NavTab[] = [
  { label: 'Dashboard', path: '/seller' },
  { label: 'My Listings', path: '/seller/products' },
  { label: 'Categories', path: '/seller/categories' },
  { label: 'Orders', path: '/seller/orders' },
  { label: 'Profile', path: '/seller/profile' },
];

// B2C seller gets additional tabs to browse B2B products and cart
const SELLER_B2C_EXTRA_TABS: NavTab[] = [
  { label: 'Shop', path: '/seller/shop' },
  { label: 'Cart', path: '/seller/cart' },
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
    case 'SELLER': {
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
    case 'SELLER':
      return '/seller';
    case 'CUSTOMER':
    default:
      return '/';
  }
};
