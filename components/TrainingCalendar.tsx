// components/TrainingCalendar.tsx
import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { TrainingSession } from '../types';

interface TrainingCalendarProps {
  sessions: TrainingSession[];
  onDateClick: (date: Date) => void;
}

const TrainingCalendar: React.FC<TrainingCalendarProps> = ({ sessions, onDateClick }) => {
  const trainingDates = new Set(
    sessions.map(s => new Date(s.fecha).toDateString())
  );

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month' && trainingDates.has(date.toDateString())) {
      return <div className="training-dot"></div>;
    }
    return null;
  };

  return (
    <div className="bg-app-surface p-4 rounded-lg shadow-lg">
      <Calendar
        onClickDay={onDateClick}
        tileContent={tileContent}
        className="react-calendar-override"
      />
    </div>
  );
};

export default TrainingCalendar;