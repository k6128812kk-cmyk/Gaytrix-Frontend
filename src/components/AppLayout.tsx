import { Outlet, useLocation } from 'react-router-dom';
import { TabBar } from './TabBar';
import styles from './AppLayout.module.css';

// ==========================================================================
// AppLayout — flex column that fills the viewport exactly.
// The outlet scrolls independently; TabBar is always pinned at the bottom.
// TAB_ROOTS: paths where the bottom tab bar is visible.
// ==========================================================================

const TAB_ROOTS = ['/discover', '/groups', '/chat', '/profile'];

export function AppLayout() {
  const location = useLocation();
  const showTabBar = TAB_ROOTS.some(root => location.pathname === root || location.pathname.startsWith(root + '/') && root !== '/');

  return (
    <div className={styles.layout}>
      <div className={styles.outlet}>
        <Outlet />
      </div>
      {showTabBar && <TabBar />}
    </div>
  );
}
