import React, { useState, useMemo } from 'react';
import Modal from '../shared/Modal';
import { Player } from '../../types';

interface ManageParticipantsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentParticipants: Player[];
    allPlayersFromStorage: Player[];
    onRemoveParticipant: (playerId: string) => void;
    onAddParticipant: (player: Player) => void;
}

const ManageParticipantsModal: React.FC<ManageParticipantsModalProps> = ({ 
    isOpen, 
    onClose, 
    currentParticipants, 
    allPlayersFromStorage, 
    onRemoveParticipant, 
    onAddParticipant 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    
    const availablePlayersToAdd = useMemo(() => {
        const currentIds = new Set(currentParticipants.map(p => p.id));
        return allPlayersFromStorage.filter(p =>
            p.estado === 'activo' && !currentIds.has(p.id) && p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [currentParticipants, allPlayersFromStorage, searchTerm]);
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Gestionar Participantes">
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div>
                    <h4 className="text-lg font-semibold text-app-accent mb-2">Participantes Actuales</h4>
                    {currentParticipants.length === 0 && <p className="text-app-secondary text-sm">No hay participantes.</p>}
                    <ul className="space-y-2">
                        {currentParticipants.map(player => (
                            <li key={player.id} className="flex justify-between items-center bg-app-surface-alt p-2 rounded">
                                <span className="text-app-primary">{player.name}</span>
                                <button 
                                    onClick={() => onRemoveParticipant(player.id)} 
                                    className="app-button btn-danger text-xs" 
                                    disabled={currentParticipants.length <= 1}
                                >
                                    Quitar
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="border-t border-app pt-4">
                    <h4 className="text-lg font-semibold text-app-accent mb-2">Agregar Jugador</h4>
                    <input 
                        type="text" 
                        placeholder="Buscar jugador..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="w-full p-2 app-input rounded-md mb-2" 
                    />
                    <ul className="space-y-2 max-h-40 overflow-y-auto">
                        {availablePlayersToAdd.map(player => (
                            <li key={player.id} className="flex justify-between items-center bg-app-surface-alt p-2 rounded">
                                <span className="text-app-primary">{player.name}</span>
                                <button 
                                    onClick={() => { 
                                        onAddParticipant(player); 
                                        setSearchTerm(''); 
                                    }} 
                                    className="app-button btn-success text-xs"
                                >
                                    + Agregar
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <button onClick={onClose} className="mt-6 app-button btn-primary w-full">Cerrar</button>
        </Modal>
    );
};

export default ManageParticipantsModal;