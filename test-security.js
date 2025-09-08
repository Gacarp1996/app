// test-security.js - PRUEBA TEMPORAL
import { SecurityUtils } from './utils/security.js';

console.log('🧪 TESTING DE SEGURIDAD');
console.log('='.repeat(50));

// Test 1: Contraseñas débiles
console.log('❌ Contraseña débil "123456":');
console.log(SecurityUtils.validatePassword('123456'));

console.log('\n❌ Contraseña débil "password":');
console.log(SecurityUtils.validatePassword('password'));

// Test 2: Contraseña fuerte
console.log('\n✅ Contraseña fuerte "MiPass123!":');
console.log(SecurityUtils.validatePassword('MiPass123!'));

// Test 3: Sanitización XSS
console.log('\n🛡️ Sanitización XSS:');
const maliciousInput = '<script>alert("XSS")</script>Nombre normal';
console.log('Input original:', maliciousInput);
console.log('Input sanitizado:', SecurityUtils.sanitizeInput(maliciousInput));

// Test 4: Email validation
console.log('\n📧 Validación de emails:');
console.log('email@test.com:', SecurityUtils.isValidEmail('email@test.com'));
console.log('email_invalido:', SecurityUtils.isValidEmail('email_invalido'));

console.log('\n✅ TODOS LOS TESTS COMPLETADOS');
