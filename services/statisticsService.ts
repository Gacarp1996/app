// services/statisticsService.ts
import { TrainingSession, LoggedExercise, PostTrainingSurvey, ChartDataPoint, IntensityDataPoint } from '../types/types';
import { TipoType, AreaType } from '../constants/training';
import { calculateExerciseStatsByTime, calculateAverageIntensity, calculateDailyAverages, parseTimeToMinutes } from '../utils/calculations';
import { formatDateShort, getUserTimeZone } from '../utils/dateHelpers';
import { RecommendationService } from './recommendationService';

export interface DrillDownData {
  data: ChartDataPoint[];
  title: string;
}

/**
 * Servicio para cálculos estadísticos de entrenamientos
 */
export class StatisticsService {
  /**
   * Calcula datos para gráfico de drill-down
   */
  static calculateDrillDownData(
    sessions: TrainingSession[],
    drillDownPath: string[]
  ): DrillDownData {
    const timeSums: Record<string, number> = {};
    let title = "Distribución por Tipo (minutos)";
    let dataType: 'TrainingType' | 'TrainingArea' | 'Exercise' = 'TrainingType';
    
    if (drillDownPath.length === 0) {
      // Nivel 1: Por tipo
      sessions.forEach(s => s.ejercicios.forEach(ex => {
        const minutes = parseTimeToMinutes(ex.tiempoCantidad);
        timeSums[ex.tipo] = (timeSums[ex.tipo] || 0) + minutes;
      }));
      dataType = 'TrainingType';
    } else if (drillDownPath.length === 1) {
      // Nivel 2: Por área dentro del tipo
      const type = drillDownPath[0] as TipoType;
      title = `${type}: Por Área (minutos)`;
      sessions.forEach(s => s.ejercicios.forEach(ex => {
        if (ex.tipo === type) {
          const minutes = parseTimeToMinutes(ex.tiempoCantidad);
          timeSums[ex.area] = (timeSums[ex.area] || 0) + minutes;
        }
      }));
      dataType = 'TrainingArea';
    } else {
      // Nivel 3: Por ejercicio específico
      const [type, area] = drillDownPath;
      title = `${type} - ${area}: Por Ejercicio (minutos)`;
      sessions.forEach(s => s.ejercicios.forEach(ex => {
        if (ex.tipo === type && ex.area === area) {
          const minutes = parseTimeToMinutes(ex.tiempoCantidad);
          timeSums[ex.ejercicio] = (timeSums[ex.ejercicio] || 0) + minutes;
        }
      }));
      dataType = 'Exercise';
    }
    
    const data = Object.entries(timeSums).map(([name, value]) => ({
      name,
      value,
      type: dataType
    }));
    
    return { data, title };
  }
  
  /**
   * Calcula datos de intensidad para gráfico
   */
  static calculateIntensityData(
    sessions: TrainingSession[],
    drillDownPath: string[],
    userTimeZone?: string
  ): { data: IntensityDataPoint[]; title: string } {
    const timeZone = userTimeZone || getUserTimeZone();
    let title = "Progresión de Intensidad (General)";
    
    // Filtrar ejercicios según drill-down
    const sessionsWithAvg = sessions.map(session => {
      let relevantExercises = session.ejercicios;
      
      if (drillDownPath.length === 1) {
        const type = drillDownPath[0] as TipoType;
        relevantExercises = session.ejercicios.filter(ex => ex.tipo === type);
        title = `Intensidad (${type})`;
      } else if (drillDownPath.length === 2) {
        const [type, area] = drillDownPath;
        relevantExercises = session.ejercicios.filter(ex => 
          ex.tipo === type && ex.area === area
        );
        title = `Intensidad (${type} - ${area})`;
      }
      
      const avg = calculateAverageIntensity(relevantExercises);
      return { ...session, avgIntensity: avg };
    }).filter(s => s.avgIntensity > 0);
    
    // Calcular promedios diarios
    const dailyAverages = calculateDailyAverages(
      sessionsWithAvg,
      s => s.fecha,
      s => s.avgIntensity,
      timeZone
    );
    
    const data: IntensityDataPoint[] = dailyAverages.map(item => ({
      fecha: item.date,
      intensidad: item.value
    }));
    
    return { data, title };
  }
  
  /**
   * Calcula datos para gráfico de radar de encuestas
   */
  static calculateRadarData(surveys: PostTrainingSurvey[]) {
    if (!surveys || surveys.length === 0) return [];
    
    const totals = surveys.reduce((acc, survey) => ({
      cansancioFisico: acc.cansancioFisico + (survey.cansancioFisico || 0),
      concentracion: acc.concentracion + (survey.concentracion || 0),
      actitudMental: acc.actitudMental + (survey.actitudMental || 0),
      sensacionesTenisticas: acc.sensacionesTenisticas + (survey.sensacionesTenisticas || 0)
    }), {
      cansancioFisico: 0,
      concentracion: 0,
      actitudMental: 0,
      sensacionesTenisticas: 0
    });
    
    const count = surveys.length;
    
    return [
      { metric: 'Energía', value: parseFloat((totals.cansancioFisico / count).toFixed(1)), fullMark: 5 },
      { metric: 'Concentración', value: parseFloat((totals.concentracion / count).toFixed(1)), fullMark: 5 },
      { metric: 'Actitud', value: parseFloat((totals.actitudMental / count).toFixed(1)), fullMark: 5 },
      { metric: 'Sensaciones', value: parseFloat((totals.sensacionesTenisticas / count).toFixed(1)), fullMark: 5 }
    ];
  }
  
  /**
   * Prepara datos de métricas individuales para gráficos
   */
  static prepareIndividualMetricData(
    surveys: PostTrainingSurvey[],
    metricKey: keyof PostTrainingSurvey,
    userTimeZone?: string
  ) {
    if (!surveys || surveys.length === 0) return [];
    
    const timeZone = userTimeZone || getUserTimeZone();
    
    return calculateDailyAverages(
      surveys,
      s => s.fecha,
      s => (s[metricKey] as number) || 0,
      timeZone
    ).map(item => ({
      fecha: item.date,
      value: item.value,
      surveysCount: item.count
    }));
  }
  

}