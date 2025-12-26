import React, { useState, useEffect } from 'react';
import { Scale, ShieldAlert, FolderClock, BookOpen, Plus, Minimize2, Maximize2, X, FileText, Settings, Save, Moon, Monitor, PaintBucket, ChevronDown, Library, Layout, Table as TableIcon, Check } from 'lucide-react';
import { FileUploader } from './components/FileUploader';
import { AnalysisDisplay } from './components/AnalysisDisplay';
import { CaseHistory } from './components/CaseHistory';
import { DocumentViewer } from './components/DocumentViewer';
import { KnowledgeBase } from './components/KnowledgeBase';
import { ConsolidatedTable } from './components/ConsolidatedTable';
import { analyzeCaseFile } from './services/geminiService';
import { AnalysisStatus, FileData, CaseRecord, CaseData, SourceData } from './types';

// Helper for initial empty state
const emptySource = (val: string = ''): SourceData => ({ value: val, page: 0, quote: '' });
const emptyDossierItem = () => ({ content: '', strategy: [], tools: [] });

const createEmptyCaseData = (): CaseData => ({
  rit: emptySource(),
  tribunal: emptySource(),
  causeType: emptySource(),
  denunciant: emptySource(),
  complaintMethod: emptySource(),
  complaintDate: emptySource(),
  receivingInstitution: emptySource(),
  motive: emptySource(),
  facts: emptySource(),
  measures: emptySource(),
  people: [],
  citations: [],
  hearings: [],
  chronology: [],
  dossier: {
    identification: emptyDossierItem(),
    typologies: emptyDossierItem(),
    gravity: emptyDossierItem(),
    careNeeds: emptyDossierItem(),
    impact: emptyDossierItem(),
    methodologies: emptyDossierItem(),
    parentalCapabilities: emptyDossierItem(),
    riskFactors: emptyDossierItem(),
    synthesis: emptyDossierItem(),
    warnings: emptyDossierItem()
  },
  missingInfo: [],
  technicalAnalysis: '',
});

// --- THEME CONFIGURATION ---
const THEMES = {
  original: {
    name: 'Original (Azul Acero)',
    colors: {
      50: '#f0f4f8', 100: '#d9e2ec', 200: '#bcccdc', 300: '#9fb3c8', 400: '#829ab1',
      500: '#627d98', 600: '#486581', 700: '#334e68', 800: '#243b53', 900: '#102a43'
    }
  },
  neutral: {
    name: 'Neutro (Gris Clásico)',
    colors: {
      50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db', 400: '#9ca3af',
      500: '#6b7280', 600: '#4b5563', 700: '#374151', 800: '#1f2937', 900: '#111827'
    }
  },
  zinc: {
    name: 'Zinc (Alto Contraste)',
    colors: {
      50: '#fafafa', 100: '#f4f4f5', 200: '#e4e4e7', 300: '#d4d4d8', 400: '#a1a1aa',
      500: '#71717a', 600: '#52525b', 700: '#3f3f46', 800: '#27272a', 900: '#18181b'
    }
  },
  blue: {
    name: 'Corporativo (Azul Real)',
    colors: {
      50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa',
      500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a'
    }
  },
  emerald: {
    name: 'Institucional (Verde)',
    colors: {
      50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399',
      500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b'
    }
  }
};

