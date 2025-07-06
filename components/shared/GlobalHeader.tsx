import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAcademia } from '../../contexts/AcademiaContext';
import { getAuth, signOut } from 'firebase/auth';

const GlobalHeader: React.FC = () => {
  const { currentUser } = useAuth();
  const { academiaActual } = useAcademia();
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

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

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
              </nav>
            )}

            <div className="flex items-center space-x-2 sm:space-x-4">
              {currentUser && academiaActual && (
                <button
                  onClick={() => navigate('/academia-settings')}
                  className="hidden md:flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-800 border border-gray-600 text-gray-300 hover:border-green-500/50 hover:bg-gray-700 hover:text-green-400 transition-all duration-200"
                  title="Configuración de Academia"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                  </svg>
                  <span>Configuración</span>
                </button>
              )}

              {currentUser && (
                <button
                  onClick={handleLogout}
                  className="hidden md:flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-800 border border-gray-600 text-gray-300 hover:border-red-500/50 hover:bg-red-950/50 hover:text-red-400 transition-all duration-200"
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

              {academiaActual && (
                <div className="border-t border-gray-800 my-2 pt-2">
                  <button
                    onClick={() => {
                      navigate('/academia-settings');
                      closeMobileMenu();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg font-medium text-gray-400 hover:bg-gray-800 hover:text-green-400 transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                      </svg>
                      <span>Configuración de Academia</span>
                    </div>
                  </button>
                </div>
              )}

              <div className="border-t border-gray-800 my-2 pt-2">
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