// src/utils/recommendations/actionableRecommendations.ts

import { 
  ConsolidatedRecommendation, 
  ActionableRecommendation,
  IntensityLevel 
} from './recommendationTypes';

/**
 * Genera recomendaciones actionables con cálculo de tiempo real
 * @param consolidatedRecommendations - Recomendaciones ya consolidadas
 * @param totalSessionTimeMinutes - Tiempo total de la sesión en minutos
 * @returns Array de recomendaciones con información práctica
 */
export function generateActionableRecommendations(
  consolidatedRecommendations: ConsolidatedRecommendation[],
  totalSessionTimeMinutes: number = 90
): ActionableRecommendation[] {
  
  console.log('⏱️ Generando recomendaciones actionables para sesión de', totalSessionTimeMinutes, 'minutos');
  
  return consolidatedRecommendations.map(rec => {
    const actionable = convertToActionableWithRealTime(rec, totalSessionTimeMinutes);
    return {
      ...rec,
      actionableText: actionable.text,
      intensityLevel: actionable.intensity,
      calculatedMinutes: actionable.calculatedMinutes,
      alternatives: actionable.alternatives
    };
  });
}

/**
 * Convierte una recomendación consolidada a formato actionable
 */
function convertToActionableWithRealTime(
  rec: ConsolidatedRecommendation, 
  totalSessionTime: number
): {
  text: string;
  intensity: IntensityLevel;
  calculatedMinutes: number;
  alternatives: string[];
} {
  const isDeficit = rec.difference > 0;
  const magnitude = Math.abs(rec.difference);
  const area = rec.exercise 
    ? `${rec.subcategory} - ${rec.exercise}`
    : rec.subcategory || rec.category;
  
  // Calcular tiempo real basado en porcentajes
  const adjustmentMinutes = Math.round((magnitude / 100) * totalSessionTime);
  
  // Determinar intensidad
  let intensity: IntensityLevel;
  if (magnitude > 20) {
    intensity = 'MUCHO';
  } else if (magnitude > 10) {
    intensity = 'MODERADAMENTE';
  } else {
    intensity = 'LIGERAMENTE';
  }

  let text = '';
  let alternatives: string[] = [];

  if (isDeficit) {
    // Recomendaciones para DÉFICIT
    switch (rec.hierarchyLevel) {
      case 'exercise':
        text = `Agregar ${adjustmentMinutes} min de "${rec.exercise}"`;
        break;
      case 'subcategory':
        text = `Dedicar ${adjustmentMinutes} min más a ${rec.subcategory}`;
        break;
      case 'category':
        text = `Aumentar tiempo de ${rec.category} en ${adjustmentMinutes} min`;
        break;
    }
  } else {
    // Recomendaciones para EXCESO
    text = `Reducir ${area} en ${adjustmentMinutes} min`;
    alternatives = getSmartAlternatives(rec);
  }

  return {
    text,
    intensity,
    calculatedMinutes: adjustmentMinutes,
    alternatives
  };
}

/**
 * Obtiene alternativas inteligentes basadas en el contexto
 */
function getSmartAlternatives(rec: ConsolidatedRecommendation): string[] {
  const alternatives: string[] = [];
  
  // Mapeo de áreas y sus alternativas sugeridas
  const alternativeMap: Record<string, string[]> = {
    // Juego de base y relacionados
    'juego de base': ['Juego de red', 'Primeras pelotas', 'Puntos'],
    'peloteo': ['Puntos', 'Juego de red', 'Primeras pelotas'],
    'fondo': ['Juego de red', 'Aproximación', 'Puntos'],
    
    // Juego de red y relacionados
    'juego de red': ['Juego de base', 'Puntos', 'Saque'],
    'voleas': ['Juego de base', 'Puntos', 'Primeras pelotas'],
    
    // Saque y relacionados
    'saque': ['Primeras pelotas', 'Puntos', 'Juego de base'],
    'servicio': ['Primeras pelotas', 'Juego de base', 'Puntos'],
    'primeras pelotas': ['Juego de base', 'Saque', 'Puntos'],
    
    // Puntos y competencia
    'puntos': ['Juego de base', 'Juego de red', 'Primeras pelotas'],
    'juego': ['Técnica específica', 'Físico', 'Puntos'],
    
    // Físico
    'físico': ['Técnica específica', 'Puntos', 'Juego de base'],
    'preparación física': ['Juego de base', 'Puntos', 'Técnica específica']
  };
  
  // Buscar alternativas según el nivel
  let key = '';
  switch (rec.hierarchyLevel) {
    case 'exercise':
      key = (rec.subcategory || rec.category).toLowerCase().trim();
      break;
    case 'subcategory':
      key = (rec.subcategory || rec.category).toLowerCase().trim();
      break;
    case 'category':
      key = rec.category.toLowerCase().trim();
      break;
  }
  
  // Buscar match exacto
  if (alternativeMap[key]) {
    return alternativeMap[key];
  }
  
  // Buscar match parcial
  for (const [mapKey, values] of Object.entries(alternativeMap)) {
    if (key.includes(mapKey) || mapKey.includes(key)) {
      return values;
    }
  }
  
  // Alternativas genéricas por defecto
  return ['Otras áreas técnicas', 'Ejercicios complementarios'];
}

/**
 * Genera texto de resumen actionable para mostrar al usuario
 */
export function generateActionableSummary(
  recommendations: ActionableRecommendation[],
  sessionDuration: number
): string {
  if (recommendations.length === 0) {
    return 'La sesión está bien balanceada. No se requieren ajustes significativos.';
  }

  const deficits = recommendations.filter(r => r.difference > 0);
  const totalMinutesToAdd = deficits.reduce((sum, r) => sum + r.calculatedMinutes, 0);
  
  if (deficits.length > 0) {
    const areas = deficits.map(r => r.subcategory || r.category).join(' y ');
    return `Agregar aproximadamente ${totalMinutesToAdd} minutos distribuidos en ${areas} para optimizar la sesión.`;
  }
  
  const excesses = recommendations.filter(r => r.difference < 0);
  const totalMinutesToReduce = excesses.reduce((sum, r) => sum + r.calculatedMinutes, 0);
  
  if (excesses.length > 0) {
    const areas = excesses.map(r => r.subcategory || r.category).join(' y ');
    return `Considerar reducir ${totalMinutesToReduce} minutos de ${areas} para balancear mejor la sesión.`;
  }
  
  return 'Revisar las recomendaciones específicas para optimizar la distribución del tiempo.';
}