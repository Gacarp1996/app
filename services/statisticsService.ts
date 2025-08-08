// services/statisticsService.ts
import { TrainingSession, LoggedExercise, PostTrainingSurvey, ChartDataPoint, IntensityDataPoint } from '../types';
import { TipoType, AreaType } from '../constants/training';
import { calculateExerciseStatsByTime, calculateAverageIntensity, calculateDailyAverages, parseTimeToMinutes } from '../utils/calculations';
import { formatDateShort, getUserTimeZone } from '../utils/dateHelpers';
import { TrainingStructureService } from './trainingStructure';

export interface DrillDownData {
  data: ChartDataPoint[];
  title: string;
}

export interface PlayerAnalysis {
  recommendations: any[];
  totalExercises: number;
  totalMinutes: number;
  typeStats: any;
  areaStats: any;
  sessionsAnalyzed: number;
  planUsed: 'real' | 'default';
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
  
  /**
   * Analiza ejercicios de un jugador y genera estadísticas
   */
  static analyzePlayerExercises(
    exercises: LoggedExercise[],
    trainingPlan?: any
  ): PlayerAnalysis {
    if (exercises.length === 0) {
      return {
        recommendations: [],
        totalExercises: 0,
        totalMinutes: 0,
        typeStats: {},
        areaStats: {},
        sessionsAnalyzed: 0,
        planUsed: 'default'
      };
    }
    
    const stats = calculateExerciseStatsByTime(exercises);
    
    // Convertir al formato esperado
    const typeStats: any = {};
    const areaStats: any = {};
    
    Object.keys(stats.typeStats).forEach(tipo => {
      typeStats[tipo] = {
        total: Math.round(stats.typeStats[tipo].total),
        percentage: Math.round(stats.typeStats[tipo].percentage),
        areas: {}
      };
      
      Object.keys(stats.typeStats[tipo].areas).forEach(area => {
        const areaData = stats.typeStats[tipo].areas[area];
        typeStats[tipo].areas[area] = {
          total: Math.round(areaData.total),
          percentage: Math.round(areaData.percentage),
          exercises: areaData.exercises
        };
      });
    });
    
    Object.keys(stats.areaStats).forEach(area => {
      areaStats[area] = {
        total: Math.round(stats.areaStats[area].total),
        percentage: Math.round(stats.areaStats[area].percentage)
      };
    });
    
    // Generar recomendaciones basadas en el plan
    const recommendations = this.generateRecommendations(
      typeStats,
      areaStats,
      trainingPlan,
      exercises.length
    );
    
    return {
      recommendations,
      totalExercises: exercises.length,
      totalMinutes: Math.round(stats.totalMinutes),
      typeStats,
      areaStats,
      sessionsAnalyzed: 0, // Se debe pasar desde fuera
      planUsed: trainingPlan ? 'real' : 'default'
    };
  }
  
  /**
   * Genera recomendaciones basadas en estadísticas y plan
   */
  private static generateRecommendations(
    typeStats: any,
    areaStats: any,
    trainingPlan: any,
    totalExercises: number
  ): any[] {
    const recommendations: any[] = [];
    const defaultPercentages = TrainingStructureService.getDefaultTypePercentages();
    const defaultAreaPercentages = TrainingStructureService.getDefaultAreaPercentages();
    
    Object.entries(typeStats).forEach(([tipo, stats]: [string, any]) => {
      const plannedPercentage = trainingPlan?.planificacion?.[tipo as TipoType]?.porcentajeTotal 
        || defaultPercentages[tipo as TipoType] 
        || 50;
      
      const difference = Math.abs(stats.percentage - plannedPercentage);
      
      if (difference > 5) {
        recommendations.push({
          level: 'TIPO',
          type: stats.percentage < plannedPercentage ? 'INCREMENTAR' : 'REDUCIR',
          area: tipo,
          parentType: tipo,
          currentPercentage: stats.percentage,
          plannedPercentage,
          difference,
          priority: difference > 15 ? 'high' : difference > 10 ? 'medium' : 'low',
          reason: `${stats.percentage < plannedPercentage ? 'Déficit' : 'Exceso'} en tipo ${tipo}`,
          basedOnExercises: totalExercises
        });
      }
      
      // Recomendaciones por áreas
      Object.entries(stats.areas).forEach(([area, areaStats]: [string, any]) => {
        const plannedAreaPercentage = trainingPlan?.planificacion?.[tipo as TipoType]?.areas?.[area as AreaType]?.porcentajeDelTotal
          || defaultAreaPercentages[tipo as TipoType]?.[area as AreaType]
          || 15;
        
        const areaDifference = Math.abs(areaStats.percentage - plannedAreaPercentage);
        
        if (areaDifference > 8) {
          recommendations.push({
            level: 'AREA',
            type: areaStats.percentage < plannedAreaPercentage ? 'INCREMENTAR' : 'REDUCIR',
            area,
            parentType: tipo,
            currentPercentage: areaStats.percentage,
            plannedPercentage: plannedAreaPercentage,
            difference: areaDifference,
            priority: areaDifference > 15 ? 'high' : areaDifference > 10 ? 'medium' : 'low',
            reason: `${areaStats.percentage < plannedAreaPercentage ? 'Déficit' : 'Exceso'} en ${area}`,
            basedOnExercises: areaStats.total,
            parentArea: area
          });
        }
      });
    });
    
    return recommendations;
  }
}