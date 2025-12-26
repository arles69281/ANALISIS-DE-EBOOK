import React, { useState, useMemo } from 'react';
import { FileText, Download, Eye, Clock, Trash2, AlertTriangle, Loader2, ArrowDownAZ, FileBarChart2 } from 'lucide-react';
import { CaseRecord, AnalysisStatus } from '../types';

interface CaseHistoryProps {
  cases: CaseRecord[];
  onSelectCase: (caseRecord: CaseRecord) => void;
  onDownloadFile: (caseRecord: CaseRecord) => void;
  onDeleteCase: (id: string) => void;
  activeCaseId?: string;
}

type SortType = 'date' | 'name' | 'pages';

export const CaseHistory: React.FC<CaseHistoryProps> = ({ 
  cases, 
  onSelectCase, 
  onDownloadFile, 
  onDeleteCase,
  activeCaseId 
}) => {
  const [caseToDelete, setCaseToDelete] = useState<string | null>(null);
  const [sortType, setSortType] = useState<SortType>('date');

  const sortedCases = useMemo(() => {
    const items = [...cases];
    switch (sortType) {
        case 'name':
            return items.sort((a, b) => a.fileName.localeCompare(b.fileName));
        case 'pages':
            return items.sort((a, b) => (b.pageCount || 0) - (a.pageCount || 0));
        case 'date':
        default:
            return items; // Default order (upload time desc usually if array is appended correctly)
    }
  }, [cases, sortType]);

  const confirmDelete = () => {
    if (caseToDelete) {
      onDeleteCase(caseToDelete);
      setCaseToDelete(null);
    }
  };

  const cancelDelete = () => {
    setCaseToDelete(null);
  };

  if (cases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-judicial-400 text-sm p-4 text-center border border-dashed border-judicial-200 rounded-lg">
        <FileText className="w-8 h-8 mb-2 opacity-20" />
        <p>Aún no hay casos en el historial.</p>
        <p className="text-xs mt-1">Sube un archivo para comenzar.</p>
      </div>
    );
  }

  return (
    <>
      {/* Sort Controls */}
      <div className="flex space-x-1 mb-3 pb-2 border-b border-gray-100 overflow-x-auto">
         <button 
            onClick={() => setSortType('name')}
            className={`flex items-center space-x-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-colors ${sortType === 'name' ? 'bg-judicial-100 text-judicial-700' : 'text-gray-400 hover:bg-gray-100'}`}
            title="Ordenar por Nombre"
         >
            <ArrowDownAZ className="w-3 h-3" />
            <span>Nombre</span>
         </button>
         <button 
            onClick={() => setSortType('pages')}
            className={`flex items-center space-x-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-colors ${sortType === 'pages' ? 'bg-judicial-100 text-judicial-700' : 'text-gray-400 hover:bg-gray-100'}`}
            title="Ordenar por Cantidad de Páginas"
         >
            <FileBarChart2 className="w-3 h-3" />
            <span>+ Páginas</span>
         </button>
         <button 
            onClick={() => setSortType('date')}
            className={`flex items-center space-x-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-colors ${sortType === 'date' ? 'bg-judicial-100 text-judicial-700' : 'text-gray-400 hover:bg-gray-100'}`}
            title="Ordenar por Fecha de Carga"
         >
            <Clock className="w-3 h-3" />
            <span>Reciente</span>
         </button>
      </div>

      <div className="space-y-3 overflow-y-auto max-h-[550px] pr-1">
        {sortedCases.map((record) => {
          const isAnalyzing = record.status === AnalysisStatus.ANALYZING;
          return (
            <div 
              key={record.id} 
              className={`group relative p-3 rounded-lg border transition-all duration-200 ${
                activeCaseId === record.id 
                  ? 'bg-judicial-50 border-judicial-300 shadow-sm' 
                  : 'bg-white border-judicial-100 hover:border-judicial-300 hover:shadow-sm'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2 overflow-hidden w-full">
                  <div className={`p-1.5 rounded flex-shrink-0 ${activeCaseId === record.id ? 'bg-judicial-200 text-judicial-800' : 'bg-gray-100 text-gray-500'}`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-judicial-900 truncate flex items-center" title={record.fileName}>
                      <span className="truncate">{record.fileName}</span>
                      {isAnalyzing && (
                        <Loader2 className="w-3 h-3 text-judicial-500 animate-spin ml-2 flex-shrink-0" />
                      )}
                    </h4>
                    <div className="flex items-center text-xs text-judicial-500 space-x-2">
                      <span className="flex items-center">
                         <Clock className="w-3 h-3 mr-1" />
                         {record.uploadDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {record.pageCount !== undefined && record.pageCount > 0 && (
                          <span className="flex items-center bg-gray-100 px-1.5 rounded text-gray-600 font-medium">
                             {record.pageCount} pág.
                          </span>
                      )}
                    </div>
                  </div>
                </div>
                {!isAnalyzing && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setCaseToDelete(record.id); }}
                    className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    title="Eliminar del historial"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex space-x-2 mt-2">
                <button
                  onClick={() => onSelectCase(record)}
                  disabled={isAnalyzing}
                  className={`flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                    activeCaseId === record.id
                      ? 'bg-judicial-600 text-white'
                      : 'bg-white border border-judicial-200 text-judicial-600 hover:bg-judicial-50 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>{isAnalyzing ? 'Analizando...' : 'Ver Análisis'}</span>
                </button>
                <button
                  onClick={() => onDownloadFile(record)}
                  disabled={isAnalyzing}
                  className="flex items-center justify-center px-2 py-1.5 text-xs font-medium text-judicial-600 bg-white border border-judicial-200 rounded hover:bg-judicial-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Descargar archivo original"
                >
                  <Download className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {caseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4 text-amber-600">
                <div className="bg-amber-100 p-2 rounded-full">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-serif font-bold text-gray-900">Eliminar Caso</h3>
              </div>
              
              <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                ¿Está seguro que desea eliminar este caso del historial?
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors shadow-sm"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};