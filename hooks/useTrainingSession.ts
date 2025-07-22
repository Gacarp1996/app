import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player, Objective, TrainingSession, Tournament, LoggedExercise } from '../types';
import { useTraining, SessionExercise } from '../contexts/TrainingContext';
<<<<<<< Updated upstream
import { addSession } from '../Database/FirebaseSessions';
=======
import { useAuth } from '../contexts/AuthContext';
import { useAcademia } from '../contexts/AcademiaContext';
import { addSession, updateSession } from '../Database/FirebaseSessions';
>>>>>>> Stashed changes
import { addPostTrainingSurvey, checkSurveyExists } from '../Database/FirebaseSurveys';
import { NEW_EXERCISE_HIERARCHY_MAPPING } from '../constants';
import { useExerciseOptions } from './useExerciseOptions';

interface UseTrainingSessionProps {
  allPlayers: Player[];
  allObjectives: Objective[];
  allTournaments: Tournament[];
  onDataChange: () => void;
  academiaId: string;
  editSessionId?: string | null; // ID de sesión a editar
  originalSession?: TrainingSession | null; // Sesión original
}

export const useTrainingSession = ({
  allPlayers,
  allObjectives,
  allTournaments,
  onDataChange,
  academiaId,
  editSessionId,
  originalSession
}: UseTrainingSessionProps) => {
  const navigate = useNavigate();
<<<<<<< Updated upstream
=======
  const { currentUser } = useAuth();
  const { academiaActual } = useAcademia();
>>>>>>> Stashed changes
  const { participants, setParticipants, exercises, addExercise, endSession, loadSession } = useTraining();

  // Estados
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode] = useState(!!editSessionId);
  const [activePlayerIds, setActivePlayerIds] = useState<Set<string>>(new Set(participants.map(p => p.id)));
  const [isObjectiveModalOpen, setIsObjectiveModalOpen] = useState(false);
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
  const modalOpenedOnceRef = useRef(false);
  
  // Estados del formulario de ejercicio
  const [currentTipoKey, setCurrentTipoKey] = useState<string>('');
  const [currentAreaKey, setCurrentAreaKey] = useState<string>('');
  const [currentEjercicioName, setCurrentEjercicioName] = useState<string>('');
  const [tiempoCantidad, setTiempoCantidad] = useState<string>('');
  const [intensidad, setIntensidad] = useState<number>(5);
  
  // Cargar observaciones desde la sesión original si estamos editando
  const [observaciones, setObservaciones] = useState(
    originalSession?.observaciones || ''
  );
  
<<<<<<< Updated upstream
=======
  // Estados para ejercicios específicos
  const [specificExercises, setSpecificExercises] = useState<SpecificExercise[]>([]);
  const [isAddSpecificExerciseModalOpen, setIsAddSpecificExerciseModalOpen] = useState(false);

