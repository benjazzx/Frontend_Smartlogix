import { Injectable, signal } from '@angular/core';

export interface ConfirmState {
  visible: boolean;
  titulo: string;
  mensaje: string;
  labelAceptar: string;
  labelCancelar: string;
  tipo: 'danger' | 'warning' | 'info';
  inputPlaceholder: string | null;
  inputValue: string;
  resolve: ((value: boolean) => void) | null;
  resolveTexto: ((value: string | null) => void) | null;
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
    inputPlaceholder: null,
    inputValue: '',
    resolve: null,
    resolveTexto: null,
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
        inputPlaceholder: null,
        inputValue: '',
        resolve,
        resolveTexto: null,
      });
    });
  }

  prompt(
    titulo: string,
    mensaje: string,
    inputPlaceholder: string,
    opciones?: { labelAceptar?: string; labelCancelar?: string; tipo?: 'danger' | 'warning' | 'info' },
  ): Promise<string | null> {
    return new Promise(resolveTexto => {
      this.state.set({
        visible: true,
        titulo,
        mensaje,
        labelAceptar: opciones?.labelAceptar ?? 'Confirmar',
        labelCancelar: opciones?.labelCancelar ?? 'Cancelar',
        tipo: opciones?.tipo ?? 'warning',
        inputPlaceholder,
        inputValue: '',
        resolve: null,
        resolveTexto,
      });
    });
  }

  setInputValue(value: string): void {
    this.state.update(s => ({ ...s, inputValue: value }));
  }

  aceptar(): void {
    const s = this.state();
    s.resolve?.(true);
    s.resolveTexto?.(s.inputValue.trim() || null);
    this.cerrar();
  }

  cancelar(): void {
    const s = this.state();
    s.resolve?.(false);
    s.resolveTexto?.(null);
    this.cerrar();
  }

  private cerrar(): void {
    this.state.update(s => ({ ...s, visible: false, resolve: null, resolveTexto: null }));
  }
}
