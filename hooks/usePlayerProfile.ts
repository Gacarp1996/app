// hooks/usePlayerProfile.ts
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player } from '../types';
import { updatePlayer } from '../Database/FirebasePlayers';

interface UsePlayerProfileProps {
  players: Player[];
  playerId: string | undefined;
  academiaId: string;
  onDataChange: () => void;
}

export const usePlayerProfile = ({ 
  players, 
  playerId, 
  academiaId, 
  onDataChange 
}: UsePlayerProfileProps) => {
  const navigate = useNavigate();
  
  // Estados del jugador
  const [player, setPlayer] = useState<Player | null>(null);
  
  // Estados del perfil
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

  // Cargar datos del jugador
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

  // Handlers
  const handleArchivePlayer = async () => {
    if (player) {
      await updatePlayer(academiaId, player.id, { estado: 'archivado' });
      onDataChange();
      navigate('/players');
    }
  };

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
    await updatePlayer(academiaId, player.id, profileData);
    onDataChange();
    alert("Perfil actualizado.");
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