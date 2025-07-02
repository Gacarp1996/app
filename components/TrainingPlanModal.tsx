import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Player } from '../types';
import { NEW_EXERCISE_HIERARCHY_CONST } from '../constants';
import { getTrainingPlan, saveTrainingPlan, TrainingPlan } from '../Database/FirebaseTrainingPlans';
import { useAcademia } from '../contexts/AcademiaContext';

interface TrainingPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
}

// Componente para una sección con estilo de cristal
const CardSection: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <div className={`relative bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-2xl shadow-lg shadow-green-500/10 ${className}`}>
    <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl p-4 sm:p-6">
      {title && (
        <h3 className="text-xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-4">
          {title}
        </h3>
      )}
      {children}
    </div>
  </div>
);

const TrainingPlanModal: React.FC<TrainingPlanModalProps> = ({ isOpen, onClose, player }) => {
  const { academiaActual } = useAcademia();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rangoAnalisis, setRangoAnalisis] = useState(30);
  const [planificacion, setPlanificacion] = useState<TrainingPlan['planificacion']>({});

  useEffect(() => {
    if (isOpen && academiaActual) {
      loadExistingPlan();
    }
  }, [isOpen, academiaActual, player.id]);

  const loadExistingPlan = async () => {
    if (!academiaActual) return;
    setLoading(true);
    try {
      const existingPlan = await getTrainingPlan(academiaActual.id, player.id);
      if (existingPlan && existingPlan.planificacion) {
        setPlanificacion(existingPlan.planificacion);
        setRangoAnalisis(existingPlan.rangoAnalisis || 30);
      } else {
        initializeEmptyPlan();
      }
    } catch (error) {
      console.error('Error cargando plan:', error);
      initializeEmptyPlan();
    } finally {
      setLoading(false);
    }
  };

  const initializeEmptyPlan = () => {
    const newPlan: TrainingPlan['planificacion'] = {};
    Object.keys(NEW_EXERCISE_HIERARCHY_CONST).forEach(tipo => {
      newPlan[tipo] = { porcentajeTotal: 0, areas: {} };
      Object.keys(NEW_EXERCISE_HIERARCHY_CONST[tipo]).forEach(area => {
        newPlan[tipo].areas[area] = { porcentajeDelTotal: 0, ejercicios: {} };
        NEW_EXERCISE_HIERARCHY_CONST[tipo][area].forEach(ejercicio => {
          newPlan[tipo].areas[area].ejercicios![ejercicio] = { porcentajeDelTotal: 0 };
        });
      });
    });
    setPlanificacion(newPlan);
  };

  const handlePercentageChange = (path: string[], value: number) => {
    setPlanificacion(prev => {
      const newPlan = JSON.parse(JSON.stringify(prev)); // Deep copy
      let currentLevel = newPlan;
      for (let i = 0; i < path.length - 1; i++) {
        currentLevel = currentLevel[path[i]];
      }
      currentLevel[path[path.length - 1]] = value;
      return newPlan;
    });
  };
  
  const handleTipoPercentageChange = (tipo: string, value: number) => handlePercentageChange([tipo, 'porcentajeTotal'], value);
  const handleAreaPercentageChange = (tipo: string, area: string, value: number) => handlePercentageChange([tipo, 'areas', area, 'porcentajeDelTotal'], value);
  const handleEjercicioPercentageChange = (tipo: string, area: string, ejercicio: string, value: number) => handlePercentageChange([tipo, 'areas', area, 'ejercicios', ejercicio, 'porcentajeDelTotal'], value);

  const calculateTotalPercentage = (): number => Object.values(planificacion).reduce((sum, tipo) => sum + (tipo.porcentajeTotal || 0), 0);
  const calculateAreasTotalPercentage = (tipo: string): number => Object.values(planificacion[tipo]?.areas || {}).reduce((sum, area) => sum + (area.porcentajeDelTotal || 0), 0);
  const calculateEjerciciosTotalPercentage = (tipo: string, area: string): number => Object.values(planificacion[tipo]?.areas[area]?.ejercicios || {}).reduce((sum, ej) => sum + (ej.porcentajeDelTotal || 0), 0);

  const handleSave = async () => {
    if (!academiaActual) return;
    const total = calculateTotalPercentage();
    if (Math.abs(total - 100) > 0.01) {
      alert(`El total de porcentajes debe ser 100%. Actualmente es: ${total.toFixed(2)}%`);
      return;
    }
    setSaving(true);
    try {
      await saveTrainingPlan(academiaActual.id, player.id, {
        jugadorId: player.id,
        fechaActualizacion: new Date().toISOString(),
        rangoAnalisis,
        planificacion
      });
      alert('Plan de entrenamiento guardado exitosamente');
      onClose();
    } catch (error) {
      console.error('Error guardando plan:', error);
      alert('Error al guardar el plan de entrenamiento');
    } finally {
      setSaving(false);
    }
  };
  
  const InputNumber = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input 
      type="number" 
      step="0.1"
      min="0"
      {...props}
      className={`px-3 py-1.5 bg-gray-800/70 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 ${props.className}`}
    />
  );

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={`Plan de Entrenamiento - ${player.name}`}>
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 shadow-lg shadow-green-500/50"></div>
        </div>
      </Modal>
    );
  }

  const totalPercentage = calculateTotalPercentage();
  const isTotalCorrect = Math.abs(totalPercentage - 100) < 0.01;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Plan de Entrenamiento - ${player.name}`}>
      <div className="space-y-6 custom-scrollbar pr-4 -mr-4">
        
        <CardSection title="Configuración General">
          <label className="block text-sm font-medium text-gray-400 mb-2">Días hacia atrás para análisis</label>
          <InputNumber
            value={rangoAnalisis}
            onChange={(e) => setRangoAnalisis(Number(e.target.value))}
            max="365"
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-2">Se analizarán los últimos {rangoAnalisis} días de entrenamiento.</p>
        </CardSection>

        <div className={`relative bg-gradient-to-br p-[1px] rounded-2xl shadow-lg ${isTotalCorrect ? 'from-green-500/20 to-cyan-500/20 shadow-green-500/20' : 'from-red-500/20 to-orange-500/20 shadow-red-500/20'}`}>
          <div className={`bg-gray-900/95 backdrop-blur-xl rounded-2xl p-4 flex items-center justify-between`}>
            <span className="text-lg font-bold text-white">Total General:</span>
            <span className={`text-2xl font-black ${isTotalCorrect ? 'text-green-400' : 'text-red-400'}`}>
              {totalPercentage.toFixed(1)}%
            </span>
          </div>
        </div>

        {Object.keys(NEW_EXERCISE_HIERARCHY_CONST).map(tipo => (
          <CardSection key={tipo}>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">{tipo}</h3>
              <div className="flex items-center gap-2">
                <InputNumber
                  value={planificacion[tipo]?.porcentajeTotal || 0}
                  onChange={(e) => handleTipoPercentageChange(tipo, Number(e.target.value))}
                  max="100"
                  className="w-24 text-lg text-center"
                />
                <span className="text-lg font-semibold text-gray-400">%</span>
              </div>
            </div>

            {planificacion[tipo]?.porcentajeTotal > 0 && (
              <div className="mt-4 pl-4 border-l-2 border-gray-800 space-y-3">
                <div className="text-sm text-gray-500">
                  Total áreas: <span className={Math.abs(calculateAreasTotalPercentage(tipo) - planificacion[tipo].porcentajeTotal) < 0.01 ? 'text-green-400' : 'text-yellow-400'}>
                    {calculateAreasTotalPercentage(tipo).toFixed(1)}%
                  </span> / {planificacion[tipo].porcentajeTotal}%
                </div>
                
                {Object.keys(NEW_EXERCISE_HIERARCHY_CONST[tipo]).map(area => (
                  <div key={area} className="bg-gray-800/30 rounded-lg p-3 space-y-2 border border-gray-700/50">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-cyan-300">{area}</h4>
                      <div className="flex items-center gap-2">
                        <InputNumber
                          value={planificacion[tipo]?.areas[area]?.porcentajeDelTotal || 0}
                          onChange={(e) => handleAreaPercentageChange(tipo, area, Number(e.target.value))}
                          max={planificacion[tipo].porcentajeTotal}
                          className="w-20 text-center"
                        />
                        <span className="text-sm text-gray-400">%</span>
                      </div>
                    </div>

                    {planificacion[tipo]?.areas[area]?.porcentajeDelTotal > 0 && (
                       <div className="mt-2 pl-4 border-l-2 border-gray-700/50 space-y-1">
                        <div className="text-xs text-gray-500">
                          Total ejercicios: <span className={Math.abs(calculateEjerciciosTotalPercentage(tipo, area) - planificacion[tipo].areas[area].porcentajeDelTotal) < 0.01 ? 'text-green-400' : 'text-yellow-400'}>
                            {calculateEjerciciosTotalPercentage(tipo, area).toFixed(1)}%
                          </span> / {planificacion[tipo].areas[area].porcentajeDelTotal}%
                        </div>
                        {NEW_EXERCISE_HIERARCHY_CONST[tipo][area].map(ejercicio => (
                          <div key={ejercicio} className="flex items-center justify-between py-1 px-2 hover:bg-gray-800/50 rounded">
                            <span className="text-sm text-gray-300">{ejercicio}</span>
                            <div className="flex items-center gap-1">
                              <InputNumber
                                value={planificacion[tipo]?.areas[area]?.ejercicios?.[ejercicio]?.porcentajeDelTotal || 0}
                                onChange={(e) => handleEjercicioPercentageChange(tipo, area, ejercicio, Number(e.target.value))}
                                max={planificacion[tipo].areas[area].porcentajeDelTotal}
                                className="w-16 text-center text-xs"
                              />
                              <span className="text-xs text-gray-500">%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardSection>
        ))}

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={saving || !isTotalCorrect}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-green-500/25"
          >
            {saving ? 'Guardando...' : 'Guardar Plan'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-200 border border-gray-700"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default TrainingPlanModal;