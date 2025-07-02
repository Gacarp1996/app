import React, { useMemo } from 'react';
import Calendar, { TileArgs } from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Estilos base
import './TrainingCalendar.css'; // <<< NUEVO: Nuestros estilos personalizados
import { TrainingSession } from '../types';

interface TrainingCalendarProps {
  sessions: TrainingSession[];
  onDateClick?: (date: Date) => void;
}

const TrainingCalendar: React.FC<TrainingCalendarProps> = ({ sessions, onDateClick }) => {
  // Crear un Set de fechas que tienen entrenamientos para búsqueda rápida
  const trainedDates = useMemo(() => {
    const dates = new Set<string>();
    sessions.forEach(session => {
      // Normalizamos la fecha a un string sin la parte horaria
      const date = new Date(session.fecha);
      dates.add(date.toDateString());
    });
    return dates;
  }, [sessions]);

  // Función para renderizar el punto indicador en los días con entrenamiento
  const tileContent = ({ date, view }: TileArgs) => {
    // Solo mostramos el punto en la vista de mes
    if (view === 'month' && trainedDates.has(date.toDateString())) {
      return <div className="training-dot"></div>;
    }
    return null;
  };

  return (
    <div className="training-calendar-wrapper w-full">
      {/* Contenedor con efecto de cristal y borde neón */}
      <div className="bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-2xl shadow-2xl shadow-green-500/10">
        <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl p-4">
          <Calendar
            tileContent={tileContent}
            onClickDay={onDateClick}
            locale="es-ES"
            showNeighboringMonth={true}
          />
        </div>
      </div>
      
      {/* Leyenda del Calendario (mejorada para claridad) */}
      <div className="mt-6 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-400 to-cyan-400"></div>
          <span className="text-gray-400">Con entrenamiento</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-md bg-green-500/15"></div>
          <span className="text-gray-400">Día actual</span>
        </div>
      </div>
    </div>
  );
};

export default TrainingCalendar;