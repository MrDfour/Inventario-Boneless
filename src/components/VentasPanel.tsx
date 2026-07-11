import React, { useState } from 'react';
import { Insumo, Platillo, Venta, CierreVenta, ConfiguracionCorte } from '../types';
import { 
  Plus, 
  Trash2, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  TrendingUp,
  RotateCcw,
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  Settings,
  Archive,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CustomDialog } from './CustomDialog';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import { jsPDF } from 'jspdf';

interface VentasPanelProps {
  ventas: Venta[];
  platillos: Platillo[];
  insumos: Insumo[];
  cierres: CierreVenta[];
  configCorte: ConfiguracionCorte;
  onRegistrarVenta: (platilloId: string, cantidad: number, force?: boolean) => { success: boolean; errorMsg?: string; warningInsumos?: string[] };
  onAnularVenta: (ventaId: string, ingredientesPerdidos?: string[]) => void;
  onRealizarCierre: (tipo: 'manual' | 'automatico') => { success: boolean; errorMsg?: string };
  onDeleteCierres: (ids: string[]) => void;
  onSaveConfigCorte: (config: ConfiguracionCorte) => void;
}

export default function VentasPanel({ 
  ventas, 
  platillos, 
  insumos, 
  cierres,
  configCorte,
  onRegistrarVenta, 
  onAnularVenta,
  onRealizarCierre,
  onDeleteCierres,
  onSaveConfigCorte
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

  // Estados para archivo de cierres
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [selectedCierres, setSelectedCierres] = useState<string[]>([]);
  const [expandedCierreId, setExpandedCierreId] = useState<string | null>(null);

  // Estados para el modal de pérdida de cocina
  const [lossModalConfig, setLossModalConfig] = useState<{
    isOpen: boolean;
    venta: Venta | null;
    tipoPerdida: 'total' | 'parcial' | null;
    ingredientesSeleccionados: string[];
  }>({
    isOpen: false,
    venta: null,
    tipoPerdida: null,
    ingredientesSeleccionados: []
  });

  const handleVentaAPerdidaClick = (venta: Venta) => {
    setLossModalConfig({
      isOpen: true,
      venta,
      tipoPerdida: null,
      ingredientesSeleccionados: []
    });
  };

  const handleConfirmLossTotal = () => {
    if (!lossModalConfig.venta) return;
    const v = lossModalConfig.venta;
    const platillo = platillos.find(p => p.id === v.platilloId);
    const allIngs = platillo ? platillo.ingredientes.map(i => i.insumoId) : [];
    
    onAnularVenta(v.id, allIngs);
    setLossModalConfig({ isOpen: false, venta: null, tipoPerdida: null, ingredientesSeleccionados: [] });
    showAlert('Pérdida Registrada', 'La venta fue cancelada y ningún ingrediente regresó al almacén (Pérdida Total).');
  };

  const handleConfirmLossParcial = () => {
    if (!lossModalConfig.venta) return;
    const v = lossModalConfig.venta;
    
    onAnularVenta(v.id, lossModalConfig.ingredientesSeleccionados);
    setLossModalConfig({ isOpen: false, venta: null, tipoPerdida: null, ingredientesSeleccionados: [] });
    showAlert('Pérdida Parcial Registrada', 'La venta fue cancelada. Los ingredientes marcados se perdieron permanentemente, y el resto regresó al almacén con éxito.');
  };

  // Filtramos las ventas activas (sin cerrar)
  const activeVentas = ventas.filter(v => !v.cierreId);

  const handleToggleSelectAll = () => {
    if (selectedCierres.length === cierres.length) {
      setSelectedCierres([]);
    } else {
      setSelectedCierres(cierres.map(c => c.id));
    }
  };

  const handleToggleExpand = (id: string) => {
    setExpandedCierreId(expandedCierreId === id ? null : id);
  };

  const handleToggleSelect = (id: string) => {
    if (selectedCierres.includes(id)) {
      setSelectedCierres(selectedCierres.filter(cid => cid !== id));
    } else {
      setSelectedCierres([...selectedCierres, id]);
    }
  };

  const handleCorteManualSubmit = () => {
    if (activeVentas.length === 0) return;
    showConfirm(
      'Cierre de Caja',
      '¿Estás seguro de que quieres realizar el corte de caja? Esto archivará las ventas activas actuales y reiniciará el historial a cero.',
      () => {
        const res = onRealizarCierre('manual');
        if (res.success) {
          showAlert('Corte Completado', 'El corte de caja se realizó con éxito y se archivó en el registro histórico.');
        } else {
          showAlert('Error', res.errorMsg || 'No se pudo realizar el corte.');
        }
      }
    );
  };

  const handleSingleDelete = (cierre: CierreVenta) => {
    showConfirm(
      'Borrar Corte',
      `¿Estás seguro de que deseas eliminar el corte del ${new Date(cierre.fechaCierre).toLocaleString()}? Esta acción es irreversible y borrará también las ventas asociadas del reporte contable.`,
      () => {
        onDeleteCierres([cierre.id]);
        setSelectedCierres(selectedCierres.filter(id => id !== cierre.id));
        showAlert('Corte Eliminado', 'El corte de caja seleccionado y sus ventas asociadas se eliminaron de forma permanente.');
      },
      true
    );
  };

  const handleDeleteSelectedCierres = () => {
    if (selectedCierres.length === 0) return;
    showConfirm(
      'Borrar Cortes Seleccionados',
      `¿Estás seguro de que deseas eliminar los ${selectedCierres.length} cortes de caja seleccionados? Esta acción es totalmente irreversible y eliminará todos sus registros de ventas del reporte contable.`,
      () => {
        onDeleteCierres(selectedCierres);
        setSelectedCierres([]);
        showAlert('Cortes Eliminados', 'Los cortes de caja seleccionados y sus ventas asociadas se eliminaron de forma permanente.');
      },
      true
    );
  };

  const generateCSVContent = (cids: string[]): string => {
    const selectedList = cierres.filter(c => cids.includes(c.id));
    let csv = '';
    
    csv += 'REPORTE HISTORICO DE CORTES DE CAJA DIARIOS\n';
    csv += `Generado el: ,${new Date().toLocaleString()}\n\n`;
    
    selectedList.forEach(cierre => {
      csv += '================================================================================\n';
      csv += `CORTE ID: ,${cierre.id},Fecha Corte: ,${new Date(cierre.fechaCierre).toLocaleString()},Tipo Corte: ,${cierre.tipoCorte}\n`;
      csv += `Operaciones: ,${cierre.cantidadOperaciones},Total Ventas: ,$${cierre.totalVentas.toFixed(2)},Total Costo Insumos: ,$${cierre.totalCosto.toFixed(2)},Margen Neto: ,$${cierre.totalMargen.toFixed(2)}\n`;
      csv += '================================================================================\n';
      
      const sales = ventas.filter(v => v.cierreId === cierre.id);
      if (sales.length > 0) {
        csv += 'ID Venta,Platillo,Cantidad,Precio Venta Unitario,Precio Venta Total,Costo Insumos Total,Margen Total,Fecha Venta\n';
        sales.forEach(sale => {
          csv += `"${sale.id}","${sale.platilloNombre}",${sale.cantidad},${sale.precioVentaUnitario.toFixed(2)},${sale.precioVentaTotal.toFixed(2)},${sale.costoInsumosTotal.toFixed(2)},${sale.margenTotal.toFixed(2)},"${new Date(sale.fecha).toLocaleString()}"\n`;
        });
      } else {
        csv += 'No hay ventas asociadas a este corte.\n';
      }
      csv += '\n\n';
    });
    
    return csv;
  };

  const triggerExportCSV = async (fileName: string, csvContent: string) => {
    if (Capacitor.getPlatform() !== 'web') {
      try {
        const writeResult = await Filesystem.writeFile({
          path: fileName,
          data: csvContent,
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        });
        
        await FileOpener.open({
          filePath: writeResult.uri,
          contentType: 'text/csv'
        });
      } catch (err: any) {
        console.error('Error al guardar y abrir CSV en Android:', err);
        showAlert('Error al exportar', `No se pudo abrir el archivo en tu dispositivo: ${err.message || err}`);
      }
    } else {
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const triggerExportPDF = async (cids: string[]) => {
    const doc = new jsPDF();
    let isFirstPage = true;
    const selectedList = cierres.filter(c => cids.includes(c.id));
    
    selectedList.forEach((cierre, index) => {
      if (!isFirstPage) {
        doc.addPage();
      }
      isFirstPage = false;
      
      // Título de la página
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(249, 115, 22); // Color naranja
      doc.text('INVENTARIO BONELESS - REPORTE DE CORTE DE CAJA', 14, 20);
      doc.setDrawColor(249, 115, 22);
      doc.line(14, 23, 195, 23);
      
      // Detalles del Corte
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.setFont('Helvetica', 'bold');
      doc.text(`ID Corte:`, 14, 32);
      doc.setFont('Helvetica', 'normal');
      doc.text(cierre.id, 35, 32);
      
      doc.setFont('Helvetica', 'bold');
      doc.text(`Fecha de Cierre:`, 14, 38);
      doc.setFont('Helvetica', 'normal');
      doc.text(new Date(cierre.fechaCierre).toLocaleString('es-MX'), 45, 38);
      
      doc.setFont('Helvetica', 'bold');
      doc.text(`Tipo de Corte:`, 14, 44);
      doc.setFont('Helvetica', 'normal');
      doc.text(cierre.tipoCorte === 'manual' ? 'Manual' : 'Automático', 42, 44);
      
      // Recuadro de Resumen Financiero
      doc.setFillColor(248, 250, 252); // gris claro
      doc.rect(14, 52, 181, 26, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Resumen Financiero:', 18, 59);
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Operaciones: ${cierre.cantidadOperaciones}`, 18, 67);
      doc.text(`Ventas Totales: $${cierre.totalVentas.toFixed(2)}`, 65, 67);
      doc.text(`Costo Insumos: $${cierre.totalCosto.toFixed(2)}`, 115, 67);
      doc.setFont('Helvetica', 'bold');
      doc.text(`Margen Neto: $${cierre.totalMargen.toFixed(2)} (${(cierre.totalVentas > 0 ? (cierre.totalMargen / cierre.totalVentas * 100) : 0).toFixed(1)}%)`, 18, 73);
      
      // Tabla de Ventas
      doc.setFontSize(11);
      doc.setFont('Helvetica', 'bold');
      doc.text('Detalle de Ventas del Corte:', 14, 90);
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 93, 195, 93);
      
      // Headers
      doc.setFontSize(9);
      doc.text('Platillo', 14, 98);
      doc.text('Cant.', 85, 98);
      doc.text('Precio U.', 105, 98);
      doc.text('Total Venta', 130, 98);
      doc.text('Costo', 155, 98);
      doc.text('Margen', 175, 98);
      doc.line(14, 100, 195, 100);
      
      let y = 106;
      doc.setFont('Helvetica', 'normal');
      const sales = ventas.filter(v => v.cierreId === cierre.id);
      
      sales.forEach(sale => {
        if (y > 270) {
          doc.addPage();
          y = 20;
          doc.setFont('Helvetica', 'bold');
          doc.text('Platillo', 14, y);
          doc.text('Cant.', 85, y);
          doc.text('Precio U.', 105, y);
          doc.text('Total Venta', 130, y);
          doc.text('Costo', 155, y);
          doc.text('Margen', 175, y);
          doc.line(14, y + 2, 195, y + 2);
          y += 8;
          doc.setFont('Helvetica', 'normal');
        }
        
        doc.text(sale.platilloNombre.substring(0, 32), 14, y);
        doc.text(sale.cantidad.toString(), 85, y);
        doc.text(`$${sale.precioVentaUnitario.toFixed(2)}`, 105, y);
        doc.text(`$${sale.precioVentaTotal.toFixed(2)}`, 130, y);
        doc.text(`$${sale.costoInsumosTotal.toFixed(2)}`, 155, y);
        doc.text(`$${sale.margenTotal.toFixed(2)}`, 175, y);
        y += 6;
      });
    });

    const fileName = `cierre_ventas_${Date.now()}.pdf`;

    if (Capacitor.getPlatform() !== 'web') {
      try {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        const writeResult = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Cache
        });

        await FileOpener.open({
          filePath: writeResult.uri,
          contentType: 'application/pdf'
        });
      } catch (err: any) {
        console.error('Error al guardar y abrir PDF en Android:', err);
        showAlert('Error al exportar', `No se pudo abrir el archivo en tu dispositivo: ${err.message || err}`);
      }
    } else {
      doc.save(fileName);
    }
  };

  const handleExportExcel = () => {
    const csvContent = generateCSVContent(selectedCierres);
    const fileName = `cierre_ventas_${Date.now()}.csv`;
    triggerExportCSV(fileName, csvContent);
  };

  const handleExportPDF = () => {
    triggerExportPDF(selectedCierres);
  };

  const handleSingleExport = (cierre: CierreVenta, type: 'excel' | 'pdf') => {
    if (type === 'excel') {
      const csvContent = generateCSVContent([cierre.id]);
      const fileName = `cierre_${cierre.id}.csv`;
      triggerExportCSV(fileName, csvContent);
    } else {
      triggerExportPDF([cierre.id]);
    }
  };

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

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    isDestructive = false,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar'
  ) => {
    setDialogConfig({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      confirmText,
      cancelText,
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
      if (res.warningInsumos && res.warningInsumos.length > 0) {
        const insumosList = res.warningInsumos.join(', ');
        showConfirm(
          'Advertencia de Inventario',
          `Advertencia, la venta contiene ${insumosList} el cual no cuenta con inventario. ¿Desea proceder?`,
          () => {
            const forceRes = onRegistrarVenta(selectedPlatilloId, cantidadVenta, true);
            if (forceRes.success) {
              const platillo = platillos.find(p => p.id === selectedPlatilloId);
              setMensajeExito(`¡Venta registrada con éxito! Se vendió un platillo de $${((platillo?.precioVenta || 0) * cantidadVenta).toFixed(2)}.`);
              setSelectedPlatilloId('');
              setCantidadVenta(1);
              setTimeout(() => {
                setMensajeExito(null);
              }, 5000);
            } else {
              setMensajeError(forceRes.errorMsg || 'No se pudo realizar la venta.');
            }
          },
          false,
          'Vender de todas formas',
          'Cancelar'
        );
      } else {
        setMensajeError(res.errorMsg || 'No se pudo realizar la venta.');
      }
    }
  };

  // Helper para calcular costo proporcional antes de registrar (solo para visualización)
  const getCostoEstimadoVentaActual = () => {
    const platillo = platillos.find(p => p.id === selectedPlatilloId);
    if (!platillo) return 0;
    
    return platillo.ingredientes.reduce((acc, ing) => {
      const insumo = insumos.find(i => i.id === ing.insumoId);
      if (!insumo) return acc;
      
      const cantidadRequerida = ing.cantidad * cantidadVenta;
      const cantidadAConsumir = Math.min(insumo.cantidadActual, cantidadRequerida);
      return acc + (cantidadAConsumir * insumo.costoUnitario);
    }, 0);
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
                {activeVentas.length} {activeVentas.length === 1 ? 'operación' : 'operaciones'}
              </div>
            </div>

            <div className="mt-4 overflow-y-auto max-h-[440px] space-y-3 pr-1">
              {activeVentas.length === 0 ? (
                <div className="text-center py-20 text-slate-500 text-sm italic font-medium">
                  Aún no registras ventas. Utiliza el panel de la izquierda para registrar tu primera operación y ver los costos proporcionales en acción.
                </div>
              ) : (
                activeVentas.map((venta) => (
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

                      <div className="flex flex-wrap sm:flex-col items-end gap-1.5">
                        <button
                          onClick={() => {
                            showConfirm(
                              'Anular Venta',
                              '¿Estás seguro de que quieres anular esta venta? Esto RESTAURARÁ todos los insumos de la receta al almacén.',
                              () => onAnularVenta(venta.id),
                              true
                            );
                          }}
                          className="text-slate-500 hover:text-rose-400 p-1 hover:bg-rose-500/10 rounded transition flex items-center gap-1 text-[10px] font-mono font-bold"
                          title="Anular venta y devolver stock"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Anular Venta
                        </button>

                        <button
                          onClick={() => handleVentaAPerdidaClick(venta)}
                          className="text-slate-500 hover:text-orange-400 p-1 hover:bg-orange-500/10 rounded transition flex items-center gap-1 text-[10px] font-mono font-bold"
                          title="Anular venta marcando ingredientes perdidos en cocina"
                        >
                          <AlertCircle className="h-3.5 w-3.5" /> Venta a Pérdida
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN NUEVA: Cierre de Caja Diario y Archivo */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800/80 shadow-xl p-6">
        <div className="border-b border-slate-800/60 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-sans font-extrabold text-white flex items-center gap-2">
              <Archive className="h-5 w-5 text-orange-400" /> Cierre de Caja y Archivo
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Agrupa las ventas activas en un corte diario para reiniciar el contador y archivar los históricos.
            </p>
          </div>
          
          <button
            onClick={() => setShowArchiveModal(true)}
            className="bg-slate-950 hover:bg-slate-800 text-orange-400 hover:text-orange-300 font-bold py-2.5 px-4.5 rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-800 hover:border-slate-750 transition"
          >
            <Archive className="h-4 w-4" /> Ver Archivo de Ventas ({cierres.length})
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Configuración de Cierre */}
          <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Settings className="h-4.5 w-4.5 text-orange-400" /> Configuración del Cierre
            </h3>
            
            <div className="space-y-3">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoCorte"
                    checked={configCorte.tipo === 'manual'}
                    onChange={() => onSaveConfigCorte({ ...configCorte, tipo: 'manual' })}
                    className="accent-orange-500"
                  />
                  <span>Corte Manual</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoCorte"
                    checked={configCorte.tipo === 'automatico'}
                    onChange={() => onSaveConfigCorte({ ...configCorte, tipo: 'automatico' })}
                    className="accent-orange-500"
                  />
                  <span>Corte Automático</span>
                </label>
              </div>

              {configCorte.tipo === 'automatico' && (
                <div className="flex items-center gap-2.5 mt-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800 w-fit">
                  <Clock className="h-4 w-4 text-orange-400" />
                  <span className="text-xs text-slate-300">Hora de corte:</span>
                  <input
                    type="time"
                    value={configCorte.horaAutomatica}
                    onChange={(e) => onSaveConfigCorte({ ...configCorte, horaAutomatica: e.target.value })}
                    className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              )}
              
              <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                {configCorte.tipo === 'manual' 
                  ? 'El corte se realizará únicamente cuando presiones el botón de la derecha.'
                  : `El sistema realizará el corte automáticamente todos los días a las ${configCorte.horaAutomatica} horas, archivando las ventas del ciclo transcurrido.`}
              </p>
            </div>
          </div>

          {/* Acción de Cierre */}
          <div className="flex flex-col justify-between bg-slate-950/40 border border-slate-850 rounded-xl p-5">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="h-4.5 w-4.5 text-orange-400" /> Resumen de Caja Activa
              </h3>
              <div className="grid grid-cols-3 gap-2 mt-2 font-mono text-center">
                <div className="bg-slate-900/60 py-2.5 rounded-lg border border-slate-800/40">
                  <span className="text-[9px] text-slate-500 block uppercase font-bold">Ventas</span>
                  <span className="text-sm font-bold text-white">${activeVentas.reduce((sum, v) => sum + v.precioVentaTotal, 0).toFixed(2)}</span>
                </div>
                <div className="bg-slate-900/60 py-2.5 rounded-lg border border-slate-800/40">
                  <span className="text-[9px] text-slate-500 block uppercase font-bold">Costo</span>
                  <span className="text-sm font-bold text-rose-400">${activeVentas.reduce((sum, v) => sum + v.costoInsumosTotal, 0).toFixed(2)}</span>
                </div>
                <div className="bg-slate-900/60 py-2.5 rounded-lg border border-slate-800/40">
                  <span className="text-[9px] text-slate-500 block uppercase font-bold">Ganancia</span>
                  <span className="text-sm font-bold text-emerald-400">+${(activeVentas.reduce((sum, v) => sum + v.precioVentaTotal, 0) - activeVentas.reduce((sum, v) => sum + v.costoInsumosTotal, 0)).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleCorteManualSubmit}
              disabled={activeVentas.length === 0}
              className={`w-full mt-4 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition flex items-center justify-center gap-1.5 ${
                activeVentas.length === 0 
                  ? 'bg-slate-800 text-slate-500 border border-slate-750 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 shadow-lg shadow-orange-500/10'
              }`}
            >
              Realizar Corte Manual
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: Archivo de Ventas */}
      <AnimatePresence>
        {showArchiveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl max-w-4xl w-full overflow-hidden text-slate-100 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60 shrink-0">
                <div className="flex items-center gap-2">
                  <Archive className="h-5 w-5 text-orange-400" />
                  <h3 className="font-sans font-extrabold text-white text-base">Archivo de Cortes de Caja Diario</h3>
                </div>
                <button onClick={() => setShowArchiveModal(false)} className="text-slate-400 hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Toolbar */}
              <div className="p-4 bg-slate-950/30 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleToggleSelectAll}
                    className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg"
                  >
                    {selectedCierres.length === cierres.length && cierres.length > 0 ? (
                      <CheckSquare className="h-4 w-4 text-orange-400" />
                    ) : (
                      <Square className="h-4 w-4 text-slate-500" />
                    )}
                    <span>Seleccionar Todos</span>
                  </button>
                  
                  {selectedCierres.length > 0 && (
                    <span className="text-xs text-orange-400 font-bold font-mono">
                      {selectedCierres.length} seleccionados
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleExportExcel}
                    disabled={selectedCierres.length === 0}
                    className={`text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition ${
                      selectedCierres.length === 0
                        ? 'bg-slate-800/50 text-slate-500 border border-slate-800 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    <FileSpreadsheet className="h-4 w-4" /> Excel (CSV)
                  </button>
                  <button
                    onClick={handleExportPDF}
                    disabled={selectedCierres.length === 0}
                    className={`text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition ${
                      selectedCierres.length === 0
                        ? 'bg-slate-800/50 text-slate-500 border border-slate-800 cursor-not-allowed'
                        : 'bg-rose-600 hover:bg-rose-550 text-white'
                    }`}
                  >
                    <FileText className="h-4 w-4" /> PDF Real
                  </button>
                  <button
                    onClick={handleDeleteSelectedCierres}
                    disabled={selectedCierres.length === 0}
                    className={`text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition ${
                      selectedCierres.length === 0
                        ? 'bg-slate-800/50 text-slate-500 border border-slate-800 cursor-not-allowed'
                        : 'bg-rose-950/20 border border-rose-900/30 text-rose-400 hover:bg-rose-900/30 font-bold'
                    }`}
                  >
                    <Trash2 className="h-4 w-4" /> Borrar
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto flex-grow space-y-4">
                {cierres.length === 0 ? (
                  <div className="text-center py-20 text-slate-500 text-sm italic font-medium">
                    No hay cortes de caja archivados todavía. Realiza un corte para comenzar el historial.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cierres.map(cierre => {
                      const isExpanded = expandedCierreId === cierre.id;
                      const isSelected = selectedCierres.includes(cierre.id);
                      const salesInCierre = ventas.filter(v => v.cierreId === cierre.id);
                      
                      return (
                        <div
                          key={cierre.id}
                          className="bg-slate-950/45 border border-slate-850 rounded-xl overflow-hidden hover:border-slate-750 transition"
                        >
                          {/* Row Header */}
                          <div className="p-4 flex items-center justify-between gap-4 cursor-pointer" onClick={() => handleToggleExpand(cierre.id)}>
                            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => handleToggleSelect(cierre.id)} className="text-slate-400 hover:text-white">
                                {isSelected ? (
                                  <CheckSquare className="h-4.5 w-4.5 text-orange-400" />
                                ) : (
                                  <Square className="h-4.5 w-4.5 text-slate-500" />
                                )}
                              </button>
                              
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg">
                                  <Calendar className="h-4.5 w-4.5 text-orange-400" />
                                </div>
                                <div>
                                  <h4 className="font-sans font-bold text-white text-sm">
                                    {new Date(cierre.fechaCierre).toLocaleString('es-MX', {
                                      day: '2-digit', month: 'short', year: 'numeric',
                                      hour: '2-digit', minute: '2-digit'
                                    })}
                                  </h4>
                                  <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono mt-1 inline-block">
                                    Corte: {cierre.tipoCorte === 'manual' ? 'Manual' : 'Automático'} • ID: {cierre.id.slice(-6)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right font-mono hidden sm:block">
                                <p className="text-xs text-slate-400">Ventas: <span className="font-bold text-white">${cierre.totalVentas.toFixed(2)}</span></p>
                                <p className="text-[10px] text-rose-400">Costo: -${cierre.totalCosto.toFixed(2)}</p>
                                <p className="text-[10px] text-emerald-400">Margen: +${cierre.totalMargen.toFixed(2)}</p>
                              </div>

                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handleSingleExport(cierre, 'excel')}
                                  className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition"
                                  title="Exportar a Excel"
                                >
                                  <FileSpreadsheet className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleSingleExport(cierre, 'pdf')}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
                                  title="Exportar a PDF"
                                >
                                  <FileText className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleSingleDelete(cierre)}
                                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded transition"
                                  title="Eliminar Corte"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleToggleExpand(cierre.id)}
                                  className="p-1.5 text-slate-400 hover:text-white rounded transition"
                                >
                                  {isExpanded ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Row Expanded Details */}
                          {isExpanded && (
                            <div className="border-t border-slate-855 bg-slate-950/60 p-4 space-y-3 font-mono text-xs">
                              <h5 className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Detalle del Corte ({cierre.cantidadOperaciones} ventas)</h5>
                              
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-[11px] text-slate-300">
                                  <thead>
                                    <tr className="border-b border-slate-800/80 text-slate-500 font-bold">
                                      <th className="pb-2">Platillo</th>
                                      <th className="pb-2 text-center">Cant.</th>
                                      <th className="pb-2 text-right">Precio U.</th>
                                      <th className="pb-2 text-right">Total</th>
                                      <th className="pb-2 text-right">Costo</th>
                                      <th className="pb-2 text-right">Margen</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {salesInCierre.map(sale => (
                                      <tr key={sale.id} className="border-b border-slate-850 hover:bg-slate-900/30">
                                        <td className="py-2 text-white font-semibold">{sale.platilloNombre}</td>
                                        <td className="py-2 text-center">{sale.cantidad}</td>
                                        <td className="py-2 text-right">${sale.precioVentaUnitario.toFixed(2)}</td>
                                        <td className="py-2 text-right text-white font-bold">${sale.precioVentaTotal.toFixed(2)}</td>
                                        <td className="py-2 text-right text-rose-400">${sale.costoInsumosTotal.toFixed(2)}</td>
                                        <td className="py-2 text-right text-emerald-400 font-semibold">+${sale.margenTotal.toFixed(2)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Venta a Pérdida */}
      <AnimatePresence>
        {lossModalConfig.isOpen && lossModalConfig.venta && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl max-w-md w-full overflow-hidden text-slate-100 p-6 space-y-4"
            >
              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
                <AlertCircle className="h-5 w-5 text-orange-400" />
                <h3 className="font-sans font-extrabold text-white text-base">Registrar Venta a Pérdida</h3>
              </div>

              {lossModalConfig.tipoPerdida === null ? (
                <div className="space-y-4 py-2">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Esta opción anula la venta de <strong>{lossModalConfig.venta.platilloNombre}</strong>. Selecciona el tipo de pérdida ocurrido en la cocina:
                  </p>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={handleConfirmLossTotal}
                      className="bg-slate-950 hover:bg-slate-850 border border-slate-800/80 hover:border-slate-700 p-4 rounded-xl text-left transition space-y-1 w-full"
                    >
                      <h4 className="text-xs font-bold text-white uppercase font-sans">Pérdida Total</h4>
                      <p className="text-[11px] text-slate-400">Ningún ingrediente regresa al almacén. Todo el platillo se arruinó por completo.</p>
                    </button>

                    <button
                      onClick={() => setLossModalConfig(prev => ({ ...prev, tipoPerdida: 'parcial' }))}
                      className="bg-slate-950 hover:bg-slate-850 border border-slate-800/80 hover:border-slate-700 p-4 rounded-xl text-left transition space-y-1 w-full"
                    >
                      <h4 className="text-xs font-bold text-orange-400 uppercase font-sans">Pérdida Parcial</h4>
                      <p className="text-[11px] text-slate-400">Selecciona los ingredientes que se echaron a perder. El resto sí regresará al almacén.</p>
                    </button>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => setLossModalConfig(prev => ({ ...prev, isOpen: false }))}
                      className="bg-slate-950 hover:bg-slate-850 border border-slate-850 text-slate-300 font-bold py-2 px-4 rounded-xl text-xs transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Marca los ingredientes que <strong>se echaron a perder</strong> (no volverán al stock). Los desmarcados se reintegrarán al almacén:
                  </p>

                  <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-3 max-h-[220px] overflow-y-auto space-y-2">
                    {platillos.find(p => p.id === lossModalConfig.venta?.platilloId)?.ingredientes.map(ing => {
                      const isChecked = lossModalConfig.ingredientesSeleccionados.includes(ing.insumoId);
                      return (
                        <label
                          key={ing.insumoId}
                          className="flex items-center justify-between text-xs text-slate-200 cursor-pointer hover:bg-slate-900/40 p-1.5 rounded transition"
                        >
                          <span className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setLossModalConfig(prev => ({
                                    ...prev,
                                    ingredientesSeleccionados: prev.ingredientesSeleccionados.filter(id => id !== ing.insumoId)
                                  }));
                                } else {
                                  setLossModalConfig(prev => ({
                                    ...prev,
                                    ingredientesSeleccionados: [...prev.ingredientesSeleccionados, ing.insumoId]
                                  }));
                                }
                              }}
                              className="accent-orange-500"
                            />
                            <span>{insumos.find(i => i.id === ing.insumoId)?.nombre || 'Insumo desconocido'}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {ing.cantidad * (lossModalConfig.venta?.cantidad || 1)} g/ml
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex justify-between pt-2">
                    <button
                      onClick={() => setLossModalConfig(prev => ({ ...prev, tipoPerdida: null, ingredientesSeleccionados: [] }))}
                      className="bg-slate-950 hover:bg-slate-850 border border-slate-850 text-slate-400 font-bold py-2 px-4 rounded-xl text-xs transition"
                    >
                      Atrás
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setLossModalConfig(prev => ({ ...prev, isOpen: false }))}
                        className="bg-slate-950 hover:bg-slate-850 border border-slate-855 text-slate-300 font-bold py-2 px-4 rounded-xl text-xs transition"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleConfirmLossParcial}
                        className="bg-orange-600 hover:bg-orange-550 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-md transition"
                      >
                        Confirmar Pérdida
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
