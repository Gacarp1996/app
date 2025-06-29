import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAcademia } from '../contexts/AcademiaContext';
import Modal from '../components/Modal';
import { crearAcademia, buscarAcademiaPorIdYNombre, obtenerAcademiaPorId } from '../Database/FirebaseAcademias';

const AcademiaSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth(); 
  const { setAcademiaActual, misAcademias, registrarAccesoAcademia } = useAcademia();

  const [isCrearModalOpen, setIsCrearModalOpen] = useState(false);
  const [isIngresarModalOpen, setIsIngresarModalOpen] = useState(false);
  const [nombreNuevaAcademia, setNombreNuevaAcademia] = useState('');
  const [nombreIngreso, setNombreIngreso] = useState('');
  const [idIngreso, setIdIngreso] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [solicitudEnviada, setSolicitudEnviada] = useState(false);

  const handleCrearAcademia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreNuevaAcademia.trim() || !currentUser) return;
    setLoading(true);
    setError('');

    try {
      // Crear la academia en Firebase
      const academiaId = await crearAcademia(nombreNuevaAcademia.trim(), currentUser.uid);
      
      // Obtener la academia completa
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
    }
  };

  const handleEnviarSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreIngreso.trim() || !idIngreso.trim() || !currentUser) return;
    setLoading(true);
    setError('');

    try {
      // Buscar la academia con el ID y nombre proporcionados
      const academiaEncontrada = await buscarAcademiaPorIdYNombre(idIngreso.trim(), nombreIngreso.trim());
      
      if (academiaEncontrada) {
        // Por ahora, simplemente registrar el acceso
        // En el futuro, aquí se crearía una solicitud real
        await setAcademiaActual(academiaEncontrada);
        await registrarAccesoAcademia(academiaEncontrada.id, academiaEncontrada.nombre);
        navigate('/');
      } else {
        setError('No se encontró una academia con esos datos.');
      }
    } catch (error) {
      console.error('Error buscando academia:', error);
      setError('Error al buscar la academia. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSeleccionarAcademia = async (academia: any) => {
    setLoading(true);
    try {
      // Obtener la academia completa desde Firebase
      const academiaCompleta = await obtenerAcademiaPorId(academia.academiaId);
      
      if (academiaCompleta) {
        await setAcademiaActual(academiaCompleta);
        await registrarAccesoAcademia(academia.academiaId, academia.nombre);
        navigate('/');
      } else {
        alert('No se pudo cargar la academia. Intenta de nuevo.');
      }
    } catch (error) {
      console.error('Error seleccionando academia:', error);
      alert('Error al seleccionar la academia.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-bold text-app-accent text-center mb-8">
          Selecciona o únete a una Academia
        </h1>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Botón Crear Academia */}
          <button 
            onClick={() => setIsCrearModalOpen(true)} 
            disabled={loading} 
            className="bg-app-surface p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group disabled:opacity-50"
          >
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-app-primary mb-2">Crear Academia</h2>
              <p className="text-app-secondary">Crea una nueva academia y conviértete en director.</p>
            </div>
          </button>
          
          {/* Botón Ingresar/Unirse a Academia */}
          <button 
            onClick={() => setIsIngresarModalOpen(true)} 
            disabled={loading} 
            className="bg-app-surface p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group disabled:opacity-50"
          >
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-app-primary mb-2">Unirse a Academia</h2>
              <p className="text-app-secondary">Ingresa con el nombre y ID de una academia existente.</p>
            </div>
          </button>
        </div>

        {/* Sección para mostrar las academias del usuario */}
        {misAcademias && misAcademias.length > 0 && (
          <div className="bg-app-surface p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-semibold text-app-accent mb-4">Mis Academias</h2>
            <div className="space-y-3">
              {misAcademias.map((academia) => (
                <button 
                  key={academia.academiaId} 
                  onClick={() => handleSeleccionarAcademia(academia)} 
                  disabled={loading} 
                  className="w-full text-left p-4 bg-app-surface-alt rounded-lg hover:bg-app-accent hover:text-white transition-colors group disabled:opacity-50"
                >
                  <h3 className="text-lg font-medium">{academia.nombre}</h3>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mensaje temporal sobre solicitudes */}
        {solicitudEnviada && (
          <div className="bg-blue-500/10 p-6 rounded-lg text-center mt-6">
            <p className="text-app-secondary">
              Nota: El sistema de solicitudes aún no está implementado. 
              Por ahora, puedes acceder directamente con el nombre y ID correctos.
            </p>
          </div>
        )}
      </div>

      {/* --- Modales --- */}
      <Modal 
        isOpen={isCrearModalOpen} 
        onClose={() => {
          setIsCrearModalOpen(false);
          setError('');
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

      <Modal 
        isOpen={isIngresarModalOpen} 
        onClose={() => {
          setIsIngresarModalOpen(false); 
          setError('');
        }} 
        title="Ingresar a Academia"
      >
        <form onSubmit={handleEnviarSolicitud} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-app-secondary mb-1">
              ID de la Academia
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
              Nombre exacto de la Academia
            </label>
            <input 
              type="text" 
              value={nombreIngreso} 
              onChange={(e) => setNombreIngreso(e.target.value)} 
              className="w-full p-3 app-input rounded-md" 
              placeholder="Nombre completo de la academia" 
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