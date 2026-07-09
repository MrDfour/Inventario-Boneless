import React, { useState } from 'react';
import { Insumo, Platillo, IngredienteReceta } from '../types';
import { 
  Layers, 
  Plus, 
  Trash2, 
  Calculator, 
  TrendingUp, 
  DollarSign,
  AlertCircle,
  X,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PlatillosPanelProps {
  platillos: Platillo[];
  insumos: Insumo[];
  onAddPlatillo: (platillo: Omit<Platillo, 'id'>) => void;
  onUpdatePlatillo: (id: string, platillo: Partial<Platillo>) => void;
  onDeletePlatillo: (id: string) => void;
}

export default function PlatillosPanel({ 
  platillos, 
  insumos, 
  onAddPlatillo, 
  onUpdatePlatillo, 
  onDeletePlatillo 
}: PlatillosPanelProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSimulador, setShowSimulador] = useState(false);

  // Estados para nuevo Platillo
  const [nombre, setNombre] = useState('');
  const [precioVenta, setPrecioVenta] = useState<number>(0);
  const [ingredientesReceta, setIngredientesReceta] = useState<IngredienteReceta[]>([]);

  // Estados auxiliares para agregar ingrediente a la receta actual en creación
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [cantidadIngrediente, setCantidadIngrediente] = useState<number>(0);

  // Estado para la calculadora/simulador de costos
  const [simPollo, setSimPollo] = useState<number>(200);
  const [simSalsa, setSimSalsa] = useState<number>(30);
  const [simCharola, setSimCharola] = useState<number>(1);
  const [simPapas, setSimPapas] = useState<number>(0);
  const [simPrecioVenta, setSimPrecioVenta] = useState<number>(120);

  // Helper para calcular el costo de los insumos en un platillo específico
  const calcularCostoPlatillo = (ingredientes: IngredienteReceta[]) => {
    return ingredientes.reduce((acc, ing) => {
      const insumo = insumos.find(i => i.id === ing.insumoId);
      if (!insumo) return acc;
      return acc + (ing.cantidad * insumo.costoUnitario);
    }, 0);
  };

  const handleAddIngrediente = () => {
    if (!selectedInsumoId || cantidadIngrediente <= 0) {
      alert('Por favor selecciona un ingrediente y escribe una cantidad válida.');
      return;
    }
    // Verificar si ya existe en la receta
    if (ingredientesReceta.some(i => i.insumoId === selectedInsumoId)) {
      alert('Este ingrediente ya está agregado a la receta. Edítalo o bórralo primero.');
      return;
    }
    setIngredientesReceta([...ingredientesReceta, { insumoId: selectedInsumoId, cantidad: cantidadIngrediente }]);
    // Reset inputs
    setSelectedInsumoId('');
    setCantidadIngrediente(0);
  };

  const handleRemoveIngrediente = (insumoId: string) => {
    setIngredientesReceta(ingredientesReceta.filter(i => i.insumoId !== insumoId));
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || precioVenta <= 0 || ingredientesReceta.length === 0) {
      alert('Por favor, ingresa el nombre, el precio de venta y al menos un ingrediente.');
      return;
    }
    onAddPlatillo({
      nombre,
      precioVenta,
      ingredientes: ingredientesReceta,
    });
    // Limpiar formulario
    setNombre('');
    setPrecioVenta(0);
    setIngredientesReceta([]);
    setShowAddModal(false);
  };

  // Simulación dinámica
  const polloInsumo = insumos.find(i => i.id === 'insumo_pollo');
  const salsaInsumo = insumos.find(i => i.id === 'insumo_salsa');
  const charolaInsumo = insumos.find(i => i.id === 'insumo_charola');
  const papasInsumo = insumos.find(i => i.id === 'insumo_papas');

  const polloCostoSim = polloInsumo ? simPollo * polloInsumo.costoUnitario : 0;
  const salsaCostoSim = salsaInsumo ? simSalsa * salsaInsumo.costoUnitario : 0;
  const charolaCostoSim = charolaInsumo ? simCharola * charolaInsumo.costoUnitario : 0;
  const papasCostoSim = papasInsumo ? simPapas * papasInsumo.costoUnitario : 0;

  const costoSimTotal = polloCostoSim + salsaCostoSim + charolaCostoSim + papasCostoSim;
  const margenSimDinero = simPrecioVenta - costoSimTotal;
  const margenSimPorcentaje = simPrecioVenta > 0 ? (margenSimDinero / simPrecioVenta) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in" id="platillos-panel-view">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-sans font-extrabold tracking-tight text-white">Recetas y Costeo de Platillos</h2>
          <p className="text-slate-400 text-xs mt-1">
            Crea platillos y asócialos a ingredientes del almacén. El sistema calculará el costo de producción y margen comercial en tiempo real.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowSimulador(true)}
            className="flex-1 sm:flex-initial bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-2.5 px-4.5 rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-800 hover:border-slate-750 transition"
          >
            <Calculator className="h-4 w-4 text-orange-400" /> Simulador Rápido
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-initial bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold py-2.5 px-5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10 transition duration-200"
          >
            <Plus className="h-4.5 w-4.5" /> Nueva Receta
          </button>
        </div>
      </div>

      {/* Grid de Platillos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="platillos-grid">
        {platillos.length === 0 ? (
          <div className="col-span-full bg-slate-900 border border-slate-800/80 rounded-2xl py-20 text-center text-slate-500 italic font-medium">
            No tienes recetas guardadas aún. Crea una receta ingresando los insumos proporcionales.
          </div>
        ) : (
          platillos.map((platillo) => {
            const costoTotal = calcularCostoPlatillo(platillo.ingredientes);
            const margenDinero = platillo.precioVenta - costoTotal;
            const margenPorcentaje = platillo.precioVenta > 0 ? (margenDinero / platillo.precioVenta) * 100 : 0;

            return (
              <motion.div 
                whileHover={{ y: -3, scale: 1.005 }}
                className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-700/80 transition duration-250"
                key={platillo.id}
              >
                <div>
                  {/* Encabezado de la Tarjeta */}
                  <div className="flex justify-between items-start pb-4 border-b border-slate-800/60">
                    <div className="min-w-0">
                      <h3 className="font-sans font-extrabold text-white text-base truncate">{platillo.nombre}</h3>
                      <p className="text-[10px] text-slate-500 uppercase font-mono mt-1 font-bold">
                        Receta ID: <span className="text-slate-400">{platillo.id.slice(0, 8)}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`¿Estás seguro de que quieres eliminar el platillo "${platillo.nombre}"?`)) {
                          onDeletePlatillo(platillo.id);
                        }
                      }}
                      className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                      title="Eliminar Platillo"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  {/* Detalle de Ingredientes / Receta */}
                  <div className="mt-4">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Ingredientes / Receta</h4>
                    <div className="mt-2 space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {platillo.ingredientes.map((ing, idx) => {
                        const ins = insumos.find(i => i.id === ing.insumoId);
                        const costoIngrediente = ins ? ing.cantidad * ins.costoUnitario : 0;
                        return (
                          <div key={idx} className="bg-slate-950/65 border border-slate-850 p-2.5 rounded-xl text-xs flex justify-between items-center hover:bg-slate-950 transition duration-150">
                            <div>
                              <span className="font-bold text-slate-200">{ins ? ins.nombre : 'Insumo Eliminado'}</span>
                              <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                                Cantidad requerida: {ing.cantidad} {ins?.unidadMedida}
                              </span>
                            </div>
                            <span className="font-mono text-slate-400 font-semibold">
                              ${costoIngrediente.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Resumen Financiero del Platillo (Márgenes de ganancia solicitados) */}
                <div className="mt-6 pt-4 border-t border-slate-800/60 bg-slate-950/30 -mx-6 -mb-6 p-6 rounded-b-2xl">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-900/60 py-2 rounded-xl border border-slate-800/40">
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Costo Insumo</span>
                      <span className="text-sm font-bold text-slate-100 font-mono">${costoTotal.toFixed(2)}</span>
                    </div>
                    <div className="bg-emerald-950/10 py-2 rounded-xl border border-emerald-900/20">
                      <span className="text-[9px] text-emerald-500 block uppercase font-bold">Ganancia Bruta</span>
                      <span className="text-sm font-bold text-emerald-400 font-mono">+${margenDinero.toFixed(2)}</span>
                    </div>
                    <div className="bg-slate-900/60 py-2 rounded-xl border border-slate-800/40">
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Margen %</span>
                      <span className="text-sm font-bold text-orange-400 font-mono">{margenPorcentaje.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* MODAL: Nueva Receta / Platillo */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden text-slate-100"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-orange-400" />
                  <h3 className="font-sans font-extrabold text-white text-base">Crear Receta de Platillo</h3>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
                {/* Datos básicos del platillo */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wide">Nombre Comercial *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Combo Boneless Individual"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wide">Precio Venta ($) *</label>
                    <input
                      type="number"
                      required
                      step="any"
                      placeholder="Ej: 120"
                      value={precioVenta === 0 ? '' : precioVenta}
                      onChange={(e) => setPrecioVenta(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Añadir Insumos a la lista */}
                <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/30 space-y-3">
                  <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider font-mono">Fórmula: Agregar Ingredientes</h4>
                  
                  <div className="flex flex-col sm:flex-row gap-2 items-end">
                    <div className="flex-grow w-full">
                      <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Seleccionar Insumo *</label>
                      <select
                        value={selectedInsumoId}
                        onChange={(e) => setSelectedInsumoId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                      >
                        <option value="">-- Elige un Insumo --</option>
                        {insumos.map(i => (
                          <option key={i.id} value={i.id}>{i.nombre} ({i.unidadMedida})</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="w-full sm:w-28">
                      <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Cantidad Requerida</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Ej: 200"
                        value={cantidadIngrediente === 0 ? '' : cantidadIngrediente}
                        onChange={(e) => setCantidadIngrediente(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white text-center font-mono"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAddIngrediente}
                      className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-1.5 px-3.5 rounded-xl text-xs transition self-stretch sm:self-auto flex items-center justify-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Vincular
                    </button>
                  </div>
                </div>

                {/* Ingredientes de la Receta listados */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wide">Ingredientes Añadidos a la Receta:</label>
                  {ingredientesReceta.length === 0 ? (
                    <p className="text-xs text-slate-500 italic bg-slate-950/45 border border-slate-800 border-dashed p-4 rounded-xl text-center font-medium">
                      Aún no vinculas ningún ingrediente. Usa el formulario de arriba para agregarlos.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                      {ingredientesReceta.map((ing, idx) => {
                        const ins = insumos.find(i => i.id === ing.insumoId);
                        const costoIng = ins ? ins.costoUnitario * ing.cantidad : 0;
                        return (
                          <div key={idx} className="flex justify-between items-center bg-slate-950 p-2 border border-slate-800 rounded-lg text-xs">
                            <span className="font-bold text-slate-200">{ins ? ins.nombre : 'Insumo'}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-400 font-mono">{ing.cantidad} {ins?.unidadMedida} • <span className="font-bold text-white">${costoIng.toFixed(2)}</span></span>
                              <button
                                type="button"
                                onClick={() => handleRemoveIngrediente(ing.insumoId)}
                                className="text-rose-400 hover:text-rose-350"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Resumen de costos dinámico en el modal */}
                {ingredientesReceta.length > 0 && (
                  <div className="bg-orange-950/20 border border-orange-900/30 rounded-xl p-4 text-xs font-mono">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-300">Costo total de insumos:</span>
                      <span className="font-mono font-bold text-white">${calcularCostoPlatillo(ingredientesReceta).toFixed(2)}</span>
                    </div>
                    {precioVenta > 0 && (
                      <div className="flex justify-between items-center mt-1 pt-1 border-t border-slate-800/60">
                        <span className="font-semibold text-slate-300">Ganancia neta por porción vendida:</span>
                        <span className="font-mono font-bold text-emerald-400">+${(precioVenta - calcularCostoPlatillo(ingredientesReceta)).toFixed(2)} ({((precioVenta - calcularCostoPlatillo(ingredientesReceta)) / precioVenta * 100).toFixed(1)}%)</span>
                      </div>
                    )}
                  </div>
                )}

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
                    Crear Platillo / Receta
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Simulador de Costo Dinámico ("Idea de mejora estelar") */}
      <AnimatePresence>
        {showSimulador && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden text-slate-100"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-orange-400" />
                  <h3 className="font-sans font-extrabold text-white text-base">Simulador Dinámico de Recetas</h3>
                </div>
                <button onClick={() => setShowSimulador(false)} className="text-slate-400 hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Ideal para cuando quieres cambiar los gramos de pollo o mililitros de salsa para ver el costo proporcional y decidir a cuánto vender un nuevo combo antes de darlo de alta en el sistema.
                </p>

                <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">Simular Ingredientes</h4>
                  
                  {/* Gramos Pollo */}
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-medium text-slate-300">Porción de Pollo (g):</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={simPollo}
                        onChange={(e) => setSimPollo(Number(e.target.value))}
                        className="w-20 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-center font-mono font-bold text-white focus:outline-none focus:border-orange-500"
                      />
                      <span className="text-slate-500 font-mono">g</span>
                    </div>
                  </div>

                  {/* Mililitros Salsa */}
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-medium text-slate-300">Salsa del platillo (ml):</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={simSalsa}
                        onChange={(e) => setSimSalsa(Number(e.target.value))}
                        className="w-20 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-center font-mono font-bold text-white focus:outline-none focus:border-orange-500"
                      />
                      <span className="text-slate-500 font-mono">ml</span>
                    </div>
                  </div>

                  {/* Charola */}
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-medium text-slate-300">Charola de servicio:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={simCharola}
                        onChange={(e) => setSimCharola(Number(e.target.value))}
                        className="w-20 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-center font-mono font-bold text-white focus:outline-none focus:border-orange-500"
                      />
                      <span className="text-slate-500">pza</span>
                    </div>
                  </div>

                  {/* Papas opcionales */}
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-medium text-slate-300">Papas Francesas (g):</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={simPapas}
                        onChange={(e) => setSimPapas(Number(e.target.value))}
                        className="w-20 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-center font-mono font-bold text-white focus:outline-none focus:border-orange-500"
                      />
                      <span className="text-slate-500 font-mono">g</span>
                    </div>
                  </div>

                  {/* Precio de Venta a simular */}
                  <div className="flex justify-between items-center text-xs border-t border-slate-800 pt-3 mt-1">
                    <label className="font-bold text-slate-300">Simular Precio de Venta ($):</label>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-500">$</span>
                      <input
                        type="number"
                        value={simPrecioVenta}
                        onChange={(e) => setSimPrecioVenta(Number(e.target.value))}
                        className="w-20 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-center font-mono font-bold text-orange-400 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Resultados Financieros en Tiempo Real */}
                <div className="bg-slate-950/65 border border-slate-800/80 rounded-xl p-5 space-y-3">
                  <h4 className="text-xs font-bold text-orange-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <TrendingUp className="h-4 w-4 text-orange-400" /> Resultados de Margen de la Simulación
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4 text-center mt-2">
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold font-mono">Costo Insumos</span>
                      <span className="text-base font-bold text-rose-400 font-mono">${costoSimTotal.toFixed(2)}</span>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold font-mono">Margen Neto</span>
                      <span className="text-base font-bold text-emerald-400 font-mono">+${margenSimDinero.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-800/60">
                    <span className="font-semibold text-slate-300">Porcentaje de Ganancia:</span>
                    <span className="font-bold text-orange-400 font-mono">{margenSimPorcentaje.toFixed(1)}%</span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg text-[10px] text-slate-400 leading-relaxed border border-slate-800/50">
                    <Info className="h-3.5 w-3.5 inline text-orange-400 mr-1" />
                    Este cálculo se actualiza automáticamente según los últimos costos reales de compra registrados en el almacén (Ej. Pollo a ${(polloInsumo?.costoUnitario || 0).toFixed(4)}/g, Salsa a ${(salsaInsumo?.costoUnitario || 0).toFixed(4)}/ml).
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setShowSimulador(false)}
                    className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold py-2 px-5 rounded-xl text-sm transition"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
