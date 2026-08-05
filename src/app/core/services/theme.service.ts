import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { AuthService } from './auth.service';

export interface AppTheme {
  id: string;
  label: string;
  swatch: string;
  gradient: string;        // sidebar background (linear-gradient)
  border: string;
  hover: string;           // rgba para hover
  active: string;          // rgba para ítem activo
  text: string;
  subtext: string;
  accent: string;
  accentText: string;
  avatarBg: string;
}

export const THEMES: AppTheme[] = [
  // ── Verdes ──────────────────────────────────────────────────────
  {
    id: 'esmeralda',
    label: 'Esmeralda',
    swatch: '#166534',
    gradient: 'linear-gradient(160deg, #14532d 0%, #166534 60%, #15803d 100%)',
    border:     'rgba(255,255,255,0.08)',
    hover:      'rgba(255,255,255,0.10)',
    active:     'rgba(255,255,255,0.20)',
    text:       '#bbf7d0',
    subtext:    '#4ade80',
    accent:     '#4ade80',
    accentText: '#14532d',
    avatarBg:   '#15803d',
  },
  {
    id: 'bosque',
    label: 'Bosque',
    swatch: '#134e4a',
    gradient: 'linear-gradient(160deg, #0f3d3a 0%, #134e4a 60%, #0f766e 100%)',
    border:     'rgba(255,255,255,0.08)',
    hover:      'rgba(255,255,255,0.10)',
    active:     'rgba(255,255,255,0.20)',
    text:       '#99f6e4',
    subtext:    '#2dd4bf',
    accent:     '#2dd4bf',
    accentText: '#0f3d3a',
    avatarBg:   '#0f766e',
  },
  // ── Azules ──────────────────────────────────────────────────────
  {
    id: 'oceano',
    label: 'Océano',
    swatch: '#0c4a6e',
    gradient: 'linear-gradient(160deg, #082f49 0%, #0c4a6e 60%, #0369a1 100%)',
    border:     'rgba(255,255,255,0.08)',
    hover:      'rgba(255,255,255,0.10)',
    active:     'rgba(255,255,255,0.20)',
    text:       '#bae6fd',
    subtext:    '#38bdf8',
    accent:     '#38bdf8',
    accentText: '#082f49',
    avatarBg:   '#0369a1',
  },
  {
    id: 'marino',
    label: 'Marino',
    swatch: '#1e3a5f',
    gradient: 'linear-gradient(160deg, #0f2942 0%, #1e3a5f 60%, #1d4ed8 100%)',
    border:     'rgba(255,255,255,0.08)',
    hover:      'rgba(255,255,255,0.10)',
    active:     'rgba(255,255,255,0.20)',
    text:       '#bfdbfe',
    subtext:    '#60a5fa',
    accent:     '#60a5fa',
    accentText: '#0f2942',
    avatarBg:   '#1d4ed8',
  },
  // ── Morados ─────────────────────────────────────────────────────
  {
    id: 'indigo',
    label: 'Índigo',
    swatch: '#1e1b4b',
    gradient: 'linear-gradient(160deg, #1a1740 0%, #1e1b4b 60%, #4338ca 100%)',
    border:     'rgba(255,255,255,0.08)',
    hover:      'rgba(255,255,255,0.10)',
    active:     'rgba(255,255,255,0.20)',
    text:       '#c7d2fe',
    subtext:    '#818cf8',
    accent:     '#818cf8',
    accentText: '#1a1740',
    avatarBg:   '#4338ca',
  },
  {
    id: 'violeta',
    label: 'Violeta',
    swatch: '#2e1065',
    gradient: 'linear-gradient(160deg, #240d56 0%, #2e1065 60%, #7c3aed 100%)',
    border:     'rgba(255,255,255,0.08)',
    hover:      'rgba(255,255,255,0.10)',
    active:     'rgba(255,255,255,0.20)',
    text:       '#ddd6fe',
    subtext:    '#a78bfa',
    accent:     '#a78bfa',
    accentText: '#240d56',
    avatarBg:   '#7c3aed',
  },
  // ── Rojos/Rosados ────────────────────────────────────────────────
  {
    id: 'carmesi',
    label: 'Carmesí',
    swatch: '#4c0519',
    gradient: 'linear-gradient(160deg, #3f0414 0%, #4c0519 60%, #be123c 100%)',
    border:     'rgba(255,255,255,0.08)',
    hover:      'rgba(255,255,255,0.10)',
    active:     'rgba(255,255,255,0.20)',
    text:       '#fecdd3',
    subtext:    '#fb7185',
    accent:     '#fb7185',
    accentText: '#3f0414',
    avatarBg:   '#be123c',
  },
  {
    id: 'coral',
    label: 'Coral',
    swatch: '#7f1d1d',
    gradient: 'linear-gradient(160deg, #6b1717 0%, #7f1d1d 60%, #dc2626 100%)',
    border:     'rgba(255,255,255,0.08)',
    hover:      'rgba(255,255,255,0.10)',
    active:     'rgba(255,255,255,0.20)',
    text:       '#fee2e2',
    subtext:    '#f87171',
    accent:     '#f87171',
    accentText: '#6b1717',
    avatarBg:   '#dc2626',
  },
  // ── Oscuros/Neutros ─────────────────────────────────────────────
  {
    id: 'pizarra',
    label: 'Pizarra',
    swatch: '#1e293b',
    gradient: 'linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #334155 100%)',
    border:     'rgba(255,255,255,0.07)',
    hover:      'rgba(255,255,255,0.08)',
    active:     'rgba(255,255,255,0.15)',
    text:       '#cbd5e1',
    subtext:    '#64748b',
    accent:     '#38bdf8',
    accentText: '#0f172a',
    avatarBg:   '#475569',
  },
  {
    id: 'medianoche',
    label: 'Medianoche',
    swatch: '#0f172a',
    gradient: 'linear-gradient(160deg, #020617 0%, #0f172a 60%, #1e293b 100%)',
    border:     'rgba(255,255,255,0.06)',
    hover:      'rgba(255,255,255,0.08)',
    active:     'rgba(99,102,241,0.35)',
    text:       '#e2e8f0',
    subtext:    '#6366f1',
    accent:     '#6366f1',
    accentText: '#020617',
    avatarBg:   '#4f46e5',
  },
  // ── Cálidos ─────────────────────────────────────────────────────
  {
    id: 'grafito',
    label: 'Grafito',
    swatch: '#292524',
    gradient: 'linear-gradient(160deg, #1c1917 0%, #292524 60%, #57534e 100%)',
    border:     'rgba(255,255,255,0.07)',
    hover:      'rgba(255,255,255,0.09)',
    active:     'rgba(255,255,255,0.18)',
    text:       '#d6d3d1',
    subtext:    '#a8a29e',
    accent:     '#fbbf24',
    accentText: '#1c1917',
    avatarBg:   '#78716c',
  },
  {
    id: 'cobre',
    label: 'Cobre',
    swatch: '#431407',
    gradient: 'linear-gradient(160deg, #3a1007 0%, #431407 60%, #c2410c 100%)',
    border:     'rgba(255,255,255,0.08)',
    hover:      'rgba(255,255,255,0.10)',
    active:     'rgba(255,255,255,0.20)',
    text:       '#fed7aa',
    subtext:    '#fb923c',
    accent:     '#fb923c',
    accentText: '#3a1007',
    avatarBg:   '#c2410c',
  },
];

