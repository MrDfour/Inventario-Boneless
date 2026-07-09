export interface LoteInsumo {
  id: string;
  cantidadInicial: number; // cantidad original comprada en este lote
  cantidadRestante: number; // cantidad que queda disponible
  precioCompraTotal: number; // costo total pagado por este lote
  costoUnitario: number; // precioCompraTotal / cantidadInicial
  fecha: string; // ISO string
}

export interface CatalogoInsumo {
  id: string;
  nombre: string;
  unidadMedida: 'g' | 'ml' | 'unidades' | 'piezas';
  alertaMinimo: number;
}

export interface Insumo {
  id: string;
  nombre: string;
  cantidadActual: number; // en la unidad base (ej: 800g, 3500ml, 15 unidades)
  unidadMedida: 'g' | 'ml' | 'unidades' | 'piezas'; // unidades estándar para simplificar recetas
  precioCompraReciente: number; // precio total de la última compra
  cantidadCompraReciente: number; // cantidad comprada en la última compra (ej: 1000g, 5000ml, 20 unidades)
  costoUnitario: number; // precioCompraReciente / cantidadCompraReciente (costo por gramo, ml o unidad)
  alertaMinimo: number; // nivel de stock mínimo en la unidad base para activar alertas
  lotes?: LoteInsumo[]; // FIFO lotes queue
}

export interface IngredienteReceta {
  insumoId: string;
  cantidad: number; // cantidad requerida del insumo en la unidad base
}

export interface Platillo {
  id: string;
  nombre: string;
  precioVenta: number;
  ingredientes: IngredienteReceta[];
}

export interface Venta {
  id: string;
  platilloId: string;
  platilloNombre: string;
  cantidad: number;
  precioVentaUnitario: number;
  precioVentaTotal: number;
  costoInsumosTotal: number;
  margenTotal: number; // precioVentaTotal - costoInsumosTotal
  fecha: string; // ISO string
}

export interface CompraHistorial {
  id: string;
  insumoId: string;
  insumoNombre: string;
  cantidadComprada: number; // ej: 1000 (g), 5000 (ml)
  precioPagado: number; // ej: $60, $250
  fecha: string;
}

export interface InventarioHistorialReporte {
  fecha: string;
  valorTotalInsumos: number;
  comprasPeriodo: number;
  costoVendidoPeriodo: number;
}
