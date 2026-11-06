import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

export const COGNITO_ROLE_MAP: Record<string, string> = {
  ADMIN: 'admin',
  OPERADOR: 'bodeguero',
  CLIENTE: 'cliente',
};

interface CognitoIdTokenClaims {
  sub: string;
  email?: string;
  exp: number;
  'cognito:groups'?: string[];
  [key: string]: unknown;
}

const VERIFIER_KEY = 'cognito_pkce_verifier';
const STATE_KEY = 'cognito_pkce_state';
const NONCE_KEY = 'cognito_oidc_nonce';
const ID_TOKEN_KEY = 'cognito_id_token';
const ACCESS_TOKEN_KEY = 'cognito_access_token';

@Injectable({ providedIn: 'root' })
export class CognitoAuthService {
  private readonly platformId = inject(PLATFORM_ID);

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  async login(): Promise<void> {
    if (!this.isBrowser) return;

    const verifier = this.randomString(64);
    const challenge = await this.sha256Base64Url(verifier);
    const state = this.randomString(32);
    // OIDC nonce: distinto de state (que protege el paso del authorization code);
    // el nonce viaja DENTRO del ID token y se valida tras el intercambio, para
    // asegurar que el token emitido corresponde a esta sesión de login y no a un
    // token robado/reproducido de otra sesión (ataque de replay).
    const nonce = this.randomString(32);

    sessionStorage.setItem(VERIFIER_KEY, verifier);
    sessionStorage.setItem(STATE_KEY, state);
    sessionStorage.setItem(NONCE_KEY, nonce);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: environment.cognito.clientId,
      redirect_uri: environment.cognito.redirectUri,
      scope: environment.cognito.scope,
      state,
      nonce,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });

    window.location.href = `${environment.cognito.domain}/oauth2/authorize?${params.toString()}`;
  }

  logout(): void {
    if (!this.isBrowser) return;
    localStorage.removeItem(ID_TOKEN_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);

    const params = new URLSearchParams({
      client_id: environment.cognito.clientId,
      logout_uri: environment.cognito.redirectUri,
    });
    window.location.href = `${environment.cognito.domain}/logout?${params.toString()}`;
  }

  async handleRedirectCallback(): Promise<boolean> {
    if (!this.isBrowser) return false;

    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const returnedState = url.searchParams.get('state');
    if (!code) return false;

    const expectedState = sessionStorage.getItem(STATE_KEY);
    const verifier = sessionStorage.getItem(VERIFIER_KEY);
    const expectedNonce = sessionStorage.getItem(NONCE_KEY);
    sessionStorage.removeItem(STATE_KEY);
    sessionStorage.removeItem(VERIFIER_KEY);
    sessionStorage.removeItem(NONCE_KEY);

    if (!verifier || !returnedState || returnedState !== expectedState) {
      console.error('Cognito: state inválido o code_verifier ausente — se descarta el callback.');
      window.history.replaceState({}, '', environment.cognito.redirectUri);
      return false;
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: environment.cognito.clientId,
      code,
      redirect_uri: environment.cognito.redirectUri,
      code_verifier: verifier,
    });

    const response = await fetch(`${environment.cognito.domain}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    window.history.replaceState({}, '', environment.cognito.redirectUri);

    if (!response.ok) {
      console.error('Cognito: fallo el intercambio de código por tokens.', await response.text());
      return false;
    }

    const tokens = await response.json();

    const idTokenNonce = this.decodeJwtPayload(tokens.id_token)?.['nonce'];
    if (!expectedNonce || idTokenNonce !== expectedNonce) {
      console.error('Cognito: nonce del ID token no coincide — posible replay de un token ajeno, se descarta.');
      return false;
    }

    localStorage.setItem(ID_TOKEN_KEY, tokens.id_token);
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
    return true;
  }

  getIdToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(ID_TOKEN_KEY);
  }

  getClaims(): CognitoIdTokenClaims | null {
    const token = this.getIdToken();
    if (!token) return null;
    return this.decodeJwtPayload(token) as CognitoIdTokenClaims | null;
  }

  private decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
      const payload = token.split('.')[1];
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  isLoggedIn(): boolean {
    const claims = this.getClaims();
    if (!claims) return false;
    return claims.exp * 1000 > Date.now();
  }

  getRoles(): string[] {
    const groups = this.getClaims()?.['cognito:groups'] ?? [];
    return groups.map(g => COGNITO_ROLE_MAP[g] ?? g.toLowerCase());
  }

  hasRole(...roles: string[]): boolean {
    const mine = this.getRoles();
    return roles.some(r => mine.includes(r));
  }

  private randomString(length: number): string {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').slice(0, length);
  }

  private async sha256Base64Url(value: string): Promise<string> {
    const data = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const bytes = new Uint8Array(digest);
    let binary = '';
    bytes.forEach(b => (binary += String.fromCharCode(b)));
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}
