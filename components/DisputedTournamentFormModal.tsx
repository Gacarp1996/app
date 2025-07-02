import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { DisputedTournament, Tournament, RendimientoJugador, ConformidadGeneral } from '../types';

interface DisputedTournamentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tournamentData: Omit<DisputedTournament, 'id' | 'jugadorId' | 'fechaRegistro'>) => void;
  playerId: string;
  existingDisputedTournament?: DisputedTournament | null;
  futureTournamentToConvert?: Tournament | null;
}

const RENDIMIENTO_OPTIONS: RendimientoJugador[] = ['Muy malo', 'Malo', 'Bueno', 'Muy bueno', 'Excelente'];
const CONFORMIDAD_OPTIONS: ConformidadGeneral[] = ['Muy insatisfecho', 'Insatisfecho', 'Satisfecho', 'Muy satisfecho', 'Totalmente satisfecho'];
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
  const [fechaFin, setFechaFin] = useState('');
  const [resultado, setResultado] = useState('');
  const [nivelDificultad, setNivelDificultad] = useState(3);
  const [rendimientoJugador, setRendimientoJugador] = useState<RendimientoJugador>('Bueno');
  const [conformidadGeneral, setConformidadGeneral] = useState<ConformidadGeneral>('Satisfecho');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (existingDisputedTournament) {
      setNombreTorneo(existingDisputedTournament.nombreTorneo);
      setFechaInicio(existingDisputedTournament.fechaInicio.split('T')[0]);
      setFechaFin(existingDisputedTournament.fechaFin.split('T')[0]);
      setResultado(existingDisputedTournament.resultado);
      setNivelDificultad(existingDisputedTournament.nivelDificultad);
      setRendimientoJugador(existingDisputedTournament.rendimientoJugador);
      setConformidadGeneral(existingDisputedTournament.conformidadGeneral);
      setObservaciones(existingDisputedTournament.observaciones || '');
    } else if (futureTournamentToConvert) {
      setNombreTorneo(futureTournamentToConvert.nombreTorneo);
      setFechaInicio(futureTournamentToConvert.fechaInicio.split('T')[0]);
      setFechaFin(futureTournamentToConvert.fechaFin.split('T')[0]);
      // Resetear campos de evaluación
      setResultado('');
      setNivelDificultad(3);
      setRendimientoJugador('Bueno');
      setConformidadGeneral('Satisfecho');
      setObservaciones('');
    } else {
      setNombreTorneo(''); setFechaInicio(''); setFechaFin(''); setResultado('');
      setNivelDificultad(3); setRendimientoJugador('Bueno');
      setConformidadGeneral('Satisfecho'); setObservaciones('');
    }
    setError('');
  }, [existingDisputedTournament, futureTournamentToConvert, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreTorneo.trim() || !fechaInicio || !fechaFin || !resultado.trim()) {
      setError('Por favor, completa todos los campos obligatorios.');
      return;
    }
    if (new Date(fechaInicio) > new Date(fechaFin)) {
      setError('La fecha de inicio no puede ser posterior a la fecha de fin.');
      return;
    }
    const tournamentData = {
      nombreTorneo: nombreTorneo.trim(),
      fechaInicio: new Date(fechaInicio + 'T00:00:00Z').toISOString(),
      fechaFin: new Date(fechaFin + 'T00:00:00Z').toISOString(),
      resultado: resultado.trim(),
      nivelDificultad, rendimientoJugador, conformidadGeneral,
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

  const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} className={`app-input w-full ${props.className}`} />;
  const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props} className={`app-input w-full ${props.className}`} />;
  const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} className={`app-input w-full resize-none ${props.className}`} />;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getTitle()}>
      <form onSubmit={handleSubmit} className="space-y-6 custom-scrollbar pr-2 -mr-2">
        <CardSection title="Información del Torneo">
          <div className="space-y-4">
            <div>
              <label htmlFor="nombreTorneo" className="block text-sm font-medium text-gray-400 mb-2">Nombre del Torneo</label>
              <Input type="text" id="nombreTorneo" value={nombreTorneo} onChange={(e) => setNombreTorneo(e.target.value)} required disabled={!!futureTournamentToConvert} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="fechaInicio" className="block text-sm font-medium text-gray-400 mb-2">Fecha de Inicio</label>
                <Input type="date" id="fechaInicio" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} required disabled={!!futureTournamentToConvert} />
              </div>
              <div>
                <label htmlFor="fechaFin" className="block text-sm font-medium text-gray-400 mb-2">Fecha de Fin</label>
                <Input type="date" id="fechaFin" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} required disabled={!!futureTournamentToConvert} />
              </div>
            </div>
          </div>
        </CardSection>
        
        <CardSection title="Resultado y Evaluación">
          <div className="space-y-6">
            <div>
              <label htmlFor="resultado" className="block text-sm font-medium text-gray-400 mb-2">Resultado Final</label>
              <div className="flex gap-2">
                <Input type="text" id="resultado" value={resultado} onChange={(e) => setResultado(e.target.value)} placeholder="Ej: Semifinal" required className="flex-1" />
                <Select onChange={(e) => setResultado(e.target.value)} value="" className="flex-shrink-0 w-auto">
                  <option value="" disabled>Sugerencias</option>
                  {RESULTADO_SUGERIDOS.map(res => <option key={res} value={res}>{res}</option>)}
                </Select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-3">Nivel de Dificultad del Torneo</label>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">Fácil</span>
                <input type="range" min="1" max="5" value={nivelDificultad} onChange={(e) => setNivelDificultad(Number(e.target.value))} className="w-full" />
                <span className="text-sm text-gray-500">Difícil</span>
                <span className="ml-2 font-bold text-green-400 bg-gray-800/50 px-3 py-1 rounded-full">{nivelDificultad}</span>
              </div>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">Rendimiento del Jugador</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {RENDIMIENTO_OPTIONS.map(option => (
                        <label key={option} className={`flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 border-2 ${rendimientoJugador === option ? 'border-green-500 bg-green-500/10' : 'border-gray-700 bg-gray-800/30 hover:border-green-500/50'}`}>
                            <input type="radio" name="rendimiento" value={option} checked={rendimientoJugador === option} onChange={(e) => setRendimientoJugador(e.target.value as RendimientoJugador)} className="mr-3" />
                            <span className="text-sm text-gray-200">{option}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Nivel de Conformidad General</label>
              <Select value={conformidadGeneral} onChange={(e) => setConformidadGeneral(e.target.value as ConformidadGeneral)}>
                {CONFORMIDAD_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
              </Select>
            </div>
            
            <div>
              <label htmlFor="observaciones" className="block text-sm font-medium text-gray-400 mb-2">Observaciones (opcional)</label>
              <Textarea id="observaciones" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={3} placeholder="Notas adicionales sobre el torneo..." />
            </div>
          </div>
        </CardSection>
        
        {error && <div className="p-3 bg-red-900/40 border border-red-500/50 rounded-lg text-red-300 text-sm">{error}</div>}
        
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button type="submit" className="app-button btn-primary flex-1">{existingDisputedTournament ? 'Guardar Cambios' : 'Registrar Torneo'}</button>
          <button type="button" onClick={onClose} className="app-button btn-secondary flex-1">Cancelar</button>
        </div>
      </form>
    </Modal>
  );
};

export default DisputedTournamentFormModal;