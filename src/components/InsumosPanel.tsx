import React, { useState } from 'react';
import { Insumo, CompraHistorial } from '../types';
import { 
  Package, 
  Plus, 
  ShoppingCart, 
  Trash2, 
  Edit3, 
  AlertTriangle,
  Info,
  CheckCircle2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InsumosPanelProps {
  insumos: Insumo[];
  onAddInsumo: (insumo: Omit<Insumo, 'id' | 'costoUnitario'>) => void;
  onUpdateInsumo: (id: string, insumo: Partial<Insumo>) => void;
  onDeleteInsumo: (id: string) => void;
  onRegistrarCompra: (insumoId: string, cantidad: number, precio: number) => void;
  compras: CompraHistorial[];
}

export default function InsumosPanel({ 
  insumos, 
  onAddInsumo, 
  onUpdateInsumo, 
  onDeleteInsumo, 
  onRegistrarCompra,
  compras 
}: InsumosPanelProps) {
  // Estados para modals de creación, compra y edición
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedInsumoId, setSelectedInsumoId] = useState<string | null>(null);

  // Estados del formulario para agregar insumo
  const [nombre, setNombre] = useState('');
  const [unidadMedida, setUnidadMedida] = useState<'g' | 'ml' | 'unidades' | 'piezas'>('g');
  const [precioCompra, setPrecioCompra] = useState<number>(0);
  const [cantidadCompra, setCantidadCompra] = useState<number>(0);
  const [stockInicial, setStockInicial] = useState<number>(0);
  const [alertaMinimo, setAlertaMinimo] = useState<number>(0);

  // Estados del formulario para comprar insumo
  const [cantidadAComprar, setCantidadAComprar] = useState<number>(0);
  const [precioCompraNueva, setPrecioCompraNueva] = useState<number>(0);

  // Estados para edición
  const [editingInsumoId, setEditingInsumoId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editAlertaMinimo, setEditAlertaMinimo] = useState<number>(0);
  const [editCantidadActual, setEditCantidadActual] = useState<number>(0);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || precioCompra <= 0 || cantidadCompra <= 0) {
      alert('Por favor llena los campos requeridos correctamente');
      return;
    }
    onAddInsumo({
      nombre,
      unidadMedida,
      precioCompraReciente: precioCompra,
      cantidadCompraReciente: cantidadCompra,
      cantidadActual: stockInicial || 0,
      alertaMinimo: alertaMinimo || 0,
    });
    // Limpiar campos
    setNombre('');
    setPrecioCompra(0);
    setCantidadCompra(0);
    setStockInicial(0);
    setAlertaMinimo(0);
    setShowAddModal(false);
  };

  const handleBuySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInsumoId || cantidadAComprar <= 0 || precioCompraNueva <= 0) {
      alert('Por favor ingresa valores válidos');
      return;
    }
    onRegistrarCompra(selectedInsumoId, cantidadAComprar, precioCompraNueva);
    setCantidadAComprar(0);
    setPrecioCompraNueva(0);
    setShowBuyModal(false);
    setSelectedInsumoId(null);
  };

  const startEdit = (insumo: Insumo) => {
    setEditingInsumoId(insumo.id);
    setEditNombre(insumo.nombre);
    setEditAlertaMinimo(insumo.alertaMinimo);
    setEditCantidadActual(insumo.cantidadActual);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInsumoId || !editNombre) return;
    onUpdateInsumo(editingInsumoId, {
      nombre: editNombre,
      alertaMinimo: editAlertaMinimo,
      cantidadActual: editCantidadActual,
    });
    setEditingInsumoId(null);
  };

  const openBuyModal = (id: string) => {
    const insumo = insumos.find(i => i.id === id);
    if (!insumo) return;
    setSelectedInsumoId(id);
    setPrecioCompraNueva(insumo.precioCompraReciente);
    setCantidadAComprar(insumo.cantidadCompraReciente);
    setShowBuyModal(true);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="insumos-panel-view">
      {/* Encabezado con Botón de Creación */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-sans font-extrabold tracking-tight text-white">Almacén de Insumos e Ingredientes</h2>
          <p className="text-slate-400 text-xs mt-1">
            Administra los ingredientes, salsas y empaques. Define costos unitarios y niveles de stock mínimos para recibir alertas.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold py-2.5 px-5 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-orange-500/10 transition duration-200"
        >
          <Plus className="h-4.5 w-4.5" /> Nuevo Insumo
        </button>
      </div>

      {/* Lista de Insumos */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/65 border-b border-slate-800/80 text-slate-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                <th className="py-4.5 px-6">Ingrediente / Insumo</th>
                <th className="py-4.5 px-4 text-center">Stock Actual</th>
                <th className="py-4.5 px-4">Alerta Mínima</th>
                <th className="py-4.5 px-4 text-right">Costo Unitario</th>
                <th className="py-4.5 px-4">Última Compra</th>
                <th className="py-4.5 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {insumos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-500 font-medium italic">
                    No hay insumos creados aún. Haz clic en "Nuevo Insumo" para empezar.
                  </td>
                </tr>
              ) : (
                insumos.map((insumo) => {
                  const esAlerta = insumo.cantidadActual <= insumo.alertaMinimo;
                  const esEdicion = editingInsumoId === insumo.id;

                  return (
                    <tr key={insumo.id} className={`transition-colors duration-150 ${esAlerta ? 'bg-rose-950/10' : 'hover:bg-slate-800/20'}`}>
                      {/* Nombre y tipo */}
                      <td className="py-4.5 px-6 font-semibold text-slate-100">
                        {esEdicion ? (
                          <input
                            type="text"
                            value={editNombre}
                            onChange={(e) => setEditNombre(e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-orange-500 w-full max-w-xs"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>{insumo.nombre}</span>
                            {esAlerta && (
                              <span className="p-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded" title="¡Stock Crítico!">
                                <AlertTriangle className="h-4 w-4" />
                              </span>
                            )}
                          </div>
                        )}
                        <span className="text-[10px] text-slate-500 block mt-1 font-mono">
                          Unidad de medida: <span className="font-bold text-slate-400">{insumo.unidadMedida}</span>
                        </span>
                      </td>

                      {/* Stock Actual */}
                      <td className="py-4.5 px-4 text-center">
                        {esEdicion ? (
                          <div className="inline-flex items-center gap-1.5">
                            <input
                              type="number"
                              step="any"
                              value={editCantidadActual}
                              onChange={(e) => setEditCantidadActual(Number(e.target.value))}
                              className="bg-slate-950 border border-slate-700 rounded-lg w-20 px-2.5 py-1.5 text-sm text-center text-white focus:outline-none focus:border-orange-500 font-mono"
                            />
                            <span className="text-xs text-slate-400">{insumo.unidadMedida}</span>
                          </div>
                        ) : (
                          <span className={`font-mono font-bold text-base ${esAlerta ? 'text-rose-400 font-black' : 'text-slate-200'}`}>
                            {insumo.cantidadActual.toLocaleString('es-MX')} <span className="text-xs font-normal text-slate-500">{insumo.unidadMedida}</span>
                          </span>
                        )}
                      </td>

                      {/* Nivel de Alerta */}
                      <td className="py-4.5 px-4">
                        {esEdicion ? (
                          <div className="inline-flex items-center gap-1.5">
                            <input
                              type="number"
                              step="any"
                              value={editAlertaMinimo}
                              onChange={(e) => setEditAlertaMinimo(Number(e.target.value))}
                              className="bg-slate-950 border border-slate-700 rounded-lg w-20 px-2.5 py-1.5 text-sm text-center text-white focus:outline-none focus:border-orange-500 font-mono"
                            />
                            <span className="text-xs text-slate-400">{insumo.unidadMedida}</span>
                          </div>
                        ) : (
                          <span className="font-mono text-slate-400 text-sm">
                            {insumo.alertaMinimo.toLocaleString('es-MX')} <span className="text-xs text-slate-500">{insumo.unidadMedida}</span>
                          </span>
                        )}
                      </td>

                      {/* Costo Unitario */}
                      <td className="py-4.5 px-4 text-right font-mono text-slate-100 font-bold">
                        ${insumo.costoUnitario.toFixed(4)}
                        <span className="text-[10px] text-slate-500 block font-normal mt-0.5">por {insumo.unidadMedida === 'g' ? 'gramo' : insumo.unidadMedida === 'ml' ? 'ml' : 'pieza'}</span>
                      </td>

                      {/* Información de la última compra */}
                      <td className="py-4.5 px-4 text-xs text-slate-400">
                        <p className="font-semibold text-slate-300">${insumo.precioCompraReciente} x {insumo.cantidadCompraReciente} {insumo.unidadMedida}</p>
                        <p className="text-[10px] text-slate-500 mt-1 font-mono">
                          Equivale a: ${(insumo.costoUnitario * (insumo.unidadMedida === 'g' || insumo.unidadMedida === 'ml' ? 1000 : 1)).toFixed(2)} por {insumo.unidadMedida === 'g' ? 'Kg' : insumo.unidadMedida === 'ml' ? 'Litro' : 'unidad'}
                        </p>
                      </td>

                      {/* Acciones */}
                      <td className="py-4.5 px-6 text-right">
                        {esEdicion ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={handleEditSubmit}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-3 py-1.5 text-xs font-bold transition"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={() => setEditingInsumoId(null)}
                              className="bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold transition"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end items-center gap-1">
                            <button
                              onClick={() => openBuyModal(insumo.id)}
                              className="p-2 text-orange-400 hover:bg-orange-500/10 rounded-lg transition"
                              title="Registrar Reabastecimiento / Compra"
                            >
                              <ShoppingCart className="h-4.5 w-4.5" />
                            </button>
                            <button
                              onClick={() => startEdit(insumo)}
                              className="p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 rounded-lg transition"
                              title="Editar nombre y límites"
                            >
                              <Edit3 className="h-4.5 w-4.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`¿Estás seguro de que quieres eliminar "${insumo.nombre}"? Esto afectará los platillos que utilicen este insumo.`)) {
                                  onDeleteInsumo(insumo.id);
                                }
                              }}
                              className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                              title="Eliminar Insumo"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historial de Compras Recientes */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        <h3 className="font-sans font-extrabold text-white pb-3 border-b border-slate-800/60 flex items-center gap-2 text-base">
          <ShoppingCart className="h-5 w-5 text-orange-400" /> Historial de Compras Recientes (Gasto en Insumos)
        </h3>
        <div className="mt-4 overflow-y-auto max-h-[220px] space-y-3 pr-1">
          {compras.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6 italic font-semibold">No se han registrado reabastecimientos de stock.</p>
          ) : (
            compras.map(compra => (
              <div key={compra.id} className="flex justify-between items-center bg-slate-950/40 hover:bg-slate-950/70 border border-slate-800/60 p-3.5 rounded-xl text-xs transition duration-150">
                <div>
                  <span className="font-bold text-slate-200 block text-sm">{compra.insumoNombre}</span>
                  <span className="text-slate-500 font-mono mt-1 block">
                    +{compra.cantidadComprada.toLocaleString('es-MX')} unidades • {new Date(compra.fecha).toLocaleDateString('es-MX', {day: '2-digit', month: 'short', year: 'numeric'})}
                  </span>
                </div>
                <div className="text-right font-mono">
                  <span className="font-extrabold text-rose-400 text-sm">-${compra.precioPagado.toFixed(2)}</span>
                  <span className="text-[10px] text-slate-500 block mt-1">Costo Unit: ${(compra.precioPagado / compra.cantidadComprada).toFixed(4)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL: Nuevo Insumo */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl max-w-md w-full overflow-hidden text-slate-100"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-orange-400" />
                  <h3 className="font-sans font-extrabold text-white text-base">Agregar Nuevo Insumo</h3>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
                {/* Nombre */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wide">Nombre del Insumo / Ingrediente *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Pechuga de Pollo, Aderezo Ranch"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Unidad de Medida */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wide">Unidad de Medida *</label>
                    <select
                      value={unidadMedida}
                      onChange={(e) => setUnidadMedida(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="g">Gramos (g)</option>
                      <option value="ml">Mililitros (ml)</option>
                      <option value="unidades">Unidades / Piezas</option>
                    </select>
                  </div>

                  {/* Stock Inicial */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wide">Stock Inicial</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Ej: 5000"
                      value={stockInicial === 0 ? '' : stockInicial}
                      onChange={(e) => setStockInicial(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                </div>

                <div className="bg-orange-950/20 p-4.5 rounded-xl border border-orange-900/30 space-y-3">
                  <h4 className="text-xs font-extrabold text-orange-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <Info className="h-4 w-4" /> Parámetros de la última compra
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Ingresa cómo compras habitualmente este ingrediente para deducir el costo por unidad de medida automáticamente.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">¿Cuánto compraste? *</label>
                      <input
                        type="number"
                        required
                        step="any"
                        placeholder="Ej: 1000g o 20"
                        value={cantidadCompra === 0 ? '' : cantidadCompra}
                        onChange={(e) => setCantidadCompra(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">¿Cuánto costó? ($) *</label>
                      <input
                        type="number"
                        required
                        step="any"
                        placeholder="Ej: $30 o $250"
                        value={precioCompra === 0 ? '' : precioCompra}
                        onChange={(e) => setPrecioCompra(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                  {cantidadCompra > 0 && precioCompra > 0 && (
                    <p className="text-[10px] font-mono text-orange-300 font-bold">
                      Costo Unitario Calculado: ${(precioCompra / cantidadCompra).toFixed(4)} por {unidadMedida === 'g' ? 'gramo' : unidadMedida === 'ml' ? 'ml' : 'pieza'}
                    </p>
                  )}
                </div>

                {/* Alerta de Mínimo */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wide">Nivel de Stock para Alerta Bajo</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Recibe advertencias si el stock baja de esta cifra"
                    value={alertaMinimo === 0 ? '' : alertaMinimo}
                    onChange={(e) => setAlertaMinimo(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1.5">Ingresar en la unidad seleccionada (ej: gramos o unidades).</p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold py-2 px-4 rounded-xl text-sm transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold py-2 px-4 rounded-xl text-sm transition shadow-lg shadow-orange-500/10"
                  >
                    Crear Insumo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Registrar Reabastecimiento/Compra */}
      <AnimatePresence>
        {showBuyModal && selectedInsumoId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl max-w-md w-full overflow-hidden text-slate-100"
            >
              {(() => {
                const insumo = insumos.find(i => i.id === selectedInsumoId);
                if (!insumo) return null;
                return (
                  <>
                    <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-emerald-400" />
                        <h3 className="font-sans font-extrabold text-white text-base">Registrar Compra / Reabastecer</h3>
                      </div>
                      <button onClick={() => { setShowBuyModal(false); setSelectedInsumoId(null); }} className="text-slate-400 hover:text-white transition">
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <form onSubmit={handleBuySubmit} className="p-5 space-y-4">
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Registrar una nueva compra para <span className="font-bold text-white underline decoration-orange-500/55">{insumo.nombre}</span>. El inventario actual de <span className="font-bold text-white font-mono">{insumo.cantidadActual} {insumo.unidadMedida}</span> se incrementará automáticamente.
                      </p>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Cantidad comprada */}
                        <div>
                          <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wide">¿Qué cantidad compraste?</label>
                          <div className="relative">
                            <input
                              type="number"
                              required
                              step="any"
                              value={cantidadAComprar === 0 ? '' : cantidadAComprar}
                              onChange={(e) => setCantidadAComprar(Number(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-10 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono font-bold">{insumo.unidadMedida}</span>
                          </div>
                        </div>

                        {/* Costo total de compra */}
                        <div>
                          <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wide">¿Costo total? ($)</label>
                          <input
                            type="number"
                            required
                            step="any"
                            placeholder="Precio total pagado"
                            value={precioCompraNueva === 0 ? '' : precioCompraNueva}
                            onChange={(e) => setPrecioCompraNueva(Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>
                      </div>

                      <div className="bg-emerald-950/20 p-4 rounded-xl border border-emerald-900/40">
                        <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                          <CheckCircle2 className="h-4 w-4" /> Efecto en Almacén e Inventario
                        </h4>
                        <div className="text-[11px] text-slate-300 space-y-1.5 mt-2.5">
                          <p>• Stock Final Estimado: <span className="font-bold text-white font-mono">{(insumo.cantidadActual + cantidadAComprar).toLocaleString('es-MX')} {insumo.unidadMedida}</span></p>
                          <p>• Nuevo Costo de Adquisición Unitario: <span className="font-bold text-white font-mono">${(precioCompraNueva / (cantidadAComprar || 1)).toFixed(4)}</span> por {insumo.unidadMedida}</p>
                          <p className="text-emerald-300/90 font-semibold leading-relaxed mt-2.5 text-[10px]">※ El costo unitario de este lote se actualizará en tu base de datos local. Esto recalcula automáticamente el costo neto de todos los combos/platillos que usen este ingrediente.</p>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => { setShowBuyModal(false); setSelectedInsumoId(null); }}
                          className="bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-2 px-4 rounded-xl text-sm transition"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2 px-4 rounded-xl text-sm transition shadow-lg shadow-emerald-500/10"
                        >
                          Registrar e Incrementar Stock
                        </button>
                      </div>
                    </form>
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
