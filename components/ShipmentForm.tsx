import React, { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { validateWithPiciz } from '../services/picizService';
import { extractDataFromDocument } from '../services/geminiService';

interface Props {
  onSuccess: () => void;
}

export const ShipmentForm: React.FC<Props> = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    blNumber: '',
    invoiceNumber: '',
    vcesCode: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setIsExtracting(true);
      setStatus('idle');

      // Convert to base64 for Gemini
      const reader = new FileReader();
      reader.onloadend = async () => {
          const base64String = reader.result as string;
          // Strip header (e.g., "data:image/jpeg;base64,") for API if needed, 
          // but Gemini JS SDK handles inlineData well with proper mimeType
          const base64Data = base64String.split(',')[1];
          
          const extractedData = await extractDataFromDocument(base64Data, selectedFile.type);
          
          if (extractedData) {
               setFormData(prev => ({
                  ...prev,
                  blNumber: extractedData.blNumber || prev.blNumber,
                  invoiceNumber: extractedData.invoiceNumber || prev.invoiceNumber,
                  vcesCode: extractedData.vcesCode || prev.vcesCode
              }));
          }
          setIsExtracting(false);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsValidating(true);
    setStatus('idle');

    try {
      // 1. Validate with Piciz Mock Service
      const picizResponse = await validateWithPiciz(formData.blNumber, formData.vcesCode);

      if (!picizResponse.valid) {
        setStatus('error');
        setStatusMsg(picizResponse.message);
        setIsValidating(false);
        return;
      }

      // 2. Simulate Save to Supabase
      await new Promise(r => setTimeout(r, 1000));
      
      setStatus('success');
      setStatusMsg('Pre-alerta creada exitosamente.');
      setFormData({ blNumber: '', invoiceNumber: '', vcesCode: '' });
      setFile(null);
      setTimeout(() => {
          setStatus('idle');
          onSuccess();
      }, 2000);

    } catch (error) {
      setStatus('error');
      setStatusMsg('Error al procesar la solicitud.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-brand-blue/5 p-4 border-b border-brand-blue/10 flex justify-between items-center">
        <h3 className="font-semibold text-brand-blue flex items-center gap-2">
            <FileText size={18} />
            Nueva Entrada de Mercancía
        </h3>
        {isExtracting && <span className="text-xs text-brand-yellow font-medium animate-pulse">Analizando documento con AI...</span>}
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        
        {/* File Upload Area */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors relative group">
          <input 
            type="file" 
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center gap-2 text-gray-500 group-hover:text-brand-blue">
            <Upload size={32} />
            <span className="text-sm font-medium">
              {file ? file.name : "Sube BL o Factura para Auto-completar"}
            </span>
            <span className="text-xs text-gray-400">PDF o Imagen (OCR Activo)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número de BL</label>
            <input
              type="text"
              required
              value={formData.blNumber}
              onChange={e => setFormData({...formData, blNumber: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
              placeholder="Ej: BL-12345"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número de Factura</label>
            <input
              type="text"
              required
              value={formData.invoiceNumber}
              onChange={e => setFormData({...formData, invoiceNumber: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
              placeholder="Ej: INV-2024-001"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Código VCES (Piciz)</label>
            <input
              type="text"
              required
              value={formData.vcesCode}
              onChange={e => setFormData({...formData, vcesCode: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
              placeholder="Ej: VCES-X99"
            />
          </div>
        </div>

        {/* Status Messages */}
        {status === 'success' && (
          <div className="p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 text-sm">
            <CheckCircle size={16} /> {statusMsg}
          </div>
        )}
        {status === 'error' && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle size={16} /> {statusMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={isValidating || isExtracting}
          className="w-full bg-brand-blue text-white py-3 rounded-lg font-medium shadow-md hover:bg-blue-900 transition-colors disabled:opacity-70 flex justify-center items-center gap-2"
        >
          {isValidating ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Validando con Piciz...
            </>
          ) : (
            'Registrar Pre-alerta'
          )}
        </button>
      </form>
    </div>
  );
};