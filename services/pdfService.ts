import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Logo and signature base64 will be loaded dynamically
let logoBase64: string | null = null;
let firmaBase64: string | null = null;

// Load logo as base64
const loadLogo = async (): Promise<string> => {
    if (logoBase64) return logoBase64;

    try {
        const response = await fetch('/logo.png');
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                logoBase64 = reader.result as string;
                resolve(logoBase64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error loading logo:', error);
        return '';
    }
};

// Load signature/stamp as base64
const loadFirma = async (): Promise<string> => {
    if (firmaBase64) return firmaBase64;

    try {
        const response = await fetch('/firma_heleiner.png');
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                firmaBase64 = reader.result as string;
                resolve(firmaBase64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error loading firma:', error);
        return '';
    }
};

export interface MovimientoData {
    tipo: 'ingreso' | 'salida';
    placa: string;
    fecha_hora: string;
    conductor: string;
    cedula_conductor?: string;
    bultos: number;
    peso_bruto?: number;
    formulario_ref?: string;
    sello?: string;
    contenedor?: string;
    cama_baja?: boolean;
    mula?: string;
    tiempo_extraordinario?: boolean;
    descripcion_mercancia?: string;
    pedido?: string;
}

export interface OrdenData {
    do_code: string;
    cliente_nombre: string;
    bl_no: string;
    bodega: string;
    bultos: number;
    producto: string;
}

// Format date to DD/MM/YYYY
const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

// Format time to HH:MM AM/PM
const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

// Get current formatted date
const getCurrentDate = (): string => {
    return new Date().toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

export const generateIngresoPDF = async (orden: OrdenData, movimiento: MovimientoData): Promise<void> => {
    const doc = new jsPDF();
    const logo = await loadLogo();

    // Header with logo
    if (logo) {
        doc.addImage(logo, 'PNG', 14, 10, 40, 20);
    }

    // Company info
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('LOGISERVICES ZF SAS', 14, 35);
    doc.text('Nit: 900.292.920-8', 14, 39);

    // Document title section
    doc.setFillColor(240, 240, 240);
    doc.rect(60, 10, 95, 30, 'F');

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('SISTEMA DE GESTION INTEGRAL', 107, 16, { align: 'center' });
    doc.text('GESTIÓN OPERACIONES', 107, 22, { align: 'center' });

    doc.setFillColor(200, 200, 200);
    doc.rect(60, 26, 95, 14, 'F');
    doc.setFontSize(9);
    doc.text('FORMATO DE INGRESO DE MERCANCIA', 107, 34, { align: 'center' });

    // Version info box
    doc.setFillColor(255, 255, 255);
    doc.rect(158, 10, 40, 30, 'S');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Versión: 003', 160, 15);
    doc.text('Cod. SGI-GO-FO-002', 160, 20);
    doc.text(`Fecha: ${getCurrentDate()}`, 160, 25);

    // Main data table
    const startY = 48;

    autoTable(doc, {
        startY: startY,
        theme: 'grid',
        styles: {
            fontSize: 8,
            cellPadding: 2,
            lineColor: [0, 0, 0],
            lineWidth: 0.1,
        },
        headStyles: {
            fillColor: [200, 220, 255],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
        },
        columnStyles: {
            0: { fontStyle: 'bold', fillColor: [230, 240, 255] },
            2: { fontStyle: 'bold', fillColor: [230, 240, 255] },
            4: { fontStyle: 'bold', fillColor: [230, 240, 255] },
        },
        body: [
            [
                { content: 'CLIENTE', styles: { fontStyle: 'bold' } },
                { content: orden.cliente_nombre, colSpan: 3 },
                { content: 'DO LS', styles: { fontStyle: 'bold' } },
                orden.do_code
            ],
            [
                { content: 'FECHA (DD/MM/YYYY)', styles: { fontStyle: 'bold' } },
                formatDate(movimiento.fecha_hora),
                { content: 'HORA DE INGRESO', styles: { fontStyle: 'bold' } },
                formatTime(movimiento.fecha_hora),
                { content: 'BODEGA', styles: { fontStyle: 'bold' } },
                orden.bodega || ''
            ],
            [
                { content: 'N° BL', styles: { fontStyle: 'bold' } },
                orden.bl_no,
                { content: 'N° FORMULARIO', styles: { fontStyle: 'bold' } },
                movimiento.formulario_ref || '',
                { content: 'N° DE BULTOS', styles: { fontStyle: 'bold' } },
                movimiento.bultos.toString()
            ],
            [
                { content: 'N° CONTENEDOR', styles: { fontStyle: 'bold' } },
                movimiento.contenedor || '',
                { content: 'N° SELLO', styles: { fontStyle: 'bold' } },
                movimiento.sello || '',
                { content: 'TIEMPO EXTRAORDINARIO', styles: { fontStyle: 'bold' } },
                movimiento.tiempo_extraordinario ? 'SI' : 'NO'
            ],
            [
                { content: 'CAMA BAJA', styles: { fontStyle: 'bold' } },
                movimiento.cama_baja ? 'X' : '',
                { content: 'MULA', styles: { fontStyle: 'bold' } },
                movimiento.mula || '',
                { content: 'OTRO', styles: { fontStyle: 'bold' } },
                ''
            ],
            [
                { content: 'N° CONDUCTOR', styles: { fontStyle: 'bold' } },
                movimiento.conductor,
                { content: 'C.C. N°', styles: { fontStyle: 'bold' } },
                movimiento.cedula_conductor || '',
                { content: 'PLACA N°', styles: { fontStyle: 'bold' } },
                movimiento.placa
            ],
        ],
        margin: { left: 14, right: 14 },
    });

    // Description section
    const finalY = (doc as any).lastAutoTable.finalY;

    autoTable(doc, {
        startY: finalY,
        theme: 'grid',
        styles: {
            fontSize: 8,
            cellPadding: 2,
            lineColor: [0, 0, 0],
            lineWidth: 0.1,
        },
        headStyles: {
            fillColor: [230, 240, 255],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center',
        },
        head: [['DESCRIPCIÓN DE MERCANCIA']],
        body: [
            [{ content: movimiento.descripcion_mercancia || `${movimiento.bultos} ${orden.producto}`, styles: { minCellHeight: 60 } }]
        ],
        margin: { left: 14, right: 14 },
    });

    // Signatures section
    const signY = (doc as any).lastAutoTable.finalY + 10;

    // Load firma/stamp image
    const firma = await loadFirma();

    // Left signature with stamp and signature image
    if (firma) {
        doc.addImage(firma, 'PNG', 25, signY, 50, 35);
    }
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('_______________________________', 25, signY + 40);
    doc.text('Heleiner juvinao perez', 33, signY + 45);
    doc.setFont('helvetica', 'normal');
    doc.text('CC. N° 1128058543', 35, signY + 50);
    doc.text('Jefe de operaciones', 35, signY + 55);

    // Right signature
    doc.setFont('helvetica', 'bold');
    doc.text('_______________________________', 125, signY + 40);
    doc.text(movimiento.conductor.toUpperCase(), 140, signY + 45);
    doc.setFont('helvetica', 'normal');
    doc.text(`C.C. N° ${movimiento.cedula_conductor || ''}`, 140, signY + 50);
    doc.text('Conductor', 150, signY + 55);

    // Save PDF
    doc.save(`Ingreso_${orden.do_code}_${formatDate(movimiento.fecha_hora).replace(/\//g, '-')}.pdf`);
};

export const generateSalidaPDF = async (orden: OrdenData, movimiento: MovimientoData): Promise<void> => {
    const doc = new jsPDF();
    const logo = await loadLogo();

    // Header with logo
    if (logo) {
        doc.addImage(logo, 'PNG', 14, 10, 40, 20);
    }

    // Company info
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('LOGISERVICES ZF SAS', 14, 35);
    doc.text('Nit: 900.292.920-8', 14, 39);

    // Document title section
    doc.setFillColor(240, 240, 240);
    doc.rect(60, 10, 95, 30, 'F');

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('SISTEMA DE GESTION INTEGRAL', 107, 16, { align: 'center' });
    doc.text('GESTIÓN OPERACIONES', 107, 22, { align: 'center' });

    doc.setFillColor(200, 200, 200);
    doc.rect(60, 26, 95, 14, 'F');
    doc.setFontSize(9);
    doc.text('FORMATO DE SALIDA DE MERCANCIA', 107, 34, { align: 'center' });

    // Version info box
    doc.setFillColor(255, 255, 255);
    doc.rect(158, 10, 40, 30, 'S');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Versión: 003', 160, 15);
    doc.text('Cod. SGI-GO-FO-003', 160, 20);
    doc.text(`Fecha: ${getCurrentDate()}`, 160, 25);

    // Main data table
    const startY = 48;

    autoTable(doc, {
        startY: startY,
        theme: 'grid',
        styles: {
            fontSize: 8,
            cellPadding: 2,
            lineColor: [0, 0, 0],
            lineWidth: 0.1,
        },
        headStyles: {
            fillColor: [200, 220, 255],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
        },
        columnStyles: {
            0: { fontStyle: 'bold', fillColor: [230, 240, 255] },
            2: { fontStyle: 'bold', fillColor: [230, 240, 255] },
            4: { fontStyle: 'bold', fillColor: [230, 240, 255] },
        },
        body: [
            [
                { content: 'CLIENTE', styles: { fontStyle: 'bold' } },
                { content: orden.cliente_nombre, colSpan: 3 },
                { content: 'DO LS', styles: { fontStyle: 'bold' } },
                orden.do_code
            ],
            [
                { content: 'FECHA (DD/MM/YYYY)', styles: { fontStyle: 'bold' } },
                formatDate(movimiento.fecha_hora),
                { content: 'HORA DE SALIDA', styles: { fontStyle: 'bold' } },
                formatTime(movimiento.fecha_hora),
                { content: 'BODEGA', styles: { fontStyle: 'bold' } },
                orden.bodega || ''
            ],
            [
                { content: 'N° BL/FACTURA', styles: { fontStyle: 'bold' } },
                orden.bl_no,
                { content: 'N° FORM. SALIDA', styles: { fontStyle: 'bold' } },
                movimiento.formulario_ref || '',
                { content: 'N° DE BULTOS', styles: { fontStyle: 'bold' } },
                movimiento.bultos.toString()
            ],
            [
                { content: 'N°CONTENEDOR', styles: { fontStyle: 'bold' } },
                movimiento.contenedor || '',
                { content: 'PEDIDO', styles: { fontStyle: 'bold' } },
                movimiento.pedido || '',
                { content: 'TIEMPO EXTRAORDINARIO', styles: { fontStyle: 'bold' } },
                movimiento.tiempo_extraordinario ? 'SI' : 'NO'
            ],
            [
                { content: 'CAMA BAJA', styles: { fontStyle: 'bold' } },
                movimiento.cama_baja ? 'X' : '',
                { content: 'MULA', styles: { fontStyle: 'bold' } },
                movimiento.mula || '',
                { content: 'OTRO', styles: { fontStyle: 'bold' } },
                ''
            ],
            [
                { content: 'N° CONDUCTOR', styles: { fontStyle: 'bold' } },
                movimiento.conductor,
                { content: 'C.C. N°', styles: { fontStyle: 'bold' } },
                movimiento.cedula_conductor || '',
                { content: 'PLACA N°', styles: { fontStyle: 'bold' } },
                movimiento.placa
            ],
        ],
        margin: { left: 14, right: 14 },
    });

    // Description section
    const finalY = (doc as any).lastAutoTable.finalY;

    autoTable(doc, {
        startY: finalY,
        theme: 'grid',
        styles: {
            fontSize: 8,
            cellPadding: 2,
            lineColor: [0, 0, 0],
            lineWidth: 0.1,
        },
        headStyles: {
            fillColor: [230, 240, 255],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center',
        },
        head: [['DESCRIPCIÓN DE MERCANCIA']],
        body: [
            [{ content: movimiento.descripcion_mercancia || `${movimiento.bultos} ${orden.producto} PED ${movimiento.pedido || ''}`, styles: { minCellHeight: 60 } }]
        ],
        margin: { left: 14, right: 14 },
    });

    // Signatures section
    const signY = (doc as any).lastAutoTable.finalY + 10;

    // Load firma/stamp image
    const firma = await loadFirma();

    // Left signature with stamp and signature image
    if (firma) {
        doc.addImage(firma, 'PNG', 25, signY, 50, 35);
    }
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('_______________________________', 25, signY + 40);
    doc.text('HELEINER JUVINAO PÉREZ', 30, signY + 45);
    doc.setFont('helvetica', 'normal');
    doc.text('CC. N° 1128058543', 35, signY + 50);
    doc.text('Jefe de Operaciones', 35, signY + 55);

    // Right signature
    doc.setFont('helvetica', 'bold');
    doc.text('_______________________________', 125, signY + 40);
    doc.text(movimiento.conductor.toUpperCase(), 140, signY + 45);
    doc.setFont('helvetica', 'normal');
    doc.text(`C.C. N° ${movimiento.cedula_conductor || ''}`, 140, signY + 50);
    doc.text('Conductor', 150, signY + 55);

    // Save PDF
    doc.save(`Salida_${orden.do_code}_${formatDate(movimiento.fecha_hora).replace(/\//g, '-')}.pdf`);
};
