import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, tap, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Orden, OrdenRequest, HistorialEntry, HistorialRequest } from '../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class OrdenService {
  private readonly baseUrl = environment.services.ordenes;

  private readonly ordenesSubject = new BehaviorSubject<Orden[]>([]);
  ordenes$ = this.ordenesSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  /** Normaliza estado (backend: lowercase) a Title Case y calcula total si falta */
  private normalizeOrden(o: Orden): Orden {
    const estadoMap: Record<string, string> = {
      'pendiente':   'Pendiente',
      'procesando':  'Procesando',
      'aprobado':    'Aprobado',
      'en tránsito': 'En tránsito',
      'en transito': 'En tránsito',
      'entregado':   'Entregado',
      'cancelado':   'Cancelado',
    };
    const raw = (o.estadoActual ?? '').toLowerCase();
    const detalles = o.detalles?.map(d => ({
      ...d,
      subtotal: d.subtotal ?? +(d.precioUnitario ?? 0) * d.cantidad,
    }));
    return {
      ...o,
      estadoActual: estadoMap[raw] ?? o.estadoActual,
      detalles,
      total: o.total ?? detalles?.reduce((sum, d) => sum + (d.subtotal ?? 0), 0) ?? 0,
    };
  }

  getAll(): Observable<Orden[]> {
    return this.http.get<Orden[]>(this.baseUrl).pipe(
      tap(data => this.ordenesSubject.next(data.map(o => this.normalizeOrden(o)))),
      catchError(() => {
        this.ordenesSubject.next([]);
        return of([]);
      }),
    );
  }

  getMisOrdenes(): Observable<Orden[]> {
    return this.http.get<Orden[]>(`${this.baseUrl}/mis-ordenes`).pipe(
      tap(data => this.ordenesSubject.next(data.map(o => this.normalizeOrden(o)))),
      catchError(() => {
        this.ordenesSubject.next([]);
        return of([]);
      }),
    );
  }

  getById(id: number): Observable<Orden> {
    return this.http.get<Orden>(`${this.baseUrl}/${id}`).pipe(
      tap(o => this.normalizeOrden(o)),
      catchError(() => throwError(() => new Error(`Orden ${id} no encontrada`))),
    );
  }

  crearOrden(dto: OrdenRequest): Observable<Orden> {
    return this.http.post<Orden>(this.baseUrl, dto).pipe(
      tap(created => this.ordenesSubject.next([this.normalizeOrden(created), ...this.ordenesSubject.value])),
      catchError(err => throwError(() => err)),
    );
  }

  getHistorial(ordenId: number): Observable<HistorialEntry[]> {
    return this.http.get<HistorialEntry[]>(`${this.baseUrl}/${ordenId}/historial`).pipe(
      catchError(() => of([])),
    );
  }

  agregarHistorial(ordenId: number, dto: HistorialRequest): Observable<Orden> {
    return this.http.post<Orden>(`${this.baseUrl}/${ordenId}/historial`, dto).pipe(
      tap(updatedOrden => {
        const normalized = this.normalizeOrden(updatedOrden);
        const list = this.ordenesSubject.value.map(o => o.id === ordenId ? normalized : o);
        this.ordenesSubject.next(list);
      }),
      catchError(err => throwError(() => err)),
    );
  }

  tomarOrden(id: number): Observable<Orden> {
    return this.http.post<Orden>(`${this.baseUrl}/${id}/tomar`, {}).pipe(
      tap(updated => {
        const normalized = this.normalizeOrden(updated);
        this.ordenesSubject.next(this.ordenesSubject.value.map(o => o.id === id ? normalized : o));
      }),
      catchError(err => throwError(() => err)),
    );
  }

  solicitarDevolucion(id: number, motivo: string): Observable<Orden> {
    return this.http.post<Orden>(`${this.baseUrl}/${id}/solicitar-devolucion`, { motivo }).pipe(
      tap(updated => {
        const normalized = this.normalizeOrden(updated);
        this.ordenesSubject.next(this.ordenesSubject.value.map(o => o.id === id ? normalized : o));
      }),
      catchError(err => throwError(() => err)),
    );
  }

  resolverDevolucion(id: number, aprobada: boolean, danado: boolean, comentario?: string): Observable<Orden> {
    return this.http.post<Orden>(`${this.baseUrl}/${id}/resolver-devolucion`, { aprobada, danado, comentario }).pipe(
      tap(updated => {
        const normalized = this.normalizeOrden(updated);
        this.ordenesSubject.next(this.ordenesSubject.value.map(o => o.id === id ? normalized : o));
      }),
      catchError(err => throwError(() => err)),
    );
  }

  liberarOrden(id: number): Observable<Orden> {
    return this.http.post<Orden>(`${this.baseUrl}/${id}/liberar`, {}).pipe(
      tap(updated => {
        const normalized = this.normalizeOrden(updated);
        this.ordenesSubject.next(this.ordenesSubject.value.map(o => o.id === id ? normalized : o));
      }),
      catchError(err => throwError(() => err)),
    );
  }

  getSnapshot(): Orden[] { return this.ordenesSubject.value; }
}
