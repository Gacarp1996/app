// components/TrainingsOnDateModal.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrainingSession } from '../types';
import Modal from './Modal';

interface TrainingsOnDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  sessions: TrainingSession[];
}

const TrainingsOnDateModal: React.FC<TrainingsOnDateModalProps> = ({ isOpen, onClose, date, sessions }) => {
  const navigate = useNavigate();

  if (!date) return null;

  const handleSessionClick = (sessionId: string) => {
    navigate(`/session/${sessionId}`);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Entrenamientos del ${date.toLocaleDateString('es-ES')}`}>
      {sessions.length > 0 ? (
        <ul className="space-y-3">
          {sessions.map(session => (
            <li 
              key={session.id} 
              className="bg-app-surface-alt p-3 rounded-md hover:bg-app-accent hover:text-white cursor-pointer transition-colors"
              onClick={() => handleSessionClick(session.id)}
            >
              <p className="font-semibold">Ver Detalles del Entrenamiento</p>
              <p className="text-sm">{session.ejercicios.length} ejercicios registrados.</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-app-secondary">No hay entrenamientos para esta fecha.</p>
      )}
    </Modal>
  );
};

export default TrainingsOnDateModal;