>>>>>>> Stashed changes
  // Estados para las encuestas post-entrenamiento
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [currentSurveyPlayerIndex, setCurrentSurveyPlayerIndex] = useState(0);
  const [pendingSurveyPlayers, setPendingSurveyPlayers] = useState<Player[]>([]);
  const [sessionIds, setSessionIds] = useState<Map<string, string>>(new Map());
  const [askForSurveys, setAskForSurveys] = useState(true);

  // Hook para las opciones de ejercicio
  const { availableTipoKeys, availableAreaKeys, availableEjercicioNames } = useExerciseOptions(currentTipoKey, currentAreaKey);

  // Valores computados
  const playerNamesDisplay = useMemo(() => participants.map(p => p.name).join(', '), [participants]);
  const singleActivePlayer = useMemo(() => 
    (activePlayerIds.size === 1) ? participants.find(p => p.id === Array.from(activePlayerIds)[0]) : null, 
    [activePlayerIds, participants]
  );
  const objectivesForSingleActivePlayer = useMemo(() => 
    singleActivePlayer 
      ? allObjectives.filter(obj => obj.jugadorId === singleActivePlayer.id && obj.estado === 'actual-progreso') 
      : [], 
    [singleActivePlayer, allObjectives]
  );

  // Cargar ejercicios específicos del localStorage
  useEffect(() => {
    const savedSpecificExercises = localStorage.getItem(`specificExercises_${academiaId}`);
    if (savedSpecificExercises) {
      try {
        setSpecificExercises(JSON.parse(savedSpecificExercises));
      } catch (error) {
        console.error('Error loading specific exercises from localStorage:', error);
      }
    }
  }, [academiaId]);

  // Guardar ejercicios específicos en localStorage cuando cambien
  useEffect(() => {
    if (specificExercises.length > 0) {
      localStorage.setItem(`specificExercises_${academiaId}`, JSON.stringify(specificExercises));
    }
  }, [specificExercises, academiaId]);

  // Effect para cargar datos de sesión en modo edición
  useEffect(() => {
    if (isEditMode && originalSession && originalSession.ejercicios.length > 0) {
      // Convertir ejercicios de la sesión original al formato del contexto
      const exercisesForContext = originalSession.ejercicios.map(ex => ({
        ...ex,
        id: crypto.randomUUID(), // Generar nuevo ID para el contexto
        loggedForPlayerId: originalSession.jugadorId,
        loggedForPlayerName: allPlayers.find(p => p.id === originalSession.jugadorId)?.name || 'Jugador'
      }));
      
      // Cargar en el contexto sin llamar a loadSession
      exercisesForContext.forEach(exercise => {
        addExercise(exercise as SessionExercise);
      });
    }
  }, [isEditMode, originalSession, allPlayers, addExercise]);

  // Effects
  useEffect(() => {
    if (participants.length === 0) {
      const loaded = loadSession();
      if (!loaded) {
        navigate('/start-training');
      } else {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [participants.length, loadSession, navigate]);

  useEffect(() => {
    setActivePlayerIds(new Set(participants.map(p => p.id)));
    if (participants.length > 0 && !modalOpenedOnceRef.current && !isEditMode) {
      // Solo abrir modal automáticamente en modo creación, no en edición
      setIsObjectiveModalOpen(true);
      modalOpenedOnceRef.current = true;
    }
  }, [participants, isEditMode]);

  // Handlers para jugadores
  const handlePlayerToggleActive = (playerId: string) => {
    const newSelection = new Set(activePlayerIds);
    newSelection.has(playerId) ? newSelection.delete(playerId) : newSelection.add(playerId);
    setActivePlayerIds(newSelection);
  };

  const toggleSelectAllPlayers = () => {
    if (activePlayerIds.size === participants.length) {
      setActivePlayerIds(new Set());
    } else {
      setActivePlayerIds(new Set(participants.map(p => p.id)));
    }
  };

  const handleAddParticipant = (player: Player) => setParticipants(prev => [...prev, player]);
  const handleRemoveParticipant = (playerId: string) => setParticipants(prev => prev.filter(p => p.id !== playerId));

  // Handlers para el formulario de ejercicio
  const handleTipoChange = (value: string) => {
    setCurrentTipoKey(value);
    setCurrentAreaKey('');
    setCurrentEjercicioName('');
  };

  const handleAreaChange = (value: string) => {
    setCurrentAreaKey(value);
    setCurrentEjercicioName('');
  };

  const handleAddExerciseToSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTipoKey || !currentAreaKey || !currentEjercicioName || !tiempoCantidad || activePlayerIds.size === 0) {
      alert('Por favor, completa todos los campos y selecciona al menos un jugador.');
      return;
    }
    activePlayerIds.forEach(playerId => {
      const player = participants.find(p => p.id === playerId);
      if (player) {
        const newExercise: SessionExercise = {
          id: crypto.randomUUID(),
          tipo: NEW_EXERCISE_HIERARCHY_MAPPING.TYPE_MAP[currentTipoKey],
          area: NEW_EXERCISE_HIERARCHY_MAPPING.AREA_MAP[currentAreaKey],
          ejercicio: currentEjercicioName,
          tiempoCantidad,
          intensidad,
          loggedForPlayerId: player.id,
          loggedForPlayerName: player.name,
        };
        addExercise(newExercise);
      }
    });
    setCurrentEjercicioName('');
    setTiempoCantidad('');
    setIntensidad(5);
  };

  // Handler principal para finalizar entrenamiento
  const handleFinishTraining = async () => {
    if (exercises.length === 0 && !window.confirm("No has registrado ningún ejercicio. ¿Deseas finalizar de todas formas?")) return;
    
<<<<<<< Updated upstream
    const sessionIdsMap = new Map<string, string>();
=======
    if (!currentUser) {
      alert('Error: No se puede identificar al entrenador. Por favor, inicia sesión nuevamente.');
      return;
    }

    if (isEditMode && originalSession) {
      // MODO EDICIÓN: Actualizar sesión existente
      await handleUpdateExistingSession();
    } else {
      // MODO CREACIÓN: Crear nueva sesión (lógica original)
      await handleCreateNewSession();
    }
  };

  // Función para actualizar sesión existente
  const handleUpdateExistingSession = async () => {
    if (!originalSession || !currentUser || !academiaActual) {
      alert('Error: Faltan datos necesarios para actualizar la sesión.');
      return;
    }

    try {
      // Preparar ejercicios actualizados
      const updatedExercises = exercises
        .filter(ex => ex.loggedForPlayerId === originalSession.jugadorId)
        .map(({ loggedForPlayerId, loggedForPlayerName, ...rest }) => rest as LoggedExercise);

      // Actualizar sesión existente
      const updatedSession: Partial<Omit<TrainingSession, "id">> = {
        ejercicios: updatedExercises,
        observaciones: observaciones.trim(),
        // Mantener fecha original y otros datos
        entrenadorId: currentUser.uid
      };

      // Llamar a función de actualización (usando tu función existente)
      await updateSession(academiaActual.id, originalSession.id, updatedSession);
      
      alert('Entrenamiento actualizado exitosamente');
      onDataChange();
      endSession();
      
      // Volver al perfil del jugador
      const player = allPlayers.find(p => p.id === originalSession.jugadorId);
      if (player) {
        navigate(`/player/${player.id}`);
      } else {
        navigate('/players');
      }
    } catch (error) {
      console.error('Error actualizando sesión:', error);
      alert('Error al actualizar el entrenamiento');
    }
  };

  // Función para crear nueva sesión (lógica original separada)
  const handleCreateNewSession = async () => {
    if (!currentUser) {
      alert('Error: No se puede identificar al entrenador. Por favor, inicia sesión nuevamente.');
      return;
    }

    // Preparar las sesiones pero NO guardarlas todavía
>>>>>>> Stashed changes
    const sessionsToSave: Omit<TrainingSession, 'id'>[] = participants.map(player => {
      const playerExercises = exercises.filter(ex => ex.loggedForPlayerId === player.id)
        .map(({ loggedForPlayerId, loggedForPlayerName, ...rest }) => rest as LoggedExercise);
      
      return { 
        jugadorId: player.id, 
<<<<<<< Updated upstream
=======
        entrenadorId: currentUser.uid,
>>>>>>> Stashed changes
        fecha: new Date().toISOString(), 
        ejercicios: playerExercises,
        observaciones: observaciones.trim()
      };
    }).filter(session => session.ejercicios.length > 0 || (session.observaciones && session.observaciones.length > 0));

    if (sessionsToSave.length > 0) {
      // Guardar las sesiones y almacenar los IDs generados
      for (const session of sessionsToSave) {
        try {
          const sessionId = await addSession(academiaId, session);
          if (sessionId) {
            sessionIdsMap.set(session.jugadorId, sessionId);
          }
        } catch (error) {
          console.error('Error guardando sesión:', error);
        }
      }
      
      setSessionIds(sessionIdsMap);
      
      // Preguntar si quieren hacer las encuestas
      if (askForSurveys && sessionsToSave.length > 0) {
        const wantsSurveys = window.confirm(
          `Entrenamiento guardado para ${sessionsToSave.length} jugador(es).\n\n` +
          `¿Deseas completar las encuestas post-entrenamiento?\n\n` +
          `(Esto ayuda a monitorear el estado físico y mental de los jugadores)`
        );
        
        if (wantsSurveys) {
          // Preparar jugadores para encuestas
          const playersWithSessions = participants.filter(p => sessionIdsMap.has(p.id));
          setPendingSurveyPlayers(playersWithSessions);
          setCurrentSurveyPlayerIndex(0);
          setIsSurveyModalOpen(true);
          return; // No navegar todavía, esperar a que terminen las encuestas
        }
      }
      
      alert(`Entrenamiento finalizado y guardado para ${sessionsToSave.length} jugador(es).`);
      onDataChange();
    } else {
      alert("Entrenamiento finalizado. No se guardaron datos nuevos.");
<<<<<<< Updated upstream
    }

=======
      endSession();
      navigate('/players');
    }
  };

  // Función helper para guardar sesiones directamente
  const saveSessionsDirectly = async (sessionsToSave: Omit<TrainingSession, 'id'>[]) => {
    if (!currentUser || !academiaActual) {
      alert('Error: No se puede identificar al entrenador. Por favor, inicia sesión nuevamente.');
      return;
    }

    const sessionIdsMap = new Map<string, string>();
    
    for (const session of sessionsToSave) {
      try {
        const sessionWithTrainer = {
          ...session,
          entrenadorId: currentUser.uid
        };
        
        const sessionId = await addSession(academiaActual.id, sessionWithTrainer);
        if (sessionId) {
          sessionIdsMap.set(session.jugadorId, sessionId);
        }
      } catch (error) {
        console.error('Error guardando sesión:', error);
      }
    }
    
    setSessionIds(sessionIdsMap);
    alert(`Entrenamiento finalizado y guardado para ${sessionsToSave.length} jugador(es).`);
    onDataChange();
>>>>>>> Stashed changes
    endSession();
    navigate('/players');
  };

  // Handler para encuestas
  const handleSurveySubmit = async (playerId: string, responses: {
    cansancioFisico: number;
    concentracion: number;
    actitudMental: number;
    sensacionesTenisticas: number;
  }) => {
    try {
<<<<<<< Updated upstream
      const sessionId = sessionIds.get(playerId);
=======
      if (!currentUser || !academiaActual) {
        alert('Error: No se puede identificar al entrenador. Por favor, inicia sesión nuevamente.');
        return;
      }

      let currentSessionIds = sessionIds;
      
      // Si es la primera encuesta, necesitamos guardar las sesiones primero
      if (currentSessionIds.size === 0) {
        const sessionIdsMap = new Map<string, string>();
        
        for (const session of pendingSessionsToSave) {
          try {
            const sessionWithTrainer = {
              ...session,
              entrenadorId: currentUser.uid
            };
            
            const sessionId = await addSession(academiaActual.id, sessionWithTrainer);
            if (sessionId) {
              sessionIdsMap.set(session.jugadorId, sessionId);
            }
          } catch (error) {
            console.error('Error guardando sesión:', error);
          }
        }
        
        setSessionIds(sessionIdsMap);
        currentSessionIds = sessionIdsMap;
      }

      // Ahora guardar la encuesta
      const sessionId = currentSessionIds.get(playerId);
>>>>>>> Stashed changes
      if (!sessionId) {
        console.error('No se encontró sessionId para el jugador:', playerId);
        return;
      }

      const surveyDate = new Date();
      const surveyExists = await checkSurveyExists(academiaActual.id, playerId, surveyDate);
      if (surveyExists) {
        console.log('Ya existe una encuesta para este jugador/sesión hoy');
      } else {
<<<<<<< Updated upstream
        await addPostTrainingSurvey(academiaId, {
=======
        // Filtrar solo las respuestas válidas (no undefined)
        const validResponses: any = {};
        Object.entries(responses).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            validResponses[key] = value;
          }
        });

        await addPostTrainingSurvey(academiaActual.id, {
>>>>>>> Stashed changes
          jugadorId: playerId,
          sessionId: sessionId,
          fecha: surveyDate.toISOString(),
          ...responses
        });
      }
      
      // Avanzar al siguiente jugador
      if (currentSurveyPlayerIndex < pendingSurveyPlayers.length - 1) {
        setCurrentSurveyPlayerIndex(prev => prev + 1);
      } else {
        // Todas las encuestas completadas
        setIsSurveyModalOpen(false);
        alert(`¡Excelente! Encuestas guardadas para ${pendingSurveyPlayers.length} jugador(es).`);
        onDataChange();
        endSession();
        navigate('/players');
      }
    } catch (error) {
      console.error('Error guardando encuesta:', error);
      alert('Error al guardar la encuesta. Intenta de nuevo.');
    }
  };

  const handleCloseSurveyModal = () => {
    if (window.confirm('¿Estás seguro de salir sin completar las encuestas?')) {
      setIsSurveyModalOpen(false);
      onDataChange();
      endSession();
      navigate('/players');
    }
  };

  return {
    // Estados
    isLoading,
    participants,
    exercises,
    activePlayerIds,
    isObjectiveModalOpen,
    isParticipantModalOpen,
    isSurveyModalOpen,
    currentSurveyPlayerIndex,
    pendingSurveyPlayers,
    askForSurveys,
    observaciones,
    
    // Estados de modo edición
    isEditMode,
    originalSession,
    
    // Estados del formulario
    currentTipoKey,
    currentAreaKey,
    currentEjercicioName,
    tiempoCantidad,
    intensidad,
    
    // Opciones disponibles
    availableTipoKeys,
    availableAreaKeys,
    availableEjercicioNames,
    
    // Valores computados
    playerNamesDisplay,
    singleActivePlayer,
    objectivesForSingleActivePlayer,
    
    // Setters para modales
    setIsObjectiveModalOpen,
    setIsParticipantModalOpen,
    setAskForSurveys,
    setObservaciones,
    
    // Setters del formulario
    setCurrentEjercicioName,
    setTiempoCantidad,
    setIntensidad,
    
    // Handlers
    handlePlayerToggleActive,
    toggleSelectAllPlayers,
    handleAddParticipant,
    handleRemoveParticipant,
    handleTipoChange,
    handleAreaChange,
    handleAddExerciseToSession,
    handleFinishTraining,
    handleSurveySubmit,
    handleCloseSurveyModal,
    
    // Props para componentes
    allPlayers,
    allObjectives,
    allTournaments,
  };
};