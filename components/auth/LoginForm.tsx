import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase/firebase-config";
import { SecurityUtils } from "../../utils/security";
import { AuditLogger } from "../../utils/auditLogger";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [attemptCount, setAttemptCount] = useState(0);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // 🛡️ SANITIZACIÓN DE SEGURIDAD
    const sanitizedEmail = SecurityUtils.sanitizeEmail(email);
    
    // Validar email
    if (!SecurityUtils.isValidEmail(sanitizedEmail)) {
      setMensaje("❌ Email inválido");
      return;
    }
    
    // Rate limiting - máximo 5 intentos por 15 minutos
    if (!SecurityUtils.checkRateLimit(`login_${sanitizedEmail}`, 5, 900000)) {
      setMensaje("❌ Demasiados intentos fallidos. Espera 15 minutos.");
      return;
    }
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, sanitizedEmail, password);
      const user = userCredential.user;
      setMensaje("✅ Inicio de sesión exitoso.");
      setAttemptCount(0);
      
      // 🛡️ LOG DE SEGURIDAD - Login exitoso
      AuditLogger.logSuccessfulLogin(user.uid, sanitizedEmail);
      
    } catch (error: any) {
      setAttemptCount(prev => prev + 1);
      
      // 🛡️ GESTIÓN SEGURA DE ERRORES
      let errorMessage = "Error de autenticación";
      
      // Solo mostrar errores específicos seguros
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = "Usuario no encontrado";
          break;
        case 'auth/wrong-password':
          errorMessage = "Contraseña incorrecta";
          break;
        case 'auth/too-many-requests':
          errorMessage = "Demasiados intentos. Cuenta temporalmente bloqueada";
          break;
        case 'auth/user-disabled':
          errorMessage = "Cuenta deshabilitada";
          break;
        default:
          errorMessage = "Error de autenticación";
      }
      
      setMensaje(`❌ ${errorMessage} (Intento ${attemptCount + 1}/5)`);
      
      // 🛡️ LOG DE SEGURIDAD - Login fallido
      AuditLogger.logFailedLogin(sanitizedEmail, error.code, attemptCount + 1);
      
      // 🚨 DETECTAR ACTIVIDAD SOSPECHOSA
      if (attemptCount >= 4) {
        AuditLogger.logSuspiciousActivity(
          'unknown', 
          'multiple_failed_logins', 
          { email: sanitizedEmail, totalAttempts: attemptCount + 1 }
        );
      }
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <h2>Iniciar sesión</h2>
      <input
        type="email"
        placeholder="Correo electrónico"
        value={email}
        onChange={(e) => setEmail(SecurityUtils.sanitizeEmail(e.target.value))}
        required
        maxLength={254}
      />
      <br />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        maxLength={128}
      />
      <br />
      
      {attemptCount >= 3 && (
        <div style={{color: 'orange', fontSize: '14px', marginBottom: '10px'}}>
          ⚠️ Múltiples intentos fallidos detectados
        </div>
      )}
      
      <button type="submit">Ingresar</button>
      <p>{mensaje}</p>
    </form>
  );
}

