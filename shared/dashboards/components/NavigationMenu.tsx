import type { User } from '../../api/auth';

type UserRole = User['role'];

export interface NavItem {
  label: string;
  icon: string;
  path: string;
  roles?: UserRole[];
}

interface NavigationMenuProps {
  role: UserRole;
  customItems?: NavItem[];
  onNavigate?: (path: string) => void;
}

const defaultNavigationItems: NavItem[] = [
  // Admin navigation
  { label: 'Overview', icon: '📊', path: '/admin', roles: ['ADMIN'] },
  { label: 'Users', icon: '👥', path: '/admin/users', roles: ['ADMIN'] },
  { label: 'Restaurants', icon: '🏪', path: '/admin/restaurants', roles: ['ADMIN'] },
  { label: 'Menu', icon: '🍽️', path: '/admin/menu', roles: ['ADMIN'] },
  { label: 'Orders', icon: '📦', path: '/admin/orders', roles: ['ADMIN'] },
  { label: 'Tables', icon: '🪑', path: '/admin/tables', roles: ['ADMIN'] },
  { label: 'Analytics', icon: '📈', path: '/admin/analytics', roles: ['ADMIN'] },
  { label: 'Settings', icon: '⚙️', path: '/admin/settings', roles: ['ADMIN'] },

  // Customer navigation
  { label: 'My Orders', icon: '📦', path: '/customer/orders', roles: ['CUSTOMER'] },
  { label: 'Browse Menu', icon: '🍽️', path: '/customer/menu', roles: ['CUSTOMER'] },
  { label: 'Favorites', icon: '❤️', path: '/customer/favorites', roles: ['CUSTOMER'] },
  { label: 'Profile', icon: '👤', path: '/customer/profile', roles: ['CUSTOMER'] },

  // Rider navigation
  { label: 'Overview', icon: '�', path: '/rider/overview', roles: ['RIDER'] },
  { label: 'Deliveries', icon: '�', path: '/rider/deliveries', roles: ['RIDER'] },
  { label: 'Earnings', icon: '�', path: '/rider/earnings', roles: ['RIDER'] },
  { label: 'Profile', icon: '👤', path: '/rider/profile', roles: ['RIDER'] },

  // Waiter navigation
  { label: 'Overview', icon: '📊', path: '/waiter/overview', roles: ['WAITER'] },
  { label: 'Tables', icon: '🪑', path: '/waiter/tables', roles: ['WAITER'] },
  { label: 'Orders', icon: '📦', path: '/waiter/orders', roles: ['WAITER'] },
  { label: 'Profile', icon: '👤', path: '/waiter/profile', roles: ['WAITER'] },

  // Chef navigation
  { label: 'Overview', icon: '📊', path: '/chef/overview', roles: ['CHEF'] },
  { label: 'Kitchen Queue', icon: '👨‍🍳', path: '/chef/queue', roles: ['CHEF'] },
  { label: 'Menu Items', icon: '🍳', path: '/chef/menu', roles: ['CHEF'] },
  { label: 'Profile', icon: '👤', path: '/chef/profile', roles: ['CHEF'] },

  // Branch Manager navigation
  { label: 'Overview', icon: '📊', path: '/manager', roles: ['BRANCH_MANAGER'] },
  { label: 'Staff', icon: '👥', path: '/manager/staff', roles: ['BRANCH_MANAGER'] },
  { label: 'Orders', icon: '📦', path: '/manager/orders', roles: ['BRANCH_MANAGER'] },
  { label: 'Inventory', icon: '📦', path: '/manager/inventory', roles: ['BRANCH_MANAGER'] },
  { label: 'Analytics', icon: '📈', path: '/manager/analytics', roles: ['BRANCH_MANAGER'] },
  { label: 'Profile', icon: '👤', path: '/manager/profile', roles: ['BRANCH_MANAGER'] },
];

export function getNavigationItems(role: UserRole, customItems?: NavItem[]): NavItem[] {
  if (customItems) {
    return customItems;
  }

  return defaultNavigationItems.filter(
    (item) => !item.roles || item.roles.includes(role)
  );
}

export function NavigationMenu({ role, customItems, onNavigate }: NavigationMenuProps) {
  const items = getNavigationItems(role, customItems);
  const currentPath = window.location.pathname;

  return (
    <nav>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((item) => (
          <li key={item.path} style={{ marginBottom: '4px' }}>
            <a
              href={item.path}
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate(item.path);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px',
                color: currentPath === item.path ? '#fff' : '#aaa',
                backgroundColor: currentPath === item.path ? '#16213e' : 'transparent',
                borderRadius: '8px',
                textDecoration: 'none',
                transition: 'all 0.2s',
                fontSize: '14px',
              }}
            >
              <span style={{ marginRight: '12px', fontSize: '18px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function useNavigation(role: UserRole, customItems?: NavItem[]) {
  const items = getNavigationItems(role, customItems);

  const getActiveItem = () => {
    const currentPath = window.location.pathname;
    return items.find((item) => item.path === currentPath);
  };

  return { items, getActiveItem };
}
