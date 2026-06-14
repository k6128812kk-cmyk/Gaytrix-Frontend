import { Outlet, useLocation } from 'react-router-dom';
import { TabBar } from './TabBar';
import styles from './AppLayout.module.css';

// ==========================================================================
// AppLayout — flex column filling viewport exactly.
// The .outlet div handles scrolling; TabBar is pinned below it.
// This prevents the fixed TabBar from covering content.
// ==========================================================================

const TAB_ROOTS = ['/discover', '/groups', '/chat', '/profile'];

export function AppLayout() {
  const location = useLocation();
  const showTabBar = TAB_ROOTS.some(r => location.pathname === r || location.pathname.startsWith(r + '/') && r !== '/');

  return (
    <div className={styles.layout}>
      <div className={styles.outlet}>
        <Outlet />
      </div>
      {showTabBar && <TabBar />}
    </div>
  );
}
