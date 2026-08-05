import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, tap, throwError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Producto, ProductoRequest, Categoria, HistorialStock } from '../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class ProductoService {
  private readonly baseUrl      = environment.services.productos;
  private readonly categoriasUrl = environment.services.categorias;

  private readonly productosSubject  = new BehaviorSubject<Producto[]>([]);
  private readonly categoriasSubject = new BehaviorSubject<Categoria[]>([]);

  productos$  = this.productosSubject.asObservable();
  categorias$ = this.categoriasSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  // --- PRODUCTOS ---

  getAll(): Observable<Producto[]> {
    return this.http.get<Producto[]>(this.baseUrl).pipe(
      tap(data => this.productosSubject.next(data)),
      catchError(() => of([])),
    );
  }

  getById(id: string): Observable<Producto> {
    return this.http.get<Producto>(`${this.baseUrl}/${id}`).pipe(
      catchError(() => throwError(() => new Error('Producto no encontrado'))),
    );
  }

  create(dto: ProductoRequest): Observable<Producto | null> {
    return this.http.post<Producto>(this.baseUrl, dto).pipe(
      tap(created => this.productosSubject.next([...this.productosSubject.value, created])),
      catchError(() => of(null)),
    );
  }

  update(id: string, dto: ProductoRequest): Observable<Producto | null> {
    return this.http.put<Producto>(`${this.baseUrl}/${id}`, dto).pipe(
      tap(updated => {
        const list = this.productosSubject.value.map(p => p.id === id ? updated : p);
        this.productosSubject.next(list);
      }),
      catchError(() => of(null)),
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => this.productosSubject.next(this.productosSubject.value.filter(p => p.id !== id))),
      catchError(() => {
        this.productosSubject.next(this.productosSubject.value.filter(p => p.id !== id));
        return of(undefined);
      }),
    );
  }

  toggleActivo(id: string): Observable<Producto | null> {
    return this.http.patch<Producto>(`${this.baseUrl}/${id}/toggle-activo`, {}).pipe(
      tap(updated => {
        const list = this.productosSubject.value.map(p => p.id === id ? updated : p);
        this.productosSubject.next(list);
      }),
      catchError(() => of(null)),
    );
  }

  subirImagen(id: string, file: File): Observable<Producto | null> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Producto>(`${this.baseUrl}/${id}/foto`, formData).pipe(
      tap(updated => {
        const list = this.productosSubject.value.map(p => p.id === id ? updated : p);
        this.productosSubject.next(list);
      }),
      catchError(() => of(null)),
    );
  }

  eliminarImagen(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}/foto`).pipe(
      tap(() => {
        const list = this.productosSubject.value.map(p => p.id === id ? { ...p, imagenUrl: undefined } : p);
        this.productosSubject.next(list);
      }),
      catchError(() => of(undefined)),
    );
  }

  getPorBodega(bodegaId: number, pasilloId?: number, estanteId?: number): Observable<Producto[]> {
    let params = `bodegaId=${bodegaId}`;
    if (pasilloId) params += `&pasilloId=${pasilloId}`;
    if (estanteId) params += `&estanteId=${estanteId}`;
    return this.http.get<Producto[]>(`${this.baseUrl}/por-bodega?${params}`).pipe(
      catchError(() => of([])),
    );
  }

  getHistorialStock(id: string): Observable<HistorialStock[]> {
    return this.http.get<HistorialStock[]>(`${this.baseUrl}/${id}/historial-stock`).pipe(
      catchError(() => of([])),
    );
  }

  // --- CATEGORÍAS ---

  getCategorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(this.categoriasUrl).pipe(
      tap(data => this.categoriasSubject.next(data)),
      catchError(() => of([])),
    );
  }

  createCategoria(dto: { nombre: string; descripcion?: string }): Observable<Categoria | null> {
    return this.http.post<Categoria>(this.categoriasUrl, dto).pipe(
      tap(c => this.categoriasSubject.next([...this.categoriasSubject.value, c])),
      catchError(() => of(null)),
    );
  }

  updateCategoria(id: string, dto: { nombre: string; descripcion?: string }): Observable<Categoria | null> {
    return this.http.put<Categoria>(`${this.categoriasUrl}/${id}`, dto).pipe(
      tap(c => this.categoriasSubject.next(this.categoriasSubject.value.map(x => x.id === id ? c : x))),
      catchError(() => of(null)),
    );
  }

  deleteCategoria(id: string): Observable<void> {
    return this.http.delete<void>(`${this.categoriasUrl}/${id}`).pipe(
      tap(() => this.categoriasSubject.next(this.categoriasSubject.value.filter(c => c.id !== id))),
      catchError(() => {
        this.categoriasSubject.next(this.categoriasSubject.value.filter(c => c.id !== id));
        return of(undefined);
      }),
    );
  }

  getSnapshot(): Producto[] { return this.productosSubject.value; }
}
