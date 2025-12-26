import React, { useEffect, useRef, useState } from 'react';
import { FileData } from '../types';
import { Loader2, AlertCircle, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCw, File } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configurar el worker de PDF.js globalmente
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';

interface DocumentViewerProps {
  fileData: FileData;
  page?: number;
  highlightText?: string | null;
  onPageChange?: (page: number) => void;
  onPageCountAvailable?: (pageCount: number) => void; // Prop para comunicar páginas al padre
  className?: string;
}

interface HighlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ 
  fileData, 
  page = 1, 
  highlightText,
  onPageChange,
  onPageCountAvailable,
  className = '' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null); // Ref to store the current render task
  
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [scale, setScale] = useState(1.0); // Zoom inicial más controlado
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [highlights, setHighlights] = useState<HighlightRect[]>([]);

  // 1. Cargar el Documento PDF (Binario)
  useEffect(() => {
    const loadPdf = async () => {
      if (fileData.mimeType !== 'application/pdf') {
        setLoading(false);
        return;
      }

      setLoading(true);
      setRenderError(null);
      setHighlights([]);

      try {
        // Convertir Base64 a Uint8Array
        const binaryString = atob(fileData.base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const loadingTask = pdfjsLib.getDocument({ data: bytes });
        const doc = await loadingTask.promise;
        
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        
        // Comunicar al padre el número de páginas para el ordenamiento
        if (onPageCountAvailable) {
            onPageCountAvailable(doc.numPages);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error loading PDF:", error);
        setRenderError("No se pudo procesar el archivo PDF.");
        setLoading(false);
      }
    };

    loadPdf();
  }, [fileData, onPageCountAvailable]);

  // 2. Renderizar la Página en el Canvas y Calcular Highlights
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;

      // Cancel previous render if it exists to avoid "Cannot use the same canvas" error
      if (renderTaskRef.current) {
        try {
            await renderTaskRef.current.cancel();
        } catch (e) {
            // RenderingCancelledException is expected
        }
      }

      try {
        setHighlights([]); // Clear previous highlights while rendering
        
        // Validar rango de página
        const safePage = Math.max(1, Math.min(page, pdfDoc.numPages));
        const pageData = await pdfDoc.getPage(safePage);

        const viewport = pageData.getViewport({ scale, rotation });
        const canvas = canvasRef.current;
        
        // Ensure canvas still exists (might be unmounted during await)
        if (!canvas) return;
        
        const context = canvas.getContext('2d');

        if (!context) return;

        // Ajustar dimensiones del canvas (HiDPI support simple)
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Ajustar dimensiones del overlay de highlights
        if (overlayRef.current) {
          overlayRef.current.style.height = `${viewport.height}px`;
          overlayRef.current.style.width = `${viewport.width}px`;
        }

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        // Store render task
        const renderTask = pageData.render(renderContext);
        renderTaskRef.current = renderTask;
        
        await renderTask.promise;
        renderTaskRef.current = null; // Clear ref on success

        // --- LÓGICA DE RESALTADO ---
        if (highlightText) {
          const textContent = await pageData.getTextContent();
          const matches: HighlightRect[] = [];
          
          const searchStr = highlightText.toLowerCase().replace(/\s+/g, ' ').trim();
          if (searchStr) {
            textContent.items.forEach((item: any) => {
               const itemStr = item.str.toLowerCase();
               const words = searchStr.split(' ');
               const hasMatch = words.some(w => w.length > 3 && itemStr.includes(w)) || itemStr.includes(searchStr);

               if (hasMatch && item.transform) {
                  const tx = item.transform;
                  const fontSize = Math.sqrt(tx[2]*tx[2] + tx[3]*tx[3]); 
                  const itemWidth = item.width || (item.str.length * fontSize * 0.5);
                  
                  const rect = [
                     tx[4], 
                     tx[5], 
                     tx[4] + itemWidth,
                     tx[5] + fontSize 
                  ];

                  const viewRect = viewport.convertToViewportRectangle(rect);
                  const minX = Math.min(viewRect[0], viewRect[2]);
                  const maxX = Math.max(viewRect[0], viewRect[2]);
                  const minY = Math.min(viewRect[1], viewRect[3]);
                  const maxY = Math.max(viewRect[1], viewRect[3]);

                  matches.push({
                     x: minX,
                     y: minY,
                     width: maxX - minX,
                     height: maxY - minY
                  });
               }
            });
            setHighlights(matches);
          }
        }

      } catch (error: any) {
        if (error.name !== 'RenderingCancelledException') {
            console.error("Error rendering page:", error);
        }
      }
    };

    void renderPage();

    return () => {
        if (renderTaskRef.current) {
            renderTaskRef.current.cancel();
            renderTaskRef.current = null;
        }
    };
  }, [pdfDoc, page, scale, rotation, highlightText]);

  // Handlers
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  
  const handlePrevPage = () => {
    const newPage = Math.max(1, page - 1);
    if (onPageChange) onPageChange(newPage);
  };

  const handleNextPage = () => {
    const newPage = Math.min(totalPages, page + 1);
    if (onPageChange) onPageChange(newPage);
  };

  // Renderizado para imágenes (no PDF)
  if (fileData.mimeType !== 'application/pdf') {
     return (
        <div className={`flex items-center justify-center bg-gray-900 overflow-auto h-full p-4 relative group ${className}`}>
           <img 
             src={`data:${fileData.mimeType};base64,${fileData.base64}`} 
             alt="Documento" 
             className="max-w-full shadow-lg" 
           />
           <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-xs font-medium backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
              Vista de Imagen
           </div>
        </div>
     );
  }

  return (
    <div className={`flex flex-col h-full bg-gray-900 relative group ${className}`}>
      
      {/* Floating Toolbar Design */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 flex items-center gap-2 px-1 py-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 shadow-2xl transition-opacity duration-300 opacity-0 group-hover:opacity-100 hover:opacity-100">
        
        {/* Navigation Group */}
        <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
            <button 
                onClick={handlePrevPage} 
                disabled={page <= 1} 
                className="p-1.5 hover:bg-white/20 text-gray-200 rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                title="Página Anterior"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-white px-2 min-w-[3rem] text-center select-none">
                {page} / {totalPages || '-'}
            </span>
            <button 
                onClick={handleNextPage} 
                disabled={page >= totalPages} 
                className="p-1.5 hover:bg-white/20 text-gray-200 rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                title="Página Siguiente"
            >
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>

        {/* Zoom Group */}
        <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
            <button 
                onClick={handleZoomOut} 
                className="p-1.5 hover:bg-white/20 text-gray-200 rounded-md transition-colors"
                title="Reducir Zoom"
            >
                <ZoomOut className="w-4 h-4" />
            </button>
            <button 
                onClick={handleZoomIn} 
                className="p-1.5 hover:bg-white/20 text-gray-200 rounded-md transition-colors"
                title="Aumentar Zoom"
            >
                <ZoomIn className="w-4 h-4" />
            </button>
        </div>

        {/* Rotate Group */}
        <div className="bg-white/10 rounded-lg p-1">
            <button 
                onClick={handleRotate} 
                className="p-1.5 hover:bg-white/20 text-gray-200 rounded-md transition-colors"
                title="Rotar Documento"
            >
                <RotateCw className="w-4 h-4" />
            </button>
        </div>

      </div>

      {/* Área de Visualización (Canvas) */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto flex justify-center p-8 relative"
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="bg-black/50 p-4 rounded-xl backdrop-blur-sm flex flex-col items-center">
                <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
                <span className="text-white text-xs font-medium">Renderizando PDF...</span>
            </div>
          </div>
        )}

        {renderError ? (
          <div className="flex flex-col items-center justify-center text-red-300 h-full">
            <AlertCircle className="w-12 h-12 mb-4 opacity-80" />
            <p className="text-sm font-medium">{renderError}</p>
          </div>
        ) : (
          <div className="relative shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] transition-transform duration-200 ease-out h-fit">
             {/* Canvas Layer */}
             <canvas ref={canvasRef} className="block bg-white" />
             
             {/* Highlights Layer */}
             <div ref={overlayRef} className="absolute top-0 left-0 pointer-events-none">
                {highlights.map((h, i) => (
                  <div 
                    key={i}
                    className="absolute bg-yellow-400 mix-blend-multiply opacity-40 border-b-2 border-yellow-600 animate-pulse"
                    style={{
                      left: h.x,
                      top: h.y,
                      width: h.width,
                      height: h.height,
                    }}
                  />
                ))}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};