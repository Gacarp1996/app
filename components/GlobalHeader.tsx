import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAcademia } from '../contexts/AcademiaContext';
import { getAuth, signOut } from 'firebase/auth';

const GlobalHeader: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { currentUser } = useAuth();
  const { academiaActual, limpiarAcademiaActual } = useAcademia();
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleCambiarAcademia = () => {
    limpiarAcademiaActual();
    navigate('/select-academia');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header style={{ backgroundColor: 'var(--color-global-header-bg)'}} className="shadow-md fixed top-0 left-0 right-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link 
              to="/" 
              className="text-xl sm:text-2xl font-bold text-app-accent flex items-center"
              onClick={closeMobileMenu}
            >
              <span className="hidden sm:inline">TenisCoaching</span>
              <span className="sm:hidden">TC</span>
              {academiaActual && (
                <span className="ml-2 text-sm font-normal text-app-secondary hidden lg:inline">
                  - {academiaActual.nombre} <span className="text-xs">(ID: {academiaActual.id})</span>
                </span>
              )}
            </Link>

            {currentUser && (
              <nav className="hidden md:flex items-center space-x-6">
                <Link 
                  to="/" 
                  className={`font-medium transition-colors ${
                    isActive('/') ? 'text-app-accent' : 'text-app-secondary hover:text-app-primary'
                  }`}
                >
                  Inicio
                </Link>
                <Link 
                  to="/players" 
                  className={`font-medium transition-colors ${
                    isActive('/players') ? 'text-app-accent' : 'text-app-secondary hover:text-app-primary'
                  }`}
                >
                  Jugadores
                </Link>
                <Link 
                  to="/start-training" 
                  className={`font-medium transition-colors ${
                    isActive('/start-training') ? 'text-app-accent' : 'text-app-secondary hover:text-app-primary'
                  }`}
                >
                  Entrenar
                </Link>
              </nav>
            )}

            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-app-surface-alt transition-colors"
                aria-label={theme === 'interiores' ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro'}
                title={theme === 'interiores' ? 'Tema oscuro' : 'Tema claro'}
              >
                {theme === 'interiores' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                )}
              </button>

              {currentUser && academiaActual && (
                <>
                  <button
                    onClick={() => navigate('/academia-settings')}
                    className="hidden md:flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium bg-app-surface-alt hover:bg-app-accent hover:text-white transition-colors"
                    title="Configuración de Academia"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                    </svg>
                    <span>Configuración</span>
                  </button>
                  <button
                    onClick={handleCambiarAcademia}
                    className="hidden md:flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium bg-app-surface-alt hover:bg-app-accent hover:text-white transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                    </svg>
                    <span>Cambiar Academia</span>
                  </button>
                </>
              )}

              {currentUser && (
                <button
                  onClick={handleLogout}
                  className="hidden md:flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium bg-app-surface-alt hover:bg-red-600 hover:text-white transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                  <span>Salir</span>
                </button>
              )}

              {currentUser && (
                <button
                  onClick={toggleMobileMenu}
                  className="md:hidden p-2 rounded-lg hover:bg-app-surface-alt transition-colors"
                  aria-label="Menú de navegación"
                >
                  {isMobileMenuOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {currentUser && isMobileMenuOpen && (
          <div className="md:hidden bg-app-surface border-t border-app">
            <nav className="px-4 pt-2 pb-4 space-y-2">
              <Link
                to="/"
                onClick={closeMobileMenu}
                className={`block px-3 py-2 rounded-lg font-medium transition-colors ${
                  isActive('/') 
                    ? 'bg-app-accent text-white' 
                    : 'text-app-secondary hover:bg-app-surface-alt hover:text-app-primary'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.44 1.152-.44 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                  </svg>
                  <span>Inicio</span>
                </div>
              </Link>

              <Link
                to="/players"
                onClick={closeMobileMenu}
                className={`block px-3 py-2 rounded-lg font-medium transition-colors ${
                  isActive('/players') 
                    ? 'bg-app-accent text-white' 
                    : 'text-app-secondary hover:bg-app-surface-alt hover:text-app-primary'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                  <span>Jugadores</span>
                </div>
              </Link>

              <Link
                to="/start-training"
                onClick={closeMobileMenu}
                className={`block px-3 py-2 rounded-lg font-medium transition-colors ${
                  isActive('/start-training') 
                    ? 'bg-app-accent text-white' 
                    : 'text-app-secondary hover:bg-app-surface-alt hover:text-app-primary'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                  </svg>
                  <span>Comenzar Entrenamiento</span>
                </div>
              </Link>

              {academiaActual && (
                <div className="border-t border-app my-2 pt-2">
                  <button
                    onClick={() => {
                      navigate('/academia-settings');
                      closeMobileMenu();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg font-medium text-app-secondary hover:bg-app-surface-alt transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                      </svg>
                      <span>Configuración de Academia</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      handleCambiarAcademia();
                      closeMobileMenu();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg font-medium text-app-secondary hover:bg-app-surface-alt transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                      </svg>
                      <span>Cambiar Academia</span>
                    </div>
                  </button>
                </div>
              )}

              <div className="border-t border-app my-2 pt-2">
                <button
                  onClick={() => {
                    handleLogout();
                    closeMobileMenu();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg font-medium text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                    </svg>
                    <span>Cerrar Sesión</span>
                  </div>
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={closeMobileMenu}
        />
      )}
    </>
  );
};

export default GlobalHeader;