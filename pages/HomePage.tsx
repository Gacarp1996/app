import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAcademia } from '../contexts/AcademiaContext';
import { db } from '../firebase/firebase-config';
import { collection, getDocs, query } from 'firebase/firestore';

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
    return <div className="text-center py-20">Cargando...</div>;
  }

  return (
    <div className="text-center">
      <header className="py-12">
        {hasPlayers ? (
          <>
            <h1 className="text-5xl font-bold text-app-accent mb-4">Continúa el gran trabajo</h1>
            <p className="text-xl text-app-secondary max-w-2xl mx-auto">
              Revisa el progreso de tus jugadores o inicia un nuevo entrenamiento.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-5xl font-bold text-app-accent mb-4">¿Listo para empezar?</h1>
            <p className="text-xl text-app-secondary max-w-2xl mx-auto">
              Comienza a cargar jugadores y llevar el registro de tus entrenamientos.
            </p>
          </>
        )}
      </header>

      {/* Acciones Principales (sin cambios) */}
      <section className="mt-12 grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        <Link
          to="/start-training"
          className="app-button btn-success text-white py-6 px-8 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 flex flex-col items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
          </svg>
          <span className="text-2xl">Comenzar Entrenamiento</span>
        </Link>
        <Link
          to="/players"
          className="app-button btn-primary text-white py-6 px-8 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 flex flex-col items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
          </svg>
          <span className="text-2xl">Ver Jugadores</span>
        </Link>
      </section>

      {/* Guía Rápida (sin cambios) */}
      <section className="mt-16 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-app-accent mb-6">Guía Rápida</h2>
        <div className="grid md:grid-cols-3 gap-6 text-left">
          <div className="bg-app-surface p-6 rounded-lg shadow-lg border-t-4 border-app-primary">
            <div className="flex items-center mb-3">
                <span className="bg-app-primary text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg mr-3">1</span>
                <h3 className="text-xl font-semibold">Crea Jugadores</h3>
            </div>
            <p className="text-app-secondary">Ve a la sección de "Ver Jugadores" y añade a tus atletas.</p>
          </div>
          <div className="bg-app-surface p-6 rounded-lg shadow-lg border-t-4 border-app-accent">
            <div className="flex items-center mb-3">
                <span className="bg-app-accent text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg mr-3">2</span>
                <h3 className="text-xl font-semibold">Define Objetivos</h3>
            </div>
            <p className="text-app-secondary">Define metas para cada jugador y sigue su evolución desde "Actuales" hasta que los consideres "Incorporados".</p>
          </div>
          <div className="bg-app-surface p-6 rounded-lg shadow-lg border-t-4 border-app-success">
            <div className="flex items-center mb-3">
                <span className="bg-app-success text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg mr-3">3</span>
                <h3 className="text-xl font-semibold">Registra Entrenamientos</h3>
            </div>
            <p className="text-app-secondary">Inicia un entrenamiento, selecciona a los participantes y registra los ejercicios realizados.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;