import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Debe reflejar exactamente las reglas de UserService.validarContraseña() en el backend (Users).
const SIMBOLO_ESPECIAL = /[!@#$%^&*()\-_=+[\]{}|;:'",.<>?/\\~`]/;

export function passwordStrength(control: AbstractControl): ValidationErrors | null {
  const value: string = control.value ?? '';
  if (!value) return null;
  const errors: ValidationErrors = {};
  if (value.length < 8) errors['minLength8'] = true;
  if (!/[A-Z]/.test(value)) errors['mayuscula'] = true;
  if (!SIMBOLO_ESPECIAL.test(value)) errors['simbolo'] = true;
  return Object.keys(errors).length ? errors : null;
}

export function passwordMatchValidator(claveField: string, confirmField: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const a = group.get(claveField)?.value;
    const b = group.get(confirmField)?.value;
    return a && b && a !== b ? { noCoinciden: true } : null;
  };
}

function calcularDigitoVerificador(cuerpo: string): string {
  let suma = 0;
  let multiplicador = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return '0';
  if (resto === 10) return 'K';
  return String(resto);
}

/** Normaliza un RUT chileno a formato "12345678-9" (sin puntos, guion, DV en mayúscula). */
export function normalizarRut(raw: string): string {
  const limpio = (raw ?? '').replace(/\./g, '').replace(/-/g, '').toUpperCase();
  if (limpio.length < 2) return limpio;
  return `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
}

/** Valida formato (7-8 dígitos + DV) y el dígito verificador real del RUT chileno. */
export function rutValidator(control: AbstractControl): ValidationErrors | null {
  const raw: string = (control.value ?? '').toString().trim();
  if (!raw) return null;

  const limpio = raw.replace(/\./g, '').replace(/-/g, '').toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(limpio)) {
    return { rutFormato: true };
  }

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  return dv === calcularDigitoVerificador(cuerpo) ? null : { rutInvalido: true };
}
