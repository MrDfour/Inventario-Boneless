import { Insumo, Platillo, Venta, CompraHistorial, CatalogoInsumo } from '../types';

const STORAGE_KEYS = {
  INSUMOS: 'boneless_inventario_insumos',
  PLATILLOS: 'boneless_inventario_platillos',
  VENTAS: 'boneless_inventario_ventas',
  COMPRAS: 'boneless_inventario_compras',
  CATALOGO: 'boneless_inventario_catalogo',
};

const CATALOGO_SEMILLA: CatalogoInsumo[] = [
  { id: 'cat_pollo', nombre: 'Pechuga de Pollo', unidadMedida: 'g', alertaMinimo: 1000 },
  { id: 'cat_salsa', nombre: 'Salsa Especial (Botella 5L)', unidadMedida: 'ml', alertaMinimo: 1500 },
  { id: 'cat_charola', nombre: 'Charolas de Servicio', unidadMedida: 'unidades', alertaMinimo: 10 },
  { id: 'cat_papas', nombre: 'Papas a la Francesa (Bolsa 2.5kg)', unidadMedida: 'g', alertaMinimo: 800 },
];

// Datos semilla basados en el ejemplo del usuario
const INSUMOS_SEMILLA: Insumo[] = [
  {
    id: 'insumo_pollo',
    nombre: 'Pechuga de Pollo',
    cantidadActual: 5000, // 5 kg en gramos
    unidadMedida: 'g',
    precioCompraReciente: 60,
    cantidadCompraReciente: 1000, // 1 kg (1000g)
    costoUnitario: 0.06, // $0.06 por gramo ($60 / 1000g)
    alertaMinimo: 1000, // Alerta si queda menos de 1 kg
  },
  {
    id: 'insumo_salsa',
    nombre: 'Salsa Especial (Botella 5L)',
    cantidadActual: 5000, // 5 litros en ml
    unidadMedida: 'ml',
    precioCompraReciente: 250,
    cantidadCompraReciente: 5000, // 5L (5000ml)
    costoUnitario: 0.05, // $0.05 por ml ($250 / 5000ml)
    alertaMinimo: 1500, // Alerta si queda menos de 1.5L
  },
  {
    id: 'insumo_charola',
    nombre: 'Charolas de Servicio',
    cantidadActual: 40, // 40 piezas
    unidadMedida: 'unidades',
    precioCompraReciente: 30,
    cantidadCompraReciente: 20, // paquete de 20 charolas
    costoUnitario: 1.5, // $1.5 por charola ($30 / 20)
    alertaMinimo: 10, // Alerta si quedan menos de 10 charolas
  },
  {
    id: 'insumo_papas',
    nombre: 'Papas a la Francesa (Bolsa 2.5kg)',
    cantidadActual: 2500, // 2.5 kg en gramos
    unidadMedida: 'g',
    precioCompraReciente: 110,
    cantidadCompraReciente: 2500,
    costoUnitario: 0.044, // $0.044 por gramo ($110 / 2500g)
    alertaMinimo: 800,
  },
];

const PLATILLOS_SEMILLA: Platillo[] = [
  {
    id: 'platillo_combo_simple',
    nombre: 'Combo Boneless Simple',
    precioVenta: 120,
    ingredientes: [
      { insumoId: 'insumo_pollo', cantidad: 200 }, // 200 gramos
      { insumoId: 'insumo_salsa', cantidad: 30 },  // 30 ml
      { insumoId: 'insumo_charola', cantidad: 1 },  // 1 charola
    ],
  },
  {
    id: 'platillo_combo_grande',
    nombre: 'Combo Boneless Especial con Papas',
    precioVenta: 180,
    ingredientes: [
      { insumoId: 'insumo_pollo', cantidad: 350 }, // 350 gramos
      { insumoId: 'insumo_salsa', cantidad: 50 },  // 50 ml
      { insumoId: 'insumo_charola', cantidad: 1 },  // 1 charola
      { insumoId: 'insumo_papas', cantidad: 150 }, // 150 gramos de papas
    ],
  },
];

const VENTAS_SEMILLA: Venta[] = [
  {
    id: 'v_1',
    platilloId: 'platillo_combo_simple',
    platilloNombre: 'Combo Boneless Simple',
    cantidad: 2,
    precioVentaUnitario: 120,
    precioVentaTotal: 240,
    costoInsumosTotal: 30.0, // (200g pollo @ 0.06 + 30ml salsa @ 0.05 + 1 charola @ 1.5) * 2 = (12 + 1.5 + 1.5) * 2 = 15 * 2 = 30
    margenTotal: 210,
    fecha: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(), // hace 36 horas
  },
  {
    id: 'v_2',
    platilloId: 'platillo_combo_grande',
    platilloNombre: 'Combo Boneless Especial con Papas',
    cantidad: 1,
    precioVentaUnitario: 180,
    precioVentaTotal: 180,
    costoInsumosTotal: 26.6, // (350g pollo @ 0.06 + 50ml salsa @ 0.05 + 1 charola @ 1.5 + 150g papas @ 0.044) = 21 + 2.5 + 1.5 + 6.6 = 31.6
    margenTotal: 148.4,
    fecha: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // hace 24 horas
  },
  {
    id: 'v_3',
    platilloId: 'platillo_combo_simple',
    platilloNombre: 'Combo Boneless Simple',
    cantidad: 3,
    precioVentaUnitario: 120,
    precioVentaTotal: 360,
    costoInsumosTotal: 45.0, // 15 * 3 = 45
    margenTotal: 315,
    fecha: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // hace 2 horas
  },
];

