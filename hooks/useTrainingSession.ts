import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player, Objective, TrainingSession, Tournament, LoggedExercise, SpecificExercise } from '../types';
import { useTraining, SessionExercise } from '../contexts/TrainingContext';
import { useAuth } from '../contexts/AuthContext';
import { useAcademia } from '../contexts/AcademiaContext';
import { addSession, updateSession } from '../Database/FirebaseSessions';
import { addPostTrainingSurvey } from '../Database/FirebaseSurveys';
import { getEnabledSurveyQuestions } from '../Database/FirebaseAcademiaConfig';
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
  const { currentUser } = useAuth();
  const { academiaActual } = useAcademia();
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
  const [currentEjercicioEspecifico, setCurrentEjercicioEspecifico] = useState<string>('');
  const [tiempoCantidad, setTiempoCantidad] = useState<string>('');
  const [intensidad, setIntensidad] = useState<number>(5);
  
  // Cargar observaciones desde la sesión original si estamos editando
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

  // Hook para las opciones de ejercicio
  const { availableTipoKeys, availableAreaKeys, availableEjercicioNames } = useExerciseOptions(currentTipoKey, currentAreaKey);
  
  // Ejercicios específicos disponibles para la selección actual
  const availableSpecificExercises = useMemo(() => {
    if (!currentTipoKey || !currentAreaKey || !currentEjercicioName) {
      return [];
    }
    return specificExercises.filter(exercise => 
      exercise.tipo === currentTipoKey && 
      exercise.area === currentAreaKey && 
      exercise.ejercicio === currentEjercicioName
    );
  }, [specificExercises, currentTipoKey, currentAreaKey, currentEjercicioName]);

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

  // Cargar preguntas habilitadas de encuesta
  useEffect(() => {
    const loadEnabledQuestions = async () => {
      try {
        const questions = await getEnabledSurveyQuestions(academiaId);
        setEnabledSurveyQuestions(questions);
      } catch (error) {
        console.error('Error cargando preguntas habilitadas:', error);
        // Mantener preguntas por defecto en caso de error
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
    setCurrentTipoKey(value);
    setCurrentAreaKey('');
    setCurrentEjercicioName('');
    setCurrentEjercicioEspecifico('');
  };

  const handleAreaChange = (value: string) => {
    setCurrentAreaKey(value);
    setCurrentEjercicioName('');
    setCurrentEjercicioEspecifico('');
  };

  const handleEjercicioChange = (value: string) => {
    setCurrentEjercicioName(value);
    setCurrentEjercicioEspecifico('');
  };

  // Handlers para ejercicios específicos
  const handleAddSpecificExercise = () => {
    if (!currentTipoKey || !currentAreaKey || !currentEjercicioName) {
      alert('Por favor, selecciona tipo, área y ejercicio antes de crear un ejercicio específico.');
      return;
    }
    setIsAddSpecificExerciseModalOpen(true);
  };

  const handleSubmitSpecificExercise = (exerciseName: string) => {
    const newSpecificExercise: SpecificExercise = {
      id: crypto.randomUUID(),
      name: exerciseName,
      tipo: currentTipoKey,
      area: currentAreaKey,
      ejercicio: currentEjercicioName
    };
    
    setSpecificExercises(prev => [...prev, newSpecificExercise]);
    setCurrentEjercicioEspecifico(exerciseName);
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
          ejercicioEspecifico: currentEjercicioEspecifico || undefined,
          tiempoCantidad,
          intensidad,
          loggedForPlayerId: player.id,
          loggedForPlayerName: player.name,
        };
        addExercise(newExercise);
      }
    });
    setCurrentEjercicioName('');
    setCurrentEjercicioEspecifico('');
    setTiempoCantidad('');
    setIntensidad(5);
  };

  // Handler principal para finalizar entrenamiento
  const handleFinishTraining = async () => {
    if (exercises.length === 0 && !window.confirm("No has registrado ningún ejercicio. ¿Deseas finalizar de todas formas?")) return;
    
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
    const sessionsToSave: Omit<TrainingSession, 'id'>[] = participants.map(player => {
      const playerExercises = exercises.filter(ex => ex.loggedForPlayerId === player.id)
        .map(({ loggedForPlayerId, loggedForPlayerName, ...rest }) => {
          // Asegurar que todos los campos requeridos estén presentes
          const exercise: LoggedExercise = {
            id: rest.id || '',
            tipo: rest.tipo || 'PELOTEO',
            area: rest.area || 'Técnica',
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

    // Guardar las sesiones preparadas para usar después
    setPendingSessionsToSave(sessionsToSave);

    if (sessionsToSave.length > 0) {
      // Preguntar si quieren hacer las encuestas usando modal
      if (askForSurveys) {
        // Preparar jugadores para encuestas
        const playersWithSessions = participants.filter(p => 
          sessionsToSave.some(session => session.jugadorId === p.id)
        );
        setPendingSurveyPlayers(playersWithSessions);
        setCurrentSurveyPlayerIndex(0);
        setIsSurveyConfirmationModalOpen(true);
        return; // No guardar ni navegar todavía, esperar confirmación del usuario
      } else {
        // Si no se van a hacer encuestas, guardar directamente
        await saveSessionsDirectly(sessionsToSave);
      }
    } else {
      alert("Entrenamiento finalizado. No se guardaron datos nuevos.");
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
    endSession();
    navigate('/players');
  };

  // Handler para encuestas - OPCIÓN 3: SIN VERIFICACIÓN DE ENCUESTAS EXISTENTES
  const handleSurveySubmit = async (playerId: string, responses: {
    cansancioFisico?: number;
    concentracion?: number;
    actitudMental?: number;
    sensacionesTenisticas?: number;
  }) => {
    try {
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
      if (!sessionId) {
        console.error('No se encontró sessionId para el jugador:', playerId);
        return;
      }

      // OPCIÓN 3: Guardar encuesta directamente sin verificación
      // Filtrar solo las respuestas válidas (no undefined)
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
        // Todas las encuestas completadas - finalizar sesión completa
        setIsSurveyModalOpen(false);
        
        // Finalizar sesión sin mostrar alert
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
    setIsSurveyExitConfirmModalOpen(true);
  };

  // Handlers para los modales de confirmación de encuestas
  const handleConfirmStartSurveys = () => {
    setIsSurveyConfirmationModalOpen(false);
    setIsSurveyModalOpen(true);
  };

  const handleDeclineSurveys = async () => {
    setIsSurveyConfirmationModalOpen(false);
    // Si declina las encuestas, guardar las sesiones directamente
    await saveSessionsDirectly(pendingSessionsToSave);
  };

  const handleConfirmExitSurveys = async () => {
    setIsSurveyExitConfirmModalOpen(false);
    setIsSurveyModalOpen(false);
    // Si sale de las encuestas, guardar las sesiones directamente
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
    currentTipoKey,
    currentAreaKey,
    currentEjercicioName,
    currentEjercicioEspecifico,
    tiempoCantidad,
    intensidad,
    
    // Opciones disponibles
    availableTipoKeys,
    availableAreaKeys,
    availableEjercicioNames,
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
    setCurrentEjercicioName,
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
    allObjectives,
    allTournaments,
  };
};