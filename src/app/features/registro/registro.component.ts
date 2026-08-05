import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { passwordStrength, passwordMatchValidator, rutValidator, normalizarRut } from '../../shared/validators/form-validators';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './registro.component.html',
})
export class RegistroComponent {
  form: FormGroup;
  loading = false;
  error = '';
  showPassword = false;
  showConfirm = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      nombre:         ['', [Validators.required, Validators.minLength(2)]],
      apellido:       ['', [Validators.required, Validators.minLength(2)]],
      rut:            ['', [Validators.required, rutValidator]],
      correo:         ['', [Validators.required, Validators.email]],
      clave:          ['', [Validators.required, passwordStrength]],
      confirmarClave: ['', Validators.required],
    }, { validators: passwordMatchValidator('clave', 'confirmarClave') });
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading) return;
    this.loading = true;
    this.error = '';
    const { confirmarClave, ...dto } = this.form.value;
    dto.rut = normalizarRut(dto.rut);
    this.authService.registrar(dto).subscribe({
      next: () => {
        // Auto-login inmediato con las mismas credenciales
        this.authService.login({ correo: dto.correo, clave: dto.clave }).subscribe({
          next: () => this.router.navigate(['/dashboard']),
          error: () => {
            // Registro OK pero login falló — llevar al login manual
            this.loading = false;
            this.router.navigate(['/login']);
          },
        });
      },
      error: (err) => {
        const backendMsg = typeof err?.error === 'string' ? err.error : err?.error?.mensaje;
        this.error = backendMsg || 'No se pudo completar el registro. Intenta nuevamente.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }
}
