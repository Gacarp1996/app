// components/RegisterForm.tsx
import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase/firebase-config";
import { SecurityUtils } from "../../utils/security";

export default function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // 🛡️ SANITIZACIÓN Y VALIDACIÓN DE SEGURIDAD
    const sanitizedEmail = SecurityUtils.sanitizeEmail(email);
    
    // Validar email
    if (!SecurityUtils.isValidEmail(sanitizedEmail)) {
      setMensaje("❌ Email inválido");
      return;
    }
    
    // Validar contraseña
    const passwordValidation = SecurityUtils.validatePassword(password);
    if (!passwordValidation.isValid) {
      setPasswordErrors(passwordValidation.errors);
      setMensaje("❌ Contraseña no cumple los requisitos de seguridad");
      return;
    }
    
    // Rate limiting
    if (!SecurityUtils.checkRateLimit(`register_${sanitizedEmail}`, 3, 300000)) { // 3 intentos por 5 min
      setMensaje("❌ Demasiados intentos. Espera 5 minutos.");
      return;
    }
    
    try {
      await createUserWithEmailAndPassword(auth, sanitizedEmail, password);
      setMensaje("✅ Usuario creado correctamente.");
      setPasswordErrors([]);
    } catch (error: any) {
      setMensaje("❌ Error: " + SecurityUtils.escapeHtml(error.message));
    }
  };

  return (
    <form onSubmit={handleRegister}>
      <h2>Registro</h2>
      <input
        type="email"
        placeholder="Correo electrónico"
        value={email}
        onChange={(e) => setEmail(SecurityUtils.sanitizeEmail(e.target.value))}
        required
      />
      <br />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          const validation = SecurityUtils.validatePassword(e.target.value);
          setPasswordErrors(validation.errors);
        }}
        required
      />
      
      {/* 🛡️ INDICADOR DE SEGURIDAD DE CONTRASEÑA */}
      {passwordErrors.length > 0 && (
        <div className="password-requirements">
          <p>Requisitos de contraseña:</p>
          <ul>
            {passwordErrors.map((error, index) => (
              <li key={index} style={{color: 'red', fontSize: '12px'}}>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <br />
      <button type="submit">Crear cuenta</button>
      <p>{mensaje}</p>
    </form>
  );
}