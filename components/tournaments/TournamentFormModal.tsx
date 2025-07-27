import React, { useState, useEffect } from 'react';
import { TOURNAMENT_IMPORTANCE_LEVELS } from '@/constants';
import { Tournament, TournamentImportance } from '@/types';
import Modal from '../shared/Modal';
import { validateTournamentForm, dateToISOString, isoToLocalDate } from './helpers';

interface TournamentFormModalProps {
 isOpen: boolean;
 onClose: () => void;
 onSave: (tournamentData: Omit<Tournament, 'id' | 'jugadorId'>) => void;
 playerId: string;
 existingTournament: Tournament | null;
}

const TournamentFormModal: React.FC<TournamentFormModalProps> = ({
 isOpen,
 onClose,
 onSave,
 existingTournament,
}) => {
 const [nombreTorneo, setNombreTorneo] = useState('');
 const [gradoImportancia, setGradoImportancia] = useState<TournamentImportance>(TOURNAMENT_IMPORTANCE_LEVELS[2]);
 const [fechaInicio, setFechaInicio] = useState('');
 const [fechaFin, setFechaFin] = useState('');
 const [error, setError] = useState<string>('');

 useEffect(() => {
   if (existingTournament) {
     setNombreTorneo(existingTournament.nombreTorneo);
     setGradoImportancia(existingTournament.gradoImportancia);
     setFechaInicio(isoToLocalDate(existingTournament.fechaInicio));
     setFechaFin(isoToLocalDate(existingTournament.fechaFin));
     setError('');
   } else {
     setNombreTorneo('');
     setGradoImportancia(TOURNAMENT_IMPORTANCE_LEVELS[2]);
     setFechaInicio('');
     setFechaFin('');
     setError('');
   }
 }, [existingTournament, isOpen]);

 const handleSubmit = (e: React.FormEvent) => {
   e.preventDefault();
   
   const validationError = validateTournamentForm({
     nombreTorneo,
     fechaInicio,
     fechaFin
   });
   
   if (validationError) {
     setError(validationError);
     return;
   }

   onSave({
     nombreTorneo: nombreTorneo.trim(),
     gradoImportancia,
     fechaInicio: dateToISOString(fechaInicio),
     fechaFin: dateToISOString(fechaFin),
   });
   onClose();
 };

 const getImportanceColor = (level: TournamentImportance) => {
   // Usamos indexOf para determinar el nivel de importancia
   const index = TOURNAMENT_IMPORTANCE_LEVELS.indexOf(level);
   switch (index) {
     case 0: // Primer nivel (menos importante)
       return 'text-gray-500';
     case 1: // Segundo nivel
       return 'text-blue-400';
     case 2: // Tercer nivel (medio)
       return 'text-yellow-400';
     case 3: // Cuarto nivel
       return 'text-orange-400';
     case 4: // Quinto nivel (más importante)
       return 'text-red-400';
     default:
       return 'text-gray-400';
   }
 };

 const getImportanceDescription = (level: TournamentImportance) => {
   const index = TOURNAMENT_IMPORTANCE_LEVELS.indexOf(level);
   const descriptions = [
     '🎯 Torneo de práctica o amistoso',
     '🏃 Torneo de preparación para eventos importantes',
     '⭐ Torneo con puntos o ranking regional',
     '🏆 Torneo nacional o con clasificación importante',
     '🔥 Torneo crucial para los objetivos del año'
   ];
   return descriptions[index] || '';
 };

 return (
   <Modal isOpen={isOpen} onClose={onClose} title={existingTournament ? 'Editar Torneo' : 'Agregar Nuevo Torneo'}>
     <form onSubmit={handleSubmit} className="space-y-6">
       <div>
         <label htmlFor="nombreTorneo" className="block text-sm font-medium text-gray-400 mb-2">
           Nombre del Torneo
         </label>
         <input
           type="text"
           id="nombreTorneo"
           value={nombreTorneo}
           onChange={(e) => setNombreTorneo(e.target.value)}
           className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
           placeholder="Ej: Torneo Nacional Sub-16"
           required
         />
       </div>

       <div>
         <label htmlFor="gradoImportancia" className="block text-sm font-medium text-gray-400 mb-2">
           Grado de Importancia
         </label>
         <div className="relative">
           <select
             id="gradoImportancia"
             value={gradoImportancia}
             onChange={(e) => setGradoImportancia(e.target.value as TournamentImportance)}
             className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 appearance-none"
           >
             {TOURNAMENT_IMPORTANCE_LEVELS.map(level => (
               <option key={level} value={level}>{level}</option>
             ))}
           </select>
           <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
             <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
             </svg>
           </div>
         </div>
         <p className={`mt-2 text-sm ${getImportanceColor(gradoImportancia)}`}>
           {getImportanceDescription(gradoImportancia)}
         </p>
       </div>

       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
         <div>
           <label htmlFor="fechaInicio" className="block text-sm font-medium text-gray-400 mb-2">
             Fecha de Inicio
           </label>
           <input
             type="date"
             id="fechaInicio"
             value={fechaInicio}
             onChange={(e) => setFechaInicio(e.target.value)}
             className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
             required
           />
         </div>
         <div>
           <label htmlFor="fechaFin" className="block text-sm font-medium text-gray-400 mb-2">
             Fecha de Fin
           </label>
           <input
             type="date"
             id="fechaFin"
             value={fechaFin}
             onChange={(e) => setFechaFin(e.target.value)}
             className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
             required
           />
         </div>
       </div>

       {error && (
         <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
           <p className="text-red-400 text-sm flex items-center">
             <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
             {error}
           </p>
         </div>
       )}

       <div className="flex flex-col sm:flex-row gap-3 pt-2">
         <button
           type="submit"
           className="flex-1 py-3 px-4 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/25"
         >
           {existingTournament ? 'Guardar Cambios' : 'Agregar Torneo'}
         </button>
         <button
           type="button"
           onClick={onClose}
           className="flex-1 py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-200 border border-gray-700"
         >
           Cancelar
         </button>
       </div>
     </form>
   </Modal>
 );
};

export default TournamentFormModal;