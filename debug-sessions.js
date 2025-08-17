// Script de debugging para verificar sesiones directamente desde Firebase
// Ejecutar en la consola del navegador para diagnosticar el problema

async function debugSessions() {
    console.group('🔍 DEBUG DIRECTO DE SESIONES');
    
    try {
        // 1. Verificar si Firebase está disponible
        if (typeof window === 'undefined' || !window.firebase) {
            console.error('❌ Firebase no está disponible en window');
            return;
        }
        
        // 2. Obtener la academia actual (necesitarás ajustar esto según tu contexto)
        const academiaId = localStorage.getItem('selectedAcademiaId') || 'tu-academia-id';
        console.log('🏫 Academia ID:', academiaId);
        
        // 3. Consulta directa a Firestore
        const { collection, getDocs } = window.firebase.firestore;
        const db = window.firebase.firestore.db;
        
        if (!db) {
            console.error('❌ Base de datos Firestore no disponible');
            return;
        }
        
        console.log('🔄 Consultando sesiones directamente desde Firestore...');
        
        const sessionsCollection = collection(db, "academias", academiaId, "sessions");
        const querySnapshot = await getDocs(sessionsCollection);
        
        console.log('📊 Total de documentos encontrados:', querySnapshot.docs.length);
        
        const sessions = [];
        querySnapshot.docs.forEach((doc) => {
            const data = doc.data();
            const session = {
                id: doc.id,
                ...data
            };
            sessions.push(session);
            
            // Log de cada sesión
            const minutosAtras = Math.round((Date.now() - new Date(session.fecha).getTime()) / (1000 * 60));
            console.log(`📝 Sesión ${doc.id}:`, {
                jugadorId: session.jugadorId,
                entrenadorId: session.entrenadorId,
                fecha: session.fecha,
                minutosAtras: minutosAtras,
                esReciente: minutosAtras < 60
            });
        });
        
        // 4. Análisis por jugador
        const jugadoresUnicos = [...new Set(sessions.map(s => s.jugadorId))];
        console.log('👥 Jugadores únicos encontrados:', jugadoresUnicos);
        
        // 5. Buscar específicamente Santiago y Bautista
        const targetPlayers = {
            'Santiago': 'X01pLb7m12RUNWp2uKy7',
            'Bautista': 'bqrijdyX3l1AJj9rB9vx'
        };
        
        Object.entries(targetPlayers).forEach(([name, id]) => {
            const playerSessions = sessions.filter(s => s.jugadorId === id);
            console.log(`🎾 ${name} (${id}):`, {
                sesionesEncontradas: playerSessions.length,
                sesiones: playerSessions.map(s => ({
                    id: s.id,
                    fecha: s.fecha,
                    minutosAtras: Math.round((Date.now() - new Date(s.fecha).getTime()) / (1000 * 60))
                }))
            });
        });
        
        // 6. Verificar fechas recientes
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() - 30); // Últimos 30 días
        
        const sesionesRecientes = sessions.filter(s => new Date(s.fecha) >= fechaLimite);
        console.log('📅 Sesiones recientes (últimos 30 días):', {
            total: sesionesRecientes.length,
            jugadores: [...new Set(sesionesRecientes.map(s => s.jugadorId))]
        });
        
        return sessions;
        
    } catch (error) {
        console.error('❌ Error en debug:', error);
    } finally {
        console.groupEnd();
    }
}

// Ejecutar automáticamente
debugSessions().then(sessions => {
    console.log('✅ Debug completado. Sesiones obtenidas:', sessions?.length || 0);
});
