import { db } from "../firebase/firebase-config";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";

export interface AcademiaConfig {
  id: string;
  academiaId: string;
  encuestasHabilitadas: boolean;
  preguntasEncuesta: {
    cansancioFisico: boolean;
    concentracion: boolean;
    actitudMental: boolean;
    sensacionesTenisticas: boolean;
  };
  // ✅ NUEVO: Configuración de ventana de análisis para recomendaciones
  recommendationsAnalysisWindowDays: number;
  fechaCreacion: string;
  fechaActualizacion: string;
}

const getDefaultConfig = (academiaId: string): AcademiaConfig => ({
  id: 'config',
  academiaId,
  encuestasHabilitadas: true,
  preguntasEncuesta: {
    cansancioFisico: true,
    concentracion: true,
    actitudMental: true,
    sensacionesTenisticas: true,
  },
  // ✅ NUEVO: Default de 7 días como especificado
  recommendationsAnalysisWindowDays: 7,
  fechaCreacion: new Date().toISOString(),
  fechaActualizacion: new Date().toISOString(),
});

export const getAcademiaConfig = async (academiaId: string): Promise<AcademiaConfig> => {
  try {
    const configDoc = doc(db, "academiaConfigs", academiaId);
    const docSnap = await getDoc(configDoc);
    
    if (docSnap.exists()) {
      const firebaseConfig = docSnap.data() as AcademiaConfig;
      
      // ✅ ARREGLO SIMPLE: Solo verificar y asignar en memoria
      if (typeof firebaseConfig.recommendationsAnalysisWindowDays !== 'number') {
        console.log("🔄 Campo recommendationsAnalysisWindowDays no encontrado, usando default de 7 días");
        firebaseConfig.recommendationsAnalysisWindowDays = 7;
      }
      
      return firebaseConfig;
    } else {
      // Si no existe, crear configuración por defecto
      const defaultConfig = getDefaultConfig(academiaId);
      await setDoc(configDoc, defaultConfig);
      return defaultConfig;
    }
  } catch (error) {
    console.error("Error obteniendo configuración de academia:", error);
    // Fallback: devolver configuración por defecto sin persistir
    return getDefaultConfig(academiaId);
  }
};

export const saveAcademiaConfig = async (
  academiaId: string,
  config: Partial<Omit<AcademiaConfig, 'id' | 'academiaId' | 'fechaCreacion'>>
): Promise<void> => {
  try {
    const configDoc = doc(db, "academiaConfigs", academiaId);
    const updateData = {
      ...config,
      fechaActualizacion: new Date().toISOString(),
    };
    
    await updateDoc(configDoc, updateData);
    console.log("Configuración guardada exitosamente en Firebase");
    
  } catch (error) {
    console.error("Error guardando configuración de academia:", error);
    throw error; // Re-lanzar el error para que el componente pueda manejarlo
  }
};

export const getEnabledSurveyQuestions = async (academiaId: string): Promise<string[]> => {
  try {
    const config = await getAcademiaConfig(academiaId);
    const enabledQuestions: string[] = [];
    
    if (config.preguntasEncuesta.cansancioFisico) enabledQuestions.push('cansancioFisico');
    if (config.preguntasEncuesta.concentracion) enabledQuestions.push('concentracion');
    if (config.preguntasEncuesta.actitudMental) enabledQuestions.push('actitudMental');
    if (config.preguntasEncuesta.sensacionesTenisticas) enabledQuestions.push('sensacionesTenisticas');
    
    return enabledQuestions;
  } catch (error) {
    console.error("Error obteniendo preguntas habilitadas:", error);
    // En caso de error, devolver todas las preguntas por defecto
    return ['cansancioFisico', 'concentracion', 'actitudMental', 'sensacionesTenisticas'];
  }
};

// ✅ NUEVO: Helper function para obtener ventana de análisis de recomendaciones
export const getRecommendationsAnalysisWindow = async (academiaId: string): Promise<number> => {
  try {
    const config = await getAcademiaConfig(academiaId);
    return config.recommendationsAnalysisWindowDays;
  } catch (error) {
    console.error("Error obteniendo ventana de análisis de recomendaciones:", error);
    // Fallback: 7 días por defecto
    return 7;
  }
};

// ✅ NUEVO: Helper function para validar y actualizar ventana de análisis
export const updateRecommendationsAnalysisWindow = async (
  academiaId: string,
  days: number
): Promise<void> => {
  // Validar que sea un número válido entre 1 y 365 días
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw new Error("La ventana de análisis debe ser un número entero entre 1 y 365 días");
  }
  
  try {
    await saveAcademiaConfig(academiaId, {
      recommendationsAnalysisWindowDays: days
    });
    console.log(`✅ Ventana de análisis actualizada a ${days} días para academia ${academiaId}`);
  } catch (error) {
    console.error("Error actualizando ventana de análisis:", error);
    throw error;
  }
};