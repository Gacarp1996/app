import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAcademia } from '../contexts/AcademiaContext';
import { useNotification } from '../hooks/useNotification';
// ✅ AGREGADO: Importar funciones de roles para registro
import { getUserRoleInAcademia, addUserToAcademia, UserRole } from '../Database/FirebaseRoles';
import Modal from '../components/shared/Modal';
import { crearAcademia, obtenerAcademiaPorId, buscarAcademiaPorIdPublico, crearSolicitudUnion } from '../Database/FirebaseAcademias';
import { Academia, TipoEntidad } from '../types/types';
import { getAuth, signOut } from 'firebase/auth';

// ✅ FUNCIÓN HELPER PARA DETERMINAR TIPO DE ENTIDAD
const getEntityType = (academiaData: Academia | null): TipoEntidad => {
  if (academiaData?.tipo) {
    return academiaData.tipo;
  }
  return 'academia';
};

// ✅ FUNCIÓN HELPER: Asegurar que el usuario esté registrado en la academia
const ensureUserRegistration = async (
  academiaId: string, 
  userId: string, 
  userEmail: string, 
  userName: string,
  academiaData: Academia | null
): Promise<UserRole | null> => {
  try {
    // Verificar si ya tiene rol
    let role = await getUserRoleInAcademia(academiaId, userId);
    
    if (!role && academiaData) {
      // Si no tiene rol, asignarlo según la lógica de negocio
      const entityType = getEntityType(academiaData);
      
      if (academiaData.creadorId === userId) {
        // Es el creador
        const creatorRole: UserRole = entityType === 'grupo-entrenamiento' ? 'groupCoach' : 'academyDirector';
        await addUserToAcademia(academiaId, userId, userEmail, creatorRole, userName);
        role = creatorRole;
        console.log(`Usuario ${userId} registrado como creador con rol: ${creatorRole}`);
      } else {
        // Usuario regular
        const defaultRole: UserRole = entityType === 'grupo-entrenamiento' ? 'assistantCoach' : 'academyCoach';
        await addUserToAcademia(academiaId, userId, userEmail, defaultRole, userName);
        role = defaultRole;
        console.log(`Usuario ${userId} registrado con rol por defecto: ${defaultRole}`);
      }
    }
    
    return role;
  } catch (error) {
    console.error(`Error registrando usuario ${userId} en academia ${academiaId}:`, error);
    return null;
  }
};

const AcademiaSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { setAcademiaActual, misAcademias, registrarAccesoAcademia } = useAcademia();
  const notification = useNotification();
  const auth = getAuth();

  const [isCrearModalOpen, setIsCrearModalOpen] = useState(false);
  const [isCrearGrupoModalOpen, setIsCrearGrupoModalOpen] = useState(false);
  const [isIngresarModalOpen, setIsIngresarModalOpen] = useState(false);
  const [nombreNuevaAcademia, setNombreNuevaAcademia] = useState('');
  const [nombreNuevoGrupo, setNombreNuevoGrupo] = useState('');
  const [idIngreso, setIdIngreso] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [academiaBuscada, setAcademiaBuscada] = useState<any>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // ✅ FUNCIÓN PARA MOSTRAR MODAL DE CONFIRMACIÓN
  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  // ✅ FUNCIÓN PARA CERRAR SESIÓN (DESPUÉS DE CONFIRMACIÓN)
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      notification.error('Error al cerrar sesión', 'Por favor, intenta de nuevo.');
    }
  };

  // ✅ FUNCIÓN CORREGIDA PARA CREAR ACADEMIA
  const handleCrearAcademia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreNuevaAcademia.trim() || !currentUser) return;
    setLoading(true);
    setError('');

    try {
      // ✅ RECIBIR AMBOS IDs
      const { firebaseId, publicId } = await crearAcademia({
        nombre: nombreNuevaAcademia.trim(),
        creadorId: currentUser.uid,
        tipo: 'academia'
      });
      
      const nuevaAcademia = await obtenerAcademiaPorId(firebaseId);
      
      if (nuevaAcademia) {
        await setAcademiaActual(nuevaAcademia);
        await registrarAccesoAcademia(firebaseId, nuevaAcademia.nombre);
        
        notification.success(
          '¡Academia creada exitosamente!',
          `Tu código de academia es: ${publicId}. Comparte este código de 6 caracteres con otros entrenadores para que puedan unirse. Duración: 8 segundos para copiar el código.`
        );
        
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

  // ✅ FUNCIÓN CORREGIDA PARA CREAR GRUPO
  const handleCrearGrupo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreNuevoGrupo.trim() || !currentUser) return;
    setLoading(true);
    setError('');

    try {
      // ✅ RECIBIR AMBOS IDs
      const { firebaseId, publicId } = await crearAcademia({
        nombre: nombreNuevoGrupo.trim(),
        creadorId: currentUser.uid,
        tipo: 'grupo-entrenamiento',
        limiteJugadores: 3
      });
      
      const nuevoGrupo = await obtenerAcademiaPorId(firebaseId);
      
      if (nuevoGrupo) {
        await setAcademiaActual(nuevoGrupo);
        await registrarAccesoAcademia(firebaseId, nuevoGrupo.nombre);
        
        notification.success(
          '¡Grupo creado exitosamente!',
          `Tu código de grupo es: ${publicId}. Comparte este código de 6 caracteres con tus jugadores para que puedan unirse. Duración: 8 segundos para copiar el código.`
        );
        
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

  // ✅ FUNCIÓN PARA BUSCAR ACADEMIA POR ID PÚBLICO
  const handleBuscarAcademia = async () => {
    if (idIngreso.length !== 6) {
      setError('El ID debe tener exactamente 6 caracteres');
      return;
    }

    setLoading(true);
    setError('');
    setAcademiaBuscada(null);

    try {
      const academia = await buscarAcademiaPorIdPublico(idIngreso.trim());
      
      if (academia) {
        setAcademiaBuscada(academia);
      } else {
        setError('No se encontró una academia o grupo con ese ID');
      }
    } catch (error: any) {
      console.error('Error buscando:', error);
      setError(error.message || 'Error al buscar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ MODIFICADO: CREAR SOLICITUD EN VEZ DE UNIRSE DIRECTAMENTE
  const handleUnirseAcademia = async () => {
    if (!academiaBuscada || !currentUser) return;

    setLoading(true);
    setError('');

    try {
      console.log('🚀 INICIANDO solicitud con datos:', {
        academia: academiaBuscada.nombre,
        academiaId: academiaBuscada.firebaseId,
        publicId: academiaBuscada.publicId,
        usuario: currentUser.email
      });

      // ✅ NUEVO: Crear solicitud en lugar de unirse directamente
      const result = await crearSolicitudUnion(
        academiaBuscada.firebaseId,
        academiaBuscada.publicId,
        {
          userId: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || undefined
        }
      );

      console.log('📋 Resultado de solicitud:', result);

      if (result.success) {
        notification.success(
          '¡Solicitud enviada!',
          'Tu solicitud ha sido enviada al director de la academia. Recibirás una notificación cuando sea procesada.'
        );
        setIsIngresarModalOpen(false);
        setAcademiaBuscada(null);
        setIdIngreso('');
      } else {
        console.error('❌ Error en solicitud:', result.message);
        setError(result.message);
      }
    } catch (error: any) {
      console.error('🚨 ERROR COMPLETO enviando solicitud:', error);
      setError('Error al enviar solicitud. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ CRÍTICO: Función con registro de usuario ANTES de operaciones
  const handleSeleccionarAcademia = async (academia: any) => {
    if (!currentUser) {
      notification.error('Error: No se pudo identificar al usuario');
      return;
    }

    setLoading(true);
    try {
      const entidadCompleta = await obtenerAcademiaPorId(academia.academiaId);
      
      if (entidadCompleta) {
        // ✅ CRÍTICO: Asegurar registro del usuario ANTES de cualquier operación
        const userName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario Anónimo';
        const userRole = await ensureUserRegistration(
          entidadCompleta.id,
          currentUser.uid,
          currentUser.email || 'no-email-provided',
          userName,
          entidadCompleta
        );

        if (!userRole) {
          notification.error('Error: No se pudo registrar el usuario en la academia');
          return;
        }

        console.log(`Usuario registrado para selección con rol: ${userRole}, procediendo a seleccionar academia`);

        // ✅ AHORA SÍ: Proceder con la selección con permisos asegurados
        await setAcademiaActual(entidadCompleta);
        await registrarAccesoAcademia(academia.academiaId, academia.nombre);
        navigate('/');
      } else {
        notification.error('No se pudo cargar la academia', 'Por favor, intenta de nuevo.');
      }
    } catch (error) {
      console.error('Error seleccionando academia:', error);
      notification.error('Error al seleccionar', 'Ocurrió un error al seleccionar la academia.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Efectos de fondo animados sutiles */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
      <div className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-96 sm:h-96 lg:w-[600px] lg:h-[600px] bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-96 sm:h-96 lg:w-[600px] lg:h-[600px] bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      {/* ✅ Botón de cerrar sesión - estilo discreto */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={handleLogoutClick}
          className="group flex items-center gap-2 px-4 py-2 bg-gray-900/80 backdrop-blur-sm border border-gray-700 hover:border-red-500/50 rounded-lg text-gray-300 hover:text-red-400 transition-all duration-300 shadow-lg hover:shadow-red-500/10"
          title="Cerrar sesión"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          <span className="text-sm font-medium hidden sm:inline">Cerrar Sesión</span>
        </button>
      </div>
      
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
                  Ingresa el código de 6 caracteres de una academia o grupo.
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
              Tu academia podrá gestionar múltiples jugadores sin límite. Recibirás un ID único de 6 caracteres para que otros entrenadores puedan unirse.
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
              un enfoque personalizado en el desarrollo de cada alumno. Recibirás un ID único de 6 caracteres.
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

      {/* ✅ MODAL ACTUALIZADO PARA SOLICITUD DE UNIÓN */}
      <Modal 
        isOpen={isIngresarModalOpen} 
        onClose={() => {
          setIsIngresarModalOpen(false); 
          setError('');
          setIdIngreso('');
          setAcademiaBuscada(null);
        }} 
        title="Solicitar Unirse a Academia o Grupo"
      >
        <div className="space-y-6">
          {/* Información mejorada */}
          <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-blue-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
              </div>
              <div>
                <p className="text-blue-400 font-medium mb-1">¿Cómo unirse?</p>
                <p className="text-sm text-gray-300">
                  Ingresa el <strong>código de 6 caracteres</strong> proporcionado por el administrador. Tu solicitud será revisada y aprobada por el director.
                </p>
              </div>
            </div>
          </div>

          {/* Campo de ID simplificado */}
          <div>
            <label className="block text-base font-medium text-gray-300 mb-3">
              Código de la Academia o Grupo
            </label>
            <div className="relative">
              <input 
                type="text" 
                value={idIngreso} 
                onChange={(e) => {
                  const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                  if (value.length <= 6) {
                    setIdIngreso(value);
                    setError('');
                    setAcademiaBuscada(null);
                  }
                }}
                className="w-full p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-white font-mono text-xl tracking-wider text-center placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200" 
                placeholder="ABC123" 
                maxLength={6}
              />
              {/* Indicador de progreso */}
              <div className="flex justify-center mt-2">
                {[...Array(6)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-2 h-2 mx-1 rounded-full transition-colors ${
                      i < idIngreso.length 
                        ? 'bg-blue-400' 
                        : 'bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Ingresa los 6 caracteres que te proporcionó el administrador
            </p>
          </div>

          {/* Botón de buscar */}
          {idIngreso.length === 6 && !academiaBuscada && (
            <button
              onClick={handleBuscarAcademia}
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Buscando...' : 'Buscar Academia'}
            </button>
          )}

          {/* Academia encontrada */}
          {academiaBuscada && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <h4 className="text-green-400 font-semibold mb-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Academia encontrada
              </h4>
              <div className="space-y-2">
                <p className="text-white font-bold text-lg">{academiaBuscada.nombre}</p>
                <p className="text-gray-400 text-sm">Código: {academiaBuscada.publicId}</p>
                <p className="text-gray-400 text-sm">Tipo: {academiaBuscada.tipo === 'academia' ? 'Academia' : 'Grupo Personal'}</p>
                {academiaBuscada.tipo === 'grupo-entrenamiento' && academiaBuscada.limiteJugadores && (
                  <p className="text-purple-400 text-sm">Límite: {academiaBuscada.limiteJugadores} jugadores</p>
                )}
              </div>
              
              <button
                onClick={handleUnirseAcademia}
                disabled={loading}
                className="mt-4 w-full px-4 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white font-bold rounded-lg transition-colors"
              >
                {loading ? 'Enviando solicitud...' : `Solicitar unirse a ${academiaBuscada.nombre}`}
              </button>
              
              <p className="text-xs text-gray-400 mt-3 text-center">
                ⏱️ Tu solicitud será revisada por el director en las próximas 24-48 horas
              </p>
            </div>
          )}

          {/* Error mejorado */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <div>
                  <p className="text-red-400 font-medium">Error</p>
                  <p className="text-red-300 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Ayuda adicional */}
          <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-3">
            <p className="text-gray-400 text-sm">
              <strong className="text-gray-300">💡 Consejo:</strong> Las solicitudes requieren aprobación del director de la academia para garantizar la seguridad. 
              Si tu solicitud es rechazada, contacta directamente al administrador.
            </p>
          </div>
        </div>
      </Modal>

      {/* ✅ NUEVO: Modal de confirmación para cerrar sesión */}
      <Modal 
        isOpen={showLogoutModal} 
        onClose={() => setShowLogoutModal(false)} 
        title="¿Cerrar sesión?"
      >
        <div className="space-y-6">
          {/* Mensaje de confirmación */}
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-yellow-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <p className="text-yellow-400 font-medium mb-1">Confirmar cierre de sesión</p>
                <p className="text-sm text-gray-300">
                  ¿Estás seguro de que quieres cerrar sesión? Tendrás que volver a iniciar sesión para acceder a la aplicación.
                </p>
              </div>
            </div>
          </div>

          {/* Información del usuario actual */}
          {currentUser && (
            <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-3">
              <p className="text-gray-400 text-sm">
                <strong className="text-gray-300">Usuario actual:</strong> {currentUser.email}
              </p>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowLogoutModal(false)}
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                setShowLogoutModal(false);
                handleLogout();
              }}
              className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
            >
              Sí, cerrar sesión
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AcademiaSelectPage;