import React, { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle, Loader2, Layers } from 'lucide-react';
import { FileData } from '../types';

interface FileUploaderProps {
  onFileSelect: (filesData: FileData[]) => void;
  isAnalyzing: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, isAnalyzing }) => {
  const [error, setError] = useState<string | null>(null);
  const [processingFiles, setProcessingFiles] = useState(false);
  const [fileCount, setFileCount] = useState<number>(0);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    setError(null);
    setProcessingFiles(false);

    if (!files || files.length === 0) return;

    setProcessingFiles(true);
    setFileCount(files.length);
    const validFiles: File[] = [];
    const processedFiles: FileData[] = [];

    // Filter valid files first
    const validTypes = ['application/pdf', 'text/plain', 'image/jpeg', 'image/png', 'image/webp'];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!validTypes.includes(file.type)) {
        setError(`El archivo "${file.name}" tiene un formato no soportado.`);
        setProcessingFiles(false);
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setError(`El archivo "${file.name}" excede el límite de 20MB.`);
        setProcessingFiles(false);
        return;
      }
      validFiles.push(file);
    }

    try {
      // Read all files in parallel
      const filePromises = validFiles.map(file => {
        return new Promise<FileData>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            const base64 = result.split(',')[1];
            resolve({
              base64,
              mimeType: file.type,
              name: file.name
            });
          };
          reader.onerror = () => reject(new Error(`Error leyendo ${file.name}`));
          reader.readAsDataURL(file);
        });
      });

      const results = await Promise.all(filePromises);
      onFileSelect(results);
    } catch (err) {
      console.error(err);
      setError('Error al procesar los archivos.');
    } finally {
      setProcessingFiles(false);
    }
  }, [onFileSelect]);

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-judicial-200">
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-judicial-50 rounded-full">
          {isAnalyzing || processingFiles ? (
            <Loader2 className="w-8 h-8 text-judicial-600 animate-spin" />
          ) : (
            <div className="relative">
              <Upload className="w-8 h-8 text-judicial-600" />
              <Layers className="w-4 h-4 text-judicial-400 absolute -bottom-1 -right-1 bg-white rounded-full" />
            </div>
          )}
        </div>
        
        <div className="text-center">
          <h3 className="text-lg font-serif font-semibold text-judicial-900">
            {isAnalyzing || processingFiles 
              ? `Procesando ${fileCount > 0 ? fileCount : ''} Documento(s)...` 
              : 'Subir Expedientes o Documentos'}
          </h3>
          <p className="text-sm text-judicial-500 mt-1 max-w-md">
            Sube uno o múltiples archivos PDF, TXT o Imágenes. La IA analizará el contenido de cada uno simultáneamente.
          </p>
        </div>

        {!isAnalyzing && !processingFiles && (
          <div className="w-full">
            <label 
              htmlFor="file-upload" 
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-judicial-300 border-dashed rounded-lg cursor-pointer bg-judicial-50 hover:bg-judicial-100 transition-colors group"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <p className="mb-2 text-sm text-judicial-600 group-hover:text-judicial-800 transition-colors">
                  <span className="font-semibold">Click para seleccionar archivos</span>
                </p>
                <p className="text-xs text-judicial-400">Selección múltiple permitida (Max 20MB c/u)</p>
              </div>
              <input 
                id="file-upload" 
                type="file" 
                className="hidden" 
                multiple 
                accept=".pdf,.txt,.jpg,.jpeg,.png,.webp"
                onChange={handleFileChange}
              />
            </label>
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 text-red-600 bg-red-50 px-4 py-2 rounded-md animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};