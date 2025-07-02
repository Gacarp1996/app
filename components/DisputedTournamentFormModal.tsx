import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { DisputedTournament, Tournament, EvaluacionGeneral, RendimientoJugador } from '../types';

interface DisputedTournamentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tournamentData: Omit<DisputedTournament, 'id' | 'jugadorId' | 'fechaRegistro'>) => void;
  playerId: string;
  existingDisputedTournament?: DisputedTournament | null;
  futureTournamentToConvert?: Tournament | null;
}

const EVALUACION_OPTIONS: EvaluacionGeneral[] = ['Muy malo', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'];
const RESULTADO_SUGERIDOS = ['Campeón', 'Finalista', 'Semifinal', 'Cuartos de final', 'Octavos de final', 'Segunda ronda', 'Primera ronda', 'Clasificación'];

const CardSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="relative bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-2xl">
        <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl p-4 sm:p-6">
            <h4 className="text-lg font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-4">
                {title}
            </h4>
            {children}
        </div>
    </div>
);

const DisputedTournamentFormModal: React.FC<DisputedTournamentFormModalProps> = ({ isOpen, onClose, onSave, existingDisputedTournament, futureTournamentToConvert }) => {
  const [nombreTorneo, setNombreTorneo] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [resultado, setResultado] = useState('');
  const [nivelDificultad, setNivelDificultad] = useState(3);
  const [evaluacionGeneral, setEvaluacionGeneral] = useState<EvaluacionGeneral>('Bueno');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (existingDisputedTournament) {
      setNombreTorneo(existingDisputedTournament.nombreTorneo);
      setFechaInicio(existingDisputedTournament.fechaInicio.split('T')[0]);
      setResultado(existingDisputedTournament.resultado);
      setNivelDificultad(existingDisputedTournament.nivelDificultad);
      
      // Manejar datos legacy
      if (existingDisputedTournament.evaluacionGeneral) {
        setEvaluacionGeneral(existingDisputedTournament.evaluacionGeneral);
      } else if (existingDisputedTournament.rendimientoJugador) {
        // Conversión de datos legacy
        const legacyMap: Record<string, EvaluacionGeneral> = {
          'Muy malo': 'Muy malo',
          'Malo': 'Malo',
          'Bueno': 'Bueno',
          'Muy bueno': 'Muy bueno',
          'Excelente': 'Excelente'
        };
        setEvaluacionGeneral(legacyMap[existingDisputedTournament.rendimientoJugador] || 'Regular');
      } else {
        setEvaluacionGeneral('Regular');
      }
      
      setObservaciones(existingDisputedTournament.observaciones || '');
    } else if (futureTournamentToConvert) {
      setNombreTorneo(futureTournamentToConvert.nombreTorneo);
      setFechaInicio(futureTournamentToConvert.fechaInicio.split('T')[0]);
      // Resetear campos de evaluación
      setResultado('');
      setNivelDificultad(3);
      setEvaluacionGeneral('Bueno');
      setObservaciones('');
    } else {
      setNombreTorneo(''); 
      setFechaInicio(''); 
      setResultado('');
      setNivelDificultad(3); 
      setEvaluacionGeneral('Bueno');
      setObservaciones('');
    }
    setError('');
  }, [existingDisputedTournament, futureTournamentToConvert, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreTorneo.trim() || !fechaInicio || !resultado.trim()) {
      setError('Por favor, completa todos los campos obligatorios.');
      return;
    }
    
    const tournamentData = {
      nombreTorneo: nombreTorneo.trim(),
      fechaInicio: new Date(fechaInicio + 'T00:00:00Z').toISOString(),
      resultado: resultado.trim(),
      nivelDificultad, 
      evaluacionGeneral,
      ...(observaciones.trim() && { observaciones: observaciones.trim() }),
      ...(futureTournamentToConvert?.id && { torneoFuturoId: futureTournamentToConvert.id })
    };
    onSave(tournamentData);
    onClose();
  };

  const getTitle = () => {
    if (existingDisputedTournament) return 'Editar Torneo Disputado';
    if (futureTournamentToConvert) return 'Registrar Resultado del Torneo';
    return 'Agregar Torneo Disputado';
  };

  const getEvaluacionColor = (evaluacion: EvaluacionGeneral) => {
    const colorMap: Record<EvaluacionGeneral, string> = {
      'Muy malo': 'text-red-500',
      'Malo': 'text-orange-500',
      'Regular': 'text-yellow-500',
      'Bueno': 'text-blue-400',
      'Muy bueno': 'text-green-400',
      'Excelente': 'text-purple-400'
    };
    return colorMap[evaluacion] || 'text-gray-400';
  };

  const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} className={`app-input w-full ${props.className}`} />;
  const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props} className={`app-input w-full ${props.className}`} />;
  const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} className={`app-input w-full resize-none ${props.className}`} />;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getTitle()}>
      <form onSubmit={handleSubmit} className="space-y-6 custom-scrollbar pr-2 -mr-2">
        <CardSection title="Información del Torneo">
          <div className="space-y-4">
            <div>
              <label htmlFor="nombreTorneo" className="block text-sm font-medium text-gray-400 mb-2">
                Nombre del Torneo
              </label>
              <Input 
                type="text" 
                id="nombreTorneo" 
                value={nombreTorneo} 
                onChange={(e) => setNombreTorneo(e.target.value)} 
                required 
                disabled={!!futureTournamentToConvert} 
                placeholder="Ej: Torneo Nacional Sub-16"
              />
            </div>
            <div>
              <label htmlFor="fechaInicio" className="block text-sm font-medium text-gray-400 mb-2">
                Fecha de inicio del torneo
              </label>
              <Input 
                type="date" 
                id="fechaInicio" 
                value={fechaInicio} 
                onChange={(e) => setFechaInicio(e.target.value)} 
                required 
                disabled={!!futureTournamentToConvert} 
              />
            </div>
          </div>
        </CardSection>
        
        <CardSection title="Resultado y Evaluación">
          <div className="space-y-6">
            <div>
              <label htmlFor="resultado" className="block text-sm font-medium text-gray-400 mb-2">
                Resultado Final
              </label>
              <div className="flex gap-2">
                <Input 
                  type="text" 
                  id="resultado" 
                  value={resultado} 
                  onChange={(e) => setResultado(e.target.value)} 
                  placeholder="Ej: Semifinal" 
                  required 
                  className="flex-1" 
                />
                <Select 
                  onChange={(e) => setResultado(e.target.value)} 
                  value="" 
                  className="flex-shrink-0 w-auto"
                >
                  <option value="" disabled>Sugerencias</option>
                  {RESULTADO_SUGERIDOS.map(res => <option key={res} value={res}>{res}</option>)}
                </Select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-3">
                Nivel de Dificultad del Torneo
              </label>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">Fácil</span>
                <input 
                  type="range" 
                  min="1" 
                  max="5" 
                  value={nivelDificultad} 
                  onChange={(e) => setNivelDificultad(Number(e.target.value))} 
                  className="w-full" 
                />
                <span className="text-sm text-gray-500">Difícil</span>
                <span className="ml-2 font-bold text-green-400 bg-gray-800/50 px-3 py-1 rounded-full">
                  {nivelDificultad}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                {nivelDificultad === 1 && "Torneo local o amistoso"}
                {nivelDificultad === 2 && "Torneo regional con poca competencia"}
                {nivelDificultad === 3 && "Torneo con nivel competitivo medio"}
                {nivelDificultad === 4 && "Torneo nacional o con jugadores fuertes"}
                {nivelDificultad === 5 && "Torneo internacional o élite"}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-3">
                Evaluación general del jugador
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {EVALUACION_OPTIONS.map(option => (
                  <label 
                    key={option} 
                    className={`flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 border-2 ${
                      evaluacionGeneral === option 
                        ? 'border-green-500 bg-green-500/10' 
                        : 'border-gray-700 bg-gray-800/30 hover:border-green-500/50'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="evaluacion" 
                      value={option} 
                      checked={evaluacionGeneral === option} 
                      onChange={(e) => setEvaluacionGeneral(e.target.value as EvaluacionGeneral)} 
                      className="mr-3" 
                    />
                    <span className={`text-sm font-medium ${
                      evaluacionGeneral === option ? getEvaluacionColor(option) : 'text-gray-200'
                    }`}>
                      {option}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center">
                Evalúa el rendimiento general del jugador considerando su nivel de juego, 
                actitud mental y cumplimiento de objetivos
              </p>
            </div>
            
            <div>
              <label htmlFor="observaciones" className="block text-sm font-medium text-gray-400 mb-2">
                Observaciones (opcional)
              </label>
              <Textarea 
                id="observaciones" 
                value={observaciones} 
                onChange={(e) => setObservaciones(e.target.value)} 
                rows={3} 
                placeholder="Notas adicionales sobre el torneo, aspectos a mejorar, puntos destacados..." 
              />
            </div>
          </div>
        </CardSection>
        
        {error && (
          <div className="p-3 bg-red-900/40 border border-red-500/50 rounded-lg text-red-300 text-sm flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button type="submit" className="app-button btn-primary flex-1">
            {existingDisputedTournament ? 'Guardar Cambios' : 'Registrar Torneo'}
          </button>
          <button type="button" onClick={onClose} className="app-button btn-secondary flex-1">
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default DisputedTournamentFormModal;