import React, { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import { Player } from '../../types';
import { NEW_EXERCISE_HIERARCHY_CONST } from '../../constants/index';
import { getTrainingPlan, saveTrainingPlan, TrainingPlan } from '../../Database/FirebaseTrainingPlans';
import { useAcademia } from '../../contexts/AcademiaContext';

interface TrainingPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
}

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
      
      if (existingPlan) {
        setPlanificacion(existingPlan.planificacion);
        setRangoAnalisis(existingPlan.rangoAnalisis);
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
      newPlan[tipo] = {
        porcentajeTotal: 0,
        areas: {}
      };
      
      Object.keys(NEW_EXERCISE_HIERARCHY_CONST[tipo]).forEach(area => {
        newPlan[tipo].areas[area] = {
          porcentajeDelTotal: 0,
          ejercicios: {}
        };
        
        NEW_EXERCISE_HIERARCHY_CONST[tipo][area].forEach(ejercicio => {
          newPlan[tipo].areas[area].ejercicios![ejercicio] = {
            porcentajeDelTotal: 0
          };
        });
      });
    });
    
    setPlanificacion(newPlan);
  };

  const handleTipoPercentageChange = (tipo: string, value: number) => {
    setPlanificacion(prev => ({
      ...prev,
      [tipo]: {
        ...prev[tipo],
        porcentajeTotal: value
      }
    }));
  };

  const handleAreaPercentageChange = (tipo: string, area: string, value: number) => {
    setPlanificacion(prev => ({
      ...prev,
      [tipo]: {
        ...prev[tipo],
        areas: {
          ...prev[tipo].areas,
          [area]: {
            ...prev[tipo].areas[area],
            porcentajeDelTotal: value
          }
        }
      }
    }));
  };

  const handleEjercicioPercentageChange = (tipo: string, area: string, ejercicio: string, value: number) => {
    setPlanificacion(prev => ({
      ...prev,
      [tipo]: {
        ...prev[tipo],
        areas: {
          ...prev[tipo].areas,
          [area]: {
            ...prev[tipo].areas[area],
            ejercicios: {
              ...prev[tipo].areas[area].ejercicios,
              [ejercicio]: {
                porcentajeDelTotal: value
              }
            }
          }
        }
      }
    }));
  };

  const calculateTotalPercentage = (): number => {
    return Object.values(planificacion).reduce((sum, tipo) => sum + tipo.porcentajeTotal, 0);
  };

  const calculateAreasTotalPercentage = (tipo: string): number => {
    return Object.values(planificacion[tipo]?.areas || {}).reduce(
      (sum, area) => sum + area.porcentajeDelTotal, 0
    );
  };

  const calculateEjerciciosTotalPercentage = (tipo: string, area: string): number => {
    return Object.values(planificacion[tipo]?.areas[area]?.ejercicios || {}).reduce(
      (sum, ej) => sum + ej.porcentajeDelTotal, 0
    );
  };

  const handleSave = async () => {
    if (!academiaActual) return;
    
    const total = calculateTotalPercentage();
    if (Math.abs(total - 100) > 0.01) {
      alert(`El total de porcentajes debe ser 100%. Actualmente es: ${total.toFixed(2)}%`);
      return;
    }

    setSaving(true);
    try {
      const planData: Omit<TrainingPlan, 'fechaCreacion'> = {
        jugadorId: player.id,
        fechaActualizacion: new Date().toISOString(),
        rangoAnalisis,
        planificacion
      };
      
      await saveTrainingPlan(academiaActual.id, player.id, planData);
      alert('Plan de entrenamiento guardado exitosamente');
      onClose();
    } catch (error) {
      console.error('Error guardando plan:', error);
      alert('Error al guardar el plan de entrenamiento');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={`Plan de Entrenamiento - ${player.name}`}>
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto shadow-lg shadow-green-500/50"></div>
          <p className="mt-4 text-gray-400">Cargando plan...</p>
        </div>
      </Modal>
    );
  }

  const totalPercentage = calculateTotalPercentage();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Plan de Entrenamiento - ${player.name}`}>
      <div className="space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Configuración de rango de análisis */}
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Días hacia atrás para análisis
          </label>
          <input
            type="number"
            value={rangoAnalisis}
            onChange={(e) => setRangoAnalisis(Number(e.target.value))}
            min="7"
            max="365"
            className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
          />
          <p className="text-xs text-gray-500 mt-2">
            Se analizarán los últimos {rangoAnalisis} días de entrenamiento
          </p>
        </div>

        {/* Total general */}
        <div className={`p-4 rounded-lg border-2 transition-all duration-300 ${
          Math.abs(totalPercentage - 100) < 0.01 
            ? 'bg-green-500/10 border-green-500/50 shadow-lg shadow-green-500/20' 
            : 'bg-red-500/10 border-red-500/50 shadow-lg shadow-red-500/20'
        }`}>
          <p className="font-bold text-lg flex items-center justify-between">
            <span>Total General:</span>
            <span className={Math.abs(totalPercentage - 100) < 0.01 ? 'text-green-400' : 'text-red-400'}>
              {totalPercentage.toFixed(2)}% / 100%
            </span>
          </p>
        </div>

        {/* Planificación por tipo */}
        {Object.keys(NEW_EXERCISE_HIERARCHY_CONST).map(tipo => (
          <div key={tipo} className="border border-gray-700 rounded-lg p-4 space-y-4 bg-gray-900/50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-green-400">{tipo}</h3>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={planificacion[tipo]?.porcentajeTotal || 0}
                  onChange={(e) => handleTipoPercentageChange(tipo, Number(e.target.value))}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-20 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/20"
                />
                <span className="text-sm text-gray-400">%</span>
              </div>
            </div>

            {planificacion[tipo]?.porcentajeTotal > 0 && (
              <div className="ml-4 space-y-3">
                <div className="text-sm text-gray-500">
                  Total áreas: <span className={calculateAreasTotalPercentage(tipo) === planificacion[tipo].porcentajeTotal ? 'text-green-400' : 'text-yellow-400'}>
                    {calculateAreasTotalPercentage(tipo).toFixed(2)}%
                  </span> / {planificacion[tipo].porcentajeTotal}%
                </div>
                
                {Object.keys(NEW_EXERCISE_HIERARCHY_CONST[tipo]).map(area => (
                  <div key={area} className="bg-gray-800/30 rounded-lg p-3 space-y-2 border border-gray-700/50">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-cyan-400">{area}</h4>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={planificacion[tipo]?.areas[area]?.porcentajeDelTotal || 0}
                          onChange={(e) => handleAreaPercentageChange(tipo, area, Number(e.target.value))}
                          min="0"
                          max={planificacion[tipo].porcentajeTotal}
                          step="0.1"
                          className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                        />
                        <span className="text-xs text-gray-400">%</span>
                      </div>
                    </div>

                    {planificacion[tipo]?.areas[area]?.porcentajeDelTotal > 0 && (
                      <div className="ml-4 space-y-1">
                        <div className="text-xs text-gray-500">
                          Total ejercicios: <span className={calculateEjerciciosTotalPercentage(tipo, area) === planificacion[tipo].areas[area].porcentajeDelTotal ? 'text-green-400' : 'text-yellow-400'}>
                            {calculateEjerciciosTotalPercentage(tipo, area).toFixed(2)}%
                          </span> / {planificacion[tipo].areas[area].porcentajeDelTotal}%
                        </div>
                        {NEW_EXERCISE_HIERARCHY_CONST[tipo][area].map(ejercicio => (
                          <div key={ejercicio} className="flex items-center justify-between py-1 px-2 hover:bg-gray-800/50 rounded">
                            <span className="text-sm text-gray-300">{ejercicio}</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={planificacion[tipo]?.areas[area]?.ejercicios?.[ejercicio]?.porcentajeDelTotal || 0}
                                onChange={(e) => handleEjercicioPercentageChange(tipo, area, ejercicio, Number(e.target.value))}
                                min="0"
                                max={planificacion[tipo].areas[area].porcentajeDelTotal}
                                step="0.1"
                                className="w-14 px-1 py-0.5 bg-gray-900 border border-gray-700 rounded text-white text-xs focus:outline-none focus:border-green-500"
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
          </div>
        ))}

        {/* Botones de acción */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={saving || Math.abs(totalPercentage - 100) > 0.01}
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