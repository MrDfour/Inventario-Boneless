import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { 
  loadInsumos, 
  saveInsumos, 
  loadPlatillos, 
  savePlatillos, 
  loadVentas, 
  saveVentas, 
  loadCompras, 
  saveCompras,
  loadCatalogo,
  saveCatalogo,
  getFallbackCaducidad,
  loadCierres,
  saveCierres,
  loadConfigCorte,
  saveConfigCorte
} from './utils/storage';
import { Insumo, Platillo, Venta, CompraHistorial, CatalogoInsumo, LoteInsumo, CierreVenta, ConfiguracionCorte } from './types';
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
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'motion/react';
import { CustomDialog } from './components/CustomDialog';

// --- FUNCIONES AUXILIARES PARA EL CONTROL DE INVENTARIOS CON FIFO ---

function actualizarInsumoDesdeLotes(ins: Insumo): Insumo {
  const lotesDisponibles = (ins.lotes || []).filter(l => l.cantidadRestante > 0);
  
  if (lotesDisponibles.length === 0) {
    return {
      ...ins,
      cantidadActual: 0,
      lotes: [],
    };
  }

  const cantidadActual = lotesDisponibles.reduce((sum, l) => sum + l.cantidadRestante, 0);
  const oldestLote = lotesDisponibles[0]; // El más antiguo disponible (FIFO)

  return {
    ...ins,
    cantidadActual,
    costoUnitario: oldestLote.costoUnitario,
    precioCompraReciente: oldestLote.precioCompraTotal,
    cantidadCompraReciente: oldestLote.cantidadInicial,
    lotes: lotesDisponibles,
  };
}

function ajustarLotesPorStockManual(lotes: LoteInsumo[], nuevoStock: number, defaultCostoUnitario: number): LoteInsumo[] {
  const currentStock = lotes.reduce((sum, l) => sum + l.cantidadRestante, 0);
  if (nuevoStock === currentStock) return lotes;

  if (nuevoStock < currentStock) {
    // Reducir stock (FIFO)
    let aEliminar = currentStock - nuevoStock;
    const resultado: LoteInsumo[] = [];
    for (const lote of lotes) {
      if (aEliminar <= 0) {
        resultado.push(lote);
      } else if (lote.cantidadRestante <= aEliminar) {
        aEliminar -= lote.cantidadRestante;
      } else {
        resultado.push({
          ...lote,
          cantidadRestante: lote.cantidadRestante - aEliminar
        });
        aEliminar = 0;
      }
    }
    return resultado;
  } else {
    // Incrementar stock
    const diferencia = nuevoStock - currentStock;
    if (lotes.length > 0) {
      return lotes.map((lote, idx) => {
        if (idx === 0) {
          return {
            ...lote,
            cantidadRestante: lote.cantidadRestante + diferencia,
            cantidadInicial: lote.cantidadInicial + diferencia,
            precioCompraTotal: lote.precioCompraTotal + (diferencia * lote.costoUnitario)
          };
        }
        return lote;
      });
    } else {
      return [{
        id: `lote_manual_${Date.now()}`,
        cantidadInicial: diferencia,
        cantidadRestante: diferencia,
        precioCompraTotal: diferencia * defaultCostoUnitario,
        costoUnitario: defaultCostoUnitario,
        fecha: new Date().toISOString(),
        fechaCaducidad: getFallbackCaducidad()
      }];
    }
  }
}

