import { Injectable, signal } from '@angular/core';

export interface ConfirmState {
  visible: boolean;
  titulo: string;
  mensaje: string;
  labelAceptar: string;
  labelCancelar: string;
  tipo: 'danger' | 'warning' | 'info';
  resolve: ((value: boolean) => void) | null;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  state = signal<ConfirmState>({
    visible: false,
    titulo: '',
    mensaje: '',
    labelAceptar: 'Confirmar',
    labelCancelar: 'Cancelar',
    tipo: 'danger',
    resolve: null,
  });

  confirm(
    titulo: string,
    mensaje: string,
    opciones?: { labelAceptar?: string; labelCancelar?: string; tipo?: 'danger' | 'warning' | 'info' },
  ): Promise<boolean> {
    return new Promise(resolve => {
      this.state.set({
        visible: true,
        titulo,
        mensaje,
        labelAceptar: opciones?.labelAceptar ?? 'Confirmar',
        labelCancelar: opciones?.labelCancelar ?? 'Cancelar',
        tipo: opciones?.tipo ?? 'danger',
        resolve,
      });
    });
  }

  aceptar(): void {
    const s = this.state();
    s.resolve?.(true);
    this.cerrar();
  }

  cancelar(): void {
    const s = this.state();
    s.resolve?.(false);
    this.cerrar();
  }

  private cerrar(): void {
    this.state.update(s => ({ ...s, visible: false, resolve: null }));
  }
}
