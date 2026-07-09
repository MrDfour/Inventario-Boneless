import React from 'react';
import { Insumo, Venta, Platillo } from '../types';
import { 
  DollarSign, 
  AlertTriangle, 
  TrendingUp, 
  Layers, 
  Package, 
  ArrowRight,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardHomeProps {
  insumos: Insumo[];
  ventas: Venta[];
  platillos: Platillo[];
  onNavigate: (tab: 'insumos' | 'platillos' | 'ventas' | 'reportes') => void;
}

export default function DashboardHome({ insumos, ventas, platillos, onNavigate }: DashboardHomeProps) {
  // 1. Calcular el valor monetario total del inventario actual en el almacén
  const valorTotalInventario = insumos.reduce((acc, insumo) => {
    return acc + (insumo.cantidadActual * insumo.costoUnitario);
  }, 0);

  // 2. Identificar insumos con stock crítico (por debajo del mínimo)
  const insumosAlertas = insumos.filter(i => i.cantidadActual <= i.alertaMinimo);

  // 3. Ventas totales e ingresos
  const totalVentasRegistradas = ventas.reduce((acc, v) => acc + v.cantidad, 0);
  const ingresosTotales = ventas.reduce((acc, v) => acc + v.precioVentaTotal, 0);
  const costoTotalInsumosVenta = ventas.reduce((acc, v) => acc + v.costoInsumosTotal, 0);
  const gananciaNetaTotal = ingresosTotales - costoTotalInsumosVenta;
  const margenPromedio = ingresosTotales > 0 ? (gananciaNetaTotal / ingresosTotales) * 100 : 0;

  // 4. Ventas del día de hoy
  const hoyStr = new Date().toISOString().split('T')[0];
  const ventasHoy = ventas.filter(v => v.fecha.startsWith(hoyStr));
  const ingresosHoy = ventasHoy.reduce((acc, v) => acc + v.precioVentaTotal, 0);
  const costoHoy = ventasHoy.reduce((acc, v) => acc + v.costoInsumosTotal, 0);
  const gananciaHoy = ingresosHoy - costoHoy;

  // 5. Ventas agrupadas por platillo para ver el más vendido (Top Seller)
  const platilloVentasCount: Record<string, number> = {};
  ventas.forEach(v => {
    platilloVentasCount[v.platilloNombre] = (platilloVentasCount[v.platilloNombre] || 0) + v.cantidad;
  });
  
  const topPlatillo = Object.entries(platilloVentasCount).reduce((a, b) => (b[1] > a[1] ? b : a), ['', 0]);

  return (
    <div className="space-y-6 animate-fade-in" id="dashboard-home-view">
      {/* Mensaje de Bienvenida e Indicación de Estado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent p-6 rounded-2xl border border-orange-500/20 shadow-lg shadow-orange-950/5">
        <div>
          <h2 className="text-2xl font-sans font-extrabold tracking-tight text-white flex items-center gap-2">
            ¡Hola! <Sparkles className="h-5.5 w-5.5 text-orange-400 animate-pulse" />
          </h2>
          <p className="text-slate-300 mt-1 text-sm max-w-2xl leading-relaxed">
            Este es el estado actual de tu negocio de boneless hoy. Todo el inventario se gestiona localmente en este navegador.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 py-2 px-4 rounded-full text-xs font-mono text-slate-300 shadow-md self-start md:self-center">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="font-semibold">Actualizado en tiempo real</span>
        </div>
      </div>

      {/* Tarjetas de Métricas Clave */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="metric-cards">
        {/* Inventario en dinero */}
        <motion.div 
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ duration: 0.2 }}
          className="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl shadow-lg flex flex-col justify-between group cursor-pointer hover:border-slate-700/80"
          id="card-inventario-valor"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs uppercase font-bold tracking-wider font-mono">Valor del Almacén</span>
            <div className="p-2.5 bg-emerald-950/50 text-emerald-400 rounded-xl border border-emerald-900/30">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-5">
            <span className="text-3xl font-mono font-bold text-white tracking-tight">${valorTotalInventario.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-xs text-slate-500 block mt-1.5">Valor en costo de adquisición</span>
          </div>
          <button 
            onClick={() => onNavigate('reportes')}
            className="mt-5 flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition w-fit"
          >
            Ver estado contable <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>

        {/* Ganancias Totales */}
        <motion.div 
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ duration: 0.2 }}
          className="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl shadow-lg flex flex-col justify-between group cursor-pointer hover:border-slate-700/80"
          id="card-ganancias-totales"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs uppercase font-bold tracking-wider font-mono">Ganancia Acumulada</span>
            <div className="p-2.5 bg-orange-950/50 text-orange-400 rounded-xl border border-orange-900/30">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-5">
            <span className="text-3xl font-mono font-bold text-white tracking-tight">${gananciaNetaTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-xs text-emerald-400 font-semibold block mt-1.5">
              Margen de {margenPromedio.toFixed(1)}% promedio
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-4 border-t border-slate-800/60 pt-3">
            Ingreso bruto: <span className="font-semibold text-slate-300">${ingresosTotales.toLocaleString('es-MX', { maximumFractionDigits: 2 })}</span>
          </div>
        </motion.div>

        {/* Ventas de Hoy */}
        <motion.div 
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ duration: 0.2 }}
          className="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl shadow-lg flex flex-col justify-between group cursor-pointer hover:border-slate-700/80"
          id="card-ventas-hoy"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs uppercase font-bold tracking-wider font-mono">Ganancia de Hoy</span>
            <div className="p-2.5 bg-amber-950/50 text-amber-400 rounded-xl border border-amber-900/30">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-5">
            <span className="text-3xl font-mono font-bold text-white tracking-tight">${gananciaHoy.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-xs text-slate-400 font-semibold block mt-1.5">
              {ventasHoy.reduce((acc, v) => acc + v.cantidad, 0)} órdenes hoy
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-4 border-t border-slate-800/60 pt-3">
            Vendido hoy: <span className="font-semibold text-slate-300">${ingresosHoy.toLocaleString('es-MX', { maximumFractionDigits: 2 })}</span>
          </div>
        </motion.div>

        {/* Alertas de Stock Bajo */}
        <motion.div 
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ duration: 0.2 }}
          className={`p-6 rounded-2xl border shadow-lg flex flex-col justify-between group cursor-pointer transition ${
            insumosAlertas.length > 0 
              ? 'bg-rose-950/20 border-rose-900/40 text-rose-100 hover:border-rose-800/60' 
              : 'bg-slate-900 border-slate-800/80 text-white hover:border-slate-700/80'
          }`}
          id="card-alertas"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs uppercase font-bold tracking-wider font-mono">Alertas de Stock</span>
            <div className={`p-2.5 rounded-xl border ${
              insumosAlertas.length > 0 
                ? 'bg-rose-900/30 text-rose-400 border-rose-800/40' 
                : 'bg-slate-800/60 text-slate-400 border-slate-700/40'
            }`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-5">
            <span className={`text-3xl font-mono font-bold tracking-tight ${insumosAlertas.length > 0 ? 'text-rose-400' : 'text-white'}`}>
              {insumosAlertas.length}
            </span>
            <span className="text-xs block mt-1.5 text-slate-400 font-semibold">
              {insumosAlertas.length > 0 
                ? 'Ingredientes agotándose' 
                : 'Inventario suficiente'}
            </span>
          </div>
          <button 
            onClick={() => onNavigate('insumos')}
            className={`mt-5 flex items-center gap-1.5 text-xs font-bold transition w-fit ${
              insumosAlertas.length > 0 ? 'text-rose-400 hover:text-rose-300' : 'text-slate-300 hover:text-white'
            }`}
          >
            Ver ingredientes <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>

      {/* Alertas de Inventario Crítico e Insumos */}
      {insumosAlertas.length > 0 && (
        <div className="bg-rose-950/20 border border-rose-900/50 rounded-2xl p-6 shadow-xl" id="critical-stock-alerts">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-rose-900/30 border border-rose-800/40 text-rose-400 rounded-xl mt-0.5">
              <AlertTriangle className="h-5.5 w-5.5 flex-shrink-0" />
            </div>
            <div className="flex-grow">
              <h4 className="text-sm font-extrabold text-rose-200 uppercase tracking-wide font-sans">Reabastecimiento Inmediato Requerido</h4>
              <p className="text-xs text-rose-300/80 mt-1 leading-relaxed">
                Los siguientes insumos están por debajo de su límite de alerta mínimo. Es posible que no puedas surtir ciertos platillos en tu menú de boneless:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 mt-4">
                {insumosAlertas.map(insumo => (
                  <div key={insumo.id} className="bg-slate-900/90 border border-rose-950 p-4 rounded-xl flex items-center justify-between shadow-md">
                    <div>
                      <p className="text-xs font-bold text-white">{insumo.nombre}</p>
                      <p className="text-xs font-mono text-rose-400 font-extrabold mt-1">
                        {insumo.cantidadActual.toLocaleString('es-MX')} {insumo.unidadMedida}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono bg-rose-950 text-rose-300 px-2.5 py-0.5 rounded-full border border-rose-900/40 font-bold">
                      Mín: {insumo.alertaMinimo}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid Inferior: Productos Estrella y Ventas Recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-grids">
        {/* Ventas Recientes */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/60">
              <h3 className="font-sans font-extrabold text-white text-base">Historial de Ventas Recientes</h3>
              <button 
                onClick={() => onNavigate('ventas')}
                className="text-xs text-orange-400 font-bold hover:text-orange-300 flex items-center gap-1 transition"
              >
                Registrar Venta <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            
            <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {ventas.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm italic">
                  No hay ventas registradas todavía. ¡Registra tu primera venta hoy!
                </div>
              ) : (
                ventas.slice(0, 5).map((venta) => (
                  <div key={venta.id} className="flex items-center justify-between p-3.5 rounded-xl hover:bg-slate-800/40 border border-transparent hover:border-slate-800/60 transition duration-200">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate">{venta.platilloNombre}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-1">
                        {venta.cantidad} {venta.cantidad === 1 ? 'unidad' : 'unidades'} • {new Date(venta.fecha).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 font-mono">
                      <p className="text-xs font-bold text-white">${venta.precioVentaTotal.toFixed(2)}</p>
                      <p className="text-[10px] text-emerald-400 font-semibold mt-1">
                        +${venta.margenTotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {ventas.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-800/60 flex justify-between items-center text-xs text-slate-400">
              <span>Mostrando las últimas 5 ventas</span>
              <button onClick={() => onNavigate('ventas')} className="text-orange-400 hover:text-orange-300 font-bold underline transition">
                Ver todo el historial
              </button>
            </div>
          )}
        </div>

        {/* Resumen Comercial o Platillo más vendido */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="font-sans font-extrabold text-white pb-4 border-b border-slate-800/60 mb-4 text-base">Información de Negocio</h3>
            
            <div className="space-y-6">
              {/* Top Seller Card */}
              <div className="bg-amber-950/20 rounded-xl p-4.5 border border-amber-900/40 text-amber-100 shadow-inner">
                <span className="text-[9px] uppercase font-mono font-extrabold text-amber-400 tracking-wider bg-amber-950 border border-amber-900/50 px-2 py-0.5 rounded-full">PLATILLO ESTRELLA</span>
                <h4 className="text-base font-extrabold text-white mt-2.5">
                  {topPlatillo[0] ? topPlatillo[0] : 'Sin ventas registradas'}
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {topPlatillo[1] ? `Se han vendido ${topPlatillo[1]} porciones en total` : 'Empieza a vender para calcularlo'}
                </p>
              </div>

              {/* Resumen del Stock de Insumos */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Estado del Almacén (Muestra)</h4>
                
                <div className="space-y-3">
                  {insumos.slice(0, 4).map(insumo => {
                    const porcentaje = Math.min((insumo.cantidadActual / (insumo.alertaMinimo * 3)) * 100, 100);
                    const esBajo = insumo.cantidadActual <= insumo.alertaMinimo;
                    
                    return (
                      <div key={insumo.id} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-300">{insumo.nombre}</span>
                          <span className={`font-mono font-bold ${esBajo ? 'text-rose-400' : 'text-slate-400'}`}>
                            {insumo.cantidadActual.toLocaleString('es-MX')} <span className="text-[10px] font-normal">{insumo.unidadMedida}</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/30">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              esBajo ? 'bg-rose-500' : porcentaje < 40 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${porcentaje}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={() => onNavigate('insumos')}
            className="text-xs text-orange-400 font-bold hover:text-orange-300 transition mt-6 block text-left"
          >
            Gestionar inventarios e insumos
          </button>
        </div>
      </div>
    </div>
  );
}

