import React, { useState } from 'react';
import { Insumo, Platillo, Venta } from '../types';
import { 
  Plus, 
  Trash2, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  TrendingUp,
  RotateCcw
} from 'lucide-react';
import { motion } from 'motion/react';
import { CustomDialog } from './CustomDialog';

interface VentasPanelProps {
  ventas: Venta[];
  platillos: Platillo[];
  insumos: Insumo[];
  onRegistrarVenta: (platilloId: string, cantidad: number) => { success: boolean; errorMsg?: string };
  onAnularVenta: (ventaId: string) => void;
}

export default function VentasPanel({ 
  ventas, 
  platillos, 
  insumos, 
  onRegistrarVenta, 
  onAnularVenta 
}: VentasPanelProps) {
  const [selectedPlatilloId, setSelectedPlatilloId] = useState('');
  const [cantidadVenta, setCantidadVenta] = useState<number>(1);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Estados para diálogos personalizados
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    type: 'confirm' | 'alert';
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  const showAlert = (title: string, message: string) => {
    setDialogConfig({
      isOpen: true,
      type: 'alert',
      title,
      message,
      confirmText: 'Aceptar',
      onConfirm: () => setDialogConfig(null)
    });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, isDestructive = false) => {
    setDialogConfig({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      isDestructive,
      onConfirm: () => {
        onConfirm();
        setDialogConfig(null);
      },
      onCancel: () => setDialogConfig(null)
    });
  };

  const handleVentaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeExito(null);
    setMensajeError(null);

    if (!selectedPlatilloId) {
      setMensajeError('Por favor, selecciona un platillo para registrar.');
      return;
    }
    if (cantidadVenta <= 0) {
      setMensajeError('La cantidad de platillos debe ser mayor a cero.');
      return;
    }

    const res = onRegistrarVenta(selectedPlatilloId, cantidadVenta);
    
    if (res.success) {
      const platillo = platillos.find(p => p.id === selectedPlatilloId);
      setMensajeExito(`¡Venta registrada con éxito! Se vendió un platillo de $${((platillo?.precioVenta || 0) * cantidadVenta).toFixed(2)}.`);
      setSelectedPlatilloId('');
      setCantidadVenta(1);
      
      // Auto ocultar mensaje después de 4 segundos
      setTimeout(() => {
        setMensajeExito(null);
      }, 5000);
    } else {
      setMensajeError(res.errorMsg || 'No se pudo realizar la venta.');
    }
  };

  // Helper para calcular costo proporcional antes de registrar (solo para visualización)
  const getCostoEstimadoVentaActual = () => {
    const platillo = platillos.find(p => p.id === selectedPlatilloId);
    if (!platillo) return 0;
    
    return platillo.ingredientes.reduce((acc, ing) => {
      const insumo = insumos.find(i => i.id === ing.insumoId);
      if (!insumo) return acc;
      return acc + (ing.cantidad * insumo.costoUnitario);
    }, 0) * cantidadVenta;
  };

  const getIngresoEstimadoVentaActual = () => {
    const platillo = platillos.find(p => p.id === selectedPlatilloId);
    if (!platillo) return 0;
    return platillo.precioVenta * cantidadVenta;
  };

  const selectedPlatillo = platillos.find(p => p.id === selectedPlatilloId);
  const costoEst = getCostoEstimadoVentaActual();
  const ingresoEst = getIngresoEstimadoVentaActual();
  const margenEst = ingresoEst - costoEst;

  return (
    <div className="space-y-6 animate-fade-in" id="ventas-panel-view">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Formulario de Registro de Venta */}
        <div className="lg:col-span-1 bg-slate-900 rounded-2xl border border-slate-800/80 shadow-xl p-6 space-y-4 h-fit">
          <div className="border-b border-slate-800/60 pb-3">
            <h2 className="text-xl font-sans font-extrabold text-white">Registrar Venta</h2>
            <p className="text-xs text-slate-400 mt-1">
              Cada venta restará automáticamente los insumos utilizados de tu almacén de forma proporcional.
            </p>
          </div>

          <form onSubmit={handleVentaSubmit} className="space-y-4">
            {/* Seleccionar Platillo */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wide">¿Qué platillo se vendió? *</label>
              <select
                value={selectedPlatilloId}
                onChange={(e) => setSelectedPlatilloId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
              >
                <option value="">-- Elige un Platillo --</option>
                {platillos.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} (${p.precioVenta.toFixed(2)})</option>
                ))}
              </select>
            </div>

            {/* Cantidad Vendida */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wide">Cantidad Vendida</label>
              <input
                type="number"
                required
                min="1"
                placeholder="Ej: 1, 2, 5"
                value={cantidadVenta}
                onChange={(e) => setCantidadVenta(Math.max(1, Number(e.target.value)))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 font-mono font-bold"
              />
            </div>

            {/* Mensajes de feedback */}
            {mensajeExito && (
              <div className="bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 p-3.5 rounded-xl text-xs flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5 animate-bounce" />
                <span>{mensajeExito}</span>
              </div>
            )}

            {mensajeError && (
              <div className="bg-rose-950/20 border border-rose-900/30 text-rose-400 p-3.5 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{mensajeError}</span>
              </div>
            )}

            {/* Previsualización Dinámica del Costo de Insumos y Ganancia */}
            {selectedPlatilloId && (
              <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-3 font-mono text-xs text-slate-300">
                <h4 className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Simulación de Venta en Curso</h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Precio de venta total:</span>
                    <span className="font-bold text-white">${ingresoEst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Costo de insumos utilizado:</span>
                    <span className="text-rose-400">${costoEst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800/80 pt-2 text-emerald-400 font-medium">
                    <span>Margen de Ganancia Neto:</span>
                    <span className="font-bold">+${margenEst.toFixed(2)} ({((margenEst / ingresoEst) * 100).toFixed(1)}%)</span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition shadow-lg shadow-orange-500/10 flex items-center justify-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Registrar e Impactar Stock
            </button>
          </form>
        </div>

        {/* Columna Derecha: Historial Completo de Ventas */}
        <div className="lg:col-span-2 bg-slate-900 rounded-2xl border border-slate-800/80 shadow-xl p-6 flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-800/60 pb-3 flex items-center justify-between">
              <h2 className="text-xl font-sans font-extrabold text-white">Historial de Ventas</h2>
              <div className="text-xs bg-slate-950 border border-slate-800 px-3 py-1 rounded-full font-mono text-slate-400 font-bold">
                {ventas.length} {ventas.length === 1 ? 'operación' : 'operaciones'}
              </div>
            </div>

            <div className="mt-4 overflow-y-auto max-h-[440px] space-y-3 pr-1">
              {ventas.length === 0 ? (
                <div className="text-center py-20 text-slate-500 text-sm italic font-medium">
                  Aún no registras ventas. Utiliza el panel de la izquierda para registrar tu primera operación y ver los costos proporcionales en acción.
                </div>
              ) : (
                ventas.map((venta) => (
                  <div 
                    key={venta.id} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-950/45 border border-slate-850 rounded-xl hover:bg-slate-950 hover:border-slate-750 transition gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 mt-0.5">
                        <Clock className="h-4 w-4 text-orange-400" />
                      </div>
                      <div>
                        <h4 className="font-sans font-extrabold text-white text-sm">{venta.platilloNombre}</h4>
                        <div className="text-[11px] text-slate-400 mt-1 space-y-1">
                          <p>Cantidad: <span className="font-bold text-slate-200">{venta.cantidad}</span> x ${venta.precioVentaUnitario.toFixed(2)}</p>
                          <p className="font-mono text-slate-500">Fecha: {new Date(venta.fecha).toLocaleString('es-MX', {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'})}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-dashed border-slate-800">
                      <div className="text-right font-mono">
                        <p className="text-sm font-bold text-white">${venta.precioVentaTotal.toFixed(2)}</p>
                        <p className="text-[10px] text-rose-400 font-bold">Insumos: -${venta.costoInsumosTotal.toFixed(2)}</p>
                        <p className="text-[11px] text-emerald-400 font-extrabold">Margen: +${venta.margenTotal.toFixed(2)}</p>
                      </div>

                      <button
                        onClick={() => {
                          showConfirm(
                            'Anular Venta',
                            '¿Estás seguro de que quieres anular esta venta? Esto RESTAURARÁ todos los insumos de la receta al almacén.',
                            () => onAnularVenta(venta.id),
                            true
                          );
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1 hover:bg-rose-500/10 rounded transition self-end sm:self-auto flex items-center gap-1 text-[10px] font-mono font-bold"
                        title="Anular venta y devolver stock"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Anular Venta
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Diálogo personalizado */}
      {dialogConfig && (
        <CustomDialog
          isOpen={dialogConfig.isOpen}
          type={dialogConfig.type}
          title={dialogConfig.title}
          message={dialogConfig.message}
          confirmText={dialogConfig.confirmText}
          cancelText={dialogConfig.cancelText}
          isDestructive={dialogConfig.isDestructive}
          onConfirm={dialogConfig.onConfirm}
          onCancel={dialogConfig.onCancel}
        />
      )}
    </div>
  );
}
