import { Injectable, signal, PLATFORM_ID, Inject, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, UsuarioSesion } from '../../shared/models/models';
import { CognitoAuthService } from '../auth/cognito-auth.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'smartlogix_token';
  private readonly USER_KEY  = 'smartlogix_user';

  private readonly cognitoAuth = inject(CognitoAuthService);
  private isBrowser: boolean;
  private currentUserSubject = new BehaviorSubject<UsuarioSesion | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  isLoggedIn = signal<boolean>(false);

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    const user = this.loadUser();
    this.currentUserSubject.next(user);
    this.isLoggedIn.set(!!this.getToken());
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.services.auth}/login`, credentials).pipe(
      tap(response => {
        this.storeToken(response.token);
        const session: UsuarioSesion = {
          userId: String(response.userId),
          correo: response.correo,
          rolNombre: response.rolNombre,
        };
        this.storeUser(session);
        this.currentUserSubject.next(session);
        this.isLoggedIn.set(true);
      }),
      catchError(err => throwError(() => err)),
    );
  }

  isMockSession(): boolean {
    return false;
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
    this.currentUserSubject.next(null);
    this.isLoggedIn.set(false);

    if (this.cognitoAuth.getIdToken()) {
      this.cognitoAuth.logout();
      return;
    }
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getCurrentUser(): UsuarioSesion | null {
    return this.cognitoUser() ?? this.currentUserSubject.value;
  }

  hasRole(...roles: string[]): boolean {
    const rol = this.getCurrentUser()?.rolNombre;
    return !!rol && roles.includes(rol);
  }

  private cognitoUser(): UsuarioSesion | null {
    if (!this.cognitoAuth.isLoggedIn()) return null;
    const claims = this.cognitoAuth.getClaims();
    if (!claims) return null;
    const roles = this.cognitoAuth.getRoles();
    const prioridad = ['admin', 'bodeguero', 'transportista', 'cliente'];
    const rol = prioridad.find(r => roles.includes(r)) ?? 'cliente';
    return {
      userId: claims.sub,
      correo: claims.email ?? '',
      rolNombre: rol as UsuarioSesion['rolNombre'],
    };
  }

  private storeToken(token: string): void {
    if (this.isBrowser) localStorage.setItem(this.TOKEN_KEY, token);
  }

  private storeUser(user: UsuarioSesion): void {
    if (this.isBrowser) localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  private loadUser(): UsuarioSesion | null {
    if (!this.isBrowser) return null;
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  solicitarRecuperacion(correo: string): Observable<{ solicitudId: string }> {
    return this.http.post<{ solicitudId: string }>('/auth/solicitar-recuperacion', { correo }).pipe(
      catchError(err => throwError(() => err)),
    );
  }

  verificarRecuperacion(solicitudId: string, correo: string, rut: string): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>('/auth/verificar-recuperacion', { solicitudId, correo, rut }).pipe(
      catchError(err => throwError(() => err)),
    );
  }

  cambiarClave(solicitudId: string, nuevaClave: string): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>('/auth/cambiar-clave', { solicitudId, nuevaClave }).pipe(
      catchError(err => throwError(() => err)),
    );
  }

  registrar(dto: import('../../shared/models/models').UsuarioRequest): Observable<unknown> {
    return this.http.post(`${environment.services.registro}`, dto).pipe(
      catchError(err => throwError(() => err)),
    );
  }

  getInitials(correo: string): string {
    const name = correo.includes('@') ? correo.split('@')[0] : correo;
    return name.split(/[\s._-]/).slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }
}