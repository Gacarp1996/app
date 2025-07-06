import React, { useState, useEffect } from 'react';


import Modal from '../shared/Modal';
import { ConformidadGeneral, DisputedTournament, RendimientoJugador, Tournament } from '@/types';

interface DisputedTournamentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tournamentData: Omit<DisputedTournament, 'id' | 'jugadorId' | 'fechaRegistro'>) => void;
  playerId: string;
  existingDisputedTournament?: DisputedTournament | null;
  futureTournamentToConvert?: Tournament | null;
}

const RENDIMIENTO_OPTIONS: RendimientoJugador[] = [
  'Muy malo', 'Malo', 'Bueno', 'Muy bueno', 'Excelente'
];

const CONFORMIDAD_OPTIONS: ConformidadGeneral[] = [
  'Muy insatisfecho', 'Insatisfecho', 'Satisfecho', 'Muy satisfecho', 'Totalmente satisfecho'
];

const RESULTADO_SUGERIDOS = [
  'Campeón',
  'Finalista',
  'Semifinal',
  'Cuartos de final',
  'Octavos de final',
  'Segunda ronda',
  'Primera ronda',
  'Clasificación'
];

const DisputedTournamentFormModal: React.FC<DisputedTournamentFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingDisputedTournament,
  futureTournamentToConvert,
}) => {
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
      setResultado('');
      setNivelDificultad(3);
      setRendimientoJugador('Bueno');
      setConformidadGeneral('Satisfecho');
      setObservaciones('');
    } else {
      resetForm();
    }
    setError('');
  }, [existingDisputedTournament, futureTournamentToConvert, isOpen]);

  const resetForm = () => {
    setNombreTorneo('');
    setFechaInicio('');
    setFechaFin('');
    setResultado('');
    setNivelDificultad(3);
    setRendimientoJugador('Bueno');
    setConformidadGeneral('Satisfecho');
    setObservaciones('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nombreTorneo.trim()) {
      setError('El nombre del torneo no puede estar vacío.');
      return;
    }
    if (!fechaInicio || !fechaFin) {
      setError('Debe seleccionar una fecha de inicio y una fecha de fin.');
      return;
    }
    if (new Date(fechaInicio) > new Date(fechaFin)) {
      setError('La fecha de inicio no puede ser posterior a la fecha de fin.');
      return;
    }
    if (!resultado.trim()) {
      setError('Debe indicar el resultado del torneo.');
      return;
    }

    const tournamentData: Omit<DisputedTournament, 'id' | 'jugadorId' | 'fechaRegistro'> = {
      nombreTorneo: nombreTorneo.trim(),
      fechaInicio: new Date(fechaInicio + 'T00:00:00Z').toISOString(),
      fechaFin: new Date(fechaFin + 'T00:00:00Z').toISOString(),
      resultado: resultado.trim(),
      nivelDificultad,
      rendimientoJugador,
      conformidadGeneral,
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getTitle()}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Información básica del torneo */}
        <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
          <h4 className="font-semibold text-green-400">Información del Torneo</h4>
          
          <div>
            <label htmlFor="nombreTorneo" className="block text-sm font-medium text-gray-400 mb-1">
              Nombre del Torneo
            </label>
            <input
              type="text"
              id="nombreTorneo"
              value={nombreTorneo}
              onChange={(e) => setNombreTorneo(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              required
              disabled={!!futureTournamentToConvert}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fechaInicio" className="block text-sm font-medium text-gray-400 mb-1">
                Fecha de Inicio
              </label>
              <input
                type="date"
                id="fechaInicio"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                required
                disabled={!!futureTournamentToConvert}
              />
            </div>
            <div>
              <label htmlFor="fechaFin" className="block text-sm font-medium text-gray-400 mb-1">
                Fecha de Fin
              </label>
              <input
                type="date"
                id="fechaFin"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                required
                disabled={!!futureTournamentToConvert}
              />
            </div>
          </div>
        </div>

        {/* Resultado del torneo */}
        <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
          <h4 className="font-semibold text-green-400">Resultado y Evaluación</h4>
          
          <div>
            <label htmlFor="resultado" className="block text-sm font-medium text-gray-400 mb-1">
              Resultado Final
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="resultado"
                value={resultado}
                onChange={(e) => setResultado(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                placeholder="Ej: Semifinal, Ganó, Perdió en 1R..."
                required
              />
              <select
                onChange={(e) => setResultado(e.target.value)}
                className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                value=""
              >
                <option value="" disabled>Sugerencias</option>
                {RESULTADO_SUGERIDOS.map(res => (
                  <option key={res} value={res}>{res}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-3">
              Nivel de Dificultad del Torneo
            </label>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">Muy fácil</span>
              <input
                type="range"
                min="1"
                max="5"
                value={nivelDificultad}
                onChange={(e) => setNivelDificultad(Number(e.target.value))}
                className="flex-1 accent-green-500"
              />
              <span className="text-sm text-gray-500">Muy difícil</span>
              <span className="ml-2 font-bold text-green-400 bg-gray-800 px-3 py-1 rounded-full">{nivelDificultad}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-3">
              Rendimiento del Jugador
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {RENDIMIENTO_OPTIONS.map(option => (
                <label key={option} className="flex items-center p-2 bg-gray-800/30 rounded-lg cursor-pointer hover:bg-gray-800/50 transition-colors">
                  <input
                    type="radio"
                    name="rendimiento"
                    value={option}
                    checked={rendimientoJugador === option}
                    onChange={(e) => setRendimientoJugador(e.target.value as RendimientoJugador)}
                    className="mr-2 accent-green-500"
                  />
                  <span className="text-sm text-gray-300">{option}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Nivel de Conformidad General
            </label>
            <select
              value={conformidadGeneral}
              onChange={(e) => setConformidadGeneral(e.target.value as ConformidadGeneral)}
              className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
            >
              {CONFORMIDAD_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="observaciones" className="block text-sm font-medium text-gray-400 mb-1">
              Observaciones (opcional)
            </label>
            <textarea
              id="observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 resize-none"
              rows={3}
              placeholder="Notas adicionales sobre el torneo..."
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="submit"
            className="flex-1 py-3 px-4 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/25"
          >
            {existingDisputedTournament ? 'Guardar Cambios' : 'Registrar Torneo'}
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

export default DisputedTournamentFormModal;