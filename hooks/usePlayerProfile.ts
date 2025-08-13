import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player } from '../types/types';
import { usePlayer } from '../contexts/PlayerContext';
import { useAcademia } from '../contexts/AcademiaContext';
import { useNotification } from './useNotification'; // ✅ NUEVO IMPORT

interface UsePlayerProfileProps {
  playerId: string | undefined;
}

export const usePlayerProfile = ({ 
  playerId
}: UsePlayerProfileProps) => {
  const navigate = useNavigate();
  const notification = useNotification(); // ✅ USAR HOOK DE NOTIFICACIONES
  
  const { players, updatePlayer: updatePlayerContext } = usePlayer();
  const { academiaActual } = useAcademia();
  
  const [player, setPlayer] = useState<Player | null>(null);
  
  const [edad, setEdad] = useState<number | ''>('');
  const [altura, setAltura] = useState<number | ''>('');
  const [peso, setPeso] = useState<number | ''>('');
  const [pesoIdeal, setPesoIdeal] = useState<number | ''>('');
  const [brazoDominante, setBrazoDominante] = useState<'Derecho' | 'Izquierdo'>('Derecho');
  const [canalComunicacion, setCanalComunicacion] = useState('');
  const [ojoDominante, setOjoDominante] = useState<'Derecho' | 'Izquierdo'>('Derecho');
  const [historiaDeportiva, setHistoriaDeportiva] = useState('');
  const [lesionesActuales, setLesionesActuales] = useState('');
  const [lesionesPasadas, setLesionesPasadas] = useState('');
  const [frecuenciaSemanal, setFrecuenciaSemanal] = useState('');

  useEffect(() => {
    const foundPlayer = players.find(p => p.id === playerId);
    if (foundPlayer) {
      setPlayer(foundPlayer);
      setEdad(foundPlayer.edad || '');
      setAltura(foundPlayer.altura || '');
      setPeso(foundPlayer.peso || '');
      setPesoIdeal(foundPlayer.pesoIdeal || '');
      setBrazoDominante(foundPlayer.brazoDominante || 'Derecho');
      setCanalComunicacion(foundPlayer.canalComunicacion || '');
      setOjoDominante(foundPlayer.ojoDominante || 'Derecho');
      setHistoriaDeportiva(foundPlayer.historiaDeportiva || '');
      setLesionesActuales(foundPlayer.lesionesActuales || '');
      setLesionesPasadas(foundPlayer.lesionesPasadas || '');
      setFrecuenciaSemanal(foundPlayer.frecuenciaSemanal || '');
    } else if (players.length > 0) {
      navigate('/players');
    }
  }, [playerId, players, navigate]);

  const handleArchivePlayer = async () => {
    if (player) {
      await updatePlayerContext(player.id, { estado: 'archivado' });
      navigate('/players');
    }
  };

  // ✅ MIGRADO: Guardar perfil
  const handleProfileSave = async () => {
    if (!player) return;
    const profileData: Partial<Player> = {
      edad: Number(edad) || undefined,
      altura: Number(altura) || undefined,
      peso: Number(peso) || undefined,
      pesoIdeal: Number(pesoIdeal) || undefined,
      brazoDominante,
      canalComunicacion,
      ojoDominante,
      historiaDeportiva,
      lesionesActuales,
      lesionesPasadas,
      frecuenciaSemanal,
    };
    
    await updatePlayerContext(player.id, profileData);
    
    // MIGRADO: alert → notification.success
    notification.success("Perfil actualizado exitosamente");
  };

  return {
    player,
    profileData: {
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
    },
    profileSetters: {
      setEdad,
      setAltura,
      setPeso,
      setPesoIdeal,
      setBrazoDominante,
      setCanalComunicacion,
      setOjoDominante,
      setHistoriaDeportiva,
      setLesionesActuales,
      setLesionesPasadas,
      setFrecuenciaSemanal,
    },
    handlers: {
      handleArchivePlayer,
      handleProfileSave,
    }
  };
};