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

// Seller navigation tabs
export const SELLER_TABS: NavTab[] = [
  { label: 'Dashboard', path: '/seller' },
  { label: 'My Listings', path: '/seller/products' },
  { label: 'Categories', path: '/seller/categories' },
  { label: 'Orders', path: '/seller/orders' },
  { label: 'Profile', path: '/seller/profile' },
];

// Customer/Buyer navigation tabs
export const CUSTOMER_TABS: NavTab[] = [
  { label: 'Products', path: '/buyer/products' },
  { label: 'Orders', path: '/buyer/orders' },
];

// Get navigation tabs based on user role and status
export const getNavigationTabs = (role: string | undefined, status?: string): NavTab[] => {
  switch (role) {
    case 'ADMIN':
      return ADMIN_TABS;
    case 'SELLER':
      if (status === 'PENDING') {
        return SELLER_TABS.filter(tab => tab.path !== '/seller/orders');
      }
      return SELLER_TABS;
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
