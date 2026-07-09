import React, { useRef, useState } from 'react';
import { Insumo, Venta, CompraHistorial } from '../types';
import { 
  FileText, 
  Download, 
  Upload, 
  Copy, 
  Check, 
  Trash2, 
  Layers, 
  Info,
  DollarSign,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { 
  exportDataAsJSON, 
  importDataFromJSON, 
  clearAllStorage 
} from '../utils/storage';

interface ReportesPanelProps {
  insumos: Insumo[];
  ventas: Venta[];
  compras: CompraHistorial[];
  onDataImported: () => void;
}

export default function ReportesPanel({ insumos, ventas, compras, onDataImported }: ReportesPanelProps) {
  const [copiadoContable, setCopiadoContable] = useState(false);
  const [errorImport, setErrorImport] = useState<string | null>(null);
  const [exitoImport, setExitoImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cálculos contables
  const valorInventarioFinalActual = insumos.reduce((acc, i) => acc + (i.cantidadActual * i.costoUnitario), 0);
  const totalComprasRealizadas = compras.reduce((acc, c) => acc + c.precioPagado, 0);
  const totalCostoVendido = ventas.reduce((acc, v) => acc + v.costoInsumosTotal, 0);
  const totalIngresos = ventas.reduce((acc, v) => acc + v.precioVentaTotal, 0);
  const margenDineroTotal = totalIngresos - totalCostoVendido;
  const margenPorcentajeTotal = totalIngresos > 0 ? (margenDineroTotal / totalIngresos) * 100 : 0;

  // Inventario Inicial Teórico = Inventario Final + Costo de lo Vendido - Compras
  const inventarioInicialTeorico = Math.max(0, valorInventarioFinalActual + totalCostoVendido - totalComprasRealizadas);

  // Exportar a CSV de Ventas
  const handleExportCSVVentas = () => {
    if (ventas.length === 0) {
      alert('No hay ventas registradas para exportar.');
      return;
    }
    
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'ID Venta,Fecha,Platillo,Cantidad,Precio Venta Unitario,Ingreso Total,Costo Insumos Total,Ganancia Neta\n';
    
    ventas.forEach(v => {
      const fila = [
        v.id,
        new Date(v.fecha).toLocaleString('es-MX'),
        `"${v.platilloNombre.replace(/"/g, '""')}"`,
        v.cantidad,
        v.precioVentaUnitario,
        v.precioVentaTotal,
        v.costoInsumosTotal,
        v.margenTotal
      ].join(',');
      csvContent += fila + '\n';
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_ventas_boneless_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Exportar a CSV de Insumos (Almacén actual)
  const handleExportCSVInsumos = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Insumo,Stock Actual,Unidad de Medida,Costo Unitario ($),Valor Total en Dinero ($)\n';
    
    insumos.forEach(i => {
      const valorDinero = i.cantidadActual * i.costoUnitario;
      const fila = [
        `"${i.nombre.replace(/"/g, '""')}"`,
        i.cantidadActual,
        i.unidadMedida,
        i.costoUnitario.toFixed(4),
        valorDinero.toFixed(2)
      ].join(',');
      csvContent += fila + '\n';
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventario_almacen_boneless_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Descargar respaldo JSON
  const handleDownloadJSON = () => {
    const dataStr = exportDataAsJSON();
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `respaldo_inventario_boneless_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Importar respaldo JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorImport(null);
    setExitoImport(false);
    
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        const success = importDataFromJSON(result);
        if (success) {
          setExitoImport(true);
          onDataImported();
          if (fileInputRef.current) fileInputRef.current.value = '';
        } else {
          setErrorImport('El archivo no tiene el formato de respaldo correcto o está corrupto.');
        }
      }
    };
    fileReader.readAsText(file);
  };

  // Copiar asiento contable al portapapeles
  const handleCopiarAsientoContable = () => {
    const texto = `=== RESUMEN DE INVENTARIOS PARA ESTADO DE RESULTADOS ===
Fecha de Generación: ${new Date().toLocaleString('es-MX')}

VALORACIÓN DEL ALMACÉN (A costo de adquisición):
• Inventario Inicial Estimado: $${inventarioInicialTeorico.toFixed(2)} MXN
• (+) Compras de Insumos del Periodo: $${totalComprasRealizadas.toFixed(2)} MXN
• (-) Costo de lo Vendido (Materia Prima): $${totalCostoVendido.toFixed(2)} MXN
======================================================
• (=) INVENTARIO FINAL EN DINERO: $${valorInventarioFinalActual.toFixed(2)} MXN

MÁRGENES DE OPERACIÓN COMERCIAL:
• Ingresos de Venta Totales: $${totalIngresos.toFixed(2)} MXN
• Costo Proporcional de Insumos: $${totalCostoVendido.toFixed(2)} MXN
• GANANCIA BRUTA DE OPERACIÓN: $${margenDineroTotal.toFixed(2)} MXN
• MARGEN DE UTILIDAD BRUTA: ${margenPorcentajeTotal.toFixed(1)}%`;

    navigator.clipboard.writeText(texto);
    setCopiadoContable(true);
    setTimeout(() => setCopiadoContable(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="reportes-panel-view">
      {/* Grid Superior: Reporte de Inventario y Utilidades */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reporte de Inventarios Contables */}
        <div className="lg:col-span-2 bg-slate-900 rounded-2xl border border-slate-800/80 shadow-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800/60 pb-3 gap-2">
            <div>
              <h2 className="text-xl font-sans font-extrabold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-400" /> Resumen Contable de Inventarios
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Datos clave del periodo listos para ingresar en tus libros de contabilidad.</p>
            </div>
            <button
              onClick={handleCopiarAsientoContable}
              className="bg-slate-800 hover:bg-slate-755 border border-slate-700 text-slate-200 text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition self-start"
            >
              {copiadoContable ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" /> Copiado
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copiar Resumen
                </>
              )}
            </button>
          </div>

          {/* Tabla Contable: Conciliación de Almacén */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
            <div className="divide-y divide-slate-800 text-sm">
              {/* Inventario Inicial */}
              <div className="flex justify-between p-4 bg-slate-900/20 hover:bg-slate-900/40 transition text-slate-300">
                <div>
                  <span className="font-semibold text-slate-200 block">Inventario Inicial Estimado</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">Valor del almacén al inicio del periodo</span>
                </div>
                <span className="font-mono font-bold text-slate-100">${inventarioInicialTeorico.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              {/* Compras */}
              <div className="flex justify-between p-4 bg-slate-900/20 hover:bg-slate-900/40 transition text-slate-300">
                <div>
                  <span className="font-semibold text-slate-200 block">(+) Compras de Insumos</span>
                  <span className="text-[10px] text-emerald-500 block mt-0.5 font-mono">Gasto registrado en adquisición de mercancía</span>
                </div>
                <span className="font-mono font-bold text-emerald-400">+${totalComprasRealizadas.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              {/* Costo de lo vendido */}
              <div className="flex justify-between p-4 bg-slate-900/20 hover:bg-slate-900/40 transition text-slate-300">
                <div>
                  <span className="font-semibold text-slate-200 block">(-) Costo de lo Vendido (Materia Prima)</span>
                  <span className="text-[10px] text-rose-500 block mt-0.5 font-mono">Costo de ingredientes mermados proporcionalmente en ventas</span>
                </div>
                <span className="font-mono font-bold text-rose-400">-${totalCostoVendido.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              {/* Inventario Final */}
              <div className="flex justify-between p-4 bg-orange-950/10 border-t-2 border-orange-900/30 text-white">
                <div>
                  <span className="font-bold text-orange-400 block">(=) Inventario Final en Almacén</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">Valor en dinero que debe coincidir con tu balance para el Estado de Resultados</span>
                </div>
                <span className="font-mono font-extrabold text-white text-base">${valorInventarioFinalActual.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="bg-orange-950/20 border border-orange-900/30 p-4 rounded-xl flex gap-2 text-xs text-slate-200">
            <Info className="h-4.5 w-4.5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-orange-400">¿Cómo usar este reporte en tu contabilidad?</span> Cuando vayas a armar tu <span className="font-semibold text-white">Estado de Resultados</span>, el valor de <span className="font-bold text-white">"${valorInventarioFinalActual.toFixed(2)}"</span> representa el inventario final de mercancías en el balance. El <span className="font-bold text-white">"${totalCostoVendido.toFixed(2)}"</span> es la deducción por materia prima en tu costo de ventas.
            </div>
          </div>
        </div>

        {/* Resumen de Rentabilidad Comercial */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800/80 shadow-xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-lg font-sans font-extrabold text-white pb-3 border-b border-slate-800/60 flex items-center gap-1.5">
              <TrendingUp className="h-5 w-5 text-orange-400" /> Rendimiento de Ventas
            </h3>

            <div className="space-y-4 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="font-sans font-semibold text-slate-400">Ingresos Brutos:</span>
                <span className="font-bold text-white text-sm">${totalIngresos.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-sans font-semibold text-slate-400">Costo total de materia prima:</span>
                <span className="font-bold text-rose-400 text-sm">-${totalCostoVendido.toFixed(2)}</span>
              </div>

              <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
                <span className="font-sans text-xs font-bold text-white">Ganancia Bruta Neta:</span>
                <span className="font-bold text-emerald-400 text-base">+${margenDineroTotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-sans font-semibold text-slate-400">Margen de utilidad promedio:</span>
                <span className="font-bold text-orange-400 text-sm">{margenPorcentajeTotal.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/60 pt-5 mt-6 space-y-2">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Exportar Reportes a Excel</h4>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportCSVVentas}
                className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-400" /> Ventas (CSV)
              </button>
              <button
                onClick={handleExportCSVInsumos}
                className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <FileSpreadsheet className="h-4 w-4 text-orange-400" /> Almacén (CSV)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Panel de Respaldo y Mantenimiento Local */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800/80 p-6 shadow-xl">
        <h3 className="font-sans font-extrabold text-white pb-3 border-b border-slate-800/60">
          Mantenimiento de Datos (Respaldo Local)
        </h3>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          Dado que este programa funciona localmente en tu navegador para que no necesite servidores ni mantenimiento complejo, tus datos se guardan en el historial del navegador. <span className="font-bold text-slate-300">Te recomendamos descargar un respaldo periódicamente</span> o cuando quieras cambiar de computadora.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {/* Descargar Respaldo */}
          <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                <Download className="h-4 w-4 text-emerald-400" /> Descargar Copia de Seguridad
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">Guarda una copia de todos tus insumos, recetas y ventas en un archivo en tu computadora.</p>
            </div>
            <button
              onClick={handleDownloadJSON}
              className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
            >
              <Download className="h-3.5 w-3.5" /> Descargar Respaldo (.json)
            </button>
          </div>

          {/* Importar Respaldo */}
          <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                <Upload className="h-4 w-4 text-orange-400" /> Restaurar Copia de Seguridad
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">Sube un archivo de respaldo descargado previamente para recuperar todos tus datos.</p>
            </div>
            
            <div className="mt-4 space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleImportJSON}
                className="hidden"
                id="file-import-input"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Upload className="h-3.5 w-3.5" /> Seleccionar Archivo (.json)
              </button>

              {exitoImport && (
                <p className="text-[10px] text-emerald-400 font-bold text-center">¡Datos importados con éxito! Cargando...</p>
              )}
              {errorImport && (
                <p className="text-[10px] text-rose-400 font-bold text-center">{errorImport}</p>
              )}
            </div>
          </div>

          {/* Empezar de Cero */}
          <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                <Trash2 className="h-4 w-4 text-rose-500" /> Resetear Base de Datos Local
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">Borra toda la información ingresada y restaura los ejemplos iniciales de comida.</p>
            </div>
            <button
              onClick={() => {
                if (confirm('¡CUIDADO! Esta acción borrará permanentemente todo tu inventario, platillos y ventas registrados. ¿Estás seguro de que deseas continuar?')) {
                  clearAllStorage();
                  window.location.reload();
                }
              }}
              className="mt-4 w-full bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-400 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
            >
              <Trash2 className="h-3.5 w-3.5" /> Borrar todo e iniciar ejemplos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
