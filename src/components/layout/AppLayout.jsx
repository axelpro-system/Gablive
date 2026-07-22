import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Video,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Globe,
  ChevronDown,
  Shield,
  ScrollText,
  Users,
  FileText,
} from 'lucide-react';
import { useState } from 'react';
import { ROLES } from '../../lib/constants';
import './AppLayout.css';

export default function AppLayout() {
  const { t, i18n } = useTranslation();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth/login');
  };

  const toggleLanguage = (lang) => {
    i18n.changeLanguage(lang);
    setLangMenuOpen(false);
  };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: t('dashboard.title') },
    { to: '/webinars', icon: Video, label: t('webinar.webinars') },
    { to: '/analytics', icon: BarChart3, label: t('analytics.title') },
    { to: '/settings', icon: Settings, label: t('common.settings') },
  ];

  const isAdmin = profile?.role === ROLES.ADMIN;

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">W</div>
            <span className="sidebar-logo-text">{t('common.appName')}</span>
          </div>
          <button
            className="sidebar-close btn-icon"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar-nav-item ${isActive ? 'active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="sidebar-section-label">Administração</div>
              <NavLink
                to="/admin"
                end
                className={({ isActive }) =>
                  `sidebar-nav-item ${isActive ? 'active' : ''}`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <Shield size={20} />
                <span>{t('admin.title')}</span>
              </NavLink>
              <NavLink
                to="/users"
                className={({ isActive }) =>
                  `sidebar-nav-item ${isActive ? 'active' : ''}`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <Users size={20} />
                <span>Usuários</span>
              </NavLink>
              <NavLink
                to="/audit"
                className={({ isActive }) =>
                  `sidebar-nav-item ${isActive ? 'active' : ''}`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <ScrollText size={20} />
                <span>Auditoria</span>
              </NavLink>
              <NavLink
                to="/admin/page-templates"
                className={({ isActive }) =>
                  `sidebar-nav-item ${isActive ? 'active' : ''}`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <FileText size={20} />
                <span>Templates</span>
              </NavLink>
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

      {/* Main content */}
      <div className="main-wrapper">
        {/* Header */}
        <header className="app-header">
          <button
            className="btn btn-ghost btn-icon mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>

          <div className="header-spacer" />

          <div className="header-actions">
            {/* Language switcher */}
            <div className="dropdown">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setLangMenuOpen(!langMenuOpen)}
              >
                <Globe size={16} />
                <span>{i18n.language === 'pt-BR' ? 'PT' : 'EN'}</span>
                <ChevronDown size={14} />
              </button>
              {langMenuOpen && (
                <div className="dropdown-menu">
                  <button
                    className={`dropdown-item ${i18n.language === 'pt-BR' ? 'active' : ''}`}
                    onClick={() => toggleLanguage('pt-BR')}
                  >
                    🇧🇷 Português
                  </button>
                  <button
                    className={`dropdown-item ${i18n.language === 'en' ? 'active' : ''}`}
                    onClick={() => toggleLanguage('en')}
                  >
                    🇺🇸 English
                  </button>
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="dropdown">
              <button
                className="btn btn-ghost btn-sm user-menu-trigger"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="avatar avatar-sm">
                  {profile?.display_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <ChevronDown size={14} />
              </button>
              {userMenuOpen && (
                <div className="dropdown-menu">
                  <button className="dropdown-item" onClick={() => { navigate('/settings'); setUserMenuOpen(false); }}>
                    <Settings size={16} />
                    {t('common.settings')}
                  </button>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item danger" onClick={handleSignOut}>
                    <LogOut size={16} />
                    {t('common.logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
