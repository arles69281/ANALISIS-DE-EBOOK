import React, { useRef, useState } from 'react';
import { Book, Plus, Trash2, FileText, AlertCircle, Library } from 'lucide-react';
import { FileData } from '../types';

interface KnowledgeBaseProps {
  files: FileData[];
  onAddFile: (file: FileData) => void;
  onRemoveFile: (fileName: string) => void;
}

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ files, onAddFile, onRemoveFile }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError(null);

    if (!file) return;

    if (file.type !== 'application/pdf' && file.type !== 'text/plain') {
      setError('Solo se permiten archivos PDF o TXT como referencia.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('El archivo excede el límite de 20MB.');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const base64 = result.split(',')[1];
        onAddFile({
          base64,
          mimeType: file.type,
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Error al leer el archivo.');
    }
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 bg-amber-50/50">
        <div className="flex items-center space-x-2 text-amber-800 mb-2">
           <Library className="w-5 h-5" />
           <h3 className="font-serif font-bold text-sm">Base de Conocimiento</h3>
        </div>
        <p className="text-xs text-amber-700/80 leading-relaxed mb-3">
           Sube documentos técnicos (ej. Dosier, Protocolos) para que la IA los use como criterio de evaluación al analizar los casos.
        </p>
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center space-x-2 bg-white border border-amber-200 text-amber-800 hover:bg-amber-100 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Referencia</span>
        </button>
        <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".pdf,.txt"
            onChange={handleFileChange}
        />
        
        {error && (
            <div className="mt-2 flex items-center space-x-1 text-red-600 text-[10px]">
                <AlertCircle className="w-3 h-3" />
                <span>{error}</span>
            </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
         {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-xs text-center border border-dashed border-gray-200 rounded-lg">
               <Book className="w-6 h-6 mb-2 opacity-20" />
               <p>Sin documentos de referencia.</p>
            </div>
         ) : (
            files.map((file, idx) => (
                <div key={idx} className="group flex items-center justify-between p-2 bg-white border border-gray-200 rounded-lg hover:border-amber-300 transition-colors shadow-sm">
                    <div className="flex items-center space-x-2 overflow-hidden">
                        <div className="bg-amber-100 p-1.5 rounded text-amber-700">
                           <FileText className="w-3 h-3" />
                        </div>
                        <span className="text-xs font-medium text-gray-700 truncate max-w-[140px]" title={file.name}>
                            {file.name}
                        </span>
                    </div>
                    <button 
                        onClick={() => onRemoveFile(file.name)}
                        className="text-gray-300 hover:text-red-500 p-1 rounded transition-colors"
                        title="Eliminar referencia"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            ))
         )}
      </div>
    </div>
  );
};