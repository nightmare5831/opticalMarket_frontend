export interface NavTab {
  label: string;
  path: string;
  icon?: string;
}

// Admin navigation tabs
export const ADMIN_TABS: NavTab[] = [
  { label: 'Products', path: '/products' },
  { label: 'Categories', path: '/products/categories' },
];

// Seller navigation tabs
export const SELLER_TABS: NavTab[] = [
  { label: 'Products', path: '/products' },
  { label: 'Categories', path: '/products/categories' },
];

// Customer/Buyer navigation tabs
export const CUSTOMER_TABS: NavTab[] = [
  { label: 'Products', path: '/products' },
];

// Get navigation tabs based on user role
export const getNavigationTabs = (role: string | undefined): NavTab[] => {
  switch (role) {
    case 'ADMIN':
      return ADMIN_TABS;
    case 'SELLER':
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
      return '/';
    case 'CUSTOMER':
    default:
      return '/';
  }
};
