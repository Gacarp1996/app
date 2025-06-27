import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAcademia } from '../contexts/AcademiaContext';
import { crearAcademia, buscarAcademiaPorIdYNombre, obtenerAcademiaPorId } from '../Database/FirebaseAcademias';
import Modal from '../components/Modal';

const AcademiaSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { misAcademias, setAcademiaActual, registrarAccesoAcademia } = useAcademia();
  
  const [isCrearModalOpen, setIsCrearModalOpen] = useState(false);
  const [isIngresarModalOpen, setIsIngresarModalOpen] = useState(false);
  const [nombreNuevaAcademia, setNombreNuevaAcademia] = useState('');
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
      const academiaId = await crearAcademia(nombreNuevaAcademia.trim(), currentUser.uid);
      const academiaData = await obtenerAcademiaPorId(academiaId);
      
      if (academiaData) {
        await registrarAccesoAcademia(academiaId, academiaData.nombre);
        
        // Mostrar el ID antes de redirigir
        alert(`¡Academia creada exitosamente!\n\nNombre: ${academiaData.nombre}\nID: ${academiaData.id}\n\nGuarda este ID para que otros puedan unirse.`);
        
        setAcademiaActual(academiaData as any);
        navigate('/');
      }
    } catch (error) {
      setError('Error al crear la academia');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleIngresarAcademia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreIngreso.trim() || !idIngreso.trim()) return;

    setLoading(true);
    setError('');

    try {
      const academia = await buscarAcademiaPorIdYNombre(idIngreso.trim(), nombreIngreso.trim());
      
      if (academia) {
        await registrarAccesoAcademia(academia.id, academia.nombre);
        setAcademiaActual(academia as any);
        navigate('/');
      } else {
        setError('No se encontró una academia con esos datos');
      }
    } catch (error) {
      setError('Error al buscar la academia');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeleccionarAcademia = async (academiaId: string) => {
    setLoading(true);
    try {
      const academia = await obtenerAcademiaPorId(academiaId);
      if (academia) {
        setAcademiaActual(academia as any);
        await registrarAccesoAcademia(academiaId, academia.nombre);
        navigate('/');
      }
    } catch (error) {
      console.error('Error al cargar academia:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl font-bold text-app-accent text-center mb-8">
          Selecciona una Academia
        </h1>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={() => setIsCrearModalOpen(true)}
            className="bg-app-surface p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
          >
            <div className="text-center">
              <div className="mb-4 text-app-accent">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-app-primary mb-2">Crear Academia</h2>
              <p className="text-app-secondary">Crea una nueva academia y conviértete en director</p>
            </div>
          </button>

          <button
            onClick={() => setIsIngresarModalOpen(true)}
            className="bg-app-surface p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
          >
            <div className="text-center">
              <div className="mb-4 text-app-accent">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-app-primary mb-2">Ingresar a Academia</h2>
              <p className="text-app-secondary">Únete a una academia existente con su ID</p>
            </div>
          </button>
        </div>

        {misAcademias.length > 0 && (
          <div className="bg-app-surface p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-semibold text-app-accent mb-4">Mis Academias</h2>
            <div className="space-y-3">
              {misAcademias.map((academia) => (
                <button
                  key={academia.academiaId}
                  onClick={() => handleSeleccionarAcademia(academia.academiaId)}
                  disabled={loading}
                  className="w-full text-left p-4 bg-app-surface-alt rounded-lg hover:bg-app-accent hover:text-white transition-colors group"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-grow">
                      <h3 className="text-lg font-medium">{academia.nombre}</h3>
                      <p className="text-sm opacity-70">
                        ID: <span className="font-mono font-bold">{academia.academiaId || 'Cargando...'}</span> • 
                        Último acceso: {new Date(academia.ultimoAcceso).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal Crear Academia */}
      <Modal isOpen={isCrearModalOpen} onClose={() => setIsCrearModalOpen(false)} title="Crear Nueva Academia">
        <form onSubmit={handleCrearAcademia} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-app-secondary mb-2">
              Nombre de la Academia
            </label>
            <input
              type="text"
              value={nombreNuevaAcademia}
              onChange={(e) => setNombreNuevaAcademia(e.target.value)}
              className="w-full p-3 app-input rounded-md"
              placeholder="Ej: Academia Rafa Nadal"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full app-button btn-success py-3"
          >
            {loading ? 'Creando...' : 'Crear Academia'}
          </button>
        </form>
      </Modal>

      {/* Modal Ingresar Academia */}
      <Modal isOpen={isIngresarModalOpen} onClose={() => setIsIngresarModalOpen(false)} title="Ingresar a Academia">
        <form onSubmit={handleIngresarAcademia} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-app-secondary mb-2">
              Nombre de la Academia
            </label>
            <input
              type="text"
              value={nombreIngreso}
              onChange={(e) => setNombreIngreso(e.target.value)}
              className="w-full p-3 app-input rounded-md"
              placeholder="Nombre exacto de la academia"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-app-secondary mb-2">
              ID de la Academia
            </label>
            <input
              type="text"
              value={idIngreso}
              onChange={(e) => setIdIngreso(e.target.value.toUpperCase())}
              className="w-full p-3 app-input rounded-md font-mono"
              placeholder="Ej: ABC123"
              maxLength={6}
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full app-button btn-primary py-3"
          >
            {loading ? 'Buscando...' : 'Ingresar'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default AcademiaSelectPage;