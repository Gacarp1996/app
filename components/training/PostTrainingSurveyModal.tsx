import React, { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import { Player } from '@/types/types';


interface SurveyQuestion {
  key: 'cansancioFisico' | 'concentracion' | 'actitudMental' | 'sensacionesTenisticas';
  title: string;
  lowLabel: string;
  highLabel: string;
  lowDescription: string;
  highDescription: string;
}

const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    key: 'cansancioFisico',
    title: 'Energía Física',
    lowLabel: '1',
    highLabel: '5',
    lowDescription: 'Muy cansado',
    highDescription: 'Muy enérgico'
  },
  {
    key: 'concentracion',
    title: 'Concentración',
    lowLabel: '1',
    highLabel: '5',
    lowDescription: 'Desconcentrado',
    highDescription: 'Muy concentrado'
  },
  {
    key: 'actitudMental',
    title: 'Actitud Mental',
    lowLabel: '1',
    highLabel: '5',
    lowDescription: 'Negativa',
    highDescription: 'Muy positiva'
  },
  {
    key: 'sensacionesTenisticas',
    title: 'Sensaciones Tenísticas',
    lowLabel: '1',
    highLabel: '5',
    lowDescription: 'Malas',
    highDescription: 'Excelentes'
  }
];

interface PostTrainingSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  onSubmit: (playerId: string, responses: {
    cansancioFisico?: number;
    concentracion?: number;
    actitudMental?: number;
    sensacionesTenisticas?: number;
  }) => void;
  currentIndex?: number;
  totalPlayers?: number;
  enabledQuestions?: string[]; // Nueva prop para preguntas habilitadas
  initialValues?: {
    cansancioFisico?: number;
    concentracion?: number;
    actitudMental?: number;
    sensacionesTenisticas?: number;
  };
}

const PostTrainingSurveyModal: React.FC<PostTrainingSurveyModalProps> = ({
  isOpen,
  onClose,
  player,
  onSubmit,
  currentIndex = 0,
  totalPlayers = 1,
  enabledQuestions = ['cansancioFisico', 'concentracion', 'actitudMental', 'sensacionesTenisticas'], // Por defecto todas
  initialValues
}) => {
  
  // Detectar si es móvil
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);
  
  // Filtrar preguntas habilitadas
  const filteredQuestions = SURVEY_QUESTIONS.filter(q => enabledQuestions.includes(q.key));
  
  const [responses, setResponses] = useState<{
    cansancioFisico: number | null;
    concentracion: number | null;
    actitudMental: number | null;
    sensacionesTenisticas: number | null;
  }>({
    cansancioFisico: null,
    concentracion: null,
    actitudMental: null,
    sensacionesTenisticas: null
  });

  useEffect(() => {
    if (initialValues) {
      setResponses({
        cansancioFisico: initialValues.cansancioFisico ?? null,
        concentracion: initialValues.concentracion ?? null,
        actitudMental: initialValues.actitudMental ?? null,
        sensacionesTenisticas: initialValues.sensacionesTenisticas ?? null
      });
    } else {
      // Resetear todas las respuestas cuando cambia el jugador
      setResponses({
        cansancioFisico: null,
        concentracion: null,
        actitudMental: null,
        sensacionesTenisticas: null
      });
    }
  }, [initialValues, player.id]); // Agregar player.id como dependencia

  const handleValueChange = (key: keyof typeof responses, value: number) => {
    setResponses(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    // Validar solo las preguntas habilitadas
    const requiredFields = enabledQuestions;
    const missingFields = requiredFields.filter(field => responses[field as keyof typeof responses] === null);
    
    if (missingFields.length > 0) {
      alert('Por favor responde todas las preguntas habilitadas');
      return;
    }

    // Crear respuestas solo con las preguntas habilitadas y con valores válidos
    const validResponses: any = {};
    enabledQuestions.forEach(field => {
      const value = responses[field as keyof typeof responses];
      if (value !== null) {
        validResponses[field] = value;
      }
    });

    onSubmit(player.id, validResponses);
  };

  const isComplete = enabledQuestions.every(field => responses[field as keyof typeof responses] !== null);

  const getModalTitle = () => {
    // En móvil, usar título más corto
    if (isMobile) {
      return `Encuesta: ${player.name}`;
    }
    return `Encuesta Post-Entrenamiento: ${player.name}`;
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={getModalTitle()}
    >
      <div className="space-y-4 sm:space-y-6">
        {totalPlayers > 1 && (
          <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg border border-gray-700">
            <span className="text-xs sm:text-sm text-gray-400">
              Jugador {currentIndex + 1} de {totalPlayers}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: totalPlayers }).map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    idx === currentIndex
                      ? 'bg-green-400 shadow-lg shadow-green-400/50'
                      : idx < currentIndex
                      ? 'bg-green-600'
                      : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
        <p className="text-sm sm:text-base text-gray-400">
          ¿Cómo se sintió <span className="text-green-400 font-semibold">{player.name}</span> durante el entrenamiento?
        </p>

        {filteredQuestions.map((question) => (
          <div key={question.key} className="space-y-3 p-3 sm:p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
            <h3 className="font-semibold text-green-400 text-base sm:text-lg">{question.title}</h3>
            
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs sm:text-sm text-gray-500">{question.lowDescription}</span>
              <span className="text-xs sm:text-sm text-gray-500">{question.highDescription}</span>
            </div>
            
            <div className="flex justify-between gap-1 sm:gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => handleValueChange(question.key, value)}
                  className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 rounded-lg font-bold transition-all duration-200 transform text-sm sm:text-base ${
                    responses[question.key] === value
                      ? 'bg-gradient-to-r from-green-500 to-cyan-500 text-black scale-105 shadow-lg shadow-green-500/30'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-4 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleSubmit}
            disabled={!isComplete}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-green-500/25 text-sm sm:text-base"
          >
            {currentIndex < totalPlayers - 1 ? 'Guardar y Continuar' : 'Guardar y Finalizar'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-200 border border-gray-700 text-sm sm:text-base"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default PostTrainingSurveyModal;