const COMPRAS_SEMILLA: CompraHistorial[] = [
  {
    id: 'c_1',
    insumoId: 'insumo_pollo',
    insumoNombre: 'Pechuga de Pollo',
    cantidadComprada: 5000,
    precioPagado: 300,
    fecha: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c_2',
    insumoId: 'insumo_salsa',
    insumoNombre: 'Salsa Especial (Botella 5L)',
    cantidadComprada: 5000,
    precioPagado: 250,
    fecha: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function loadInsumos(): Insumo[] {
  const data = localStorage.getItem(STORAGE_KEYS.INSUMOS);
  let list: Insumo[] = [];
  if (!data) {
    list = INSUMOS_SEMILLA;
    saveInsumos(list);
  } else {
    list = JSON.parse(data);
  }

  // Asegurar que todos los insumos tengan la lista de lotes (FIFO) inicializada
  let modificado = false;
  const listConLotes = list.map(ins => {
    if (!ins.lotes || ins.lotes.length === 0) {
      modificado = true;
      return {
        ...ins,
        lotes: [{
          id: `lote_init_${ins.id}_${Date.now()}`,
          cantidadInicial: ins.cantidadActual,
          cantidadRestante: ins.cantidadActual,
          precioCompraTotal: ins.cantidadActual * ins.costoUnitario,
          costoUnitario: ins.costoUnitario,
          fecha: new Date().toISOString()
        }]
      };
    }
    return ins;
  });

  if (modificado) {
    saveInsumos(listConLotes);
  }

  return listConLotes;
}

export function saveInsumos(insumos: Insumo[]): void {
  localStorage.setItem(STORAGE_KEYS.INSUMOS, JSON.stringify(insumos));
}

export function loadCatalogo(): CatalogoInsumo[] {
  const data = localStorage.getItem(STORAGE_KEYS.CATALOGO);
  if (!data) {
    saveCatalogo(CATALOGO_SEMILLA);
    return CATALOGO_SEMILLA;
  }
  return JSON.parse(data);
}

export function saveCatalogo(catalogo: CatalogoInsumo[]): void {
  localStorage.setItem(STORAGE_KEYS.CATALOGO, JSON.stringify(catalogo));
}

export function loadPlatillos(): Platillo[] {
  const data = localStorage.getItem(STORAGE_KEYS.PLATILLOS);
  if (!data) {
    savePlatillos(PLATILLOS_SEMILLA);
    return PLATILLOS_SEMILLA;
  }
  return JSON.parse(data);
}

export function savePlatillos(platillos: Platillo[]): void {
  localStorage.setItem(STORAGE_KEYS.PLATILLOS, JSON.stringify(platillos));
}

export function loadVentas(): Venta[] {
  const data = localStorage.getItem(STORAGE_KEYS.VENTAS);
  if (!data) {
    saveVentas(VENTAS_SEMILLA);
    return VENTAS_SEMILLA;
  }
  return JSON.parse(data);
}

export function saveVentas(ventas: Venta[]): void {
  localStorage.setItem(STORAGE_KEYS.VENTAS, JSON.stringify(ventas));
}

export function loadCompras(): CompraHistorial[] {
  const data = localStorage.getItem(STORAGE_KEYS.COMPRAS);
  if (!data) {
    saveCompras(COMPRAS_SEMILLA);
    return COMPRAS_SEMILLA;
  }
  return JSON.parse(data);
}

export function saveCompras(compras: CompraHistorial[]): void {
  localStorage.setItem(STORAGE_KEYS.COMPRAS, JSON.stringify(compras));
}

export function clearAllStorage(): void {
  localStorage.removeItem(STORAGE_KEYS.INSUMOS);
  localStorage.removeItem(STORAGE_KEYS.PLATILLOS);
  localStorage.removeItem(STORAGE_KEYS.VENTAS);
  localStorage.removeItem(STORAGE_KEYS.COMPRAS);
  localStorage.removeItem(STORAGE_KEYS.CATALOGO);
  window.location.reload();
}

export function exportDataAsJSON(): string {
  const data = {
    insumos: loadInsumos(),
    platillos: loadPlatillos(),
    ventas: loadVentas(),
    compras: loadCompras(),
    catalogo: loadCatalogo(),
    exportDate: new Date().toISOString()
  };
  return JSON.stringify(data, null, 2);
}

export function importDataFromJSON(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data.insumos && data.platillos && data.ventas && data.compras) {
      saveInsumos(data.insumos);
      savePlatillos(data.platillos);
      saveVentas(data.ventas);
      saveCompras(data.compras);
      if (data.catalogo) {
        saveCatalogo(data.catalogo);
      }
      return true;
    }
    return false;
  } catch (e) {
    console.error('Error al importar datos:', e);
    return false;
  }
}
