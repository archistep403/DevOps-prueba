export const ALLOWED_EMAIL_DOMAINS = ['gmail.com', 'duoc.cl', 'profesor.duoc.cl'];

export function isAllowedEmail(email) {
  const domain = email.split('@')[1] || '';
  return ALLOWED_EMAIL_DOMAINS.includes(domain.toLowerCase());
}

export const required = v => (v === '' ? 'Este campo es obligatorio' : '');
export const maxLength = (v, n) => (v.length > n ? `Máximo ${n} caracteres` : '');

// RUN sin puntos ni guion (ej: 111111111): valida el dígito verificador con módulo 11.
export function validarRun(run) {
  if (!/^\d{6,8}[0-9kK]$/.test(run)) return false;
  const cuerpo = run.slice(0, -1);
  const dv = run.slice(-1).toUpperCase();
  let suma = 0;
  let mult = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const resto = 11 - (suma % 11);
  const esperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
  return dv === esperado;
}

export const emailRule = v =>
  required(v) ||
  maxLength(v, 100) ||
  (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Ingresa un correo válido') ||
  (isAllowedEmail(v) ? '' : 'Solo correos @duoc.cl, @profesor.duoc.cl o @gmail.com');

export const passwordRule = v =>
  required(v) || (v.length < 4 || v.length > 10 ? 'La contraseña debe tener entre 4 y 10 caracteres' : '');

export const LOGIN_RULES = {
  email: emailRule,
  password: passwordRule
};

export const REGISTER_RULES = {
  run: v =>
    required(v) ||
    (v.length < 7 || v.length > 9 ? 'El RUN debe tener entre 7 y 9 caracteres' : '') ||
    (validarRun(v) ? '' : 'RUN inválido: sin puntos ni guion y con dígito verificador correcto'),
  nombre: v => required(v) || maxLength(v, 50),
  apellidos: v => required(v) || maxLength(v, 100),
  email: emailRule,
  emailConfirm: (v, all) =>
    required(v) || (v.toLowerCase() === all.email.trim().toLowerCase() ? '' : 'Los correos no coinciden'),
  password: passwordRule,
  passwordConfirm: (v, all) => required(v) || (v === all.password ? '' : 'Las contraseñas no coinciden'),
  fechaNacimiento: v => (v && new Date(v) > new Date() ? 'La fecha no puede ser futura' : ''),
  telefono: v => (v === '' || /^\+?\d{8,12}$/.test(v) ? '' : 'Ingresa entre 8 y 12 dígitos'),
  region: v => (v === '' ? 'Selecciona una región' : ''),
  comuna: v => (v === '' ? 'Selecciona una comuna' : ''),
  direccion: v => required(v) || maxLength(v, 300)
};

export const ADMIN_USER_RULES = {
  ...REGISTER_RULES,
  tipoUsuario: v => (v === '' ? 'Selecciona un tipo de usuario' : '')
};

export const PRODUCT_RULES = {
  name: v => required(v) || maxLength(v, 60),
  desc: v => required(v) || maxLength(v, 200),
  price: v => {
    if (v === '') return 'Este campo es obligatorio';
    const n = Number(v);
    if (!Number.isInteger(n) || n <= 0) return 'Ingresa un precio entero mayor a 0';
    if (n > 100000000) return 'El precio es demasiado alto';
    return '';
  }
};

// Campos que se vuelven a validar cuando cambia el campo original.
export const LINKED_FIELDS = { email: 'emailConfirm', password: 'passwordConfirm' };
