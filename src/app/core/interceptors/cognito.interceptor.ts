import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { CognitoAuthService } from '../auth/cognito-auth.service';

const COGNITO_ROUTE_PREFIXES = ['/api/ordenes', '/api/productos'];

export const cognitoInterceptor: HttpInterceptorFn = (req, next) => {
  const base = environment.apiGateway;
  if (!base || !req.url.startsWith(base)) {
    return next(req);
  }

  const path = req.url.substring(base.length);
  const isCognitoRoute = COGNITO_ROUTE_PREFIXES.some(prefix => path.startsWith(prefix));
  const isAuthRoute = path.startsWith('/auth/');
  const hasOwnAuth = req.headers.has('Authorization');

  if (!isCognitoRoute && (isAuthRoute || hasOwnAuth)) {
    return next(req);
  }

  const token = inject(CognitoAuthService).getIdToken();
  if (token) {
    return next(req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) }));
  }
  return next(req);
};