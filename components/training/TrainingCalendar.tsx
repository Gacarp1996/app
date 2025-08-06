import React, { useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useSession } from '@/contexts/SessionContext'; // ✅ NUEVO IMPORT

// ✅ INTERFACE ACTUALIZADA - Sin sessions prop
interface TrainingCalendarProps {
  playerId?: string; // ✅ OPCIONAL - Si no se pasa, muestra todas las sesiones
  onDateClick?: (date: Date) => void;
}

const TrainingCalendar: React.FC<TrainingCalendarProps> = ({ playerId, onDateClick }) => {
  // ✅ OBTENER SESIONES DEL CONTEXTO
  const { sessions, getSessionsByPlayer } = useSession();
  
  // ✅ FILTRAR SESIONES SEGÚN playerId
  const relevantSessions = useMemo(() => {
    if (playerId) {
      return getSessionsByPlayer(playerId);
    }
    return sessions; // Si no hay playerId, mostrar todas las sesiones
  }, [playerId, sessions, getSessionsByPlayer]);

  // Crear un Set de fechas que tienen entrenamientos
  const trainedDates = useMemo(() => {
    const dates = new Set<string>();
    relevantSessions.forEach(session => {
      const date = new Date(session.fecha);
      dates.add(date.toDateString());
    });
    return dates;
  }, [relevantSessions]);

  // Función para determinar el contenido de cada tile
  const tileContent = ({ date }: { date: Date }) => {
    if (trainedDates.has(date.toDateString())) {
      return (
        <div className="flex justify-center items-center h-full">
          <div className="training-dot"></div>
        </div>
      );
    }
    return null;
  };

  // Función para agregar clases CSS a los tiles
  const tileClassName = ({ date }: { date: Date }) => {
    if (trainedDates.has(date.toDateString())) {
      return 'has-training';
    }
    return '';
  };

  return (
    <div className="training-calendar-wrapper">
      <style>{`
        .training-calendar-wrapper .react-calendar {
          width: 100%;
          max-width: 100%;
          background-color: rgba(17, 24, 39, 0.95);
          backdrop-filter: blur(12px);
          border: 1px solid #374151;
          border-radius: 0.75rem;
          font-family: inherit;
          line-height: 1.5;
          padding: 1rem;
          box-shadow: 0 0 20px rgba(0, 232, 122, 0.1);
        }

        /* Navegación del calendario */
        .training-calendar-wrapper .react-calendar__navigation {
          display: flex;
          height: 3rem;
          margin-bottom: 1rem;
          background: transparent;
        }

        .training-calendar-wrapper .react-calendar__navigation button {
          color: #e5e7eb;
          background: transparent;
          border: none;
          font-size: 1.1rem;
          font-weight: 600;
          transition: all 0.2s ease;
          border-radius: 0.5rem;
          padding: 0.5rem;
        }

        .training-calendar-wrapper .react-calendar__navigation button:hover {
          background-color: rgba(0, 232, 122, 0.1);
          color: #00E87A;
          transform: scale(1.05);
        }

        .training-calendar-wrapper .react-calendar__navigation button:disabled {
          color: #6b7280;
          cursor: not-allowed;
          transform: none;
        }

        .training-calendar-wrapper .react-calendar__navigation__label {
          font-weight: 700;
          font-size: 1.2rem;
          color: #00E87A;
        }

        /* Días de la semana */
        .training-calendar-wrapper .react-calendar__month-view__weekdays {
          text-transform: uppercase;
          font-weight: 700;
          font-size: 0.75rem;
          color: #9ca3af;
          padding: 0.5rem 0;
          border-bottom: 1px solid #374151;
        }

        .training-calendar-wrapper .react-calendar__month-view__weekdays__weekday {
          padding: 0.5rem;
          text-align: center;
        }

        .training-calendar-wrapper .react-calendar__month-view__weekdays__weekday abbr {
          text-decoration: none;
        }

        /* Tiles (días) */
        .training-calendar-wrapper .react-calendar__tile {
          background: transparent;
          color: #e5e7eb;
          border: 1px solid transparent;
          border-radius: 0.5rem;
          padding: 0.75rem 0.25rem;
          font-size: 0.9rem;
          position: relative;
          transition: all 0.2s ease;
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        @media (min-width: 1024px) {
          .training-calendar-wrapper .react-calendar__tile {
            padding: 1rem 0.5rem;
            font-size: 1rem;
          }
        }

        .training-calendar-wrapper .react-calendar__tile:hover {
          background-color: rgba(0, 232, 122, 0.1);
          border-color: rgba(0, 232, 122, 0.3);
          transform: scale(1.05);
          color: #00E87A;
        }

        .training-calendar-wrapper .react-calendar__tile:disabled {
          color: #6b7280;
          background-color: transparent;
        }

        /* Día actual */
        .training-calendar-wrapper .react-calendar__tile--now {
          background: rgba(0, 232, 122, 0.15);
          border-color: rgba(0, 232, 122, 0.3);
          color: #00E87A;
          font-weight: 700;
        }

        .training-calendar-wrapper .react-calendar__tile--now:hover {
          background: rgba(0, 232, 122, 0.25);
          border-color: rgba(0, 232, 122, 0.5);
        }

        /* Día activo/seleccionado */
        .training-calendar-wrapper .react-calendar__tile--active {
          background: linear-gradient(135deg, #00E87A, #00D9E8);
          color: #000000;
          font-weight: 700;
          transform: scale(1.05);
          box-shadow: 0 0 15px rgba(0, 232, 122, 0.4);
        }

        .training-calendar-wrapper .react-calendar__tile--active:hover {
          background: linear-gradient(135deg, #00B85F, #00A8B5);
          transform: scale(1.08);
        }

        /* Días con entrenamiento */
        .training-calendar-wrapper .react-calendar__tile.has-training {
          background: rgba(0, 232, 122, 0.1);
          border-color: rgba(0, 232, 122, 0.3);
          font-weight: 600;
        }

        .training-calendar-wrapper .react-calendar__tile.has-training:hover {
          background: rgba(0, 232, 122, 0.2);
          border-color: rgba(0, 232, 122, 0.5);
          cursor: pointer;
        }

        /* Días del mes anterior/siguiente */
        .training-calendar-wrapper .react-calendar__month-view__days__day--neighboringMonth {
          color: #4b5563;
          opacity: 0.5;
        }

        /* Punto indicador de entrenamiento */
        .training-calendar-wrapper .training-dot {
          width: 6px;
          height: 6px;
          background: linear-gradient(135deg, #00E87A, #00D9E8);
          border-radius: 50%;
          position: absolute;
          bottom: 4px;
          box-shadow: 0 0 6px rgba(0, 232, 122, 0.6);
          animation: pulse-dot 2s infinite;
        }

        @media (min-width: 1024px) {
          .training-calendar-wrapper .training-dot {
            width: 8px;
            height: 8px;
            bottom: 6px;
          }
        }

        @keyframes pulse-dot {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.8;
          }
        }

        /* Estilos para vista de año y década */
        .training-calendar-wrapper .react-calendar__year-view__months__month,
        .training-calendar-wrapper .react-calendar__decade-view__years__year,
        .training-calendar-wrapper .react-calendar__century-view__decades__decade {
          color: #e5e7eb;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 0.5rem;
          padding: 1rem;
          transition: all 0.2s ease;
        }

        .training-calendar-wrapper .react-calendar__year-view__months__month:hover,
        .training-calendar-wrapper .react-calendar__decade-view__years__year:hover,
        .training-calendar-wrapper .react-calendar__century-view__decades__decade:hover {
          background-color: rgba(0, 232, 122, 0.1);
          border-color: rgba(0, 232, 122, 0.3);
          color: #00E87A;
          transform: scale(1.05);
        }
      `}</style>
      
      <div className="bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-xl shadow-2xl shadow-green-500/10">
        <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl">
          <Calendar
            tileContent={tileContent}
            tileClassName={tileClassName}
            onClickDay={onDateClick}
            locale="es-ES"
            showNeighboringMonth={true}
            minDetail="month"
            maxDetail="month"
          />
        </div>
      </div>
      
      <div className="mt-4 flex items-center justify-center gap-6 text-sm lg:text-base">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 lg:w-5 lg:h-5 bg-gradient-to-br from-green-500/20 to-cyan-500/20 rounded border border-green-500/30"></div>
          <span className="text-gray-400">Con entrenamiento</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 lg:w-5 lg:h-5 bg-green-500/20 rounded border border-green-500/50"></div>
          <span className="text-gray-400">Día actual</span>
        </div>
      </div>
    </div>
  );
};

export default TrainingCalendar;