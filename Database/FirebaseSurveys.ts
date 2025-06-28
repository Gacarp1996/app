import { db } from "../firebase/firebase-config";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { PostTrainingSurvey } from "../types";

export const addPostTrainingSurvey = async (
  academiaId: string,
  surveyData: Omit<PostTrainingSurvey, 'id'>
): Promise<string> => {
  try {
    const surveyWithTimestamp = {
      ...surveyData,
      // Se asegura de que la fecha se guarde como un tipo de dato nativo de Firebase
      fecha: Timestamp.fromDate(new Date(surveyData.fecha)),
    };
    const surveysCollection = collection(db, "academias", academiaId, "surveys");
    const docRef = await addDoc(surveysCollection, surveyWithTimestamp);
    return docRef.id;
  } catch (error) {
    console.error("Error al guardar la encuesta:", error);
    throw new Error("No se pudo guardar la encuesta");
  }
};

export const checkSurveyExists = async (
  academiaId: string,
  jugadorId: string,
  fecha: Date
): Promise<boolean> => {
  try {
    const startOfDay = new Date(fecha);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(fecha);
    endOfDay.setHours(23, 59, 59, 999);

    const surveysCollection = collection(db, "academias", academiaId, "surveys");
    const q = query(
      surveysCollection,
      where("jugadorId", "==", jugadorId),
      where("fecha", ">=", Timestamp.fromDate(startOfDay)),
      where("fecha", "<=", Timestamp.fromDate(endOfDay))
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error al chequear si la encuesta existe:", error);
    return false;
  }
};

export const getPlayerSurveys = async (
  academiaId: string,
  jugadorId: string,
  startDate?: Date,
  endDate?: Date
): Promise<PostTrainingSurvey[]> => {
  // Esta función ahora es más simple. Confía en las fechas que recibe.
  console.log('Recibiendo fechas para query:', { startDate, endDate });

  try {
    const surveysCollection = collection(db, "academias", academiaId, "surveys");
    
    // El 'any' es para darle flexibilidad a la construcción dinámica de la consulta
    const queryConstraints: any[] = [
      where("jugadorId", "==", jugadorId),
    ];

    if (startDate) {
      queryConstraints.push(where("fecha", ">=", Timestamp.fromDate(startDate)));
    }
    if (endDate) {
      queryConstraints.push(where("fecha", "<=", Timestamp.fromDate(endDate)));
    }
    
    // El orderBy de fecha debe ir después de los filtros de desigualdad de fecha
    queryConstraints.push(orderBy("fecha", "desc"));
    
    const q = query(surveysCollection, ...queryConstraints);

    const querySnapshot = await getDocs(q);

    const surveys: PostTrainingSurvey[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        fecha: data.fecha.toDate().toISOString()
      } as PostTrainingSurvey;
    });

    return surveys;

  } catch (error) {
    console.error('Error obteniendo encuestas del jugador:', error);
    // Este tipo de error de Firebase suele ocurrir si falta un índice.
    // La consola del navegador te dará un link para crearlo con un solo click.
    if (error instanceof Error && error.message.includes("indexes")) {
        alert("Error de base de datos: Falta un índice compuesto. Revisa la consola del navegador (F12) para encontrar un link para crearlo automáticamente en Firebase.");
    }
    return [];
  }
};

export const getBatchSurveys = async (
    academiaId: string,
    playerIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<PostTrainingSurvey[]> => {
    try {
      const surveysCollection = collection(db, 'academias', academiaId, 'surveys');
      
      const adjustedEndDate = new Date(endDate);
      adjustedEndDate.setHours(23, 59, 59, 999);
      
      const q = query(
        surveysCollection,
        where('jugadorId', 'in', playerIds),
        where('fecha', '>=', Timestamp.fromDate(startDate)),
        where('fecha', '<=', Timestamp.fromDate(adjustedEndDate)),
        orderBy('fecha', 'desc')
      );
  
      const querySnapshot = await getDocs(q);
      const surveys: PostTrainingSurvey[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          fecha: data.fecha.toDate().toISOString(),
        } as PostTrainingSurvey;
      });
      return surveys;
    } catch (error) {
      console.error('Error al obtener las encuestas del lote:', error);
      return [];
    }
  };