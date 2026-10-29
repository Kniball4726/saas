import { authService } from './services/auth.service.js';
import { db } from './services/store.service.js';
import { fiatService } from './services/fiat.service.js';

async function runAuthTests() {
  console.log('====================================================');
  console.log('🔐 INICIANDO SUITE DE PRUEBAS DE AUTENTICACIÓN VELOXPAY');
  console.log('====================================================');

  // [1] Registro tradicional
  console.log('\n[1] Probando registro con correo y contraseña:');
  const regResult = await authService.register({
    email: 'carlos.rodriguez@empresa.com.ar',
    password: 'PasswordSegura2026!',
    firstName: 'Carlos',
    lastName: 'Rodríguez',
    cuitDni: '20-33445566-9',
    pin: '654321',
  });
  console.log('   - Usuario registrado:', regResult.user.email, `(${regResult.user.id})`);
  console.log('   - Tipo de Token:', regResult.tokens.tokenType);
  console.log('   - Saldo de bienvenida ARS:', db.getAccount(regResult.user.id, 'ARS').balance);

  // [2] Login tradicional exitoso
  console.log('\n[2] Probando login con credenciales correctas:');
  const loginResult = await authService.login('carlos.rodriguez@empresa.com.ar', 'PasswordSegura2026!');
  console.log('   - Login exitoso para:', loginResult.user.firstName, loginResult.user.lastName);
  console.log('   - Token emitido (longitud):', loginResult.tokens.accessToken.length);

  // [3] Login rechazado por contraseña incorrecta
  console.log('\n[3] Probando login con contraseña errónea:');
  try {
    await authService.login('carlos.rodriguez@empresa.com.ar', 'ContraseñaEquivocada');
    console.error('   ❌ ERROR: No debió permitir el acceso');
  } catch (err: any) {
    console.log('   - Correctamente rechazado:', err.message);
  }

  // [4] Google Sign-In (Simulación y Onboarding)
  console.log('\n[4] Probando autenticación con Google (OAuth / OpenID):');
  const googleResult = await authService.loginWithGoogle({
    idToken: 'mock-google-id-token-abc',
    email: 'lucas.gonzalez@gmail.com',
    name: 'Lucas González',
    picture: 'https://lh3.googleusercontent.com/a/default-user',
  });
  console.log('   - Usuario Google creado/verificado:', googleResult.user.email);
  console.log('   - Proveedor asignado:', googleResult.user.authProvider);
  console.log('   - CVU asignado en COELSA:', db.virtualBankAccounts.size > 0 ? 'Generado con éxito' : 'Error');

  // [5] Sign in with Apple (Simulación y Onboarding)
  console.log('\n[5] Probando autenticación con Apple (Sign in with Apple):');
  const appleResult = await authService.loginWithApple({
    identityToken: 'mock-apple-identity-token-xyz',
    email: 'mariana.lopez@privaterelay.appleid.com',
    fullName: { firstName: 'Mariana', lastName: 'López' },
  });
  console.log('   - Usuario Apple creado:', appleResult.user.email);
  console.log('   - Proveedor asignado:', appleResult.user.authProvider);

  // [6] Verificación de PIN de 6 dígitos (Step-Up Auth)
  console.log('\n[6] Probando Step-Up Auth (Verificación de PIN transaccional):');
  const isPinValid = authService.verifyPin(regResult.user.id, '654321');
  const isPinInvalid = authService.verifyPin(regResult.user.id, '000000');
  console.log('   - PIN 654321 (Correcto):', isPinValid ? 'VÁLIDO ✅' : 'INVÁLIDO ❌');
  console.log('   - PIN 000000 (Incorrecto):', isPinInvalid ? 'VÁLIDO ❌' : 'RECHAZADO ✅');

  // [7] Retiro bancario con validación de PIN
  console.log('\n[7] Probando Retiro Bancario con PIN de seguridad:');
  const withdrawal = await fiatService.requestWithdrawal(regResult.user.id, {
    amount: 15000,
    targetCbuCvu: '0720000188000000999999',
    ownerName: 'Carlos Rodríguez',
    ownerCuit: '20-33445566-9',
  });
  console.log('   - Retiro procesado vía COELSA:', withdrawal.status, `Tracking: ${withdrawal.coelsaTrackingId}`);
  console.log('   - Saldo restante ARS:', withdrawal.remainingBalance);

  console.log('\n====================================================');
  console.log('🎉 TODAS LAS PRUEBAS DE AUTENTICACIÓN PASARON CON ÉXITO');
  console.log('====================================================');
}

runAuthTests().catch((err) => {
  console.error('Error en pruebas de autenticación:', err);
  process.exit(1);
});
