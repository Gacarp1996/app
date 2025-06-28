import { db } from "../firebase/firebase-config";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { PostTrainingSurvey } from "../types";

export const addPostTrainingSurvey = async (
  academiaId: string,
  surveyData: Omit<PostTrainingSurvey, 'id'>
): Promise<string> => {
  try {
    const surveyWithTimestamp = {
      ...surveyData,
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
  console.log('Recibiendo fechas para query:', { startDate, endDate });

  try {
    const surveysCollection = collection(db, "academias", academiaId, "surveys");
    let q;

    if (startDate && endDate) {
      q = query(
        surveysCollection,
        where("jugadorId", "==", jugadorId),
        where("fecha", ">=", Timestamp.fromDate(startDate)),
        where("fecha", "<=", Timestamp.fromDate(endDate)),
        orderBy("fecha", "desc")
      );
    } else {
      q = query(
        surveysCollection,
        where("jugadorId", "==", jugadorId),
        orderBy("fecha", "desc")
      );
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        fecha: data.fecha.toDate().toISOString(),
      } as PostTrainingSurvey;
    });
  } catch (error) {
    console.error("Error al obtener encuestas del jugador:", error);
    return [];
  }
};

export const getSurveyBySessionId = async (
  academiaId: string,
  sessionId: string
): Promise<PostTrainingSurvey | null> => {
  try {
    const surveysCollection = collection(db, "academias", academiaId, "surveys");
    const q = query(surveysCollection, where("sessionId", "==", sessionId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        fecha: data.fecha.toDate().toISOString()
      } as PostTrainingSurvey;
    }

    return null;
  } catch (error) {
    console.error('Error obteniendo encuesta por sessionId:', error);
    return null;
  }
};

export const updateSurvey = async (
  academiaId: string,
  surveyId: string,
  updates: Partial<Omit<PostTrainingSurvey, 'id'>>
): Promise<void> => {
  try {
    const surveyDoc = doc(db, "academias", academiaId, "surveys", surveyId);
    await updateDoc(surveyDoc, {
      ...updates,
      fecha: updates.fecha ? Timestamp.fromDate(new Date(updates.fecha)) : undefined
    });
  } catch (error) {
    console.error('Error actualizando encuesta:', error);
    throw error;
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
