import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router      = inject(Router);
  const authService = inject(AuthService);
  const toast       = inject(ToastService);

  const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      switch (error.status) {
        case 0:
          if (isWrite) {
            toast.warning(
              'Sin conexión con el servidor',
              'El cambio se aplicó localmente pero no se guardó en la base de datos.',
            );
          }
          break;

        case 401:
          toast.error('Sesión expirada', 'Inicia sesión nuevamente.');
          authService.logout();
          router.navigate(['/login']);
          break;

        case 403:
          if (authService.isMockSession()) {
            toast.warning(
              'Modo sin conexión',
              'Sesión local activa — cierra sesión e ingresa nuevamente con el servidor corriendo para guardar cambios.',
            );
          } else if (isWrite) {
            toast.error('Sin permiso', 'No tienes autorización para realizar esta acción.');
          }
          // GET con 403: silencioso — el componente maneja el null con catchError
          break;

        case 404:
          if (isWrite) toast.error('Recurso no encontrado', 'El elemento que intentas modificar no existe.');
          break;

        case 422:
        case 400:
          toast.error(
            'Datos inválidos',
            error.error?.mensaje ?? error.error?.message ?? 'Revisa los campos e intenta de nuevo.',
          );
          break;

        case 500:
        case 502:
        case 503:
          if (isWrite) {
            toast.error('Error del servidor', 'No se pudo guardar. Intenta de nuevo más tarde.');
          }
          break;
      }
      return throwError(() => error);
    }),
  );
};
