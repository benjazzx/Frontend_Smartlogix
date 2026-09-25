import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CognitoAuthService } from '../auth/cognito-auth.service';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, _state) => {
  const authService = inject(AuthService);
  const cognitoAuth = inject(CognitoAuthService);
  const router = inject(Router);

  const allowedRoles: string[] = route.data?.['roles'] ?? [];
  if (allowedRoles.length === 0) return true;

  if (authService.hasRole(...allowedRoles)) return true;

  if (cognitoAuth.hasRole(...allowedRoles)) return true;

  router.navigate(['/dashboard']);
  return false;
};
