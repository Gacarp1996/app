import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAcademia } from '../contexts/AcademiaContext';
import Modal from '../components/Modal';
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
    <div className="min-h-screen bg-app-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <header className="py-12 text-center">
            <h1 className="text-5xl font-bold text-app-accent mb-6">Bienvenido a TenisCoaching</h1>
            <p className="text-xl text-app-secondary max-w-2xl mx-auto">
              Gestiona los objetivos de tus jugadores, registra entrenamientos y visualiza su progreso.
            </p>
        </header>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Botón Crear Academia */}
          <button 
            onClick={() => setIsCrearModalOpen(true)} 
            disabled={loading} 
            className="bg-app-surface p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group disabled:opacity-50"
          >
            <div className="text-center">
              <div className="mb-4 text-4xl">🎾</div>
              <h2 className="text-2xl font-semibold text-app-primary mb-2">Crear Academia</h2>
              <p className="text-app-secondary text-sm">Para clubes y academias de tenis con múltiples jugadores.</p>
            </div>
          </button>

          {/* Botón Crear Grupo de Entrenamiento */}
          <button 
            onClick={() => setIsCrearGrupoModalOpen(true)} 
            disabled={loading} 
            className="bg-app-surface p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group disabled:opacity-50"
          >
            <div className="text-center">
              <div className="mb-4 text-4xl">👥</div>
              <h2 className="text-2xl font-semibold text-app-primary mb-2">Crear Grupo Personal</h2>
              <p className="text-app-secondary text-sm">Para entrenadores personales (máx. 3 jugadores).</p>
              <span className="inline-block mt-2 text-xs bg-app-accent/10 text-app-accent px-2 py-1 rounded">
                Ideal para entrenamiento personalizado
              </span>
            </div>
          </button>
          
          {/* Botón Ingresar/Unirse */}
          <button 
            onClick={() => setIsIngresarModalOpen(true)} 
            disabled={loading} 
            className="bg-app-surface p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group disabled:opacity-50"
          >
            <div className="text-center">
              <div className="mb-4 text-4xl">🔗</div>
              <h2 className="text-2xl font-semibold text-app-primary mb-2">Unirse</h2>
              <p className="text-app-secondary text-sm">Ingresa con el nombre y ID de una academia o grupo existente.</p>
            </div>
          </button>
        </div>

        {/* Sección para mostrar las academias y grupos del usuario */}
        {misAcademias && misAcademias.length > 0 && (
          <div className="bg-app-surface p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-semibold text-app-accent mb-4">Mis Espacios de Entrenamiento</h2>
            <div className="space-y-3">
              {misAcademias.map((academia) => (
                <button 
                  key={academia.academiaId} 
                  onClick={() => handleSeleccionarAcademia(academia)} 
                  disabled={loading} 
                  className="w-full text-left p-4 bg-app-surface-alt rounded-lg hover:bg-app-accent hover:text-white transition-colors group disabled:opacity-50 flex items-center justify-between"
                >
                  <div>
                    <h3 className="text-lg font-medium">{academia.nombre}</h3>
                    {academia.tipo === 'grupo-entrenamiento' && (
                      <span className="text-xs opacity-75">Grupo personal</span>
                    )}
                  </div>
                  {academia.tipo === 'grupo-entrenamiento' && (
                    <span className="text-2xl opacity-50">👥</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* --- Modales --- */}
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
          <input 
            type="text" 
            value={nombreNuevaAcademia} 
            onChange={(e) => setNombreNuevaAcademia(e.target.value)} 
            className="w-full p-3 app-input rounded-md" 
            placeholder="Nombre de tu Academia" 
            required 
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button 
            type="submit" 
            disabled={loading || !nombreNuevaAcademia.trim()} 
            className="w-full app-button btn-success py-3 disabled:opacity-50"
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
          <div className="bg-app-accent/10 p-4 rounded-lg mb-4">
            <p className="text-sm text-app-accent font-medium">👥 Grupo Personal</p>
            <p className="text-xs text-app-secondary mt-1">
              Perfecto para entrenadores personales. Límite de 3 jugadores para mantener 
              un enfoque personalizado en el desarrollo de cada alumno.
            </p>
          </div>
          <input 
            type="text" 
            value={nombreNuevoGrupo} 
            onChange={(e) => setNombreNuevoGrupo(e.target.value)} 
            className="w-full p-3 app-input rounded-md" 
            placeholder="Nombre de tu Grupo (ej: Entrenamiento Elite)" 
            required 
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button 
            type="submit" 
            disabled={loading || !nombreNuevoGrupo.trim()} 
            className="w-full app-button btn-success py-3 disabled:opacity-50"
          >
            {loading ? 'Creando...' : 'Crear Grupo Personal'}
          </button>
        </form>
      </Modal>

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
          <div>
            <label className="block text-sm font-medium text-app-secondary mb-1">
              ID de la Academia/Grupo
            </label>
            <input 
              type="text" 
              value={idIngreso} 
              onChange={(e) => setIdIngreso(e.target.value.toUpperCase())} 
              className="w-full p-3 app-input rounded-md font-mono text-lg tracking-wider" 
              placeholder="Ej: ABC123" 
              maxLength={6} 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-app-secondary mb-1">
              Nombre exacto
            </label>
            <input 
              type="text" 
              value={nombreIngreso} 
              onChange={(e) => setNombreIngreso(e.target.value)} 
              className="w-full p-3 app-input rounded-md" 
              placeholder="Nombre completo de la academia o grupo" 
              required 
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button 
            type="submit" 
            disabled={loading || !nombreIngreso.trim() || !idIngreso.trim()} 
            className="w-full app-button btn-primary py-3 disabled:opacity-50"
          >
            {loading ? 'Buscando...' : 'Ingresar'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default AcademiaSelectPage;