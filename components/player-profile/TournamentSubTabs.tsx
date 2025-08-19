// components/player-profile/TournamentSubTabs.tsx
import React from 'react';

interface TournamentSubTabsProps {
  activeSubTab: 'future' | 'disputed';
  onSubTabChange: (tab: 'future' | 'disputed') => void;
  futureTournamentsCount: number;
  disputedTournamentsCount: number;
}

const TournamentSubTabs: React.FC<TournamentSubTabsProps> = ({
  activeSubTab,
  onSubTabChange,
  futureTournamentsCount,
  disputedTournamentsCount
}) => {
  return (
    <div className="border-b border-gray-800">
      <nav className="flex space-x-8">
        {/* ✅ CAMBIO SOLO VISUAL: Torneos Disputados primero */}
        <button
          onClick={() => onSubTabChange('disputed')}
          className={`py-2 px-1 font-medium transition-colors ${
            activeSubTab === 'disputed'
              ? 'border-b-2 border-green-400 text-green-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Torneos Disputados ({disputedTournamentsCount})
        </button>
        <button
          onClick={() => onSubTabChange('future')}
          className={`py-2 px-1 font-medium transition-colors ${
            activeSubTab === 'future'
              ? 'border-b-2 border-green-400 text-green-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Próximos Torneos ({futureTournamentsCount})
        </button>
      </nav>
    </div>
  );
};

export default TournamentSubTabs;