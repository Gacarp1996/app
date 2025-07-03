import React from 'react';
import Modal from '../Modal';
import { Player } from '../../types';

interface PlayerArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  player: Player;
}

const PlayerArchiveModal: React.FC<PlayerArchiveModalProps> = ({ isOpen, onClose, onConfirm, player }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmar Archivar">
      <p>¿Archivar a <strong>{player.name}</strong>?</p>
      <div className="flex justify-end space-x-3 mt-4">
        <button 
          onClick={onClose} 
          className="app-button btn-secondary"
        >
          Cancelar
        </button>
        <button 
          onClick={onConfirm} 
          className="app-button btn-warning"
        >
          Sí, Archivar
        </button>
      </div>
    </Modal>
  );
};

export default PlayerArchiveModal;