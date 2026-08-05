// =============================================
// SmartLogix — Interfaces TypeScript exactas al backend
// =============================================

// --- AUTENTICACIÓN ---

export type RolNombre = 'admin' | 'bodeguero' | 'transportista' | 'cliente';

export interface LoginRequest {
  correo: string;
  clave: string;
}

export interface LoginResponse {
  token: string;
  tipo: string;
  userId: string;
  correo: string;
  rolNombre: RolNombre;
}

export interface UsuarioSesion {
  userId: string;
  correo: string;
  rolNombre: RolNombre;
}

// --- USUARIOS ---

export interface Region {
  id: string;
  nombre: string;
}

export interface Comuna {
  id: string;
  nombre: string;
  region?: Region;
}

export interface DireccionModel {
  id?: string;
  calle?: string;
  numero?: string;
  codigoPostal?: string;
  comuna?: { id?: string; nombre?: string; region?: { id?: string; nombre?: string } };
}

export interface Usuario {
  id: string;
  nombre: string;
  apellido?: string;
  rut?: string;
  correo: string;
  cargo?: string;
  activo?: boolean;
  rolId?: string;
  rolNombre?: string;
  estadoId?: string;
  estadoNombre?: string;
  direccion?: DireccionModel;
}

export interface UsuarioRequest {
  nombre: string;
  apellido?: string;
  rut?: string;
  correo: string;
  clave?: string;
  cargo?: string;
  rolId?: string;
  rolNombre?: string;
}

// --- ROLES ---

export interface Rol {
  id: string;
  nombre: string;
  descripcion?: string;
}

// --- ESTADOS ---

export interface TipoDeEstado {
  id: string;
  nombre: string;
  descripcion?: string;
}

export interface Estado {
  id: string;
  nombre: string;
  descripcion?: string;
  tipoDeEstado?: TipoDeEstado;
}

// --- INVENTARIO ---

export interface Bodega {
  idBodega?: number;
  nombre: string;
  direccion?: string;
  ciudad?: string;
  pais?: string;
  capacidadTotal?: number;
  activa?: boolean;
  totalPasillos?: number;
}

export interface BodegaRequest {
  nombre: string;
  direccion?: string;
  ciudad?: string;
  pais?: string;
  capacidadTotal?: number;
  activa?: boolean;
}

export interface Pasillo {
  idPasillo?: number;
  codigo: string;
  descripcion?: string;
  numeroOrden?: number;
  activo?: boolean;
  idBodega?: number;
  nombreBodega?: string;
  totalEstantes?: number;
}

export interface PasilloRequest {
  codigo: string;
  descripcion?: string;
  numeroOrden?: number;
  idBodega: number;
  activo?: boolean;
}

export interface Estante {
  idEstante?: number;
  codigo: string;
  descripcion?: string;
  numNiveles?: number;
  capacidadPorNivel?: number;
  capacidadTotal?: number;
  activo?: boolean;
  idPasillo?: number;
}

export interface EstanteRequest {
  codigo: string;
  descripcion?: string;
  numNiveles?: number;
  capacidadPorNivel?: number;
  idPasillo?: number;
}

export interface EstPasi {
  idEstPasi?: number;
  idEstante?: number;
  codigoEstante?: string;
  descripcionEstante?: string;
  numNiveles?: number;
  idPasillo?: number;
  codigoPasillo?: string;
  descripcionPasillo?: string;
  idBodega?: number;
  nombreBodega?: string;
  posicion?: string;
  numeroFila?: number;
  ocupacionPct?: number;
  habilitada?: boolean;
  observaciones?: string;
  fechaAsignacion?: string;
  fechaActualizacion?: string;
}

export interface EstPasiRequest {
  idEstante: number;
  idPasillo: number;
  posicion?: string;
  numeroFila?: number;
  ocupacionPct?: number;
  habilitada?: boolean;
  observaciones?: string;
}

// --- CATEGORÍAS ---

export interface Categoria {
  id: string;
  nombre: string;
  descripcion?: string;
}

// --- PRODUCTOS ---

export interface Producto {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  stock?: number;
  categoriaId?: string;
  categoriaNombre?: string;
  estadoNombre?: string;
  activo?: boolean;
  imagenUrl?: string;
  idBodega?: number;
  idPasillo?: number;
  idEstante?: number;
  pais?: string;
  creadoPorId?: string;
  creadoPorNombre?: string;
  modificadoPorId?: string;
  modificadoPorNombre?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export interface ProductoRequest {
  nombre: string;
  descripcion?: string;
  precio: number;
  stock: number;
  categoriaId: string;
  estadoNombre?: string;
  idBodega?: number;
  idPasillo?: number;
  idEstante?: number;
  pais?: string;
}

export type TipoAccionHistorial =
  | 'CREADO'
  | 'STOCK_AUMENTADO'
  | 'STOCK_DECREMENTADO'
  | 'DESACTIVADO'
  | 'REACTIVADO'
  | 'UBICACION_CAMBIADA';

export interface HistorialStock {
  id: number;
  productoId: string;
  productoNombre: string;
  cantidadAnterior: number;
  cantidadNueva: number;
  modificadoPorId?: string;
  modificadoPorNombre?: string;
  tipoAccion: TipoAccionHistorial;
  descripcion?: string;
  idEstanteAnterior?: number;
  idEstanteNuevo?: number;
  ordenId?: number;
  fecha: string;
}

export interface HistorialStockPage {
  content: HistorialStock[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

// --- AUDITORÍA / SEGURIDAD ---

export interface PreguntaSecreta {
  id: string;
  pregunta: string;
  activa?: boolean;
}

export interface ConfigurarPreguntasRequest {
  respuestas: { preguntaId: string; respuesta: string }[];
}

export interface BodegueroActividad {
  userId: string;
  nombre: string;
  correo: string;
  ultimoAcceso?: string;
  cantidadProductosGestionados: number;
}

// --- ÓRDENES ---

export interface OrdenDetalle {
  productoId: string;
  cantidad: number;
  productoNombre?: string;
  precioUnitario?: number;
  subtotal?: number;
}

export interface HistorialEntry {
  id?: string;
  estadoId?: string;
  estadoNombre?: string;
  fecha?: string;
  comentario?: string;
}

export interface Orden {
  id: number;
  fechaOrden?: string;
  direccionId?: string;
  direccionTexto?: string;
  userId?: string;
  userNombre?: string;
  estadoActual?: string;
  tomada?: boolean;
  transportistaId?: string;
  transportistaNombre?: string;
  detalles?: OrdenDetalle[];
  historial?: HistorialEntry[];
  total?: number;
}

export interface OrdenRequest {
  direccionId?: string;
  userNombre?: string;
  detalles: OrdenDetalle[];
}

export interface HistorialRequest {
  estadoId: string;
  estadoNombre: string;
  comentario?: string;
}

// --- DASHBOARD ---

export interface MetricaCard {
  titulo: string;
  valor: string | number;
  subtitulo: string;
  icono: string;
  color: string;
  variacion?: number;
}

export interface MicroservicioStatus {
  nombre: string;
  puerto: number;
  estado: 'activo' | 'inactivo' | 'degradado';
  version: string;
  uptime: string;
}

export interface ActividadReciente {
  id: number;
  descripcion: string;
  modulo: string;
  tiempo: string;
  tipo: 'pedido' | 'inventario' | 'envio' | 'usuario' | 'sistema';
}

// --- API Response Wrapper ---

export interface ApiResponse<T> {
  data: T;
  message?: string;
  total?: number;
  page?: number;
}
