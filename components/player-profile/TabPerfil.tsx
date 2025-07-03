import React from 'react';

interface TabPerfilProps {
  edad: number | '';
  setEdad: (value: number | '') => void;
  altura: number | '';
  setAltura: (value: number | '') => void;
  peso: number | '';
  setPeso: (value: number | '') => void;
  pesoIdeal: number | '';
  setPesoIdeal: (value: number | '') => void;
  brazoDominante: 'Derecho' | 'Izquierdo';
  setBrazoDominante: (value: 'Derecho' | 'Izquierdo') => void;
  canalComunicacion: string;
  setCanalComunicacion: (value: string) => void;
  ojoDominante: 'Derecho' | 'Izquierdo';
  setOjoDominante: (value: 'Derecho' | 'Izquierdo') => void;
  historiaDeportiva: string;
  setHistoriaDeportiva: (value: string) => void;
  lesionesActuales: string;
  setLesionesActuales: (value: string) => void;
  lesionesPasadas: string;
  setLesionesPasadas: (value: string) => void;
  frecuenciaSemanal: string;
  setFrecuenciaSemanal: (value: string) => void;
  requierePlanificacion: boolean;
  setRequierePlanificacion: (value: boolean) => void;
  onProfileSave: () => void;
}

const TabPerfil: React.FC<TabPerfilProps> = ({
  edad, setEdad,
  altura, setAltura,
  peso, setPeso,
  pesoIdeal, setPesoIdeal,
  brazoDominante, setBrazoDominante,
  canalComunicacion, setCanalComunicacion,
  ojoDominante, setOjoDominante,
  historiaDeportiva, setHistoriaDeportiva,
  lesionesActuales, setLesionesActuales,
  lesionesPasadas, setLesionesPasadas,
  frecuenciaSemanal, setFrecuenciaSemanal,
  requierePlanificacion, setRequierePlanificacion,
  onProfileSave
}) => {
  return (
    <section className="bg-gray-900/50 backdrop-blur-sm p-4 sm:p-6 lg:p-10 rounded-xl shadow-lg border border-gray-800">
      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-6 sm:mb-8 lg:mb-10">
        Información Detallada
      </h2>
      
      {/* Grid responsivo para la información del perfil */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 xl:gap-10">
        {/* Datos Físicos */}
        <div className="bg-gray-800/50 p-5 sm:p-6 lg:p-8 rounded-lg border border-gray-700 space-y-4">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-green-400 border-b border-gray-700 pb-3 mb-4">
            Datos Físicos
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Edad</label>
              <input 
                type="number" 
                value={edad} 
                onChange={e => setEdad(e.target.value ? Number(e.target.value) : '')} 
                className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Altura (cm)</label>
              <input 
                type="number" 
                value={altura} 
                onChange={e => setAltura(e.target.value ? Number(e.target.value) : '')} 
                className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Peso (kg)</label>
              <input 
                type="number" 
                value={peso} 
                onChange={e => setPeso(e.target.value ? Number(e.target.value) : '')} 
                className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Peso Ideal (kg)</label>
              <input 
                type="number" 
                value={pesoIdeal} 
                onChange={e => setPesoIdeal(e.target.value ? Number(e.target.value) : '')} 
                className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
              />
            </div>
          </div>
        </div>
        
        {/* Dominancias */}
        <div className="bg-gray-800/50 p-5 sm:p-6 lg:p-8 rounded-lg border border-gray-700 space-y-4">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-green-400 border-b border-gray-700 pb-3 mb-4">
            Dominancias
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Brazo Dominante</label>
              <select 
                value={brazoDominante} 
                onChange={e => setBrazoDominante(e.target.value as any)} 
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
                onChange={e => setOjoDominante(e.target.value as any)} 
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
                onChange={e => setCanalComunicacion(e.target.value)} 
                className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
              />
            </div>
          </div>
        </div>
        
        {/* Entrenamiento */}
        <div className="bg-gray-800/50 p-5 sm:p-6 lg:p-8 rounded-lg border border-gray-700 space-y-4">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-green-400 border-b border-gray-700 pb-3 mb-4">
            Entrenamiento
          </h3>
          <div>
            <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Frecuencia Semanal</label>
            <textarea 
              value={frecuenciaSemanal} 
              onChange={e => setFrecuenciaSemanal(e.target.value)} 
              rows={6} 
              className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 resize-none"
            />
          </div>
          
          {/* Campo de planificación requerida */}
          <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-sm lg:text-base font-medium text-gray-300">
                  Requiere planificación
                </span>
                <p className="text-xs lg:text-sm text-gray-500 mt-1">
                  Activar si este jugador necesita objetivos y plan de entrenamiento
                </p>
              </div>
              <input
                type="checkbox"
                checked={requierePlanificacion ?? true}
                onChange={(e) => setRequierePlanificacion(e.target.checked)}
                className="h-5 w-5 lg:h-6 lg:w-6 rounded text-green-400 bg-gray-800 border-gray-600 focus:ring-2 focus:ring-green-500/20 focus:ring-offset-0 transition-all duration-200"
              />
            </label>
          </div>
        </div>
      </div>
      
      {/* Segunda fila de información */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 xl:gap-10 mt-6 lg:mt-10">
        <div className="bg-gray-800/50 p-5 sm:p-6 lg:p-8 rounded-lg border border-gray-700">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-green-400 mb-4">
            Historia Deportiva
          </h3>
          <textarea 
            value={historiaDeportiva} 
            onChange={e => setHistoriaDeportiva(e.target.value)} 
            rows={6} 
            className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 resize-none"
          />
        </div>
        <div className="bg-gray-800/50 p-5 sm:p-6 lg:p-8 rounded-lg border border-gray-700 space-y-4">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-green-400 mb-4">
            Historial de Lesiones
          </h3>
          <div>
            <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Lesiones Actuales</label>
            <textarea 
              value={lesionesActuales} 
              onChange={e => setLesionesActuales(e.target.value)} 
              rows={3} 
              className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Lesiones Pasadas</label>
            <textarea 
              value={lesionesPasadas} 
              onChange={e => setLesionesPasadas(e.target.value)} 
              rows={3} 
              className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 resize-none"
            />
          </div>
        </div>
      </div>
      
      <div className="mt-8 sm:mt-10 lg:mt-12 text-center sm:text-right">
        <button 
          onClick={onProfileSave} 
          className="px-6 py-3 lg:px-8 lg:py-4 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/25 text-base sm:text-lg lg:text-xl"
        >
          Guardar Cambios del Perfil
        </button>
      </div>
    </section>
  );
};

export default TabPerfil;