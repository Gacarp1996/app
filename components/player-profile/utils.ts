// components/player-profile/utils.ts
import React from 'react';

export const parseTimeToMinutes = (tiempoCantidad: string): number => {
  const cleanTime = tiempoCantidad.trim().toLowerCase();
  
  const pureNumber = parseFloat(cleanTime);
  if (!isNaN(pureNumber) && cleanTime === pureNumber.toString()) {
    return pureNumber;
  }
  
  const minuteMatch = cleanTime.match(/(\d+\.?\d*)\s*(m|min|mins|minuto|minutos)/);
  if (minuteMatch) {
    return parseFloat(minuteMatch[1]);
  }
  
  const hourMatch = cleanTime.match(/(\d+\.?\d*)\s*(h|hr|hrs|hora|horas)/);
  if (hourMatch) {
    return parseFloat(hourMatch[1]) * 60;
  }
  
  const mixedMatch = cleanTime.match(/(\d+)\s*(h|hr|hrs|hora|horas)?\s*:?\s*(\d+)\s*(m|min|mins|minuto|minutos)?/);
  if (mixedMatch) {
    const hours = parseFloat(mixedMatch[1]) || 0;
    const minutes = parseFloat(mixedMatch[3]) || 0;
    return hours * 60 + minutes;
  }
  
  return 0;
};

export const getDefaultDateRange = () => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0]
  };
};

export const formatDate = (dateString: string) => 
  new Date(dateString).toLocaleDateString('es-ES', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

// Definir los colores y nombres de las métricas
export const METRIC_CONFIG = {
  energia: { key: 'cansancioFisico', label: 'Energía', color: '#22c55e' },
  concentracion: { key: 'concentracion', label: 'Concentración', color: '#3b82f6' },
  actitud: { key: 'actitudMental', label: 'Actitud', color: '#facc15' },
  sensaciones: { key: 'sensacionesTenisticas', label: 'Sensaciones', color: '#a855f7' }
};