function consumirInsumoFIFO(insumo: Insumo, cantidadARestar: number): { updatedInsumo: Insumo, costoConsumido: number } {
  const lotes = insumo.lotes ? [...insumo.lotes] : [];
  let restantePorRestar = cantidadARestar;
  let costoConsumido = 0;

  const updatedLotes: LoteInsumo[] = [];

  for (const lote of lotes) {
    if (restantePorRestar <= 0) {
      updatedLotes.push(lote);
    } else if (lote.cantidadRestante <= restantePorRestar) {
      restantePorRestar -= lote.cantidadRestante;
      costoConsumido += lote.cantidadRestante * lote.costoUnitario;
    } else {
      costoConsumido += restantePorRestar * lote.costoUnitario;
      updatedLotes.push({
        ...lote,
        cantidadRestante: lote.cantidadRestante - restantePorRestar
      });
      restantePorRestar = 0;
    }
  }

  const insumoConNuevosLotes = {
    ...insumo,
    lotes: updatedLotes
  };

  const updatedInsumo = actualizarInsumoDesdeLotes(insumoConNuevosLotes);

  return {
    updatedInsumo,
    costoConsumido
  };
}

export default function App() {
  // Inicialización de estados locales cargados del localStorage
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [platillos, setPlatillos] = useState<Platillo[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [compras, setCompras] = useState<CompraHistorial[]>([]);
  const [catalogo, setCatalogo] = useState<CatalogoInsumo[]>([]);
  const [cierres, setCierres] = useState<CierreVenta[]>([]);
  const [configCorte, setConfigCorte] = useState<ConfiguracionCorte>({ tipo: 'manual', horaAutomatica: '23:00' });
  
  // Estado para la pestaña seleccionada
  const [activeTab, setActiveTab] = useState<'dashboard' | 'insumos' | 'platillos' | 'ventas' | 'reportes'>('dashboard');

  // Estado para mostrar ayuda de uso rápido
  const [showHelp, setShowHelp] = useState(false);

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

  // Cargar datos en el primer render
  useEffect(() => {
    setInsumos(loadInsumos());
    setPlatillos(loadPlatillos());
    setVentas(loadVentas());
    setCompras(loadCompras());
    setCatalogo(loadCatalogo());
    setCierres(loadCierres());
    setConfigCorte(loadConfigCorte());
  }, []);

  // Verificar actualizaciones en Android
  useEffect(() => {
    if (Capacitor.getPlatform() === 'android') {
      const checkAndroidUpdates = async () => {
        try {
          const res = await fetch('https://api.github.com/repos/MrDfour/Inventario-Boneless/releases/latest');
          if (res.ok) {
            const data = await res.json();
            const latestTag = data.tag_name;
            const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
            
            // Comparar versiones (semver simple)
            const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number);
            const [currMajor, currMinor, currPatch] = parse(currentVersion);
            const [latMajor, latMinor, latPatch] = parse(latestTag);
            
            let isNewer = false;
            if (latMajor !== currMajor) {
              isNewer = latMajor > currMajor;
            } else if (latMinor !== currMinor) {
              isNewer = latMinor > currMinor;
            } else {
              isNewer = latPatch > currPatch;
            }

            if (isNewer) {
              setDialogConfig({
                isOpen: true,
                type: 'confirm',
                title: 'Actualización disponible',
                message: `Una nueva versión (${latestTag}) está disponible para Android. ¿Deseas descargar el nuevo APK ahora?`,
                confirmText: 'Descargar',
                cancelText: 'Más tarde',
                onConfirm: () => {
                  window.open(data.html_url, '_system');
                  setDialogConfig(null);
                },
                onCancel: () => {
                  setDialogConfig(null);
                }
              });
            }
          }
        } catch (err) {
          console.error('Error al verificar actualizaciones en Android:', err);
        }
      };
      // Esperar un momento antes de verificar para no sobrecargar el inicio de la app
      const timer = setTimeout(checkAndroidUpdates, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Función para forzar la recarga de estados tras una importación
  const handleDataImported = () => {
    setInsumos(loadInsumos());
    setPlatillos(loadPlatillos());
    setVentas(loadVentas());
    setCompras(loadCompras());
    setCatalogo(loadCatalogo());
    setActiveTab('dashboard');
  };

  // --- CONTROL DEL CATÁLOGO ---
  const handleAddCatalogoItem = (item: Omit<CatalogoInsumo, 'id'>) => {
    const exist = catalogo.some(c => c.nombre.trim().toLowerCase() === item.nombre.trim().toLowerCase());
    if (exist) {
      showAlert('Duplicado en Catálogo', 'Ya existe un ingrediente con este nombre en el catálogo (evita duplicados con o sin mayúsculas).');
      return false;
    }
    const newItem: CatalogoInsumo = {
      ...item,
      id: 'cat_' + Date.now()
    };
    const updated = [...catalogo, newItem];
    setCatalogo(updated);
    saveCatalogo(updated);
    return true;
  };

  const handleUpdateCatalogoItem = (id: string, fields: Partial<CatalogoInsumo>) => {
    if (fields.nombre) {
      const exist = catalogo.some(c => c.id !== id && c.nombre.trim().toLowerCase() === fields.nombre!.trim().toLowerCase());
      if (exist) {
        showAlert('Nombre Duplicado', 'Ya existe otro ingrediente con este nombre en el catálogo.');
        return false;
      }
    }
    const updated = catalogo.map(c => c.id === id ? { ...c, ...fields } : c);
    setCatalogo(updated);
    saveCatalogo(updated);
    
    // Sincronizar cambios del catálogo con insumos activos en el almacén
    const originalItem = catalogo.find(c => c.id === id);
    if (originalItem) {
      const updatedInsumos = insumos.map(ins => {
        if (ins.nombre.trim().toLowerCase() === originalItem.nombre.trim().toLowerCase()) {
          return {
            ...ins,
            nombre: fields.nombre || ins.nombre,
            unidadMedida: fields.unidadMedida || ins.unidadMedida
          };
        }
        return ins;
      });
      setInsumos(updatedInsumos);
      saveInsumos(updatedInsumos);
    }
    return true;
  };

  const handleDeleteCatalogoItem = (id: string) => {
    const item = catalogo.find(c => c.id === id);
    if (!item) return;

    const enUso = insumos.some(ins => ins.nombre.trim().toLowerCase() === item.nombre.trim().toLowerCase());
    if (enUso) {
      showAlert('Insumo en Uso', 'No puedes eliminar este insumo del catálogo porque está en uso en tu almacén.');
      return;
    }

    const updated = catalogo.filter(c => c.id !== id);
    setCatalogo(updated);
    saveCatalogo(updated);
  };

  // --- CONTROL DE INSUMOS ---
  const handleAddInsumo = (nuevoInsumo: Omit<Insumo, 'id' | 'costoUnitario'>, fechaCaducidad?: string) => {
    const id = `ins_` + Date.now();
    const costoUnitario = nuevoInsumo.precioCompraReciente / nuevoInsumo.cantidadCompraReciente;
    const stockInicial = nuevoInsumo.cantidadActual;
    const loteInicial: LoteInsumo = {
      id: `lote_` + Date.now(),
      cantidadInicial: stockInicial,
      cantidadRestante: stockInicial,
      precioCompraTotal: stockInicial * costoUnitario,
      costoUnitario: costoUnitario,
      fecha: new Date().toISOString(),
      fechaCaducidad: getFallbackCaducidad(fechaCaducidad)
    };
    const insumoCompleto: Insumo = {
      ...nuevoInsumo,
      id,
      costoUnitario,
      lotes: [loteInicial],
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
        let temp = { ...ins, ...fields };
        // Si se pasaron los lotes modificados directamente
        if (fields.lotes !== undefined) {
          temp = actualizarInsumoDesdeLotes(temp);
        }
        // Si se alteró la cantidadActual, ajustamos los lotes correspondientes
        else if (fields.cantidadActual !== undefined && fields.cantidadActual !== ins.cantidadActual) {
          const lotesAjustados = ajustarLotesPorStockManual(ins.lotes || [], fields.cantidadActual, ins.costoUnitario);
          temp.lotes = lotesAjustados;
          temp = actualizarInsumoDesdeLotes(temp);
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
  const handleRegistrarCompra = (insumoId: string, cantidad: number, precio: number, fechaCaducidad?: string) => {
    const updatedInsumos = insumos.map(ins => {
      if (ins.id === insumoId) {
        const lotesExistentes = ins.lotes || [];
        const nuevoCostoUnitario = precio / cantidad;
        const nuevoLote: LoteInsumo = {
          id: `lote_` + Date.now(),
          cantidadInicial: cantidad,
          cantidadRestante: cantidad,
          precioCompraTotal: precio,
          costoUnitario: nuevoCostoUnitario,
          fecha: new Date().toISOString(),
          fechaCaducidad: getFallbackCaducidad(fechaCaducidad)
        };

        const insumoConLotes = {
          ...ins,
          lotes: [...lotesExistentes, nuevoLote]
        };

        return actualizarInsumoDesdeLotes(insumoConLotes);
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

  // --- CIERRE DE VENTAS (CORTES DIARIOS MANUALES Y AUTOMÁTICOS) ---
  const handleRealizarCierre = (tipo: 'manual' | 'automatico'): { success: boolean; errorMsg?: string } => {
    const activeSales = ventas.filter(v => !v.cierreId);
    if (activeSales.length === 0) {
      return { success: false, errorMsg: 'No hay ventas activas para realizar el corte.' };
    }

    const cierreId = `cierre_${Date.now()}`;
    const totalVentas = activeSales.reduce((sum, v) => sum + v.precioVentaTotal, 0);
    const totalCosto = activeSales.reduce((sum, v) => sum + v.costoInsumosTotal, 0);
    const totalMargen = activeSales.reduce((sum, v) => sum + v.margenTotal, 0);
    const cantidadOperaciones = activeSales.length;

    const nuevoCierre: CierreVenta = {
      id: cierreId,
      fechaCierre: new Date().toISOString(),
      totalVentas,
      totalCosto,
      totalMargen,
      cantidadOperaciones,
      tipoCorte: tipo
    };

    const updatedVentas = ventas.map(v => {
      if (!v.cierreId) {
        return { ...v, cierreId };
      }
      return v;
    });

    const updatedCierres = [nuevoCierre, ...cierres];

    setVentas(updatedVentas);
    saveVentas(updatedVentas);
    setCierres(updatedCierres);
    saveCierres(updatedCierres);

    return { success: true };
  };

  const handleDeleteCierres = (ids: string[]) => {
    const updatedCierres = cierres.filter(c => !ids.includes(c.id));
    const updatedVentas = ventas.filter(v => !v.cierreId || !ids.includes(v.cierreId));

    setVentas(updatedVentas);
    saveVentas(updatedVentas);
    setCierres(updatedCierres);
    saveCierres(updatedCierres);
  };

  const handleSaveConfigCorte = (config: ConfiguracionCorte) => {
    setConfigCorte(config);
    saveConfigCorte(config);
  };

  // Temporizador para corte de ventas diario automático
  useEffect(() => {
    if (configCorte.tipo !== 'automatico') return;

    const interval = setInterval(() => {
      const activeSales = ventas.filter(v => !v.cierreId);
      if (activeSales.length === 0) return;

      const [hStr, mStr] = configCorte.horaAutomatica.split(':');
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      const now = new Date();

      const algunCortePasado = activeSales.some(sale => {
        const saleDate = new Date(sale.fecha);
        const cutoff = new Date(saleDate);
        cutoff.setHours(h, m, 0, 0);
        
        if (saleDate >= cutoff) {
          cutoff.setDate(cutoff.getDate() + 1);
        }
        
        return now >= cutoff;
      });

      if (algunCortePasado) {
        handleRealizarCierre('automatico');
        showAlert(
          'Corte Automático Realizado',
          'El sistema ha realizado el cierre de ventas diario de forma automática según el horario configurado.'
        );
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [configCorte, ventas, cierres]);

  const handleRegistrarVenta = (platilloId: string, cantidadVendida: number, force = false): { success: boolean; errorMsg?: string; warningInsumos?: string[] } => {
    const platillo = platillos.find(p => p.id === platilloId);
    if (!platillo) return { success: false, errorMsg: 'Platillo no encontrado.' };

    // 1. Validar Stock Suficiente de todos los insumos de la receta
    const faltantes: string[] = [];
    const warningInsumos: string[] = [];
    
    platillo.ingredientes.forEach(ingrediente => {
      const insumo = insumos.find(i => i.id === ingrediente.insumoId);
      if (!insumo) {
        faltantes.push(`Falta el insumo de la receta (ID: ${ingrediente.insumoId})`);
        return;
      }
      
      const cantidadRequerida = ingrediente.cantidad * cantidadVendida;
      if (insumo.cantidadActual < cantidadRequerida) {
        warningInsumos.push(insumo.nombre);
        const diferencia = cantidadRequerida - insumo.cantidadActual;
        faltantes.push(
          `${insumo.nombre} (Stock actual: ${insumo.cantidadActual.toLocaleString('es-MX')} ${insumo.unidadMedida}, requerido: ${cantidadRequerida.toLocaleString('es-MX')} ${insumo.unidadMedida}. Faltan ${diferencia.toLocaleString('es-MX')} ${insumo.unidadMedida})`
        );
      }
    });

    if (faltantes.length > 0 && !force) {
      return { 
        success: false, 
        warningInsumos,
        errorMsg: `No hay suficiente stock para completar esta venta:\n` + faltantes.join('\n') 
      };
    }

    // 2. Descontar Insumos Proporcionalmente del Almacén usando FIFO en tiempo real
    let costoInsumosTotal = 0;
    const tempInsumosMap = new Map<string, Insumo>();
    insumos.forEach(ins => tempInsumosMap.set(ins.id, { ...ins }));

    platillo.ingredientes.forEach(ingrediente => {
      const ins = tempInsumosMap.get(ingrediente.insumoId);
      if (ins) {
        const cantidadARestar = ingrediente.cantidad * cantidadVendida;
        const { updatedInsumo, costoConsumido } = consumirInsumoFIFO(ins, cantidadARestar);
        tempInsumosMap.set(ins.id, updatedInsumo);
        costoInsumosTotal += costoConsumido;
      }
    });

    const updatedInsumos = insumos.map(ins => tempInsumosMap.get(ins.id) || ins);
    setInsumos(updatedInsumos);
    saveInsumos(updatedInsumos);

    // 3. Registrar Operación Comercial con Margen Exacto
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

  // --- ANULAR VENTA (RESTAURACIÓN DE INVENTARIO FIFO O REGISTRO A PÉRDIDA) ---
  const handleAnularVenta = (ventaId: string, ingredientesPerdidos?: string[]) => {
    const venta = ventas.find(v => v.id === ventaId);
    if (!venta) return;

    const platillo = platillos.find(p => p.id === venta.platilloId);

    // Si el platillo o su receta todavía existen, restauramos los insumos
    if (platillo) {
      const updatedInsumos = insumos.map(ins => {
        const ingredienteReceta = platillo.ingredientes.find(ing => ing.insumoId === ins.id);
        if (ingredienteReceta) {
          // Si el ingrediente se echó a perder, no se restaura al inventario
          if (ingredientesPerdidos && ingredientesPerdidos.includes(ins.id)) {
            return ins;
          }
          const cantidadARestaurar = ingredienteReceta.cantidad * venta.cantidad;
          const lotesActuales = ins.lotes || [];
          let nuevosLotes = [...lotesActuales];
          if (nuevosLotes.length > 0) {
            nuevosLotes[0] = {
              ...nuevosLotes[0],
              cantidadRestante: nuevosLotes[0].cantidadRestante + cantidadARestaurar,
              cantidadInicial: nuevosLotes[0].cantidadInicial + cantidadARestaurar,
              precioCompraTotal: nuevosLotes[0].precioCompraTotal + (cantidadARestaurar * nuevosLotes[0].costoUnitario)
            };
          } else {
            nuevosLotes = [{
              id: `lote_restored_${Date.now()}`,
              cantidadInicial: cantidadARestaurar,
              cantidadRestante: cantidadARestaurar,
              precioCompraTotal: cantidadARestaurar * ins.costoUnitario,
              costoUnitario: ins.costoUnitario,
              fecha: new Date().toISOString(),
              fechaCaducidad: getFallbackCaducidad()
            }];
          }
          return actualizarInsumoDesdeLotes({
            ...ins,
            lotes: nuevosLotes
          });
        }
        return ins;
      });

      setInsumos(updatedInsumos);
      saveInsumos(updatedInsumos);
    } else {
      showAlert('Venta Anulada', 'Nota: El platillo original fue eliminado de las recetas de comida, por lo que el inventario no se modificó para evitar inconsistencias de fórmula. La venta se eliminó del historial contable.');
    }

    // Remover del historial
    const updatedVentas = ventas.filter(v => v.id !== ventaId);
    setVentas(updatedVentas);
    saveVentas(updatedVentas);
  };

  // Calcular cantidad de lotes próximos a vencer (vence en <= 2 días o ya vencido)
  const lotesPorCaducarCount = insumos.reduce((acc, ins) => {
    const lotesCaducando = (ins.lotes || []).filter(l => {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const fechaCaducidad = new Date(l.fechaCaducidad);
      fechaCaducidad.setHours(0, 0, 0, 0);
      const diffTime = fechaCaducidad.getTime() - hoy.getTime();
      const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diasRestantes <= 2;
    });
    return acc + lotesCaducando.length;
  }, 0);

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
            className={`flex items-center gap-2.5 py-3 px-4 rounded-xl text-sm font-semibold transition duration-200 whitespace-nowrap md:w-full border relative ${
              activeTab === 'insumos' 
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-500/15 border-orange-500/40' 
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60 border-transparent'
            }`}
          >
            <Package className="h-4.5 w-4.5" />
            <span className="flex-grow text-left">Almacén (Insumos)</span>
            {lotesPorCaducarCount > 0 && (
              <span 
                className="flex items-center justify-center bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse border border-rose-500/30"
                title={`${lotesPorCaducarCount} lote(s) cerca de caducar o vencidos`}
              >
                <AlertTriangle className="h-3 w-3 mr-0.5" />
                {lotesPorCaducarCount}
              </span>
            )}
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
              catalogo={catalogo}
              onAddInsumo={handleAddInsumo}
              onUpdateInsumo={handleUpdateInsumo}
              onDeleteInsumo={handleDeleteInsumo}
              onRegistrarCompra={handleRegistrarCompra}
              onAddCatalogoItem={handleAddCatalogoItem}
              onUpdateCatalogoItem={handleUpdateCatalogoItem}
              onDeleteCatalogoItem={handleDeleteCatalogoItem}
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
              cierres={cierres}
              configCorte={configCorte}
              onRegistrarVenta={handleRegistrarVenta}
              onAnularVenta={handleAnularVenta}
              onRealizarCierre={handleRealizarCierre}
              onDeleteCierres={handleDeleteCierres}
              onSaveConfigCorte={handleSaveConfigCorte}
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
          <p className="mt-1.5 text-[10px] text-slate-600 max-w-lg mx-auto leading-relaxed">Almacenamiento 100% local y seguro en tu aplicación. Sin bases de datos externas, manteniendo la privacidad absoluta de tus costos e ingresos.</p>
        </div>
      </footer>

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
