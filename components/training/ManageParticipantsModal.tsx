import React, { useState, useMemo } from 'react';
import Modal from '../shared/Modal';
import { Player } from '../../types/types';

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
    const [activeTab, setActiveTab] = useState<'current' | 'add'>('current');
    
    const availablePlayersToAdd = useMemo(() => {
        const currentIds = new Set(currentParticipants.map(p => p.id));
        return allPlayersFromStorage.filter(p =>
            p.estado === 'activo' && !currentIds.has(p.id) && p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [currentParticipants, allPlayersFromStorage, searchTerm]);

    const handleRemoveWithConfirmation = (player: Player) => {
        if (currentParticipants.length <= 1) {
            alert('Debe haber al menos un participante en la sesión.');
            return;
        }
        
        if (confirm(`¿Estás seguro de que quieres quitar a ${player.name} de la sesión?`)) {
            onRemoveParticipant(player.id);
        }
    };

    const handleAddWithFeedback = (player: Player) => {
        onAddParticipant(player);
        setSearchTerm('');
        // Cambiar a la tab de participantes actuales para mostrar el nuevo jugador
        setActiveTab('current');
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Gestionar Participantes de la Sesión">
            <div className="space-y-4">
                {/* Tabs */}
                <div className="flex bg-gray-800/50 rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab('current')}
                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                            activeTab === 'current'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'text-gray-400 hover:text-gray-300'
                        }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 3.197c0 .74.134 1.448.384 2.104A9.094 9.094 0 0012 21a9.094 9.094 0 005.676-1.976" />
                            </svg>
                            Participantes ({currentParticipants.length})
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('add')}
                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                            activeTab === 'add'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'text-gray-400 hover:text-gray-300'
                        }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            Agregar Jugador ({availablePlayersToAdd.length})
                        </div>
                    </button>
                </div>

                {/* Contenido según tab activo */}
                <div className="max-h-[60vh] overflow-y-auto">
                    {activeTab === 'current' ? (
                        /* Tab de participantes actuales */
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-4">
                                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 3.197c0 .74.134 1.448.384 2.104A9.094 9.094 0 0012 21a9.094 9.094 0 005.676-1.976" />
                                </svg>
                                <h4 className="text-lg font-semibold text-blue-400">
                                    Participantes en la Sesión
                                </h4>
                            </div>
                            
                            {currentParticipants.length === 0 ? (
                                <div className="text-center py-8">
                                    <svg className="w-12 h-12 text-gray-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                                    </svg>
                                    <p className="text-gray-400 text-sm">No hay participantes en la sesión</p>
                                    <p className="text-gray-500 text-xs mt-1">Usa la pestaña "Agregar Jugador" para añadir participantes</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {currentParticipants.map((player, index) => (
                                        <div key={player.id} className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-sm font-semibold">
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-medium">{player.name}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs text-gray-400">ID: {player.id}</span>
                                                            <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                                                                Activo
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <button
                                                    onClick={() => handleRemoveWithConfirmation(player)}
                                                    disabled={currentParticipants.length <= 1}
                                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                                                        currentParticipants.length <= 1
                                                            ? 'bg-gray-600/50 text-gray-500 cursor-not-allowed'
                                                            : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                                                    }`}
                                                    title={currentParticipants.length <= 1 ? 'Debe haber al menos un participante' : 'Quitar de la sesión'}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                        Quitar
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Mensaje informativo sobre mínimo de participantes */}
                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mt-4">
                                <div className="flex items-start gap-2">
                                    <svg className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.007v.008H12v-.008z" />
                                    </svg>
                                    <div>
                                        <p className="text-orange-400 text-sm font-medium">Nota importante</p>
                                        <p className="text-orange-300 text-xs mt-1">
                                            Debe haber al menos un participante en la sesión. Los participantes se pueden quitar por lesión o indicación del director.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Tab de agregar jugadores */
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-4">
                                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                <h4 className="text-lg font-semibold text-green-400">
                                    Agregar Jugadores a la Sesión
                                </h4>
                            </div>

                            {/* Barra de búsqueda */}
                            <div className="relative">
                                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Buscar jugadores por nombre..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 text-sm"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>

                            {/* Lista de jugadores disponibles */}
                            {availablePlayersToAdd.length === 0 ? (
                                <div className="text-center py-8">
                                    <svg className="w-12 h-12 text-gray-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                    </svg>
                                    <p className="text-gray-400 text-sm">
                                        {searchTerm 
                                            ? `No se encontraron jugadores que coincidan con "${searchTerm}"`
                                            : 'No hay más jugadores disponibles para agregar'
                                        }
                                    </p>
                                    <p className="text-gray-500 text-xs mt-1">
                                        Solo se muestran jugadores activos que no están en la sesión
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {availablePlayersToAdd.map((player) => (
                                        <div key={player.id} className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center text-sm font-semibold">
                                                        +
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-medium">{player.name}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs text-gray-400">ID: {player.id}</span>
                                                            <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                                                                Disponible
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <button
                                                    onClick={() => handleAddWithFeedback(player)}
                                                    className="px-3 py-1.5 bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 text-xs font-medium rounded-lg transition-all"
                                                >
                                                    <div className="flex items-center gap-1">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                                        </svg>
                                                        Agregar
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Información adicional */}
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mt-4">
                                <div className="flex items-start gap-2">
                                    <svg className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <p className="text-blue-400 text-sm font-medium">Gestión de participantes</p>
                                        <p className="text-blue-300 text-xs mt-1">
                                            Puedes agregar o quitar jugadores durante la sesión por lesiones o indicaciones del director. 
                                            Las recomendaciones de entrenamiento se actualizarán automáticamente.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer del modal */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                    <div className="text-sm text-gray-400">
                        {currentParticipants.length > 0 && (
                            <>
                                <span className="text-white font-medium">{currentParticipants.length}</span> participante{currentParticipants.length > 1 ? 's' : ''} en la sesión
                            </>
                        )}
                    </div>
                    
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                        Continuar con {currentParticipants.length} jugador{currentParticipants.length > 1 ? 'es' : ''}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ManageParticipantsModal;