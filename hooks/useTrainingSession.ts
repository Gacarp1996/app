import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player, TrainingSession, Tournament, LoggedExercise, SpecificExercise, SessionExercise } from '../types';
import { TipoType, AreaType, getAreasForTipo, getEjerciciosForTipoArea } from '../constants/training';
import { useTraining } from '../contexts/TrainingContext';
import { useAuth } from '../contexts/AuthContext';
import { useAcademia } from '../contexts/AcademiaContext';
import { usePlayer } from '../contexts/PlayerContext';
import { useSession } from '../contexts/SessionContext';
import { useObjective } from '../contexts/ObjectiveContext';
import { addPostTrainingSurvey } from '../Database/FirebaseSurveys';
import { getEnabledSurveyQuestions } from '../Database/FirebaseAcademiaConfig';

interface UseTrainingSessionProps {
  allTournaments: Tournament[];
  editSessionId?: string | null;
  originalSession?: TrainingSession | null;
}

export const useTrainingSession = ({
  allTournaments,
  editSessionId,
  originalSession
}: UseTrainingSessionProps) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { academiaActual } = useAcademia();
  const { players: allPlayers, refreshPlayers } = usePlayer();
  const { objectives: allObjectives } = useObjective();
  
  const { 
    addSession: addSessionToContext,
    updateSession: updateSessionInContext,
    refreshSessions: refreshSessionsInContext 
  } = useSession();
  
  const { participants, setParticipants, exercises, addExercise, endSession, loadSession } = useTraining();
  const academiaId = academiaActual?.id || '';

  // Estados
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode] = useState(!!editSessionId);
  const [activePlayerIds, setActivePlayerIds] = useState<Set<string>>(new Set(participants.map(p => p.id)));
  const [isObjectiveModalOpen, setIsObjectiveModalOpen] = useState(false);
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
  const modalOpenedOnceRef = useRef(false);
  
  // Estados del formulario de ejercicio
  const [currentTipo, setCurrentTipo] = useState<TipoType | ''>('');
  const [currentArea, setCurrentArea] = useState<AreaType | ''>('');
  const [currentEjercicio, setCurrentEjercicio] = useState<string>('');
  const [currentEjercicioEspecifico, setCurrentEjercicioEspecifico] = useState<string>('');
  const [tiempoCantidad, setTiempoCantidad] = useState<string>('');
  const [intensidad, setIntensidad] = useState<number>(5);
  
  const [observaciones, setObservaciones] = useState(
    originalSession?.observaciones || ''
  );
  
  // Estados para ejercicios específicos
  const [specificExercises, setSpecificExercises] = useState<SpecificExercise[]>([]);
  const [isAddSpecificExerciseModalOpen, setIsAddSpecificExerciseModalOpen] = useState(false);

  // Estados para las encuestas post-entrenamiento
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [currentSurveyPlayerIndex, setCurrentSurveyPlayerIndex] = useState(0);
  const [pendingSurveyPlayers, setPendingSurveyPlayers] = useState<Player[]>([]);
  const [sessionIds, setSessionIds] = useState<Map<string, string>>(new Map());
  const [pendingSessionsToSave, setPendingSessionsToSave] = useState<Omit<TrainingSession, 'id'>[]>([]);
  const [askForSurveys, setAskForSurveys] = useState(true);
  const [enabledSurveyQuestions, setEnabledSurveyQuestions] = useState<string[]>(['cansancioFisico', 'concentracion', 'actitudMental', 'sensacionesTenisticas']);
  
  // Estados para los modales de confirmación de encuestas
  const [isSurveyConfirmationModalOpen, setIsSurveyConfirmationModalOpen] = useState(false);
  const [isSurveyExitConfirmModalOpen, setIsSurveyExitConfirmModalOpen] = useState(false);

  // Opciones disponibles basadas en la selección actual
  const availableTipos = useMemo(() => Object.values(TipoType), []);
  
  const availableAreas = useMemo(() => {
    if (!currentTipo) return [];
    return getAreasForTipo(currentTipo as TipoType);
  }, [currentTipo]);
  
  const availableEjercicios = useMemo(() => {
    if (!currentTipo || !currentArea) return [];
    return getEjerciciosForTipoArea(currentTipo as TipoType, currentArea as AreaType);
  }, [currentTipo, currentArea]);
  
  const availableSpecificExercises = useMemo(() => {
    if (!currentTipo || !currentArea || !currentEjercicio) {
      return [];
    }
    return specificExercises.filter(exercise => 
      exercise.tipo === currentTipo && 
      exercise.area === currentArea && 
      exercise.ejercicio === currentEjercicio
    );
  }, [specificExercises, currentTipo, currentArea, currentEjercicio]);

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
      const exercisesForContext = originalSession.ejercicios.map(ex => ({
        ...ex,
        id: crypto.randomUUID(),
        loggedForPlayerId: originalSession.jugadorId,
        loggedForPlayerName: allPlayers.find(p => p.id === originalSession.jugadorId)?.name || 'Jugador'
      }));
      
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
      setIsObjectiveModalOpen(true);
      modalOpenedOnceRef.current = true;
    }
  }, [participants, isEditMode]);

  // Cargar preguntas habilitadas de encuesta
  useEffect(() => {
    const loadEnabledQuestions = async () => {
      try {
        const questions = await getEnabledSurveyQuestions(academiaId);
        setEnabledSurveyQuestions(questions);
      } catch (error) {
        console.error('Error cargando preguntas habilitadas:', error);
      }
    };

    if (academiaId) {
      loadEnabledQuestions();
    }
  }, [academiaId]);

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
    setCurrentTipo(value as TipoType);
    setCurrentArea('');
    setCurrentEjercicio('');
    setCurrentEjercicioEspecifico('');
  };

  const handleAreaChange = (value: string) => {
    setCurrentArea(value as AreaType);
    setCurrentEjercicio('');
    setCurrentEjercicioEspecifico('');
  };

  const handleEjercicioChange = (value: string) => {
    setCurrentEjercicio(value);
    setCurrentEjercicioEspecifico('');
  };

  // Handlers para ejercicios específicos
  const handleAddSpecificExercise = () => {
    if (!currentTipo || !currentArea || !currentEjercicio) {
      alert('Por favor, selecciona tipo, área y ejercicio antes de crear un ejercicio específico.');
      return;
    }
    setIsAddSpecificExerciseModalOpen(true);
  };

  const handleSubmitSpecificExercise = (exerciseName: string) => {
    const newSpecificExercise: SpecificExercise = {
      id: crypto.randomUUID(),
      name: exerciseName,
      tipo: currentTipo as TipoType,
      area: currentArea as AreaType,
      ejercicio: currentEjercicio
    };
    
    setSpecificExercises(prev => [...prev, newSpecificExercise]);
    setCurrentEjercicioEspecifico(exerciseName);
  };

  const handleAddExerciseToSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTipo || !currentArea || !currentEjercicio || !tiempoCantidad || activePlayerIds.size === 0) {
      alert('Por favor, completa todos los campos y selecciona al menos un jugador.');
      return;
    }
    activePlayerIds.forEach(playerId => {
      const player = participants.find(p => p.id === playerId);
      if (player) {
        const newExercise: SessionExercise = {
          id: crypto.randomUUID(),
          tipo: currentTipo as TipoType,
          area: currentArea as AreaType,
          ejercicio: currentEjercicio,
          ejercicioEspecifico: currentEjercicioEspecifico || undefined,
          tiempoCantidad,
          intensidad,
          loggedForPlayerId: player.id,
          loggedForPlayerName: player.name,
        };
        addExercise(newExercise);
      }
    });
    setCurrentEjercicio('');
    setCurrentEjercicioEspecifico('');
    setTiempoCantidad('');
    setIntensidad(5);
  };

  // Función para guardar sesiones directamente (con useCallback)
  const saveSessionsDirectly = useCallback(async (sessionsToSave: Omit<TrainingSession, 'id'>[]) => {
    if (!currentUser || !academiaActual) {
      alert('Error: No se puede identificar al entrenador.');
      return;
    }

    // Guardar todas las sesiones en paralelo
    const sessionPromises = sessionsToSave.map(async (session) => {
      const sessionWithTrainer = {
        ...session,
        entrenadorId: currentUser.uid
      };
      
      try {
        const sessionId = await addSessionToContext(sessionWithTrainer);
        return { playerId: session.jugadorId, sessionId };
      } catch (error) {
        console.error('Error guardando sesión:', error);
        return null;
      }
    });

    // Esperar todas las promesas en paralelo
    const results = await Promise.all(sessionPromises);
    
    // Crear mapa de IDs
    const sessionIdsMap = new Map<string, string>();
    results.forEach(result => {
      if (result?.sessionId) {
        sessionIdsMap.set(result.playerId, result.sessionId);
      }
    });
    
    setSessionIds(sessionIdsMap);
    alert(`Entrenamiento finalizado y guardado para ${sessionsToSave.length} jugador(es).`);
    
    // ✅ LIMPIAR LA SESIÓN SOLO DESPUÉS DEL GUARDADO EXITOSO
    endSession();
    
    // Navegar
    navigate('/players');
    
    // Operaciones de actualización diferidas
    setTimeout(async () => {
      await refreshSessionsInContext();
      await refreshPlayers();
    }, 100);
    
  }, [currentUser, academiaActual, addSessionToContext, navigate, refreshSessionsInContext, refreshPlayers, endSession]);

  // Función para actualizar sesión existente (con useCallback)
  const handleUpdateExistingSession = useCallback(async () => {
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
        entrenadorId: currentUser.uid
      };

      // Actualizar sesión
      await updateSessionInContext(originalSession.id, updatedSession);
      
      alert('Entrenamiento actualizado exitosamente');
      
      // ✅ LIMPIAR LA SESIÓN SOLO DESPUÉS DE LA ACTUALIZACIÓN EXITOSA
      endSession();
      
      // Navegar inmediatamente
      const player = allPlayers.find(p => p.id === originalSession.jugadorId);
      navigate(player ? `/player/${player.id}` : '/players');
      
      // Operaciones de actualización diferidas
      setTimeout(async () => {
        await refreshSessionsInContext();
        await refreshPlayers();
      }, 100);
      
    } catch (error) {
      console.error('Error actualizando sesión:', error);
      alert('Error al actualizar el entrenamiento');
    }
  }, [originalSession, currentUser, academiaActual, exercises, observaciones, updateSessionInContext, allPlayers, navigate, refreshSessionsInContext, refreshPlayers, endSession]);

  // Handler principal para finalizar entrenamiento
  const handleFinishTraining = async () => {
    if (exercises.length === 0 && !window.confirm("No has registrado ningún ejercicio. ¿Deseas finalizar de todas formas?")) return;
    
    if (!currentUser) {
      alert('Error: No se puede identificar al entrenador. Por favor, inicia sesión nuevamente.');
      return;
    }

    if (isEditMode && originalSession) {
      await handleUpdateExistingSession();
    } else {
      await handleCreateNewSession();
    }
  };

  // Función para crear nueva sesión
  const handleCreateNewSession = async () => {
    if (!currentUser) {
      alert('Error: No se puede identificar al entrenador. Por favor, inicia sesión nuevamente.');
      return;
    }

    const sessionsToSave: Omit<TrainingSession, 'id'>[] = participants.map(player => {
      const playerExercises = exercises.filter(ex => ex.loggedForPlayerId === player.id)
        .map(({ loggedForPlayerId, loggedForPlayerName, ...rest }) => {
          const exercise: LoggedExercise = {
            id: rest.id || '',
            tipo: rest.tipo,
            area: rest.area,
            ejercicio: rest.ejercicio || '',
            ejercicioEspecifico: rest.ejercicioEspecifico,
            tiempoCantidad: rest.tiempoCantidad || '',
            intensidad: rest.intensidad || 1
          };
          return exercise;
        });
      
      return { 
        jugadorId: player.id, 
        entrenadorId: currentUser.uid,
        fecha: new Date().toISOString(), 
        ejercicios: playerExercises,
        observaciones: observaciones.trim() || ''
      };
    }).filter(session => session.ejercicios.length > 0 || (session.observaciones && session.observaciones.length > 0));

    setPendingSessionsToSave(sessionsToSave);

    if (sessionsToSave.length > 0) {
      if (askForSurveys) {
        const playersWithSessions = participants.filter(p => 
          sessionsToSave.some(session => session.jugadorId === p.id)
        );
        setPendingSurveyPlayers(playersWithSessions);
        setCurrentSurveyPlayerIndex(0);
        setIsSurveyConfirmationModalOpen(true);
        return;
      } else {
        await saveSessionsDirectly(sessionsToSave);
      }
    } else {
      alert("Entrenamiento finalizado. No se guardaron datos nuevos.");
      // NO limpiar la sesión aquí porque no se guardó nada
      navigate('/players');
    }
  };

  // Handler para encuestas (con useCallback)
  const handleSurveySubmit = useCallback(async (playerId: string, responses: {
    cansancioFisico?: number;
    concentracion?: number;
    actitudMental?: number;
    sensacionesTenisticas?: number;
  }) => {
    try {
      if (!currentUser || !academiaActual) {
        alert('Error: No se puede identificar al entrenador.');
        return;
      }

      let currentSessionIds = sessionIds;
      
      // Si es la primera encuesta, guardar todas las sesiones en paralelo
      if (currentSessionIds.size === 0) {
        const sessionPromises = pendingSessionsToSave.map(async (session) => {
          const sessionWithTrainer = {
            ...session,
            entrenadorId: currentUser.uid
          };
          
          try {
            const sessionId = await addSessionToContext(sessionWithTrainer);
            return { playerId: session.jugadorId, sessionId };
          } catch (error) {
            console.error('Error guardando sesión:', error);
            return null;
          }
        });

        const results = await Promise.all(sessionPromises);
        
        const sessionIdsMap = new Map<string, string>();
        results.forEach(result => {
          if (result?.sessionId) {
            sessionIdsMap.set(result.playerId, result.sessionId);
          }
        });
        
        setSessionIds(sessionIdsMap);
        currentSessionIds = sessionIdsMap;
      }

      // Guardar encuesta
      const sessionId = currentSessionIds.get(playerId);
      if (!sessionId) {
        console.error('No se encontró sessionId para el jugador:', playerId);
        return;
      }

      const validResponses: any = {};
      Object.entries(responses).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          validResponses[key] = value;
        }
      });

      await addPostTrainingSurvey(academiaActual.id, {
        jugadorId: playerId,
        sessionId: sessionId,
        fecha: new Date().toISOString(),
        ...validResponses
      });
      
      console.log('Encuesta guardada exitosamente');
      
      // Avanzar al siguiente jugador
      if (currentSurveyPlayerIndex < pendingSurveyPlayers.length - 1) {
        setCurrentSurveyPlayerIndex(prev => prev + 1);
      } else {
        // ✅ TODAS LAS ENCUESTAS COMPLETADAS - LIMPIAR LA SESIÓN
        setIsSurveyModalOpen(false);
        
        // Limpiar la sesión solo después de completar todas las encuestas
        endSession();
        
        navigate('/players');
        
        // Operaciones de actualización diferidas
        setTimeout(async () => {
          await refreshSessionsInContext();
          await refreshPlayers();
        }, 100);
      }
    } catch (error) {
      console.error('Error guardando encuesta:', error);
      alert('Error al guardar la encuesta. Intenta de nuevo.');
    }
  }, [currentUser, academiaActual, sessionIds, pendingSessionsToSave, addSessionToContext, currentSurveyPlayerIndex, pendingSurveyPlayers.length, navigate, refreshSessionsInContext, refreshPlayers, endSession]);

  const handleCloseSurveyModal = () => {
    setIsSurveyExitConfirmModalOpen(true);
  };

  // Handlers para los modales de confirmación de encuestas
  const handleConfirmStartSurveys = () => {
    setIsSurveyConfirmationModalOpen(false);
    setIsSurveyModalOpen(true);
  };

  const handleDeclineSurveys = async () => {
    setIsSurveyConfirmationModalOpen(false);
    await saveSessionsDirectly(pendingSessionsToSave);
  };

  const handleConfirmExitSurveys = async () => {
    setIsSurveyExitConfirmModalOpen(false);
    setIsSurveyModalOpen(false);
    await saveSessionsDirectly(pendingSessionsToSave);
  };

  const handleCancelExitSurveys = () => {
    setIsSurveyExitConfirmModalOpen(false);
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
    isSurveyConfirmationModalOpen,
    isSurveyExitConfirmModalOpen,
    observaciones,
    isAddSpecificExerciseModalOpen,
    enabledSurveyQuestions,
    
    // Estados de modo edición
    isEditMode,
    originalSession,
    
    // Estados del formulario
    currentTipo,
    currentArea,
    currentEjercicio,
    currentEjercicioEspecifico,
    tiempoCantidad,
    intensidad,
    
    // Opciones disponibles
    availableTipos,
    availableAreas,
    availableEjercicios,
    availableSpecificExercises,
    
    // Valores computados
    playerNamesDisplay,
    singleActivePlayer,
    objectivesForSingleActivePlayer,
    
    // Setters para modales
    setIsObjectiveModalOpen,
    setIsParticipantModalOpen,
    setAskForSurveys,
    setObservaciones,
    setIsAddSpecificExerciseModalOpen,
    
    // Setters del formulario
    setCurrentEjercicio,
    setCurrentEjercicioEspecifico,
    setTiempoCantidad,
    setIntensidad,
    
    // Handlers
    handlePlayerToggleActive,
    toggleSelectAllPlayers,
    handleAddParticipant,
    handleRemoveParticipant,
    handleTipoChange,
    handleAreaChange,
    handleEjercicioChange,
    handleAddSpecificExercise,
    handleSubmitSpecificExercise,
    handleAddExerciseToSession,
    handleFinishTraining,
    handleSurveySubmit,
    handleCloseSurveyModal,
    handleConfirmStartSurveys,
    handleDeclineSurveys,
    handleConfirmExitSurveys,
    handleCancelExitSurveys,
    
    // Props para componentes
    allPlayers,
    allTournaments,
  };
};