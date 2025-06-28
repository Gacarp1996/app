import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Player } from '../types';

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
    title: 'Cansancio Físico',
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
    lowDescription: 'Muy desconcentrado',
    highDescription: 'Muy concentrado'
  },
  {
    key: 'actitudMental',
    title: 'Actitud Mental',
    lowLabel: '1',
    highLabel: '5',
    lowDescription: 'Muy negativa',
    highDescription: 'Muy positiva'
  },
  {
    key: 'sensacionesTenisticas',
    title: 'Sensaciones Tenísticas',
    lowLabel: '1',
    highLabel: '5',
    lowDescription: 'Muy malas',
    highDescription: 'Excelentes'
  }
];

interface PostTrainingSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  onSubmit: (playerId: string, responses: {
    cansancioFisico: number;
    concentracion: number;
    actitudMental: number;
    sensacionesTenisticas: number;
  }) => void;
  currentIndex?: number;
  totalPlayers?: number;
  initialValues?: {
    cansancioFisico: number;
    concentracion: number;
    actitudMental: number;
    sensacionesTenisticas: number;
  };
}

const PostTrainingSurveyModal: React.FC<PostTrainingSurveyModalProps> = ({
  isOpen,
  onClose,
  player,
  onSubmit,
  currentIndex = 0,
  totalPlayers = 1,
  initialValues
}) => {
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
      setResponses(initialValues);
    }
  }, [initialValues]);

  const handleValueChange = (key: keyof typeof responses, value: number) => {
    setResponses(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    if (Object.values(responses).some(v => v === null)) {
      alert('Por favor responde todas las preguntas');
      return;
    }

    onSubmit(player.id, responses as any);
    setResponses({
      cansancioFisico: null,
      concentracion: null,
      actitudMental: null,
      sensacionesTenisticas: null
    });
  };

  const isComplete = Object.values(responses).every(v => v !== null);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Encuesta Post-Entrenamiento: ${player.name}`}
    >
      <div className="space-y-6">
        {totalPlayers > 1 && (
          <div className="flex items-center justify-between bg-app-surface-alt p-3 rounded-lg">
            <span className="text-sm text-app-secondary">
              Jugador {currentIndex + 1} de {totalPlayers}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: totalPlayers }).map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full ${
                    idx === currentIndex
                      ? 'bg-app-accent'
                      : idx < currentIndex
                      ? 'bg-green-500'
                      : 'bg-app-surface-alt border border-app'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
        <p className="text-app-secondary">
          ¿Cómo se sintió {player.name} durante el entrenamiento?
        </p>

        {SURVEY_QUESTIONS.map((question) => (
          <div key={question.key} className="space-y-3">
            <h3 className="font-semibold text-app-accent text-lg">{question.title}</h3>
            
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-app-secondary">{question.lowDescription}</span>
              <span className="text-sm text-app-secondary">{question.highDescription}</span>
            </div>
            
            <div className="flex justify-between gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => handleValueChange(question.key, value)}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                    responses[question.key] === value
                      ? 'bg-app-accent text-white transform scale-105 shadow-lg'
                      : 'bg-app-surface-alt hover:bg-opacity-80'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-4 flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={!isComplete}
            className="flex-1 app-button btn-success disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Guardar Respuestas
          </button>
          <button
            onClick={onClose}
            className="flex-1 app-button btn-secondary"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default PostTrainingSurveyModal;
