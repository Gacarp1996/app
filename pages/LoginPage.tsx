import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // ✅ NUEVO ESTADO
  const navigate = useNavigate();
  const auth = getAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err) {
      setError('Error al iniciar sesión. Verifica tus credenciales.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black relative overflow-hidden p-4">
      {/* Efectos de fondo */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
      <div className="absolute top-10 sm:top-20 left-10 sm:left-20 w-64 h-64 sm:w-96 sm:h-96 bg-green-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-10 sm:bottom-20 right-10 sm:right-20 w-64 h-64 sm:w-96 sm:h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
      
      {/* CONTENEDOR RESPONSIVE: Más ancho en desktop */}
      <div className="relative z-10 w-full max-w-md lg:max-w-lg xl:max-w-xl p-1 bg-gradient-to-br from-green-500/20 to-cyan-500/20 rounded-2xl shadow-2xl">
        <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl p-6 sm:p-8 lg:p-10 space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
              TennisCoaching
            </h1>
            <p className="text-gray-400 text-sm lg:text-base">Entrena con propósito. Gestiona con claridad.</p>
          </div>

          {/* Tabs */}
          <div className="flex bg-gray-800/50 rounded-lg p-1">
            <button className="flex-1 py-2.5 lg:py-3 px-4 bg-gradient-to-r from-green-500 to-cyan-500 text-black font-semibold rounded-md transition-all duration-200 text-sm sm:text-base lg:text-lg">
              Iniciar sesión
            </button>
            <button className="flex-1 py-2.5 lg:py-3 px-4 text-gray-400 font-medium hover:text-gray-300 transition-colors duration-200 text-sm sm:text-base lg:text-lg">
              Registrarse
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}
            
            <div className="space-y-4 lg:space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm lg:text-base font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="correo@ejemplo.com"
                  className="w-full px-4 py-3 lg:py-3.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 text-sm sm:text-base lg:text-lg"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm lg:text-base font-medium text-gray-300 mb-2">
                  Contraseña
                </label>
                {/* CONTENEDOR RELATIVO PARA EL BOTÓN DE MOSTRAR/OCULTAR */}
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3 lg:py-3.5 pr-12 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 text-sm sm:text-base lg:text-lg"
                  />
                  {/* BOTÓN PARA MOSTRAR/OCULTAR CONTRASEÑA */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors p-1 focus:outline-none focus:text-green-400"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? (
                      // Icono de ojo cerrado
                      <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      // Icono de ojo abierto
                      <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 lg:py-4 px-4 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-green-500/25 text-sm sm:text-base lg:text-lg"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Iniciando sesión...
                </span>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Funcionalidades - TAMAÑO AJUSTADO PARA DESKTOP */}
          <div className="pt-4 sm:pt-6 border-t border-gray-800">
            <h3 className="text-center text-gray-400 text-sm lg:text-base font-medium mb-3 sm:mb-4">Funcionalidades Principales</h3>
            <div className="space-y-2 sm:space-y-3 lg:space-y-4">
              {[
                { icon: '📊', text: 'Seguimiento detallado del entrenamiento por jugador' },
                { icon: '📅', text: 'Planificación personalizada según objetivos y torneos' },
                { icon: '👥', text: 'Coordinación entre entrenadores de una academia' },
                { icon: '📈', text: 'Visualización del progreso e indicadores clave' }
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3 text-gray-400 text-xs sm:text-sm lg:text-base">
                  <span className="text-base sm:text-lg lg:text-xl flex-shrink-0">{feature.icon}</span>
                  <span className="leading-relaxed">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;