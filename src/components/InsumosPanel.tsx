import React, { useState } from 'react';
import { Insumo, CompraHistorial, CatalogoInsumo } from '../types';
import { 
  Package, 
  Plus, 
  ShoppingCart, 
  Trash2, 
  Edit3, 
  AlertTriangle,
  Info,
  CheckCircle2,
  X,
  Layers,
  FolderLock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CustomDialog } from './CustomDialog';

interface InsumosPanelProps {
  insumos: Insumo[];
  compras: CompraHistorial[];
  catalogo: CatalogoInsumo[];
  onAddInsumo: (insumo: Omit<Insumo, 'id' | 'costoUnitario'>) => void;
  onUpdateInsumo: (id: string, insumo: Partial<Insumo>) => void;
  onDeleteInsumo: (id: string) => void;
  onRegistrarCompra: (insumoId: string, cantidad: number, precio: number) => void;
  onAddCatalogoItem: (item: Omit<CatalogoInsumo, 'id'>) => boolean;
  onUpdateCatalogoItem: (id: string, item: Partial<CatalogoInsumo>) => boolean;
  onDeleteCatalogoItem: (id: string) => void;
}

export default function InsumosPanel({ 
  insumos, 
  compras,
  catalogo,
  onAddInsumo, 
  onUpdateInsumo, 
  onDeleteInsumo, 
  onRegistrarCompra,
  onAddCatalogoItem,
  onUpdateCatalogoItem,
  onDeleteCatalogoItem
}: InsumosPanelProps) {
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

  // Modals de creación, compra, edición e inventario/catálogo
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showCatalogoModal, setShowCatalogoModal] = useState(false);
  const [selectedInsumoId, setSelectedInsumoId] = useState<string | null>(null);

  // Estados del formulario para agregar insumo
  const [selectedCatalogoId, setSelectedCatalogoId] = useState('');
  const [nombre, setNombre] = useState('');
  const [unidadMedida, setUnidadMedida] = useState<'g' | 'ml' | 'unidades' | 'piezas'>('g');
  const [precioCompra, setPrecioCompra] = useState<number>(0);
  const [cantidadCompra, setCantidadCompra] = useState<number>(0);
  const [stockInicial, setStockInicial] = useState<number>(0);
  const [alertaMinimo, setAlertaMinimo] = useState<number>(0);

  // Estados del formulario para comprar insumo (FIFO)
  const [cantidadAComprar, setCantidadAComprar] = useState<number>(0);
  const [precioCompraNueva, setPrecioCompraNueva] = useState<number>(0);

  // Estados para edición de insumos existentes
  const [editingInsumoId, setEditingInsumoId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editAlertaMinimo, setEditAlertaMinimo] = useState<number>(0);
  const [editCantidadActual, setEditCantidadActual] = useState<number>(0);

  // Estados para agregar/editar catálogo
  const [catNombre, setCatNombre] = useState('');
  const [catUnidad, setCatUnidad] = useState<'g' | 'ml' | 'unidades' | 'piezas'>('g');
  const [catAlerta, setCatAlerta] = useState<number>(0);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // Handlers del Catálogo
  const handleAddCatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catNombre) return;
    
    if (editingCatId) {
      const success = onUpdateCatalogoItem(editingCatId, {
        nombre: catNombre,
        unidadMedida: catUnidad,
        alertaMinimo: catAlerta
      });
      if (success) {
        setCatNombre('');
        setEditingCatId(null);
      }
    } else {
      const success = onAddCatalogoItem({
        nombre: catNombre,
        unidadMedida: catUnidad,
        alertaMinimo: catAlerta
      });
      if (success) {
        setCatNombre('');
      }
    }
  };

  const handleSelectCatalogo = (catId: string) => {
    setSelectedCatalogoId(catId);
    const catItem = catalogo.find(c => c.id === catId);
    if (catItem) {
      setNombre(catItem.nombre);
      setUnidadMedida(catItem.unidadMedida);
      setAlertaMinimo(catItem.alertaMinimo);
    } else {
      setNombre('');
      setUnidadMedida('g');
      setAlertaMinimo(0);
    }
  };

  // Agregar Insumo (Lotes FIFO)
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || precioCompra <= 0 || cantidadCompra <= 0) {
      showAlert('Campos Incompletos', 'Por favor llena los campos requeridos correctamente');
      return;
    }

    // Validar si ya existe este insumo en Almacén para evitar duplicados
    const duplicadoEnAlmacen = insumos.some(ins => ins.nombre.trim().toLowerCase() === nombre.trim().toLowerCase());
    if (duplicadoEnAlmacen) {
      showAlert('Insumo Existente', `El ingrediente "${nombre}" ya existe en tu Almacén de insumos. Si deseas agregar más inventario o registrar otra compra, usa la opción de "Reabastecer" (carrito de compras) del ingrediente para que se administre correctamente con el sistema FIFO de lotes.`);
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
    setSelectedCatalogoId('');
    setNombre('');
    setPrecioCompra(0);
    setCantidadCompra(0);
    setStockInicial(0);
    setAlertaMinimo(0);
    setShowAddModal(false);
  };

  // Registrar Reabastecimiento de Lotes (FIFO)
  const handleBuySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInsumoId || cantidadAComprar <= 0 || precioCompraNueva <= 0) {
      showAlert('Valores Inválidos', 'Por favor ingresa valores válidos');
      return;
    }
    onRegistrarCompra(selectedInsumoId, cantidadAComprar, precioCompraNueva);
    setCantidadAComprar(0);
    setPrecioCompraNueva(0);
    setShowBuyModal(false);
    setSelectedInsumoId(null);
  };

  // Edición rápida de Stock manual
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
      {/* Encabezado con Botones de Creación y Catálogo */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-sans font-extrabold tracking-tight text-white">Almacén de Insumos e Ingredientes</h2>
          <p className="text-slate-400 text-xs mt-1">
            Administra los ingredientes, salsas y empaques. Define costos unitarios y niveles de stock con soporte inteligente FIFO de lotes múltiples.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowCatalogoModal(true)}
            className="flex-1 sm:flex-initial bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-800 hover:border-slate-700 transition duration-150"
          >
            <FolderLock className="h-4 w-4 text-orange-400" /> Gestionar Catálogo
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-initial bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold py-2.5 px-5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10 transition duration-200"
          >
            <Plus className="h-4.5 w-4.5" /> Nuevo Insumo
          </button>
        </div>
      </div>

      {/* Alerta del catálogo vacío */}
      {catalogo.length === 0 && (
        <div className="bg-orange-950/20 border border-orange-500/30 rounded-xl p-4 flex gap-3 text-xs text-orange-300 leading-relaxed">
          <Info className="h-5 w-5 text-orange-400 flex-shrink-0" />
          <div>
            <span className="font-bold">¡Tip de organización!</span> Tu catálogo de ingredientes está vacío. Se recomienda presionar <strong className="underline cursor-pointer hover:text-orange-200" onClick={() => setShowCatalogoModal(true)}>Gestionar Catálogo</strong> para registrar tus ingredientes estándares antes de añadirlos al almacén. Esto evita duplicar "Pechuga de Pollo" y "Pechuga de pollo" como productos diferentes.
          </div>
        </div>
      )}

      {/* RESPONSIVO: Tabla para pantallas PC (md+) */}
      <div className="hidden md:block bg-slate-900 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/65 border-b border-slate-800/80 text-slate-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                <th className="py-4.5 px-6">Ingrediente / Insumo</th>
                <th className="py-4.5 px-4 text-center">Stock Actual</th>
                <th className="py-4.5 px-4">Alerta Mínima</th>
                <th className="py-4.5 px-4 text-right">Costo Unitario (FIFO)</th>
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
                      {/* Nombre, tipo y lotes */}
                      <td className="py-4.5 px-6 font-semibold text-slate-100">
                        {esEdicion ? (
                          <input
                            type="text"
                            value={editNombre}
                            onChange={(e) => setEditNombre(e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-orange-500 w-full max-w-xs"
                          />
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span>{insumo.nombre}</span>
                              {esAlerta && (
                                <span className="p-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded animate-pulse" title="¡Stock Crítico!">
                                  <AlertTriangle className="h-4 w-4" />
                                </span>
                              )}
                            </div>
                            
                            {/* Visualizador de lotes FIFO activos en tabla */}
                            {insumo.lotes && insumo.lotes.length > 0 && (
                              <div className="pt-2">
                                <span className="text-[9px] uppercase tracking-wider font-extrabold text-orange-400/80 block mb-1">Inventario FIFO Lotes Activos:</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {insumo.lotes.map((l, idx) => (
                                    <span 
                                      key={l.id} 
                                      className="inline-flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded text-[10px] font-mono text-slate-300 border border-slate-800/70"
                                      title={`Lote de compra #${idx + 1} de ${l.cantidadInicial.toLocaleString()} comprado en $${l.precioCompraTotal.toFixed(2)} el ${new Date(l.fecha).toLocaleDateString()}`}
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                      L{idx + 1}: <span className="font-extrabold text-white">{l.cantidadRestante.toLocaleString()}</span> {insumo.unidadMedida} @ ${l.costoUnitario.toFixed(4)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        <span className="text-[10px] text-slate-500 block mt-1.5 font-mono">
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
                              className="bg-slate-950 border border-slate-700 rounded-lg w-24 px-2.5 py-1.5 text-sm text-center text-white focus:outline-none focus:border-orange-500 font-mono"
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
                              className="p-2.5 text-orange-400 hover:bg-orange-500/10 rounded-xl transition"
                              title="Registrar Reabastecimiento / Compra"
                            >
                              <ShoppingCart className="h-4.5 w-4.5" />
                            </button>
                            <button
                              onClick={() => startEdit(insumo)}
                              className="p-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 rounded-xl transition"
                              title="Editar stock manual y alertas"
                            >
                              <Edit3 className="h-4.5 w-4.5" />
                            </button>
                            <button
                              onClick={() => {
                                showConfirm(
                                  'Eliminar Insumo',
                                  `¿Estás seguro de que quieres eliminar "${insumo.nombre}"? Esto afectará las recetas que utilicen este ingrediente.`,
                                  () => onDeleteInsumo(insumo.id),
                                  true
                                );
                              }}
                              className="p-2.5 text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
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

      {/* RESPONSIVO: Tarjetas para pantallas móviles (md-) */}
      <div className="grid grid-cols-1 gap-4 md:hidden" id="insumos-mobile-cards">
        {insumos.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl py-12 text-center text-slate-500 font-medium italic">
            No hay insumos creados aún. Haz clic en "Nuevo Insumo" para empezar.
          </div>
        ) : (
          insumos.map((insumo) => {
            const esAlerta = insumo.cantidadActual <= insumo.alertaMinimo;
            const esEdicion = editingInsumoId === insumo.id;

            return (
              <div 
                key={insumo.id} 
                className={`bg-slate-900 border rounded-2xl p-5 space-y-4 shadow-md ${esAlerta ? 'border-rose-500/30 bg-rose-950/5' : 'border-slate-800/60 bg-slate-900/90'}`}
              >
                {/* Cabecera del Insumo */}
                <div className="flex justify-between items-start">
                  <div>
                    {esEdicion ? (
                      <input
                        type="text"
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-sm text-white focus:outline-none focus:border-orange-500 w-full"
                      />
                    ) : (
                      <h3 className="font-bold text-white text-base flex items-center gap-2">
                        {insumo.nombre}
                        {esAlerta && (
                          <span className="p-1 bg-rose-500/15 text-rose-400 border border-rose-500/20 rounded-lg">
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </h3>
                    )}
                    <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                      Unidad: <span className="font-bold text-slate-400">{insumo.unidadMedida}</span>
                    </span>
                  </div>
                  <div className="text-right">
                    {esEdicion ? (
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-slate-400 block font-mono">Stock Manual</span>
                        <input
                          type="number"
                          step="any"
                          value={editCantidadActual}
                          onChange={(e) => setEditCantidadActual(Number(e.target.value))}
                          className="bg-slate-950 border border-slate-700 rounded-lg w-20 px-1 py-1 text-xs text-center text-white"
                        />
                      </div>
                    ) : (
                      <>
                        <span className={`text-base font-mono font-extrabold block ${esAlerta ? 'text-rose-400' : 'text-slate-200'}`}>
                          {insumo.cantidadActual.toLocaleString('es-MX')} <span className="text-xs font-normal text-slate-500">{insumo.unidadMedida}</span>
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Alerta: &lt;{insumo.alertaMinimo} {insumo.unidadMedida}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Edición de alerta mínima en móvil */}
                {esEdicion && (
                  <div className="flex items-center justify-between text-xs bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Alerta Stock Bajo:</span>
                    <input
                      type="number"
                      step="any"
                      value={editAlertaMinimo}
                      onChange={(e) => setEditAlertaMinimo(Number(e.target.value))}
                      className="bg-slate-950 border border-slate-700 rounded-lg w-20 px-2 py-1 text-center text-white"
                    />
                  </div>
                )}

                {/* Detalles de Costos */}
                <div className="grid grid-cols-2 gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/50 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-mono tracking-wider">Costo Unitario</span>
                    <span className="font-mono font-bold text-slate-200">${insumo.costoUnitario.toFixed(4)}</span>
                    <span className="text-[9px] text-slate-500 block">por {insumo.unidadMedida}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-mono tracking-wider">Última Compra</span>
                    <span className="font-bold text-slate-300 block">${insumo.precioCompraReciente}</span>
                    <span className="text-[9px] text-slate-500 block">x {insumo.cantidadCompraReciente} {insumo.unidadMedida}</span>
                  </div>
                </div>

                {/* Mostrar Lotes FIFO Activos en Móvil */}
                {insumo.lotes && insumo.lotes.length > 0 && (
                  <div className="space-y-1.5 bg-slate-950/20 p-3 rounded-xl border border-slate-800/30 text-[11px]">
                    <span className="text-orange-400 font-bold block text-[10px] uppercase tracking-wider">Lotes FIFO Activos</span>
                    <div className="divide-y divide-slate-800/40 space-y-1">
                      {insumo.lotes.map((lote, index) => (
                        <div key={lote.id} className="flex justify-between text-slate-300 pt-1 font-mono">
                          <span>Lote #{index + 1}:</span>
                          <span className="font-bold text-white">
                            {lote.cantidadRestante.toLocaleString('es-MX')} {insumo.unidadMedida} @ ${lote.costoUnitario.toFixed(4)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Acciones para Móvil */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-800/60">
                  <span className="text-[10px] text-slate-500 font-mono">
                    ID: {insumo.id}
                  </span>
                  {esEdicion ? (
                    <div className="flex gap-1.5">
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
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openBuyModal(insumo.id)}
                        className="flex items-center gap-1.5 bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 font-bold px-3 py-2 rounded-xl text-xs border border-orange-500/20 active:scale-95 transition"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" /> Reabastecer
                      </button>
                      <button
                        onClick={() => startEdit(insumo)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          showConfirm(
                            'Eliminar Insumo',
                            `¿Estás seguro de que deseas eliminar "${insumo.nombre}"?`,
                            () => onDeleteInsumo(insumo.id),
                            true
                          );
                        }}
                        className="p-2 text-rose-400 hover:text-rose-500 hover:bg-rose-950/20 rounded-xl transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Historial de Compras Recientes (Responsive) */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 sm:p-6 shadow-xl">
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

      {/* MODAL: Gestionar Catálogo (Evita duplicados) */}
      <AnimatePresence>
        {showCatalogoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl max-w-2xl w-full overflow-hidden text-slate-100 flex flex-col h-[90vh] sm:h-auto sm:max-h-[85vh]"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
                <div className="flex items-center gap-2">
                  <FolderLock className="h-5 w-5 text-orange-400" />
                  <h3 className="font-sans font-extrabold text-white text-base">Catálogo Único de Ingredientes</h3>
                </div>
                <button onClick={() => setShowCatalogoModal(false)} className="text-slate-400 hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-6 flex-grow">
                {/* Formulario para agregar ingrediente al catálogo */}
                <form onSubmit={handleAddCatSubmit} className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-extrabold text-orange-400 uppercase tracking-wider">
                    {editingCatId ? 'Editar ingrediente en el catálogo' : '+ Registrar nuevo tipo de ingrediente'}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Nombre único *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Pechuga de Pollo"
                        value={catNombre}
                        onChange={(e) => setCatNombre(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Medida base *</label>
                      <select
                        value={catUnidad}
                        onChange={(e) => setCatUnidad(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="g">Gramos (g)</option>
                        <option value="ml">Mililitros (ml)</option>
                        <option value="unidades">Unidades / Piezas</option>
                        <option value="piezas">Piezas</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Alerta Mínima</label>
                      <input
                        type="number"
                        placeholder="Ej: 1000"
                        value={catAlerta === 0 ? '' : catAlerta}
                        onChange={(e) => setCatAlerta(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    {editingCatId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCatId(null);
                          setCatNombre('');
                          setCatAlerta(0);
                        }}
                        className="bg-slate-800 text-slate-300 font-bold py-1 px-3 rounded-lg text-xs"
                      >
                        Cancelar
                      </button>
                    )}
                    <button
                      type="submit"
                      className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-1 px-4 rounded-lg text-xs shadow-md transition"
                    >
                      {editingCatId ? 'Guardar Cambios' : 'Añadir al Catálogo'}
                    </button>
                  </div>
                </form>

                {/* Listado de ingredientes en catálogo */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ingredientes Registrados en el Catálogo ({catalogo.length})</h4>
                  <div className="border border-slate-800 rounded-xl overflow-hidden max-h-[250px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-mono">
                          <th className="py-2.5 px-4">Nombre del ingrediente (Evita duplicados)</th>
                          <th className="py-2.5 px-4">Medida</th>
                          <th className="py-2.5 px-4">Alerta Base</th>
                          <th className="py-2.5 px-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-slate-200">
                        {catalogo.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="text-center py-8 text-slate-500 italic">No hay ingredientes definidos en el catálogo. ¡Agrega uno arriba!</td>
                          </tr>
                        ) : (
                          catalogo.map(item => (
                            <tr key={item.id} className="hover:bg-slate-800/30">
                              <td className="py-2.5 px-4 font-semibold text-slate-100">{item.nombre}</td>
                              <td className="py-2.5 px-4 font-mono">{item.unidadMedida}</td>
                              <td className="py-2.5 px-4 font-mono">{item.alertaMinimo.toLocaleString()}</td>
                              <td className="py-2.5 px-4 text-right">
                                <div className="flex justify-end gap-1">
                                  <button
                                    onClick={() => {
                                      setEditingCatId(item.id);
                                      setCatNombre(item.nombre);
                                      setCatUnidad(item.unidadMedida);
                                      setCatAlerta(item.alertaMinimo);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
                                    title="Editar nombre/tipo"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => onDeleteCatalogoItem(item.id)}
                                    className="p-1.5 text-rose-400 hover:bg-rose-950/20 rounded"
                                    title="Eliminar ingrediente"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
                <button
                  onClick={() => setShowCatalogoModal(false)}
                  className="bg-slate-800 hover:bg-slate-750 text-white font-bold py-2 px-5 rounded-xl text-xs"
                >
                  Cerrar Ventana
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Nuevo Insumo (Selección obligatoria del catálogo para evitar duplicados ortográficos) */}
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
                  <h3 className="font-sans font-extrabold text-white text-base">Registrar Insumo en Almacén</h3>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
                {/* Selección obligatoria del catálogo para evitar duplicados ortográficos */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wide">Selecciona Ingrediente del Catálogo *</label>
                  <div className="flex gap-2">
                    <select
                      required
                      value={selectedCatalogoId}
                      onChange={(e) => handleSelectCatalogo(e.target.value)}
                      className="flex-grow bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="">-- Elige un ingrediente del Catálogo --</option>
                      {catalogo.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.nombre} ({item.unidadMedida})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        setShowCatalogoModal(true);
                      }}
                      className="bg-slate-800 hover:bg-slate-750 text-orange-400 px-3 py-2 rounded-xl border border-slate-700 font-bold text-xs"
                      title="Agregar un nuevo ingrediente al catálogo estándar"
                    >
                      <Plus className="h-4 w-4 inline mr-1" /> Nuevo
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Esto previene la duplicación por mayúsculas o errores ("Pechuga de Pollo" vs "Pechuga de pollo").
                  </p>
                </div>

                {nombre && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      {/* Unidad de Medida (Preset de Catálogo) */}
                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1.5 uppercase tracking-wide">Medida (Fija)</label>
                        <input
                          type="text"
                          disabled
                          value={unidadMedida === 'g' ? 'Gramos (g)' : unidadMedida === 'ml' ? 'Mililitros (ml)' : unidadMedida === 'unidades' ? 'Unidades' : 'Piezas'}
                          className="w-full bg-slate-950 border border-slate-850/40 rounded-xl px-3 py-2 text-sm text-slate-400 cursor-not-allowed font-semibold"
                        />
                      </div>

                      {/* Stock Inicial */}
                      <div>
                        <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wide">Stock Inicial en Almacén</label>
                        <input
                          type="number"
                          step="any"
                          required
                          placeholder="Ej: 5000"
                          value={stockInicial === 0 ? '' : stockInicial}
                          onChange={(e) => setStockInicial(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="bg-orange-950/20 p-4 rounded-xl border border-orange-900/30 space-y-3">
                      <h4 className="text-xs font-extrabold text-orange-400 flex items-center gap-1.5 uppercase tracking-wider">
                        <Info className="h-4 w-4" /> Parámetros de Compra (Primer Lote)
                      </h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Registra cómo adquiriste tu inventario para que el sistema calcule el costo unitario inicial de este lote.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">¿Qué cantidad compraste? *</label>
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
                            placeholder="Ej: $60 o $250"
                            value={precioCompra === 0 ? '' : precioCompra}
                            onChange={(e) => setPrecioCompra(Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                      </div>
                      {cantidadCompra > 0 && precioCompra > 0 && (
                        <p className="text-[10px] font-mono text-orange-300 font-bold">
                          Costo Unitario Inicial: ${(precioCompra / cantidadCompra).toFixed(4)} por {unidadMedida}
                        </p>
                      )}
                    </div>

                    {/* Alerta de Mínimo */}
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wide">Stock Mínimo para Alerta</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Recibe advertencias si el stock baja de esta cifra"
                        value={alertaMinimo === 0 ? '' : alertaMinimo}
                        onChange={(e) => setAlertaMinimo(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 font-mono"
                      />
                      <p className="text-[10px] text-slate-500 mt-1.5">Ingresar en la unidad seleccionada ({unidadMedida}).</p>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddModal(false)}
                        className="bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-2 px-4 rounded-xl text-sm transition"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold py-2 px-4 rounded-xl text-sm transition shadow-lg shadow-orange-500/10"
                      >
                        Registrar Insumo en Almacén
                      </button>
                    </div>
                  </motion.div>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Registrar Reabastecimiento/Compra (FIFO) */}
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
                        <h3 className="font-sans font-extrabold text-white text-base">Registrar Compra / Añadir Lote</h3>
                      </div>
                      <button onClick={() => { setShowBuyModal(false); setSelectedInsumoId(null); }} className="text-slate-400 hover:text-white transition">
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <form onSubmit={handleBuySubmit} className="p-5 space-y-4">
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Estás comprando más stock de <span className="font-bold text-white underline decoration-orange-500/55">{insumo.nombre}</span> con un costo específico. Esto creará un lote separado (sistema FIFO). El stock actual de <span className="font-bold text-white font-mono">{insumo.cantidadActual} {insumo.unidadMedida}</span> se incrementará automáticamente.
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
                          <CheckCircle2 className="h-4 w-4" /> Inteligencia de Lotes (FIFO)
                        </h4>
                        <div className="text-[11px] text-slate-300 space-y-1.5 mt-2.5">
                          <p>• Stock Final Estimado: <span className="font-bold text-white font-mono">{(insumo.cantidadActual + cantidadAComprar).toLocaleString('es-MX')} {insumo.unidadMedida}</span></p>
                          <p>• Costo Unitario de este Nuevo Lote: <span className="font-bold text-white font-mono">${(precioCompraNueva / (cantidadAComprar || 1)).toFixed(4)}</span> por {insumo.unidadMedida}</p>
                          <p className="text-emerald-300/90 font-semibold leading-relaxed mt-2 text-[10px]">
                            ※ El sistema priorizará consumir los {insumo.cantidadActual.toLocaleString()} {insumo.unidadMedida} que ya tenías al precio anterior. Al terminarse ese lote, el sistema comenzará a calcular los costos de tus platillos usando el precio nuevo automáticamente.
                          </p>
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
                          Registrar Lote de Compra
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
