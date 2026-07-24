import { useState, useCallback } from 'react';

/**
 * Gerencia os estados de abertura/fechamento dos menus do AppLayout.
 * Centraliza sidebar, menu do usuário e menu de idioma.
 */
export function useMenuToggle() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const closeAll = useCallback(() => {
    setSidebarOpen(false);
    setUserMenuOpen(false);
    setLangMenuOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
    setUserMenuOpen(false);
    setLangMenuOpen(false);
  }, []);

  const toggleUserMenu = useCallback(() => {
    setUserMenuOpen((prev) => !prev);
    setLangMenuOpen(false);
  }, []);

  const toggleLangMenu = useCallback(() => {
    setLangMenuOpen((prev) => !prev);
    setUserMenuOpen(false);
  }, []);

  return {
    sidebarOpen,
    setSidebarOpen,
    userMenuOpen,
    setUserMenuOpen,
    langMenuOpen,
    setLangMenuOpen,
    closeAll,
    toggleSidebar,
    toggleUserMenu,
    toggleLangMenu,
  };
}