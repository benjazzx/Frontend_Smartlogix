import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { passwordStrength, passwordMatchValidator, rutValidator, normalizarRut } from '../../shared/validators/form-validators';

@Component({
  selector: 'app-recuperar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './recuperar.component.html',
})
export class RecuperarComponent {
  paso: 1 | 2 | 3 = 1;
  correoValidado = '';
  private solicitudId = '';

  validarForm: FormGroup;
  claveForm: FormGroup;

  loading = false;
  error = '';
  showNueva = false;
  showConfirmar = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    this.validarForm = this.fb.group({
      correo: ['', [Validators.required, Validators.email]],
      rut:    ['', [Validators.required, rutValidator]],
    });

    this.claveForm = this.fb.group({
      nuevaClave: ['', [Validators.required, passwordStrength]],
      confirmar:  ['', Validators.required],
    }, { validators: passwordMatchValidator('nuevaClave', 'confirmar') });
  }

  onValidar(): void {
    if (this.validarForm.invalid || this.loading) return;
    this.loading = true;
    this.error = '';
    const { correo, rut } = this.validarForm.value;
    const rutNormalizado = normalizarRut(rut);

    // El backend expone un flujo de 3 pasos encadenados por solicitudId:
    // solicitar-recuperacion -> verificar-recuperacion -> cambiar-clave.
    this.authService.solicitarRecuperacion(correo).subscribe({
      next: ({ solicitudId }) => {
        this.authService.verificarRecuperacion(solicitudId, correo, rutNormalizado).subscribe({
          next: () => {
            this.loading = false;
            this.solicitudId = solicitudId;
            this.correoValidado = correo;
            this.paso = 2;
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.loading = false;
            this.error = this.extraerMensaje(err, 'No se pudo verificar tu identidad. Verifica los datos.');
            this.cdr.detectChanges();
          },
        });
      },
      error: (err) => {
        this.loading = false;
        this.error = this.extraerMensaje(err, 'No se encontró una cuenta con ese correo.');
        this.cdr.detectChanges();
      },
    });
  }

  onCambiarClave(): void {
    if (this.claveForm.invalid || this.loading) return;
    this.loading = true;
    this.error = '';
    this.authService.cambiarClave(this.solicitudId, this.claveForm.value.nuevaClave).subscribe({
      next: () => {
        this.loading = false;
        this.paso = 3;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.error = this.extraerMensaje(err, 'No se pudo actualizar la contraseña. Intenta nuevamente.');
        this.cdr.detectChanges();
      },
    });
  }

  private extraerMensaje(err: unknown, fallback: string): string {
    const httpErr = err as { error?: string | { mensaje?: string } };
    const backendMsg = typeof httpErr?.error === 'string' ? httpErr.error : httpErr?.error?.mensaje;
    return backendMsg || fallback;
  }
}
