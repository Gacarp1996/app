// components/player-profile/ProfileSection.tsx
import React from 'react';

interface ProfileSectionProps {
  edad: number | '';
  altura: number | '';
  peso: number | '';
  pesoIdeal: number | '';
  brazoDominante: 'Derecho' | 'Izquierdo';
  canalComunicacion: string;
  ojoDominante: 'Derecho' | 'Izquierdo';
  historiaDeportiva: string;
  lesionesActuales: string;
  lesionesPasadas: string;
  frecuenciaSemanal: string;
  onEdadChange: (value: number | '') => void;
  onAlturaChange: (value: number | '') => void;
  onPesoChange: (value: number | '') => void;
  onPesoIdealChange: (value: number | '') => void;
  onBrazoDominanteChange: (value: 'Derecho' | 'Izquierdo') => void;
  onCanalComunicacionChange: (value: string) => void;
  onOjoDominanteChange: (value: 'Derecho' | 'Izquierdo') => void;
  onHistoriaDeportivaChange: (value: string) => void;
  onLesionesActualesChange: (value: string) => void;
  onLesionesPasadasChange: (value: string) => void;
  onFrecuenciaSemanalChange: (value: string) => void;
  onSave: () => void;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({
  edad,
  altura,
  peso,
  pesoIdeal,
  brazoDominante,
  canalComunicacion,
  ojoDominante,
  historiaDeportiva,
  lesionesActuales,
  lesionesPasadas,
  frecuenciaSemanal,
  onEdadChange,
  onAlturaChange,
  onPesoChange,
  onPesoIdealChange,
  onBrazoDominanteChange,
  onCanalComunicacionChange,
  onOjoDominanteChange,
  onHistoriaDeportivaChange,
  onLesionesActualesChange,
  onLesionesPasadasChange,
  onFrecuenciaSemanalChange,
  onSave
}) => {
  return (
    <section className="bg-gray-900/50 backdrop-blur-sm p-4 sm:p-6 lg:p-10 rounded-xl shadow-lg border border-gray-800">
      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-6 sm:mb-8 lg:mb-10">Información Detallada</h2>
      
      {/* Grid responsivo para la información del perfil */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 xl:gap-10">
        {/* Datos Físicos */}
        <div className="bg-gray-800/50 p-5 sm:p-6 lg:p-8 rounded-lg border border-gray-700 space-y-4">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-green-400 border-b border-gray-700 pb-3 mb-4">Datos Físicos</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Edad</label>
              <input 
                type="number" 
                value={edad} 
                onChange={e => onEdadChange(e.target.value ? Number(e.target.value) : '')} 
                className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Altura (cm)</label>
              <input 
                type="number" 
                value={altura} 
                onChange={e => onAlturaChange(e.target.value ? Number(e.target.value) : '')} 
                className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Peso (kg)</label>
              <input 
                type="number" 
                value={peso} 
                onChange={e => onPesoChange(e.target.value ? Number(e.target.value) : '')} 
                className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Peso Ideal (kg)</label>
              <input 
                type="number" 
                value={pesoIdeal} 
                onChange={e => onPesoIdealChange(e.target.value ? Number(e.target.value) : '')} 
                className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
              />
            </div>
          </div>
        </div>
        
        {/* Dominancias */}
        <div className="bg-gray-800/50 p-5 sm:p-6 lg:p-8 rounded-lg border border-gray-700 space-y-4">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-green-400 border-b border-gray-700 pb-3 mb-4">Dominancias</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Brazo Dominante</label>
              <select 
                value={brazoDominante} 
                onChange={e => onBrazoDominanteChange(e.target.value as 'Derecho' | 'Izquierdo')} 
                className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
              >
                <option>Derecho</option>
                <option>Izquierdo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Ojo Dominante</label>
              <select 
                value={ojoDominante} 
                onChange={e => onOjoDominanteChange(e.target.value as 'Derecho' | 'Izquierdo')} 
                className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
              >
                <option>Derecho</option>
                <option>Izquierdo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Canal Comunicación</label>
              <input 
                type="text" 
                value={canalComunicacion} 
                onChange={e => onCanalComunicacionChange(e.target.value)} 
                className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
              />
            </div>
          </div>
        </div>
        
        {/* Entrenamiento */}
        <div className="bg-gray-800/50 p-5 sm:p-6 lg:p-8 rounded-lg border border-gray-700 space-y-4">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-green-400 border-b border-gray-700 pb-3 mb-4">Entrenamiento</h3>
          <div>
            <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Frecuencia Semanal</label>
            <textarea 
              value={frecuenciaSemanal} 
              onChange={e => onFrecuenciaSemanalChange(e.target.value)} 
              rows={6} 
              className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 resize-none"
            />
          </div>
        </div>
      </div>
      
      {/* Segunda fila de información */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 xl:gap-10 mt-6 lg:mt-10">
        <div className="bg-gray-800/50 p-5 sm:p-6 lg:p-8 rounded-lg border border-gray-700">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-green-400 mb-4">Historia Deportiva</h3>
          <textarea 
            value={historiaDeportiva} 
            onChange={e => onHistoriaDeportivaChange(e.target.value)} 
            rows={6} 
            className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 resize-none"
          />
        </div>
        <div className="bg-gray-800/50 p-5 sm:p-6 lg:p-8 rounded-lg border border-gray-700 space-y-4">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-green-400 mb-4">Historial de Lesiones</h3>
          <div>
            <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Lesiones Actuales</label>
            <textarea 
              value={lesionesActuales} 
              onChange={e => onLesionesActualesChange(e.target.value)} 
              rows={3} 
              className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Lesiones Pasadas</label>
            <textarea 
              value={lesionesPasadas} 
              onChange={e => onLesionesPasadasChange(e.target.value)} 
              rows={3} 
              className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 resize-none"
            />
          </div>
        </div>
      </div>
      
      <div className="mt-8 sm:mt-10 lg:mt-12 text-center sm:text-right">
        <button 
          onClick={onSave} 
          className="px-6 py-3 lg:px-8 lg:py-4 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/25 text-base sm:text-lg lg:text-xl"
        >
          Guardar Cambios del Perfil
        </button>
      </div>
    </section>
  );
};

export default ProfileSection;