function App() {
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [currentCaseId, setCurrentCaseId] = useState<string | null>(null);
  
  // Knowledge Base State
  const [referenceFiles, setReferenceFiles] = useState<FileData[]>([]);

  // Layout state
  const [activeTab, setActiveTab] = useState<'history' | 'knowledge'>('history');
  
  // View Modes
  const [mainViewMode, setMainViewMode] = useState<'single' | 'table'>('single');

  // SEPARACIÓN DE ESTADOS:
  // 1. isImmersiveMode: Controla la vista dividida especializada (PDF + Análisis).
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  
  const [viewerPage, setViewerPage] = useState(1);
  const [activeQuote, setActiveQuote] = useState<string | null>(null); // Nuevo estado para el resaltado
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // --- CONFIGURATION STATE ---
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<keyof typeof THEMES>('original');

  // --- EFFECT: APPLY THEME VARIABLES ---
  useEffect(() => {
    const theme = THEMES[currentTheme];
    const root = document.documentElement;
    
    // Set CSS Variables for the Judicial Palette
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--judicial-${key}`, value as string);
    });
  }, [currentTheme]);

  // Derived state
  const activeCase = cases.find(c => c.id === currentCaseId);

  const handleFilesSelect = async (files: FileData[]) => {
    if (files.length === 0) return;

    // 1. Crear registros temporales para TODOS los archivos
    const newCases: CaseRecord[] = files.map(file => ({
      id: crypto.randomUUID(),
      fileName: file.name,
      uploadDate: new Date(),
      analysis: createEmptyCaseData(),
      fileData: file,
      status: AnalysisStatus.ANALYZING
    }));

    // 2. Actualizar estado: Agregar casos, seleccionar el PRIMERO, poner estado global en analizando
    setCases(prev => [...newCases, ...prev]);
    const firstCaseId = newCases[0].id;
    setCurrentCaseId(firstCaseId);
    setStatus(AnalysisStatus.ANALYZING);
    
    // NO activamos modo inmersivo automáticamente
    setIsImmersiveMode(false); 
    
    // Si subimos múltiples archivos, sugerimos la vista de tabla, sino mantenemos la single
    if (files.length > 1) {
        setMainViewMode('table');
    } else {
        setMainViewMode('single');
    }

    setViewerPage(1);
    setActiveQuote(null);

    // 3. Procesar cada archivo individualmente en "segundo plano"
    newCases.forEach(async (caseRecord) => {
      try {
        // PASAMOS LOS ARCHIVOS DE REFERENCIA A LA FUNCIÓN DE ANÁLISIS
        const { rit, data } = await analyzeCaseFile(caseRecord.fileData, referenceFiles);

        let finalFileName = caseRecord.fileName;
        if (rit && rit !== "SIN_RIT" && rit !== "NO SE CONSIGNA") {
          const parts = caseRecord.fileName.split('.');
          const extension = parts.length > 1 ? `.${parts.pop()}` : '';
          const safeRit = rit.replace(/[\/\\]/g, '-').trim();
          finalFileName = `${safeRit}${extension}`;
        }

        // Actualizar el caso específico cuando termine
        setCases(prev => prev.map(c => {
          if (c.id === caseRecord.id) {
            return {
              ...c,
              fileName: finalFileName,
              analysis: data,
              fileData: { ...c.fileData, name: finalFileName },
              status: AnalysisStatus.COMPLETED
            };
          }
          return c;
        }));

        // Si el caso que terminó es el que estamos viendo actualmente, actualizar el estado global
        if (caseRecord.id === firstCaseId) {
          setStatus(AnalysisStatus.COMPLETED);
        } else if (currentCaseId === caseRecord.id) {
           setStatus(AnalysisStatus.COMPLETED);
        }

      } catch (error) {
        console.error(`Error processing ${caseRecord.fileName}`, error);
        
        setCases(prev => prev.map(c => {
          if (c.id === caseRecord.id) {
            return { ...c, status: AnalysisStatus.ERROR };
          }
          return c;
        }));

        if (caseRecord.id === firstCaseId) {
           setStatus(AnalysisStatus.ERROR);
        }
      }
    });
  };

  const handleSelectCase = (record: CaseRecord) => {
    setCurrentCaseId(record.id);
    setMainViewMode('single'); // Al seleccionar uno específico, volvemos a la vista de ficha
    if (record.status === AnalysisStatus.COMPLETED) {
      setStatus(AnalysisStatus.COMPLETED);
    } else if (record.status === AnalysisStatus.ANALYZING) {
      setStatus(AnalysisStatus.ANALYZING);
    } else {
      setStatus(AnalysisStatus.ERROR);
    }
    setViewerPage(1);
    setActiveQuote(null);
  };

  const handleChangeCaseInImmersive = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    const record = cases.find(c => c.id === newId);
    if (record) {
      handleSelectCase(record);
    }
  };

  const handleUpdatePageCount = (pageCount: number) => {
    if (activeCase && (!activeCase.pageCount || activeCase.pageCount !== pageCount)) {
      setCases(prev => prev.map(c => 
        c.id === activeCase.id ? { ...c, pageCount } : c
      ));
    }
  };

  const handleDeleteCase = (id: string) => {
    setCases(prev => prev.filter(c => c.id !== id));
    if (currentCaseId === id) {
      setCurrentCaseId(null);
      setStatus(AnalysisStatus.IDLE);
    }
  };

  const handleNewAnalysis = () => {
    setCurrentCaseId(null);
    setStatus(AnalysisStatus.IDLE);
    setIsImmersiveMode(false);
    setActiveQuote(null);
  };

  const handleViewSource = (page: number, quote?: string) => {
    if (page > 0) {
      setViewerPage(page);
      if (quote) {
        setActiveQuote(quote);
      } else {
        setActiveQuote(null);
      }
    }
  };

  const handlePageChange = (page: number) => {
    setViewerPage(page);
  };

  // --- KNOWLEDGE BASE HANDLERS ---
  const handleAddReference = (file: FileData) => {
    setReferenceFiles(prev => [...prev, file]);
  };

  const handleRemoveReference = (fileName: string) => {
    setReferenceFiles(prev => prev.filter(f => f.name !== fileName));
  };

  // Función exclusiva para activar/desactivar la vista dividida (PDF + Datos)
  const toggleImmersiveMode = () => {
    setIsImmersiveMode(!isImmersiveMode);
  };

  // Función exclusiva para Modo Cine (Pantalla Completa Nativa del Navegador)
  const toggleNativeFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => {
        console.error("Error attempting to enable fullscreen:", e);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(e => console.error(e));
      }
    }
    setIsSettingsOpen(false);
  };

  const downloadFile = (record: CaseRecord) => {
    const link = document.createElement('a');
    link.href = `data:${record.fileData.mimeType};base64,${record.fileData.base64}`;
    link.download = record.fileName; 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- RENDER COMPONENT: IMMERSIVE MODE ---
  if (isImmersiveMode && activeCase) {
    return (
      <div className="fixed inset-0 z-[100] bg-gray-900 flex flex-col h-screen w-screen overflow-hidden">
        {/* Full Screen Header Bar */}
        <div className="flex-shrink-0 bg-judicial-900 text-white h-16 flex items-center justify-between px-6 border-b border-gray-700 shadow-md">
           <div className="flex items-center space-x-6 flex-1 min-w-0">
              <div className="flex items-center text-judicial-200">
                <Scale className="w-8 h-8" />
              </div>
              
              {/* --- HIGH VISIBILITY CASE SELECTOR --- */}
              <div className="flex items-center bg-judicial-800 rounded-lg p-1.5 border border-judicial-700 shadow-inner">
                <span className="text-[10px] font-bold text-judicial-300 px-3 uppercase tracking-wider hidden md:block">
                  EXPEDIENTE ACTUAL:
                </span>
                <div className="relative group">
                  <select 
                    value={activeCase.id} 
                    onChange={handleChangeCaseInImmersive}
                    className="appearance-none bg-white text-judicial-900 font-bold py-2 pl-4 pr-10 rounded-md shadow-sm focus:ring-4 focus:ring-judicial-500/50 outline-none text-sm min-w-[300px] cursor-pointer hover:bg-judicial-50 transition-colors truncate"
                  >
                    {cases.map(c => (
                      <option key={c.id} value={c.id} className="text-gray-900 bg-white py-2">
                        {c.fileName} {c.pageCount ? `(${c.pageCount} págs)` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-5 h-5 text-judicial-600 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none group-hover:text-judicial-800 transition-colors" />
                </div>
              </div>

              {/* Status Indicator */}
              {activeCase.status === AnalysisStatus.ANALYZING && (
                 <span className="flex items-center bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/30 animate-pulse">
                    Analizando...
                 </span>
              )}
           </div>
           
           <div className="flex items-center space-x-3">
             <button 
                onClick={toggleNativeFullScreen}
                className="p-2.5 text-judicial-300 hover:text-white hover:bg-judicial-800 rounded-lg transition-colors"
                title="Pantalla Completa"
             >
                <Monitor className="w-5 h-5" />
             </button>

             <button 
               onClick={toggleImmersiveMode}
               className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-200 px-5 py-2.5 rounded-lg text-xs font-bold transition-all hover:text-white shadow-sm hover:shadow-md"
             >
               <Minimize2 className="w-4 h-4" />
               <span>SALIR</span>
             </button>
           </div>
        </div>

        {/* Split Content */}
        <div className="flex-1 flex overflow-hidden">
          <div className="w-1/2 h-full border-r border-gray-700 bg-gray-800 relative">
             <DocumentViewer 
               fileData={activeCase.fileData} 
               page={viewerPage} 
               highlightText={activeQuote}
               onPageChange={handlePageChange}
               onPageCountAvailable={handleUpdatePageCount}
               className="w-full h-full"
             />
          </div>
          <div className="w-1/2 h-full bg-gray-50 flex flex-col overflow-hidden relative">
             <div className="flex-1 overflow-auto p-0">
               <AnalysisDisplay 
                  data={activeCase.analysis} 
                  fileData={activeCase.fileData}
                  onDownloadFile={() => downloadFile(activeCase)}
                  onViewSource={handleViewSource}
                  isSplitView={true}
               />
             </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER COMPONENT: NORMAL DASHBOARD VIEW ---
  return (
    <div className="min-h-screen flex flex-col bg-slate-100 h-screen overflow-hidden font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 z-30 shadow-sm flex-shrink-0 h-16">
        <div className={`w-full h-full mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center transition-all duration-300 ${isFullWidth ? 'max-w-[98%]' : 'max-w-7xl'}`}>
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={handleNewAnalysis}>
            <div className="bg-judicial-800 p-2 rounded-lg shadow-sm group-hover:bg-judicial-900 transition-colors">
              <Scale className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-judicial-900 leading-none">
                Asistente Jurídico
              </h1>
              <span className="text-xs text-judicial-500 font-medium tracking-wide">PODER JUDICIAL CHILE (AI)</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {activeCase && (
              <button 
                  onClick={toggleImmersiveMode}
                  className="flex items-center space-x-2 px-4 py-2 bg-judicial-50 text-judicial-700 border border-judicial-200 hover:bg-judicial-100 hover:border-judicial-300 text-sm font-semibold rounded-lg transition-all shadow-sm"
              >
                <Maximize2 className="w-4 h-4" />
                <span>Modo Inmersivo</span>
              </button>
            )}

            <button 
              onClick={toggleNativeFullScreen}
              className="p-2 text-judicial-600 hover:bg-judicial-50 rounded-lg transition-colors"
              title="Activar Modo Cine (Pantalla Completa)"
            >
              <Monitor className="w-5 h-5" />
            </button>

            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-judicial-600 hover:bg-judicial-50 rounded-lg transition-colors"
              title="Ajustes de Configuración"
            >
              <Settings className="w-5 h-5" />
            </button>

            <button 
              onClick={handleNewAnalysis}
              className="flex items-center space-x-2 px-4 py-2 bg-judicial-700 hover:bg-judicial-800 text-white text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Caso</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 overflow-hidden relative">
        <div className={`h-full mx-auto px-4 sm:px-6 lg:px-8 py-6 transition-all duration-300 ${isFullWidth ? 'max-w-[98%]' : 'max-w-7xl'}`}>
          <div className="flex gap-6 h-full">
            
            {/* COLUMN 1: Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
               
               {/* 1. View Toggle Switch (Only if cases exist) */}
               {cases.length > 0 && (
                 <div className="flex-shrink-0 mb-4 bg-white p-1 rounded-lg border border-judicial-200 shadow-sm inline-flex self-start">
                    <button
                        onClick={() => setMainViewMode('single')}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                            mainViewMode === 'single' ? 'bg-judicial-100 text-judicial-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                        <Layout className="w-4 h-4" />
                        <span>Ficha del Caso</span>
                    </button>
                    <button
                        onClick={() => setMainViewMode('table')}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                            mainViewMode === 'table' ? 'bg-judicial-100 text-judicial-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                        <TableIcon className="w-4 h-4" />
                        <span>Tabla Consolidada</span>
                    </button>
                 </div>
               )}

               {/* 2. Uploader State (No files) */}
               {(!activeCase && status !== AnalysisStatus.ANALYZING && cases.length === 0) && (
                  <div className="flex flex-col h-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex-1 bg-white rounded-xl shadow-md border border-judicial-200 flex flex-col items-center justify-center p-8 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-judicial-500 to-judicial-300"></div>
                      <FileUploader onFileSelect={handleFilesSelect} isAnalyzing={status === AnalysisStatus.ANALYZING} />
                    </div>
                  </div>
               )}

               {/* 3. Analyzing State */}
               {status === AnalysisStatus.ANALYZING && cases.length === 0 && (
                  <div className="flex-1 bg-white rounded-xl shadow-md border border-judicial-200 flex flex-col items-center justify-center p-12">
                     <FileUploader onFileSelect={() => {}} isAnalyzing={true} />
                  </div>
               )}

               {/* 4. Active Content: Single View */}
               {mainViewMode === 'single' && activeCase && (
                  <div className="flex flex-col h-full bg-white rounded-xl shadow-lg border border-judicial-200 overflow-hidden relative">
                     <div className="bg-judicial-50 border-b border-judicial-200 px-4 py-2 flex justify-between items-center text-xs text-judicial-600 font-medium">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4" />
                          <span>VISTA DE EXPEDIENTE INDIVIDUAL</span>
                        </div>
                        <div>ID: {activeCase.id.substring(0,8)}</div>
                     </div>
                     <div className="flex-1 overflow-hidden">
                       <AnalysisDisplay 
                         data={activeCase.analysis} 
                         fileData={activeCase.fileData}
                         onDownloadFile={() => downloadFile(activeCase)}
                         onViewSource={handleViewSource}
                         isSplitView={true}
                       />
                     </div>
                  </div>
               )}

               {/* 5. Active Content: Table View */}
               {mainViewMode === 'table' && cases.length > 0 && (
                  <div className="flex flex-col h-full overflow-hidden">
                      <ConsolidatedTable cases={cases} />
                  </div>
               )}

            </div>

            {/* COLUMN 2: Sidebar */}
            <aside className="w-80 flex-shrink-0 flex flex-col gap-4 h-full">
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-judicial-200 flex flex-col overflow-hidden">
                  {/* Sidebar Tabs */}
                  <div className="flex border-b border-gray-100">
                    <button
                      onClick={() => setActiveTab('history')}
                      className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
                        activeTab === 'history' 
                          ? 'border-judicial-600 text-judicial-800 bg-gray-50' 
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <FolderClock className="w-4 h-4" />
                        <span>Historial</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab('knowledge')}
                      className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
                        activeTab === 'knowledge' 
                          ? 'border-amber-600 text-amber-800 bg-amber-50' 
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <Library className="w-4 h-4" />
                        <span>Referencias</span>
                      </div>
                    </button>
                  </div>

                  <div className="flex-1 overflow-hidden bg-gray-50/50">
                      {activeTab === 'history' ? (
                        <div className="p-3 h-full overflow-y-auto">
                            <CaseHistory 
                              cases={cases}
                              onSelectCase={handleSelectCase}
                              onDownloadFile={downloadFile}
                              onDeleteCase={handleDeleteCase}
                              activeCaseId={currentCaseId || undefined}
                            />
                        </div>
                      ) : (
                        <KnowledgeBase 
                            files={referenceFiles}
                            onAddFile={handleAddReference}
                            onRemoveFile={handleRemoveReference}
                        />
                      )}
                  </div>
                </div>

                <div className="bg-judicial-800 rounded-xl p-4 text-white shadow-md">
                   <h3 className="font-serif font-bold text-sm mb-2 opacity-90">Tip Jurídico</h3>
                   <p className="text-xs opacity-75 leading-relaxed">
                     Recuerde que el análisis de IA es una herramienta de apoyo. Verifique siempre las citas textuales usando el modo inmersivo.
                   </p>
                </div>
            </aside>

          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-gray-200 overflow-hidden">
            <div className="bg-judicial-900 px-6 py-4 flex justify-between items-center text-white">
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <h2 className="font-serif font-bold text-lg">Configuración</h2>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Layout Config */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-3 flex items-center">
                  <Layout className="w-4 h-4 mr-2 text-judicial-600" />
                  Distribución de Pantalla
                </label>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button 
                    onClick={() => setIsFullWidth(false)}
                    className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${!isFullWidth ? 'bg-white text-judicial-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Centrado (Estándar)
                  </button>
                  <button 
                    onClick={() => setIsFullWidth(true)}
                    className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${isFullWidth ? 'bg-white text-judicial-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Ancho Completo
                  </button>
                </div>
              </div>

              {/* Theme Config */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-3 flex items-center">
                  <PaintBucket className="w-4 h-4 mr-2 text-judicial-600" />
                  Tema de Color
                </label>
                <div className="space-y-2">
                  {Object.entries(THEMES).map(([key, theme]) => (
                    <button
                      key={key}
                      onClick={() => setCurrentTheme(key as keyof typeof THEMES)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border transition-all ${
                        currentTheme === key 
                          ? 'border-judicial-500 bg-judicial-50 ring-1 ring-judicial-200' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-5 h-5 rounded-full border border-gray-200 shadow-sm" 
                          style={{ backgroundColor: theme.colors[600] }}
                        />
                        <span className={`text-sm ${currentTheme === key ? 'font-bold text-judicial-900' : 'text-gray-600'}`}>
                          {theme.name}
                        </span>
                      </div>
                      {currentTheme === key && <Check className="w-4 h-4 text-judicial-600" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end border-t border-gray-200">
               <button onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
                 Cerrar
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;