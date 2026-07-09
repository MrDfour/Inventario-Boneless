import React, { useState, useEffect } from 'react';
import { 
  loadInsumos, 
  saveInsumos, 
  loadPlatillos, 
  savePlatillos, 
  loadVentas, 
  saveVentas, 
  loadCompras, 
  saveCompras 
} from './utils/storage';
import { Insumo, Platillo, Venta, CompraHistorial } from './types';
import DashboardHome from './components/DashboardHome';
import InsumosPanel from './components/InsumosPanel';
import PlatillosPanel from './components/PlatillosPanel';
import VentasPanel from './components/VentasPanel';
import ReportesPanel from './components/ReportesPanel';
import { 
  Layers, 
  Package, 
  ShoppingCart, 
  FileText, 
  LayoutDashboard,
  UtensilsCrossed,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  // Inicialización de estados locales cargados del localStorage
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [platillos, setPlatillos] = useState<Platillo[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [compras, setCompras] = useState<CompraHistorial[]>([]);
  
  // Estado para la pestaña seleccionada
  const [activeTab, setActiveTab] = useState<'dashboard' | 'insumos' | 'platillos' | 'ventas' | 'reportes'>('dashboard');

  // Estado para mostrar ayuda de uso rápido
  const [showHelp, setShowHelp] = useState(false);

  // Cargar datos en el primer render
  useEffect(() => {
    setInsumos(loadInsumos());
    setPlatillos(loadPlatillos());
    setVentas(loadVentas());
    setCompras(loadCompras());
  }, []);

  // Función para forzar la recarga de estados tras una importación
  const handleDataImported = () => {
    setInsumos(loadInsumos());
    setPlatillos(loadPlatillos());
    setVentas(loadVentas());
    setCompras(loadCompras());
    setActiveTab('dashboard');
  };

  // --- CONTROL DE INSUMOS ---
  const handleAddInsumo = (nuevoInsumo: Omit<Insumo, 'id' | 'costoUnitario'>) => {
    const id = `ins_` + Date.now();
    const costoUnitario = nuevoInsumo.precioCompraReciente / nuevoInsumo.cantidadCompraReciente;
    const insumoCompleto: Insumo = {
      ...nuevoInsumo,
      id,
      costoUnitario,
    };
    const updated = [insumoCompleto, ...insumos];
    setInsumos(updated);
    saveInsumos(updated);

    // Registrar también como primera compra en el historial de reabastecimientos
    const compraId = `c_` + Date.now();
    const nuevaCompra: CompraHistorial = {
      id: compraId,
      insumoId: id,
      insumoNombre: nuevoInsumo.nombre,
      cantidadComprada: nuevoInsumo.cantidadCompraReciente,
      precioPagado: nuevoInsumo.precioCompraReciente,
      fecha: new Date().toISOString(),
    };
    const updatedCompras = [nuevaCompra, ...compras];
    setCompras(updatedCompras);
    saveCompras(updatedCompras);
  };

  const handleUpdateInsumo = (id: string, fields: Partial<Insumo>) => {
    const updated = insumos.map(ins => {
      if (ins.id === id) {
        const temp = { ...ins, ...fields };
        // Si se alteró el precio o cantidad de compra reciente en la edición, recalculamos costo unitario
        if (fields.precioCompraReciente !== undefined || fields.cantidadCompraReciente !== undefined) {
          temp.costoUnitario = temp.precioCompraReciente / temp.cantidadCompraReciente;
        }
        return temp;
      }
      return ins;
    });
    setInsumos(updated);
    saveInsumos(updated);
  };

  const handleDeleteInsumo = (id: string) => {
    const updated = insumos.filter(ins => ins.id !== id);
    setInsumos(updated);
    saveInsumos(updated);
  };

  // Reabastecer stock de un ingrediente y registrar gasto de compra
  const handleRegistrarCompra = (insumoId: string, cantidad: number, precio: number) => {
    const updatedInsumos = insumos.map(ins => {
      if (ins.id === insumoId) {
        const nuevoStock = ins.cantidadActual + cantidad;
        const nuevoCostoUnitario = precio / cantidad; // Último precio pagado
        return {
          ...ins,
          cantidadActual: nuevoStock,
          precioCompraReciente: precio,
          cantidadCompraReciente: cantidad,
          costoUnitario: nuevoCostoUnitario,
        };
      }
      return ins;
    });
    setInsumos(updatedInsumos);
    saveInsumos(updatedInsumos);

    // Añadir movimiento al historial de compras
    const insumoOriginal = insumos.find(i => i.id === insumoId);
    const nuevaCompra: CompraHistorial = {
      id: `c_` + Date.now(),
      insumoId,
      insumoNombre: insumoOriginal ? insumoOriginal.nombre : 'Insumo',
      cantidadComprada: cantidad,
      precioPagado: precio,
      fecha: new Date().toISOString(),
    };
    const updatedCompras = [nuevaCompra, ...compras];
    setCompras(updatedCompras);
    saveCompras(updatedCompras);
  };

  // --- CONTROL DE RECETAS ---
  const handleAddPlatillo = (nuevoPlatillo: Omit<Platillo, 'id'>) => {
    const id = `plat_` + Date.now();
    const platilloCompleto: Platillo = {
      ...nuevoPlatillo,
      id,
    };
    const updated = [platilloCompleto, ...platillos];
    setPlatillos(updated);
    savePlatillos(updated);
  };

  const handleUpdatePlatillo = (id: string, fields: Partial<Platillo>) => {
    const updated = platillos.map(plat => {
      if (plat.id === id) {
        return { ...plat, ...fields };
      }
      return plat;
    });
    setPlatillos(updated);
    savePlatillos(updated);
  };

  const handleDeletePlatillo = (id: string) => {
    const updated = platillos.filter(plat => plat.id !== id);
    setPlatillos(updated);
    savePlatillos(updated);
  };

  // --- REGISTRAR VENTA (INTEGRIDAD DE INVENTARIOS EN TIEMPO REAL) ---
  const handleRegistrarVenta = (platilloId: string, cantidadVendida: number) => {
    const platillo = platillos.find(p => p.id === platilloId);
    if (!platillo) return { success: false, errorMsg: 'Platillo no encontrado.' };

    // 1. Validar Stock Suficiente de todos los insumos de la receta
    const faltantes: string[] = [];
    
    platillo.ingredientes.forEach(ingrediente => {
      const insumo = insumos.find(i => i.id === ingrediente.insumoId);
      if (!insumo) {
        faltantes.push(`Falta el insumo de la receta (ID: ${ingrediente.insumoId})`);
        return;
      }
      
      const cantidadRequerida = ingrediente.cantidad * cantidadVendida;
      if (insumo.cantidadActual < cantidadRequerida) {
        const diferencia = cantidadRequerida - insumo.cantidadActual;
        faltantes.push(
          `${insumo.nombre} (Stock actual: ${insumo.cantidadActual.toLocaleString('es-MX')} ${insumo.unidadMedida}, requerido: ${cantidadRequerida.toLocaleString('es-MX')} ${insumo.unidadMedida}. Faltan ${diferencia.toLocaleString('es-MX')} ${insumo.unidadMedida})`
        );
      }
    });

    if (faltantes.length > 0) {
      return { 
        success: false, 
        errorMsg: `No hay suficiente stock para completar esta venta:\n` + faltantes.join('\n') 
      };
    }

    // 2. Descontar Insumos Proporcionalmente del Almacén en tiempo real
    const updatedInsumos = insumos.map(ins => {
      const ingredienteReceta = platillo.ingredientes.find(ing => ing.insumoId === ins.id);
      if (ingredienteReceta) {
        const cantidadARestar = ingredienteReceta.cantidad * cantidadVendida;
        return {
          ...ins,
          cantidadActual: Math.max(0, ins.cantidadActual - cantidadARestar),
        };
      }
      return ins;
    });
    setInsumos(updatedInsumos);
    saveInsumos(updatedInsumos);

    // 3. Calcular Costos Exactos y Registrar Operación Comercial
    const costoInsumosTotal = platillo.ingredientes.reduce((sum, ing) => {
      const ins = insumos.find(i => i.id === ing.insumoId);
      if (!ins) return sum;
      return sum + (ing.cantidad * ins.costoUnitario);
    }, 0) * cantidadVendida;

    const precioVentaTotal = platillo.precioVenta * cantidadVendida;
    const margenTotal = precioVentaTotal - costoInsumosTotal;

    const nuevaVenta: Venta = {
      id: `v_` + Date.now(),
      platilloId,
      platilloNombre: platillo.nombre,
      cantidad: cantidadVendida,
      precioVentaUnitario: platillo.precioVenta,
      precioVentaTotal,
      costoInsumosTotal,
      margenTotal,
      fecha: new Date().toISOString(),
    };

    const updatedVentas = [nuevaVenta, ...ventas];
    setVentas(updatedVentas);
    saveVentas(updatedVentas);

    return { success: true };
  };

  // --- ANULAR VENTA (RESTAURACIÓN DE INVENTARIO) ---
  const handleAnularVenta = (ventaId: string) => {
    const venta = ventas.find(v => v.id === ventaId);
    if (!venta) return;

    const platillo = platillos.find(p => p.id === venta.platilloId);

    // Si el platillo o su receta todavía existen, restauramos los insumos
    if (platillo) {
      const updatedInsumos = insumos.map(ins => {
        const ingredienteReceta = platillo.ingredientes.find(ing => ing.insumoId === ins.id);
        if (ingredienteReceta) {
          const cantidadARestaurar = ingredienteReceta.cantidad * venta.cantidad;
          return {
            ...ins,
            cantidadActual: ins.cantidadActual + cantidadARaurarIngrediente(cantidadARestaurar),
          };
        }
        return ins;
      });

      // Función auxiliar interna para consistencia de nombres
      function cantidadARaurarIngrediente(val: number) {
        return val;
      }

      setInsumos(updatedInsumos);
      saveInsumos(updatedInsumos);
    } else {
      // Si el platillo fue eliminado, intentamos restaurar según la venta si tenemos el mapeado,
      // pero como política simple le avisamos al usuario que se restauraron los montos globales.
      alert('Nota: El platillo original fue eliminado de las recetas de comida, por lo que el inventario no se modificó para evitar inconsistencias de fórmula. La venta se eliminó del historial contable.');
    }

    // Remover del historial
    const updatedVentas = ventas.filter(v => v.id !== ventaId);
    setVentas(updatedVentas);
    saveVentas(updatedVentas);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-orange-600/30 selection:text-orange-200">
      {/* Header Principal de la Aplicación */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md text-white border-b border-slate-800/80 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo e Identidad */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg shadow-orange-500/10 text-white">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-sans font-extrabold tracking-tight flex items-center gap-1.5">
                  Inventario de Boneless <span className="text-[10px] font-mono font-bold bg-orange-600/20 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/30">Local-Only</span>
                </h1>
                <p className="text-[10px] text-slate-400 font-medium">Control de Costos, Almacén y Recetas</p>
              </div>
            </div>

            {/* Ayuda Rápida */}
            <button 
              onClick={() => setShowHelp(!showHelp)}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition text-xs flex items-center gap-1.5 font-semibold border border-slate-800 bg-slate-900/50"
            >
              <HelpCircle className="h-4 w-4 text-orange-400" />
              <span className="hidden sm:inline">¿Cómo funciona?</span>
            </button>
          </div>
        </div>
      </header>

      {/* Guía rápida de uso interactiva */}
      {showHelp && (
        <div className="bg-slate-900 border-b border-slate-800 text-slate-200 py-6 px-4">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="space-y-2.5 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
              <span className="bg-orange-600/20 text-orange-400 border border-orange-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">PASO 1</span>
              <h4 className="font-bold text-sm text-white">Configura tu Almacén</h4>
              <p className="text-slate-400 leading-relaxed">
                Ve a <span className="font-semibold text-white">Almacén</span> y agrega tus ingredientes básicos. Escribe cuánto compraste y cuánto pagaste (ej. Pechuga de Pollo 1000g costó $60). El sistema deducirá el costo unitario por gramo automáticamente.
              </p>
            </div>
            <div className="space-y-2.5 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
              <span className="bg-orange-600/20 text-orange-400 border border-orange-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">PASO 2</span>
              <h4 className="font-bold text-sm text-white">Define tus Recetas</h4>
              <p className="text-slate-400 leading-relaxed">
                Ve a <span className="font-semibold text-white">Recetas</span> y crea platillos o combos. Vincula los ingredientes del almacén en gramos o mililitros exactos. Verás el costo exacto del platillo y tu porcentaje de ganancia bruto según tu precio de venta.
              </p>
            </div>
            <div className="space-y-2.5 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
              <span className="bg-orange-600/20 text-orange-400 border border-orange-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">PASO 3</span>
              <h4 className="font-bold text-sm text-white">Registra Ventas</h4>
              <p className="text-slate-400 leading-relaxed">
                Cuando vendas un platillo, ve a <span className="font-semibold text-white">Registrar Venta</span>. El sistema restará en tiempo real el pollo, salsa y empaques exactos de tu stock de almacén, impidiendo vender si no hay mercancía suficiente.
              </p>
            </div>
          </div>
          <div className="max-w-4xl mx-auto mt-6 pt-4 border-t border-slate-800 text-center text-xs text-orange-400 font-semibold">
            <span className="font-bold bg-orange-600/20 text-orange-300 px-2 py-0.5 rounded mr-1">¡Tip Contable!</span> Al final de tu periodo, ve a <span className="font-semibold underline cursor-pointer hover:text-orange-300" onClick={() => { setActiveTab('reportes'); setShowHelp(false); }}>Estado Contable</span> para descargar reportes listos para Excel o copiar el resumen de inventario final en dinero para tus estados financieros.
          </div>
        </div>
      )}

      {/* Navegación y Cuerpo de la Aplicación */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow flex flex-col md:flex-row gap-6">
        {/* Navegación Lateral (Para computadoras) o Superior (Para móviles) */}
        <nav className="flex md:flex-col overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 gap-1.5 md:w-64 flex-shrink-0 h-fit" id="app-navigation-tabs">
          {/* Dashboard */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2.5 py-3 px-4 rounded-xl text-sm font-semibold transition duration-200 whitespace-nowrap md:w-full border ${
              activeTab === 'dashboard' 
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-500/15 border-orange-500/40' 
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60 border-transparent'
            }`}
          >
            <LayoutDashboard className="h-4.5 w-4.5" />
            <span>Resumen General</span>
          </button>

          {/* Insumos */}
          <button
            onClick={() => setActiveTab('insumos')}
            className={`flex items-center gap-2.5 py-3 px-4 rounded-xl text-sm font-semibold transition duration-200 whitespace-nowrap md:w-full border ${
              activeTab === 'insumos' 
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-500/15 border-orange-500/40' 
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60 border-transparent'
            }`}
          >
            <Package className="h-4.5 w-4.5" />
            <span>Almacén (Insumos)</span>
          </button>

          {/* Platillos */}
          <button
            onClick={() => setActiveTab('platillos')}
            className={`flex items-center gap-2.5 py-3 px-4 rounded-xl text-sm font-semibold transition duration-200 whitespace-nowrap md:w-full border ${
              activeTab === 'platillos' 
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-500/15 border-orange-500/40' 
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60 border-transparent'
            }`}
          >
            <Layers className="h-4.5 w-4.5" />
            <span>Recetas (Costeo)</span>
          </button>

          {/* Registrar Venta */}
          <button
            onClick={() => setActiveTab('ventas')}
            className={`flex items-center gap-2.5 py-3 px-4 rounded-xl text-sm font-semibold transition duration-200 whitespace-nowrap md:w-full border ${
              activeTab === 'ventas' 
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-500/15 border-orange-500/40' 
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60 border-transparent'
            }`}
          >
            <ShoppingCart className="h-4.5 w-4.5" />
            <span>Registrar Venta</span>
          </button>

          {/* Reportes Contables */}
          <button
            onClick={() => setActiveTab('reportes')}
            className={`flex items-center gap-2.5 py-3 px-4 rounded-xl text-sm font-semibold transition duration-200 whitespace-nowrap md:w-full border ${
              activeTab === 'reportes' 
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-500/15 border-orange-500/40' 
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60 border-transparent'
            }`}
          >
            <FileText className="h-4.5 w-4.5" />
            <span>Estado Contable</span>
          </button>
        </nav>

        {/* Sección de Contenido Activo */}
        <main className="flex-grow bg-transparent" id="app-main-content">
          {activeTab === 'dashboard' && (
            <DashboardHome 
              insumos={insumos} 
              ventas={ventas} 
              platillos={platillos} 
              onNavigate={setActiveTab} 
            />
          )}

          {activeTab === 'insumos' && (
            <InsumosPanel 
              insumos={insumos}
              compras={compras}
              onAddInsumo={handleAddInsumo}
              onUpdateInsumo={handleUpdateInsumo}
              onDeleteInsumo={handleDeleteInsumo}
              onRegistrarCompra={handleRegistrarCompra}
            />
          )}

          {activeTab === 'platillos' && (
            <PlatillosPanel 
              platillos={platillos}
              insumos={insumos}
              onAddPlatillo={handleAddPlatillo}
              onUpdatePlatillo={handleUpdatePlatillo}
              onDeletePlatillo={handleDeletePlatillo}
            />
          )}

          {activeTab === 'ventas' && (
            <VentasPanel 
              ventas={ventas}
              platillos={platillos}
              insumos={insumos}
              onRegistrarVenta={handleRegistrarVenta}
              onAnularVenta={handleAnularVenta}
            />
          )}

          {activeTab === 'reportes' && (
            <ReportesPanel 
              insumos={insumos}
              ventas={ventas}
              compras={compras}
              onDataImported={handleDataImported}
            />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-500 py-8 text-center text-xs mt-auto border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {new Date().getFullYear()} Sistema de Inventario Boneless. Todo bajo control.</p>
          <p className="mt-1.5 text-[10px] text-slate-600 max-w-lg mx-auto leading-relaxed">Almacenamiento 100% local y seguro en tu navegador. Sin bases de datos externas, manteniendo la privacidad absoluta de tus costos e ingresos.</p>
        </div>
      </footer>
    </div>
  );
}
