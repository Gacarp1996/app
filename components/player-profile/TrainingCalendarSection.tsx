// components/player-profile/TrainingCalendarSection.tsx
import React from 'react';
import TrainingCalendar from '../training/TrainingCalendar';

// ✅ INTERFACE ACTUALIZADA - Sin sessions prop
interface TrainingCalendarSectionProps {
  playerId: string;
  onDateClick: (date: Date) => void;
}

const TrainingCalendarSection: React.FC<TrainingCalendarSectionProps> = ({
  playerId,
  onDateClick
}) => {
  return (
    <div className="border-t border-gray-800 pt-8 lg:pt-12">
      <div className="bg-gray-900/50 backdrop-blur-sm p-6 lg:p-8 rounded-xl shadow-lg border border-gray-800">
        <h2 className="text-2xl lg:text-3xl font-semibold text-green-400 mb-6">Calendario de Entrenamientos</h2>
        <div className="max-w-4xl mx-auto">
          {/* ✅ ACTUALIZADO - Pasar playerId en lugar de sessions filtradas */}
          <TrainingCalendar
            playerId={playerId}
            onDateClick={onDateClick}
          />
        </div>
      </div>
    </div>
  );
};

export default TrainingCalendarSection;