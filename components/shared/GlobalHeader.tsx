import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAcademia } from '../../contexts/AcademiaContext';
import { useConfigModal } from '../../contexts/ConfigModalContext'; // ✅ NUEVO IMPORT
import { getAuth, signOut } from 'firebase/auth';

const GlobalHeader: React.FC = () => {
  const { currentUser } = useAuth();
  const { academiaActual, limpiarAcademiaActual } = useAcademia();
  const { openConfigModal } = useConfigModal(); // ✅ USAR CONTEXT
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ✅ NUEVO: Determinar si mostrar link de Academia/Configuración
  const isAcademia = academiaActual?.tipo === 'academia' || !academiaActual?.tipo; // Fallback para academias legacy
  const configLinkText = isAcademia ? 'Academia' : 'Grupo';

  // Cerrar dropdown cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  const handleChangeAcademia = () => {
    if (limpiarAcademiaActual) {
      limpiarAcademiaActual();
    }
    navigate('/select-academia');
    closeDropdown();
  };

  // ✅ NUEVA FUNCIÓN: Solo abre el modal, no navega
  const handleOpenConfig = () => {
    console.log('🔧 Abriendo configuración desde GlobalHeader...');
    openConfigModal(); // Solo abre el modal global
    closeDropdown(); // Cerrar dropdown si está abierto
  };

  const isActive = (path: string) => location.pathname === path;

  // Obtener email truncado para mostrar
  const getUserDisplay = () => {
    if (!currentUser?.email) return 'Usuario';
    const email = currentUser.email;
    if (email.length > 20) {
      return email.substring(0, 17) + '...';
    }
    return email;
  };

  return (
    <>
      <header className="bg-black/95 backdrop-blur-md shadow-lg shadow-green-500/10 fixed top-0 left-0 right-0 z-50 border-b border-gray-800">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link 
              to="/" 
              className="text-xl sm:text-2xl font-black bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent flex items-center hover:scale-105 transition-transform"
              onClick={closeMobileMenu}
            >
              <span className="hidden sm:inline">TennisCoaching</span>
              <span className="sm:hidden">TC</span>
              {academiaActual && (
                <span className="ml-2 text-sm font-normal text-gray-400 hidden lg:inline">
                  - {academiaActual.nombre}
                  {academiaActual.tipo === 'grupo-entrenamiento' && ' (Grupo Personal)'}
                </span>
              )}
            </Link>

            {currentUser && (
              <nav className="hidden md:flex items-center space-x-6">
                <Link 
                  to="/" 
                  className={`font-medium transition-all duration-200 ${
                    isActive('/') 
                      ? 'text-green-400 text-shadow-neon' 
                      : 'text-gray-400 hover:text-green-400 hover:text-shadow-neon-sm'
                  }`}
                >
                  Inicio
                </Link>
                <Link 
                  to="/players" 
                  className={`font-medium transition-all duration-200 ${
                    isActive('/players') 
                      ? 'text-green-400 text-shadow-neon' 
                      : 'text-gray-400 hover:text-green-400 hover:text-shadow-neon-sm'
                  }`}
                >
                  Jugadores
                </Link>
                <Link 
                  to="/start-training" 
                  className={`font-medium transition-all duration-200 ${
                    isActive('/start-training') 
                      ? 'text-green-400 text-shadow-neon' 
                      : 'text-gray-400 hover:text-green-400 hover:text-shadow-neon-sm'
                  }`}
                >
                  Entrenar
                </Link>
                {/* ✅ MOSTRAR SOLO PARA ACADEMIAS NORMALES */}
                {isAcademia && (
                  <Link 
                    to="/academia-settings" 
                    className={`font-medium transition-all duration-200 ${
                      isActive('/academia-settings') 
                        ? 'text-green-400 text-shadow-neon' 
                        : 'text-gray-400 hover:text-green-400 hover:text-shadow-neon-sm'
                    }`}
                  >
                    {configLinkText}
                  </Link>
                )}
              </nav>
            )}

            <div className="flex items-center space-x-2 sm:space-x-4">
              {currentUser && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={toggleDropdown}
                    className="hidden md:flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-800 border border-gray-600 text-gray-300 hover:border-green-500/50 hover:bg-gray-700 hover:text-green-400 transition-all duration-200"
                  >
                    <span>{getUserDisplay()}</span>
                    <svg 
                      className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-700 rounded-lg shadow-xl shadow-black/50 overflow-hidden">
                      {/* Email completo en el header del dropdown */}
                      <div className="px-4 py-3 border-b border-gray-800">
                        <p className="text-xs text-gray-400">Conectado como</p>
                        <p className="text-sm text-gray-300 font-medium truncate">{currentUser.email}</p>
                      </div>

                      {/* Opciones del menú */}
                      <div className="py-1">
                        {/* ✅ CONFIGURACIÓN: Ahora solo abre modal */}
                        <button
                          onClick={handleOpenConfig}
                          className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-green-400 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Configuración
                        </button>

                        {/* Cambiar Academia */}
                        <button
                          onClick={handleChangeAcademia}
                          className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-green-400 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                          Cambiar {isAcademia ? 'Academia' : 'Grupo'}
                        </button>

                        <div className="border-t border-gray-800 my-1"></div>

                        {/* Cerrar Sesión */}
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center px-4 py-2 text-sm text-red-400 hover:bg-red-950/50 hover:text-red-300 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                          </svg>
                          Cerrar Sesión
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {currentUser && (
                <button
                  onClick={toggleMobileMenu}
                  className="md:hidden p-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-300 hover:border-green-500/50 hover:bg-gray-700 hover:text-green-400 transition-all duration-200"
                  aria-label="Menú de navegación"
                >
                  {isMobileMenuOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-green-400">
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

        {/* Menú móvil */}
        {currentUser && isMobileMenuOpen && (
          <div className="md:hidden bg-gray-900/95 backdrop-blur-md border-t border-gray-800">
            <nav className="px-4 pt-2 pb-4 space-y-2">
              <Link
                to="/"
                onClick={closeMobileMenu}
                className={`block px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isActive('/') 
                    ? 'bg-gradient-to-r from-green-500/20 to-cyan-500/20 text-green-400 border border-green-500/30' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-green-400'
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
                className={`block px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isActive('/players') 
                    ? 'bg-gradient-to-r from-green-500/20 to-cyan-500/20 text-green-400 border border-green-500/30' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-green-400'
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
                className={`block px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isActive('/start-training') 
                    ? 'bg-gradient-to-r from-green-500/20 to-cyan-500/20 text-green-400 border border-green-500/30' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-green-400'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                  </svg>
                  <span>Comenzar Entrenamiento</span>
                </div>
              </Link>

              {/* ✅ MOSTRAR SOLO PARA ACADEMIAS EN MÓVIL TAMBIÉN */}
              {isAcademia && (
                <Link
                  to="/academia-settings"
                  onClick={closeMobileMenu}
                  className={`block px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                    isActive('/academia-settings') 
                      ? 'bg-gradient-to-r from-green-500/20 to-cyan-500/20 text-green-400 border border-green-500/30' 
                      : 'text-gray-400 hover:bg-gray-800 hover:text-green-400'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15l-.75 18H5.25L4.5 3z" />
                    </svg>
                    <span>{configLinkText}</span>
                  </div>
                </Link>
              )}

              <div className="border-t border-gray-800 my-2 pt-2">
                {/* ✅ CONFIGURACIÓN EN MÓVIL: Solo abre modal */}
                <button
                  onClick={() => {
                    handleOpenConfig();
                    closeMobileMenu();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg font-medium text-gray-300 hover:bg-gray-800 hover:text-green-400 transition-all duration-200"
                >
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Configuración</span>
                  </div>
                </button>

                {/* Cambiar Academia en móvil */}
                <button
                  onClick={() => {
                    handleChangeAcademia();
                    closeMobileMenu();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg font-medium text-gray-300 hover:bg-gray-800 hover:text-green-400 transition-all duration-200"
                >
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span>Cambiar {isAcademia ? 'Academia' : 'Grupo'}</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    handleLogout();
                    closeMobileMenu();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg font-medium text-red-500 hover:bg-red-950/50 hover:text-red-400 transition-all duration-200"
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