import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useMenuToggle } from '../../hooks/useMenuToggle';
import {
  LayoutDashboard, Video, BarChart3, Settings, LogOut,
  Menu, X, Globe, ChevronDown, Shield, ScrollText, Users, FileText, Plug, Bot,
} from 'lucide-react';
import { ROLES } from '../../lib/constants';
import './AppLayout.css';

const PUBLIC_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard.title' },
  { to: '/webinars', icon: Video, labelKey: 'webinar.webinars' },
  { to: '/analytics', icon: BarChart3, labelKey: 'analytics.title' },
  { to: '/leads', icon: Users, label: 'Leads' },
  { to: '/integrations', icon: Plug, labelKey: 'integrations.title' },
  { to: '/ai-agents', icon: Bot, label: 'Agentes IA' },
  { to: '/settings', icon: Settings, labelKey: 'common.settings' },
];

const ADMIN_NAV = [
  { to: '/admin', icon: Shield, label: 'Painel Admin', end: true },
  { to: '/users', icon: Users, label: 'Usuários' },
  { to: '/admin/page-templates', icon: FileText, label: 'Templates de páginas' },
  { to: '/audit', icon: ScrollText, label: 'Auditoria' },
];

export default function AppLayout() {
  const { t, i18n } = useTranslation();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const menu = useMenuToggle();

  const isAdmin = profile?.role === ROLES.ADMIN;

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth/login');
  };

  const toggleLanguage = (lang) => {
    i18n.changeLanguage(lang);
    menu.setLangMenuOpen(false);
  };

  const renderNavItem = (item) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
      onClick={() => menu.setSidebarOpen(false)}
    >
      <item.icon size={20} />
      <span>{item.label || t(item.labelKey)}</span>
    </NavLink>
  );

  return (
    <div className="app-layout">
      {menu.sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => menu.setSidebarOpen(false)} role="presentation" />
      )}

      <aside className={`sidebar ${menu.sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src="/gablive-logo.svg" alt="Gablive" className="sidebar-logo-icon" />
            <span className="sidebar-logo-text">{t('common.appName')}</span>
          </div>
          <button className="sidebar-close btn-icon" onClick={() => menu.setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Navegação principal">
          {PUBLIC_NAV.map(renderNavItem)}

          {isAdmin && (
            <>
              <div className="sidebar-section-label" id="admin-section-label">Administração</div>
              <div role="group" aria-labelledby="admin-section-label">
                {ADMIN_NAV.map(renderNavItem)}
              </div>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar avatar-sm">
              {profile?.display_name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{profile?.display_name || 'User'}</span>
              <span className="sidebar-user-role">{profile?.role || 'presenter'}</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-wrapper">
        <header className="app-header">
          <button
            className="btn btn-ghost btn-icon mobile-menu-btn"
            onClick={menu.toggleSidebar}
            aria-label={t('common.openMenu')}
          >
            <Menu size={20} />
          </button>

          <div className="header-spacer" />

          <div className="header-actions">
            {/* Language switcher */}
            <div className="dropdown">
              <button
                className="btn btn-ghost btn-sm"
                onClick={menu.toggleLangMenu}
                aria-expanded={menu.langMenuOpen}
                aria-haspopup="menu"
                aria-label={t('common.selectLanguage')}
              >
                <Globe size={16} />
                <span>{i18n.language === 'pt-BR' ? 'PT' : 'EN'}</span>
                <ChevronDown size={14} />
              </button>
              {menu.langMenuOpen && (
                <div className="dropdown-menu" role="menu" aria-label={t('common.languageOptions')}>
                  <button
                    className={`dropdown-item ${i18n.language === 'pt-BR' ? 'active' : ''}`}
                    onClick={() => toggleLanguage('pt-BR')}
                    role="menuitem"
                  >
                    PT Português
                  </button>
                  <button
                    className={`dropdown-item ${i18n.language === 'en' ? 'active' : ''}`}
                    onClick={() => toggleLanguage('en')}
                    role="menuitem"
                  >
                    EN English
                  </button>
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="dropdown">
              <button
                className="btn btn-ghost btn-sm user-menu-trigger"
                onClick={menu.toggleUserMenu}
                aria-expanded={menu.userMenuOpen}
                aria-haspopup="menu"
                aria-label={t('common.userMenu')}
              >
                <div className="avatar avatar-sm">
                  {profile?.display_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <ChevronDown size={14} />
              </button>
              {menu.userMenuOpen && (
                <div className="dropdown-menu" role="menu" aria-label={t('common.userMenu')}>
                  <button className="dropdown-item" role="menuitem" onClick={() => { navigate('/settings'); menu.setUserMenuOpen(false); }}>
                    <Settings size={16} />
                    {t('common.settings')}
                  </button>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item danger" role="menuitem" onClick={handleSignOut}>
                    <LogOut size={16} />
                    {t('common.logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
