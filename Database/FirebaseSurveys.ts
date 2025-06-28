import { db } from "../firebase/firebase-config";
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore";
import { PostTrainingSurvey } from "../types";

// Agregar una encuesta post-entrenamiento
export const addPostTrainingSurvey = async (
  academiaId: string,
  surveyData: Omit<PostTrainingSurvey, "id">
): Promise<void> => {
  try {
    const surveysCollection = collection(db, "academias", academiaId, "surveys");
    await addDoc(surveysCollection, {
      jugadorId: surveyData.jugadorId,
      sessionId: surveyData.sessionId,
      cansancioFisico: surveyData.cansancioFisico,
      concentracion: surveyData.concentracion,
      actitudMental: surveyData.actitudMental,
      sensacionesTenisticas: surveyData.sensacionesTenisticas,
      fecha: Timestamp.now() // Usar Timestamp.now() en lugar de convertir desde string
    });
    console.log("Encuesta post-entrenamiento agregada exitosamente");
  } catch (error) {
    console.error("Error al agregar encuesta:", error);
    throw error;
  }
};

// Verificar si ya existe una encuesta para un jugador en una sesión específica
export const checkSurveyExists = async (
  academiaId: string,
  jugadorId: string,
  sessionId: string
): Promise<boolean> => {
  try {
    const surveysCollection = collection(db, "academias", academiaId, "surveys");
    const q = query(
      surveysCollection,
      where("jugadorId", "==", jugadorId),
      where("sessionId", "==", sessionId)
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error verificando encuesta:", error);
    return false;
  }
};

// Obtener todas las encuestas de un jugador
export const getPlayerSurveys = async (
  academiaId: string,
  jugadorId: string,
  startDate?: Date,
  endDate?: Date
): Promise<PostTrainingSurvey[]> => {
  console.log('getPlayerSurveys llamada con:', { academiaId, jugadorId, startDate, endDate });
  try {
    const surveysCollection = collection(db, "academias", academiaId, "surveys");
    let q = query(
      surveysCollection,
      where("jugadorId", "==", jugadorId),
      orderBy("fecha", "desc")
    );

    const querySnapshot = await getDocs(q);
    console.log('Query ejecutada, documentos encontrados:', querySnapshot.size);
    const surveys: PostTrainingSurvey[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const surveyDate = data.fecha.toDate();

      // NUEVO: Ver la fecha de cada encuesta
      console.log('Fecha encuesta Firebase:', surveyDate.toISOString());

      // Filtrar por fechas si se proporcionan
      if (startDate && surveyDate < startDate) return;
      if (endDate && surveyDate > endDate) return;

      surveys.push({
        id: doc.id,
        ...data,
        fecha: surveyDate.toISOString()
      } as PostTrainingSurvey);
    });

    console.log('Encuestas procesadas:', surveys.length);
    return surveys.sort((a, b) => 
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
  } catch (error) {
    console.error('Error obteniendo encuestas del jugador:', error);
    return [];
  }
};



// Obtener encuestas múltiples para varios jugadores y sesiones
export const getBatchSurveys = async (
  academiaId: string,
  playerSessionPairs: { jugadorId: string; sessionId: string }[]
): Promise<Map<string, PostTrainingSurvey>> => {
  try {
    const surveysMap = new Map<string, PostTrainingSurvey>();
    
    // Para optimizar, podríamos hacer una sola consulta con múltiples condiciones
    // Pero por simplicidad, haremos consultas individuales
    for (const pair of playerSessionPairs) {
      const surveysCollection = collection(db, "academias", academiaId, "surveys");
      const q = query(
        surveysCollection,
        where("jugadorId", "==", pair.jugadorId),
        where("sessionId", "==", pair.sessionId)
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        const key = `${pair.jugadorId}-${pair.sessionId}`;
        surveysMap.set(key, {
          id: doc.id,
          ...data,
          fecha: data.fecha.toDate().toISOString()
        } as PostTrainingSurvey);
      }
    }
    
    return surveysMap;
  } catch (error) {
    console.error("Error obteniendo encuestas en lote:", error);
    return new Map();
  }
};