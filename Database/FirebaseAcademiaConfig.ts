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
  fechaCreacion: new Date().toISOString(),
  fechaActualizacion: new Date().toISOString(),
});

export const getAcademiaConfig = async (academiaId: string): Promise<AcademiaConfig> => {
  try {
    const configDoc = doc(db, "academiaConfigs", academiaId);
    const docSnap = await getDoc(configDoc);
    
    if (docSnap.exists()) {
      const firebaseConfig = docSnap.data() as AcademiaConfig;
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
