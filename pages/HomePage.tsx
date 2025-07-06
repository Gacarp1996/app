import { useAcademia } from "@/contexts/AcademiaContext";
import { db } from "@/firebase/firebase-config";
import { collection, getDocs, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";


const HomePage: React.FC = () => {
  const { academiaActual } = useAcademia();
  const [hasPlayers, setHasPlayers] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPlayers = async () => {
      // Si tenemos una academia seleccionada con su ID...
      if (academiaActual?.id) {
        try {
          // --- ESTA ES LA LÍNEA CORREGIDA ---
          // Ahora buscamos en la sub-colección 'players' dentro de la academia actual.
          const playersQuery = query(
            collection(db, "academias", academiaActual.id, "players")
          );
          
          const querySnapshot = await getDocs(playersQuery);
          
          // Si la consulta no está vacía, hay jugadores.
          setHasPlayers(!querySnapshot.empty);
        } catch (error) {
          console.error("Error al verificar jugadores:", error);
          setHasPlayers(false);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    checkPlayers();
  }, [academiaActual]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
          <p className="mt-4 text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  const newLocal = "absolute inset-0 bg-gradient-to-br from-green-500/0 to-cyan-500/0 group-hover:from-green-500/10 group-hover:to-cyan-500/10 transition-all duration-300 rounded-2xl";
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Efectos de fondo animados sutiles */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
      <div className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-96 sm:h-96 lg:w-[500px] lg:h-[500px] bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-96 sm:h-96 lg:w-[500px] lg:h-[500px] bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Header principal con estilo neón */}
        <header className="py-8 lg:py-16 text-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            {hasPlayers ? (
              <>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-4 lg:mb-6">
                  Continúa el gran trabajo
                </h1>
                <p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-gray-400 max-w-2xl lg:max-w-3xl mx-auto">
                  Revisa el progreso de tus jugadores o inicia un nuevo entrenamiento.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-4 lg:mb-6">
                  ¿Listo para empezar?
                </h1>
                <p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-gray-400 max-w-2xl lg:max-w-3xl mx-auto">
                  Comienza a cargar jugadores y llevar el registro de tus entrenamientos.
                </p>
              </>
            )}
          </div>
        </header>

        {/* Acciones Principales con diseño mejorado */}
        <section className="mt-8 lg:mt-16 grid md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/start-training"
            className="group relative overflow-hidden bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-2xl shadow-2xl shadow-green-500/10 transition-all duration-300 hover:shadow-green-500/20 transform hover:-translate-y-1"
          >
            <div className="relative bg-gray-900/95 backdrop-blur-xl rounded-2xl p-8 lg:p-10 xl:p-12 flex flex-col items-center justify-center h-full">
              <div className={newLocal}></div>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="relative w-16 h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 mb-4 lg:mb-6 text-green-400 group-hover:scale-110 transition-transform duration-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
              <span className="relative text-xl lg:text-2xl xl:text-3xl font-bold text-white group-hover:text-green-400 transition-colors duration-300">
                Comenzar Entrenamiento
              </span>
              <span className="relative text-sm lg:text-base text-gray-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Registra ejercicios y monitorea el progreso
              </span>
            </div>
          </Link>

          <Link
            to="/players"
            className="group relative overflow-hidden bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-[1px] rounded-2xl shadow-2xl shadow-blue-500/10 transition-all duration-300 hover:shadow-blue-500/20 transform hover:-translate-y-1"
          >
            <div className="relative bg-gray-900/95 backdrop-blur-xl rounded-2xl p-8 lg:p-10 xl:p-12 flex flex-col items-center justify-center h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-indigo-500/0 group-hover:from-blue-500/10 group-hover:to-indigo-500/10 transition-all duration-300 rounded-2xl"></div>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="relative w-16 h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 mb-4 lg:mb-6 text-blue-400 group-hover:scale-110 transition-transform duration-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
              <span className="relative text-xl lg:text-2xl xl:text-3xl font-bold text-white group-hover:text-blue-400 transition-colors duration-300">
                Ver Jugadores
              </span>
              <span className="relative text-sm lg:text-base text-gray-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Gestiona tu equipo y objetivos
              </span>
            </div>
          </Link>
        </section>

        {/* Guía Rápida con diseño mejorado */}
        <section className="mt-16 lg:mt-24 px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-8 lg:mb-12 text-center">
            Guía Rápida
          </h2>
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 lg:gap-8">
            {/* Paso 1 */}
            <div className="group relative overflow-hidden bg-gray-900/50 backdrop-blur-sm p-[1px] rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-green-500/10">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 via-transparent to-transparent group-hover:from-green-500/10 transition-all duration-300"></div>
              <div className="relative bg-gray-900/95 rounded-xl p-6 lg:p-8 h-full">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-green-600 rounded-t-xl"></div>
                <div className="flex items-center mb-4 lg:mb-6">
                  <span className="bg-gradient-to-r from-green-400 to-green-600 text-black w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center font-bold text-lg lg:text-xl mr-3 shadow-lg shadow-green-500/25">
                    1
                  </span>
                  <h3 className="text-xl lg:text-2xl font-bold text-white">Crea Jugadores</h3>
                </div>
                <p className="text-gray-400 text-sm lg:text-base leading-relaxed">
                  Ve a la sección de "Ver Jugadores" y añade a tus atletas.
                </p>
              </div>
            </div>

            {/* Paso 2 */}
            <div className="group relative overflow-hidden bg-gray-900/50 backdrop-blur-sm p-[1px] rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-transparent to-transparent group-hover:from-cyan-500/10 transition-all duration-300"></div>
              <div className="relative bg-gray-900/95 rounded-xl p-6 lg:p-8 h-full">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-t-xl"></div>
                <div className="flex items-center mb-4 lg:mb-6">
                  <span className="bg-gradient-to-r from-cyan-400 to-cyan-600 text-black w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center font-bold text-lg lg:text-xl mr-3 shadow-lg shadow-cyan-500/25">
                    2
                  </span>
                  <h3 className="text-xl lg:text-2xl font-bold text-white">Define Objetivos</h3>
                </div>
                <p className="text-gray-400 text-sm lg:text-base leading-relaxed">
                  Define metas para cada jugador y sigue su evolución desde "Actuales" hasta que los consideres "Incorporados".
                </p>
              </div>
            </div>

            {/* Paso 3 */}
            <div className="group relative overflow-hidden bg-gray-900/50 backdrop-blur-sm p-[1px] rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 via-transparent to-transparent group-hover:from-purple-500/10 transition-all duration-300"></div>
              <div className="relative bg-gray-900/95 rounded-xl p-6 lg:p-8 h-full">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 to-purple-600 rounded-t-xl"></div>
                <div className="flex items-center mb-4 lg:mb-6">
                  <span className="bg-gradient-to-r from-purple-400 to-purple-600 text-white w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center font-bold text-lg lg:text-xl mr-3 shadow-lg shadow-purple-500/25">
                    3
                  </span>
                  <h3 className="text-xl lg:text-2xl font-bold text-white">Registra Entrenamientos</h3>
                </div>
                <p className="text-gray-400 text-sm lg:text-base leading-relaxed">
                  Inicia un entrenamiento, selecciona a los participantes y registra los ejercicios realizados.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Información adicional para desktop */}
        <section className="hidden lg:block mt-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-xl">
              <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl p-8">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {academiaActual?.nombre || 'Academia'}
                    </h3>
                    <p className="text-gray-400">
                      {academiaActual?.tipo === 'grupo-entrenamiento' 
                        ? 'Grupo de entrenamiento personal' 
                        : 'Academia de tenis'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 mb-1">ID de acceso</p>
                    <p className="text-2xl font-mono font-bold text-green-400">
                      {academiaActual?.id || '------'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage;