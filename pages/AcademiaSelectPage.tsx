import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAcademia } from '../contexts/AcademiaContext';
import Modal from '../components/shared/Modal';
import { crearAcademia, obtenerAcademiaPorId } from '../Database/FirebaseAcademias';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';

const AcademiaSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { setAcademiaActual, misAcademias, registrarAccesoAcademia } = useAcademia();

  const [isCrearModalOpen, setIsCrearModalOpen] = useState(false);
  const [isCrearGrupoModalOpen, setIsCrearGrupoModalOpen] = useState(false);
  const [isIngresarModalOpen, setIsIngresarModalOpen] = useState(false);
  const [nombreNuevaAcademia, setNombreNuevaAcademia] = useState('');
  const [nombreNuevoGrupo, setNombreNuevoGrupo] = useState('');
  const [nombreIngreso, setNombreIngreso] = useState('');
  const [idIngreso, setIdIngreso] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCrearAcademia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreNuevaAcademia.trim() || !currentUser) return;
    setLoading(true);
    setError('');

    try {
      const academiaId = await crearAcademia({
        nombre: nombreNuevaAcademia.trim(),
        creadorId: currentUser.uid,
        tipo: 'academia'
      });
      
      const nuevaAcademia = await obtenerAcademiaPorId(academiaId);
      
      if (nuevaAcademia) {
        await setAcademiaActual(nuevaAcademia);
        await registrarAccesoAcademia(academiaId, nuevaAcademia.nombre);
        navigate('/');
      }
    } catch (error) {
      console.error('Error creando academia:', error);
      setError('Error al crear la academia. Intenta de nuevo.');
    } finally {
      setLoading(false);
      setIsCrearModalOpen(false);
      setNombreNuevaAcademia('');
    }
  };

  const handleCrearGrupo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreNuevoGrupo.trim() || !currentUser) return;
    setLoading(true);
    setError('');

    try {
      const grupoId = await crearAcademia({
        nombre: nombreNuevoGrupo.trim(),
        creadorId: currentUser.uid,
        tipo: 'grupo-entrenamiento',
        limiteJugadores: 3
      });
      
      const nuevoGrupo = await obtenerAcademiaPorId(grupoId);
      
      if (nuevoGrupo) {
        await setAcademiaActual(nuevoGrupo);
        await registrarAccesoAcademia(grupoId, nuevoGrupo.nombre);
        navigate('/');
      }
    } catch (error) {
      console.error('Error creando grupo:', error);
      setError('Error al crear el grupo de entrenamiento. Intenta de nuevo.');
    } finally {
      setLoading(false);
      setIsCrearGrupoModalOpen(false);
      setNombreNuevoGrupo('');
    }
  };

  const handleEnviarSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreIngreso.trim() || !idIngreso.trim() || !currentUser) return;
    setLoading(true);
    setError('');

    try {
      const q = query(
        collection(db, "academias"),
        where("id", "==", idIngreso.toUpperCase()),
        where("nombre", "==", nombreIngreso),
        where("activa", "==", true)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const entidadEncontrada = {
          id: doc.id,
          ...doc.data()
        };
        
        await setAcademiaActual(entidadEncontrada as any);
        await registrarAccesoAcademia(doc.id, (entidadEncontrada as any).nombre);
        navigate('/');
      } else {
        setError('No se encontró una academia o grupo con esos datos.');
      }
    } catch (error) {
      console.error('Error buscando:', error);
      setError('Error al buscar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSeleccionarAcademia = async (academia: any) => {
    setLoading(true);
    try {
      const entidadCompleta = await obtenerAcademiaPorId(academia.academiaId);
      
      if (entidadCompleta) {
        await setAcademiaActual(entidadCompleta);
        await registrarAccesoAcademia(academia.academiaId, academia.nombre);
        navigate('/');
      } else {
        alert('No se pudo cargar. Intenta de nuevo.');
      }
    } catch (error) {
      console.error('Error seleccionando:', error);
      alert('Error al seleccionar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Efectos de fondo animados sutiles */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
      <div className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-96 sm:h-96 lg:w-[600px] lg:h-[600px] bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-96 sm:h-96 lg:w-[600px] lg:h-[600px] bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl">
          {/* Header principal con estilo neón */}
          <header className="py-8 lg:py-16 text-center mb-8 lg:mb-12">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-4 lg:mb-6">
              Bienvenido a TennisCoaching
            </h1>
            <p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-gray-400 max-w-2xl lg:max-w-3xl mx-auto">
              Gestiona los objetivos de tus jugadores, registra entrenamientos y visualiza su progreso.
            </p>
          </header>

          {/* Grid de opciones principales con diseño mejorado */}
          <div className="grid md:grid-cols-3 gap-4 lg:gap-6 xl:gap-8 mb-8 lg:mb-12">
            {/* Botón Crear Academia */}
            <button 
              onClick={() => setIsCrearModalOpen(true)} 
              disabled={loading} 
              className="group relative overflow-hidden bg-gray-900/50 backdrop-blur-sm p-6 lg:p-8 xl:p-10 rounded-xl border border-gray-800 hover:border-green-500/50 shadow-lg hover:shadow-xl hover:shadow-green-500/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 to-cyan-500/0 group-hover:from-green-500/10 group-hover:to-cyan-500/10 transition-all duration-300"></div>
              <div className="relative text-center">
                <div className="mb-4 text-5xl lg:text-6xl xl:text-7xl group-hover:scale-110 transition-transform duration-300">🎾</div>
                <h2 className="text-xl lg:text-2xl xl:text-3xl font-bold text-white mb-2 lg:mb-3 group-hover:text-green-400 transition-colors">
                  Crear Academia
                </h2>
                <p className="text-gray-400 text-sm lg:text-base xl:text-lg">
                  Para clubes y academias de tenis con múltiples jugadores.
                </p>
              </div>
            </button>

            {/* Botón Crear Grupo de Entrenamiento */}
            <button 
              onClick={() => setIsCrearGrupoModalOpen(true)} 
              disabled={loading} 
              className="group relative overflow-hidden bg-gray-900/50 backdrop-blur-sm p-6 lg:p-8 xl:p-10 rounded-xl border border-gray-800 hover:border-purple-500/50 shadow-lg hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-pink-500/0 group-hover:from-purple-500/10 group-hover:to-pink-500/10 transition-all duration-300"></div>
              <div className="relative text-center">
                <div className="mb-4 text-5xl lg:text-6xl xl:text-7xl group-hover:scale-110 transition-transform duration-300">👥</div>
                <h2 className="text-xl lg:text-2xl xl:text-3xl font-bold text-white mb-2 lg:mb-3 group-hover:text-purple-400 transition-colors">
                  Crear Grupo Personal
                </h2>
                <p className="text-gray-400 text-sm lg:text-base xl:text-lg mb-2">
                  Para entrenadores personales (máx. 3 jugadores).
                </p>
                <span className="inline-block text-xs lg:text-sm bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full border border-purple-500/30">
                  Ideal para entrenamiento personalizado
                </span>
              </div>
            </button>
            
            {/* Botón Ingresar/Unirse */}
            <button 
              onClick={() => setIsIngresarModalOpen(true)} 
              disabled={loading} 
              className="group relative overflow-hidden bg-gray-900/50 backdrop-blur-sm p-6 lg:p-8 xl:p-10 rounded-xl border border-gray-800 hover:border-blue-500/50 shadow-lg hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-indigo-500/0 group-hover:from-blue-500/10 group-hover:to-indigo-500/10 transition-all duration-300"></div>
              <div className="relative text-center">
                <div className="mb-4 text-5xl lg:text-6xl xl:text-7xl group-hover:scale-110 transition-transform duration-300">🔗</div>
                <h2 className="text-xl lg:text-2xl xl:text-3xl font-bold text-white mb-2 lg:mb-3 group-hover:text-blue-400 transition-colors">
                  Unirse
                </h2>
                <p className="text-gray-400 text-sm lg:text-base xl:text-lg">
                  Ingresa con el nombre y ID de una academia o grupo existente.
                </p>
              </div>
            </button>
          </div>

          {/* Sección para mostrar las academias y grupos del usuario */}
          {misAcademias && misAcademias.length > 0 && (
            <div className="bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-xl shadow-2xl shadow-green-500/10">
              <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl p-6 lg:p-8 xl:p-10">
                <h2 className="text-2xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-6 lg:mb-8">
                  Mis Espacios de Entrenamiento
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                  {misAcademias.map((academia) => (
                    <button 
                      key={academia.academiaId} 
                      onClick={() => handleSeleccionarAcademia(academia)} 
                      disabled={loading} 
                      className="group relative text-left p-4 lg:p-6 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-green-500/50 hover:bg-gray-800/70 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 to-cyan-500/0 group-hover:from-green-500/5 group-hover:to-cyan-500/5 transition-all duration-300"></div>
                      <div className="relative flex items-center justify-between">
                        <div>
                          <h3 className="text-lg lg:text-xl font-semibold text-white group-hover:text-green-400 transition-colors">
                            {academia.nombre}
                          </h3>
                          {academia.tipo === 'grupo-entrenamiento' && (
                            <span className="text-xs lg:text-sm text-purple-400 mt-1 inline-block">
                              Grupo personal
                            </span>
                          )}
                        </div>
                        <div className="flex items-center">
                          {academia.tipo === 'grupo-entrenamiento' ? (
                            <span className="text-2xl lg:text-3xl opacity-50 group-hover:opacity-100 transition-opacity">👥</span>
                          ) : (
                            <span className="text-2xl lg:text-3xl opacity-50 group-hover:opacity-100 transition-opacity">🎾</span>
                          )}
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 lg:w-6 lg:h-6 ml-2 text-gray-500 group-hover:text-green-400 group-hover:translate-x-1 transition-all">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- Modales con estilo actualizado --- */}
      <Modal 
        isOpen={isCrearModalOpen} 
        onClose={() => {
          setIsCrearModalOpen(false);
          setError('');
          setNombreNuevaAcademia('');
        }} 
        title="Crear Nueva Academia"
      >
        <form onSubmit={handleCrearAcademia} className="space-y-4">
          <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg">
            <p className="text-sm lg:text-base text-green-400">
              Tu academia podrá gestionar múltiples jugadores sin límite. Recibirás un ID único para que otros entrenadores puedan unirse.
            </p>
          </div>
          <input 
            type="text" 
            value={nombreNuevaAcademia} 
            onChange={(e) => setNombreNuevaAcademia(e.target.value)} 
            className="w-full p-3 lg:p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200" 
            placeholder="Nombre de tu Academia" 
            required 
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button 
            type="submit" 
            disabled={loading || !nombreNuevaAcademia.trim()} 
            className="w-full px-6 py-3 lg:py-4 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 disabled:from-gray-700 disabled:to-gray-700 text-black disabled:text-gray-500 font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none shadow-lg shadow-green-500/25 disabled:shadow-none"
          >
            {loading ? 'Creando...' : 'Confirmar Creación'}
          </button>
        </form>
      </Modal>

      {/* Modal para Crear Grupo */}
      <Modal 
        isOpen={isCrearGrupoModalOpen} 
        onClose={() => {
          setIsCrearGrupoModalOpen(false);
          setError('');
          setNombreNuevoGrupo('');
        }} 
        title="Crear Grupo de Entrenamiento Personal"
      >
        <form onSubmit={handleCrearGrupo} className="space-y-4">
          <div className="bg-purple-500/10 border border-purple-500/30 p-4 rounded-lg">
            <p className="text-sm lg:text-base text-purple-400 font-medium flex items-center gap-2">
              <span className="text-2xl">👥</span> Grupo Personal
            </p>
            <p className="text-xs lg:text-sm text-gray-400 mt-2">
              Perfecto para entrenadores personales. Límite de 3 jugadores para mantener 
              un enfoque personalizado en el desarrollo de cada alumno.
            </p>
          </div>
          <input 
            type="text" 
            value={nombreNuevoGrupo} 
            onChange={(e) => setNombreNuevoGrupo(e.target.value)} 
            className="w-full p-3 lg:p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200" 
            placeholder="Nombre de tu Grupo (ej: Entrenamiento Elite)" 
            required 
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button 
            type="submit" 
            disabled={loading || !nombreNuevoGrupo.trim()} 
            className="w-full px-6 py-3 lg:py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-700 disabled:to-gray-700 text-white disabled:text-gray-500 font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none shadow-lg shadow-purple-500/25 disabled:shadow-none"
          >
            {loading ? 'Creando...' : 'Crear Grupo Personal'}
          </button>
        </form>
      </Modal>

      {/* Modal para Ingresar */}
      <Modal 
        isOpen={isIngresarModalOpen} 
        onClose={() => {
          setIsIngresarModalOpen(false); 
          setError('');
          setNombreIngreso('');
          setIdIngreso('');
        }} 
        title="Ingresar a Academia o Grupo"
      >
        <form onSubmit={handleEnviarSolicitud} className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg">
            <p className="text-sm lg:text-base text-blue-400">
              Solicita el ID y nombre exacto al administrador de la academia o grupo al que deseas unirte.
            </p>
          </div>
          <div>
            <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">
              ID de la Academia/Grupo
            </label>
            <input 
              type="text" 
              value={idIngreso} 
              onChange={(e) => setIdIngreso(e.target.value.toUpperCase())} 
              className="w-full p-3 lg:p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-white font-mono text-lg lg:text-xl tracking-wider placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200" 
              placeholder="Ej: ABC123" 
              maxLength={6} 
              required 
            />
          </div>
          <div>
            <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">
              Nombre exacto
            </label>
            <input 
              type="text" 
              value={nombreIngreso} 
              onChange={(e) => setNombreIngreso(e.target.value)} 
              className="w-full p-3 lg:p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200" 
              placeholder="Nombre completo de la academia o grupo" 
              required 
            />
          </div>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          <button 
            type="submit" 
            disabled={loading || !nombreIngreso.trim() || !idIngreso.trim()} 
            className="w-full px-6 py-3 lg:py-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 disabled:from-gray-700 disabled:to-gray-700 text-white disabled:text-gray-500 font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none shadow-lg shadow-blue-500/25 disabled:shadow-none"
          >
            {loading ? 'Buscando...' : 'Ingresar'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default AcademiaSelectPage;