const API_URL = '/api/config/preferencias';
const CLAVE_TEMA = 'tema';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _current: AppTheme = THEMES[0];
  private readonly STORAGE_BASE_KEY = 'smartlogix-theme';

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private http: HttpClient,
    private authService: AuthService,
  ) {
    // Carga inicial desde localStorage usando clave per-usuario
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem(this.storageKey());
      const found = THEMES.find(t => t.id === saved);
      if (found) this._apply(found);
    }
  }

  private storageKey(): string {
    const userId = this.authService.getCurrentUser()?.userId;
    return userId ? `${this.STORAGE_BASE_KEY}-${userId}` : this.STORAGE_BASE_KEY;
  }

  get current(): AppTheme { return this._current; }
  get themes(): AppTheme[] { return THEMES; }

  /** Carga el tema guardado en el servidor para el usuario autenticado. */
  loadFromServer(): void {
    this.http.get<Record<string, string>>(API_URL)
      .pipe(catchError(() => of({} as Record<string, string>)))
      .subscribe(prefs => {
        const temaId = prefs[CLAVE_TEMA];
        const found  = THEMES.find(t => t.id === temaId);
        if (found) this._apply(found);
      });
  }

  /** Aplica un tema, lo guarda en el servidor y en localStorage como respaldo. */
  apply(theme: AppTheme): void {
    this._apply(theme);
    this.http.put(`${API_URL}/${CLAVE_TEMA}`, { valor: theme.id })
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  private _apply(theme: AppTheme): void {
    this._current = theme;
    if (isPlatformBrowser(this.platformId)) {
      const root = document.documentElement;
      root.style.setProperty('--sl-text',        theme.text);
      root.style.setProperty('--sl-subtext',     theme.subtext);
      root.style.setProperty('--sl-hover',       theme.hover);
      root.style.setProperty('--sl-active',      theme.active);
      root.style.setProperty('--sl-accent',      theme.accent);
      root.style.setProperty('--sl-accent-text', theme.accentText);
      root.style.setProperty('--sl-avatar',      theme.avatarBg);
      root.style.setProperty('--sl-border',      theme.border);
      localStorage.setItem(this.storageKey(), theme.id);
    }
  }
}
