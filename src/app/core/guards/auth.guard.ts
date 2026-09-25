import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CognitoAuthService } from '../auth/cognito-auth.service';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, _state) => {
  const authService = inject(AuthService);
  const cognitoAuth = inject(CognitoAuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  if (cognitoAuth.isLoggedIn()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
