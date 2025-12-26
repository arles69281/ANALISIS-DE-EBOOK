
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Download, FileText, AlignLeft, List, Table as TableIcon, 
  Layout, History, CheckSquare, Zap, Scale, Copy, CheckCheck, Share2,
  User, Calendar, MapPin, Phone, Link as LinkIcon, Info, Search, Gavel, CalendarDays, ClipboardCheck, AlertTriangle, ShieldAlert,
  ArrowRight, Lightbulb, Target, Wrench, ChevronDown, ChevronUp, BrainCircuit, Activity,
  Footprints, CheckCircle2, Workflow, Microscope
} from 'lucide-react';
import { CaseData, FileData, SourceData, DossierItem } from '../types';

interface AnalysisDisplayProps {
  data: CaseData;
  fileData?: FileData;
  onDownloadFile?: () => void;
  onViewSource?: (page: number, quote?: string) => void;
  isSplitView?: boolean;
}

// --- INTERACTIVE FIELD COMPONENT ---
const Field: React.FC<{ 
  data: SourceData; 
  label?: string; 
  className?: string; 
  onViewSource?: (p: number, q?: string) => void 
}> = ({ data, label, className = '', onViewSource }) => {
  const hasPage = data.page > 0;
  
  return (
    <div className={`group relative ${className}`}>
      {label && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-0.5">{label}</span>}
      <div className="flex items-start">
        <span 
          onClick={() => hasPage && onViewSource && onViewSource(data.page, data.quote)}
          className={`
            text-sm text-gray-800 leading-snug break-words
            ${hasPage ? 'cursor-pointer hover:bg-amber-100 hover:text-amber-900 transition-colors rounded px-1 -mx-1' : ''}
          `}
          title={hasPage ? `Ver en página ${data.page}: "${data.quote}"` : 'Sin referencia exacta'}
        >
          {data.value}
        </span>
        {hasPage && (
          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-gray-100 text-gray-500 border border-gray-200 opacity-60 group-hover:opacity-100 transition-opacity whitespace-nowrap cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onViewSource && onViewSource(data.page, data.quote); }}
          >
            P.{data.page}
          </span>
        )}
      </div>
    </div>
  );
};

// --- VISUAL STRATEGY COMPONENT (ENHANCED FLOWCHART) ---
const StrategicCanvas: React.FC<{ item: DossierItem; title: string; icon: React.ReactNode; colorTheme: any }> = ({ item, title, icon, colorTheme }) => {
  const content = typeof item.content === 'string' ? item.content : "Sin información";
  const strategies = item.strategy || [];
  const tools = item.tools || [];

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      
      {/* 1. FACTS SECTION (Contexto) */}
      <div className={`bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden group`}>
        <div className={`absolute top-0 left-0 w-1.5 h-full ${colorTheme.bar} transition-all group-hover:w-2`}></div>
        <h4 className={`text-xs font-bold uppercase tracking-wider mb-4 flex items-center ${colorTheme.textDark} border-b border-gray-100 pb-2`}>
          <FileText className="w-4 h-4 mr-2" />
          Evidencia Documental Detectada
        </h4>
        <div className="prose prose-sm max-w-none text-gray-700 text-justify leading-relaxed">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>

      {/* 2. STRATEGIC ROADMAP (Process Flow Diagram) */}
      {(strategies.length > 0 || tools.length > 0) && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 relative overflow-hidden">
          {/* Technical Background Pattern */}
          <div className="absolute inset-0 opacity-[0.03]" 
               style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
               <span className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center shadow-sm ${colorTheme.bgSolid} text-white tracking-wide`}>
                  <Workflow className="w-3.5 h-3.5 mr-2" />
                  DISEÑO DE INTERVENCIÓN PERICIAL
               </span>
               <div className="hidden md:flex items-center space-x-1 text-[10px] font-bold text-gray-400 uppercase">
                  <span>Exploración</span>
                  <ArrowRight className="w-3 h-3" />
                  <span>Profundización</span>
                  <ArrowRight className="w-3 h-3" />
                  <span>Conclusión</span>
               </div>
            </div>

            {/* FLUID PROCESS DIAGRAM */}
            <div className="flex flex-col md:flex-row gap-6 items-stretch justify-between relative">
              {strategies.map((step, idx) => {
                // Determine step type/icon based on index
                let StepIcon = Footprints;
                if (idx === strategies.length - 1) StepIcon = CheckCircle2;
                else if (idx > 0) StepIcon = BrainCircuit;

                return (
                  <div key={idx} className="flex-1 flex flex-col relative group min-w-0">
                    
                    {/* Visual Connector (Arrow) */}
                    {idx < strategies.length - 1 && (
                      <div className="hidden md:flex absolute top-8 -right-4 w-8 justify-center items-center z-20 text-gray-300">
                         <ArrowRight className="w-6 h-6" strokeWidth={2.5} />
                      </div>
                    )}
                    {idx < strategies.length - 1 && (
                      <div className="md:hidden flex justify-center py-2 text-gray-300">
                         <ChevronDown className="w-6 h-6" strokeWidth={2.5} />
                      </div>
                    )}

                    {/* Step Card */}
                    <div className={`
                      h-full bg-white rounded-lg border-l-4 p-5 shadow-sm transition-all duration-300
                      hover:shadow-md hover:-translate-y-1 relative
                      ${colorTheme.borderLeft || `border-l-${colorTheme.bar.split('-')[1]}-500`} 
                      border-t border-r border-b border-gray-100
                    `}>
                       {/* Step Header */}
                       <div className="flex items-center justify-between mb-3">
                          <span className={`
                             w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm
                             ${colorTheme.bgLight} ${colorTheme.textDark} border border-white
                          `}>
                             {idx + 1}
                          </span>
                          <StepIcon className={`w-5 h-5 opacity-20 ${colorTheme.textDark}`} />
                       </div>
                       
                       {/* Step Content */}
                       <p className="text-sm text-gray-700 font-medium leading-relaxed">
                         {step}
                       </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* TOOLBOX SECTION */}
            {tools.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-200 border-dashed">
                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-4">
                   <div className={`flex items-center flex-shrink-0 px-3 py-1 rounded bg-gray-100 text-xs font-bold uppercase text-gray-600`}>
                      <Wrench className="w-4 h-4 mr-2" />
                      Kit de Herramientas
                   </div>
                   
                   <div className="flex flex-wrap gap-2 flex-1">
                     {tools.map((tool, idx) => (
                       <span key={idx} className={`
                          inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold border 
                          bg-white text-gray-700 border-gray-200 shadow-sm transition-colors
                          hover:border-gray-300
                       `}>
                          <Microscope className={`w-3.5 h-3.5 mr-1.5 ${colorTheme.textDark}`} />
                          {tool}
                       </span>
                     ))}
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

type ViewMode = 'narrative' | 'dossier' | 'technical';

// COLOR THEMES FOR DOSSIER
const DOSSIER_THEMES: Record<string, { bgHeader: string, textHeader: string, iconBg: string, bar: string, textDark: string, bgLight: string, bgSolid: string, borderLight: string, borderLeft?: string }> = {
    identification: { 
        bgHeader: 'bg-blue-600', textHeader: 'text-white', iconBg: 'bg-white/20', 
        bar: 'bg-blue-600', textDark: 'text-blue-800', bgLight: 'bg-blue-50', bgSolid: 'bg-blue-600', borderLight: 'border-blue-100', borderLeft: 'border-l-blue-600'
    },
    typologies: { 
        bgHeader: 'bg-red-600', textHeader: 'text-white', iconBg: 'bg-white/20', 
        bar: 'bg-red-600', textDark: 'text-red-800', bgLight: 'bg-red-50', bgSolid: 'bg-red-600', borderLight: 'border-red-100', borderLeft: 'border-l-red-600' 
    },
    gravity: { 
        bgHeader: 'bg-orange-500', textHeader: 'text-white', iconBg: 'bg-white/20', 
        bar: 'bg-orange-500', textDark: 'text-orange-800', bgLight: 'bg-orange-50', bgSolid: 'bg-orange-500', borderLight: 'border-orange-100', borderLeft: 'border-l-orange-500' 
    },
    careNeeds: { 
        bgHeader: 'bg-teal-600', textHeader: 'text-white', iconBg: 'bg-white/20', 
        bar: 'bg-teal-600', textDark: 'text-teal-800', bgLight: 'bg-teal-50', bgSolid: 'bg-teal-600', borderLight: 'border-teal-100', borderLeft: 'border-l-teal-600' 
    },
    impact: { 
        bgHeader: 'bg-purple-600', textHeader: 'text-white', iconBg: 'bg-white/20', 
        bar: 'bg-purple-600', textDark: 'text-purple-800', bgLight: 'bg-purple-50', bgSolid: 'bg-purple-600', borderLight: 'border-purple-100', borderLeft: 'border-l-purple-600' 
    },
    methodologies: { 
        bgHeader: 'bg-indigo-600', textHeader: 'text-white', iconBg: 'bg-white/20', 
        bar: 'bg-indigo-600', textDark: 'text-indigo-800', bgLight: 'bg-indigo-50', bgSolid: 'bg-indigo-600', borderLight: 'border-indigo-100', borderLeft: 'border-l-indigo-600' 
    },
    parentalCapabilities: { 
        bgHeader: 'bg-cyan-600', textHeader: 'text-white', iconBg: 'bg-white/20', 
        bar: 'bg-cyan-600', textDark: 'text-cyan-800', bgLight: 'bg-cyan-50', bgSolid: 'bg-cyan-600', borderLight: 'border-cyan-100', borderLeft: 'border-l-cyan-600' 
    },
    riskFactors: { 
        bgHeader: 'bg-slate-700', textHeader: 'text-white', iconBg: 'bg-white/20', 
        bar: 'bg-slate-700', textDark: 'text-slate-800', bgLight: 'bg-slate-100', bgSolid: 'bg-slate-700', borderLight: 'border-slate-200', borderLeft: 'border-l-slate-700' 
    },
    synthesis: { 
        bgHeader: 'bg-green-600', textHeader: 'text-white', iconBg: 'bg-white/20', 
        bar: 'bg-green-600', textDark: 'text-green-800', bgLight: 'bg-green-50', bgSolid: 'bg-green-600', borderLight: 'border-green-100', borderLeft: 'border-l-green-600' 
    },
    warnings: { 
        bgHeader: 'bg-yellow-500', textHeader: 'text-white', iconBg: 'bg-white/20', 
        bar: 'bg-yellow-500', textDark: 'text-yellow-900', bgLight: 'bg-yellow-50', bgSolid: 'bg-yellow-500', borderLight: 'border-yellow-200', borderLeft: 'border-l-yellow-500' 
    },
    default: {
        bgHeader: 'bg-gray-600', textHeader: 'text-white', iconBg: 'bg-white/20', 
        bar: 'bg-gray-600', textDark: 'text-gray-800', bgLight: 'bg-gray-50', bgSolid: 'bg-gray-600', borderLight: 'border-gray-200', borderLeft: 'border-l-gray-600' 
    }
};

export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ 
  data, 
  fileData, 
  onDownloadFile, 
  onViewSource,
  isSplitView = false
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('narrative');
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [expandedDossierItem, setExpandedDossierItem] = useState<string | null>(null);

  // Helper to get next hearing date
  const nextHearing = data.hearings.length > 0 ? data.hearings[0].date : { value: "No programada / Ver detalle", page: 0, quote: "" };

  const renderStructuredReport = () => (
    <div className="space-y-8">
      {/* HEADER: DATOS DE LA CAUSA */}
      <div className="bg-judicial-50 border border-judicial-200 rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="flex flex-col items-center md:items-start border-b md:border-b-0 md:border-r border-judicial-200 pb-4 md:pb-0 md:pr-4">
            <span className="text-xs font-bold text-judicial-500 uppercase tracking-wider mb-1">RIT</span>
            <div className="text-2xl font-serif font-black text-judicial-900">
               <Field data={data.rit} onViewSource={onViewSource} />
            </div>
          </div>
          <div className="flex flex-col items-center md:items-start border-b md:border-b-0 md:border-r border-judicial-200 pb-4 md:pb-0 md:pr-4">
             <span className="text-xs font-bold text-judicial-500 uppercase tracking-wider mb-1 flex items-center">
               <Gavel className="w-3 h-3 mr-1" /> TRIBUNAL
             </span>
             <div className="text-lg font-bold text-judicial-800">
                <Field data={data.tribunal} onViewSource={onViewSource} />
             </div>
          </div>
          <div className="flex flex-col items-center md:items-start">
             <span className="text-xs font-bold text-judicial-500 uppercase tracking-wider mb-1 flex items-center">
               <CalendarDays className="w-3 h-3 mr-1" /> FECHA AUDIENCIA
             </span>
             <div className="text-lg font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded">
                <Field data={nextHearing} onViewSource={onViewSource} />
             </div>
          </div>
        </div>
      </div>

      {/* TABLA DE PERSONAS */}
      <div className="space-y-3">
         <h3 className="text-lg font-serif font-bold text-judicial-900 flex items-center border-l-4 border-judicial-600 pl-3">
            Involucrados (NNA, Padres, Cuidadores)
         </h3>
         <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                 <thead className="bg-judicial-100">
                    <tr>
                       <th className="px-4 py-3 text-left text-xs font-bold text-judicial-800 uppercase tracking-wider w-[15%]">Rol</th>
                       <th className="px-4 py-3 text-left text-xs font-bold text-judicial-800 uppercase tracking-wider w-[25%]">Nombre Completo</th>
                       <th className="px-4 py-3 text-left text-xs font-bold text-judicial-800 uppercase tracking-wider w-[15%]">RUT</th>
                       <th className="px-4 py-3 text-left text-xs font-bold text-judicial-800 uppercase tracking-wider w-[25%]">Contacto</th>
                       <th className="px-4 py-3 text-left text-xs font-bold text-judicial-800 uppercase tracking-wider w-[20%]">Nacionalidad</th>
                    </tr>
                 </thead>
                 <tbody className="bg-white divide-y divide-gray-200">
                    {data.people.map((person, idx) => (
                       <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-xs font-bold text-judicial-700 bg-gray-50/50 align-top"><Field data={person.role} onViewSource={onViewSource} /></td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 align-top"><Field data={person.name} onViewSource={onViewSource} /></td>
                          <td className="px-4 py-3 text-sm text-gray-600 font-mono align-top"><Field data={person.rut} onViewSource={onViewSource} /></td>
                          <td className="px-4 py-3 text-sm text-gray-600 align-top">
                             <div className="space-y-1">
                                <Field data={person.phones} onViewSource={onViewSource} />
                                <div className="text-xs text-gray-400"><Field data={person.address} onViewSource={onViewSource} /></div>
                             </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 align-top"><Field data={person.nationality} onViewSource={onViewSource} /></td>
                       </tr>
                    ))}
                 </tbody>
              </table>
            </div>
         </div>
      </div>

      {/* DENUNCIA */}
      <div className="space-y-3">
         <h3 className="text-lg font-serif font-bold text-judicial-900 flex items-center border-l-4 border-judicial-600 pl-3">
            Detalle de la Denuncia
         </h3>
         <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 to-judicial-400"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
               <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Denunciante</span>
                  <div className="text-base font-semibold text-judicial-900"><Field data={data.denunciant} onViewSource={onViewSource} /></div>
               </div>
               <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Fecha</span>
                  <div className="text-base font-semibold text-judicial-900"><Field data={data.complaintDate} onViewSource={onViewSource} /></div>
               </div>
            </div>
            <div className="space-y-4">
               <div>
                  <h4 className="text-sm font-bold text-judicial-800 mb-2 uppercase tracking-wide border-b border-gray-100 pb-1">Motivo</h4>
                  <div className="bg-red-50/50 p-4 rounded-lg border border-red-100 text-gray-800 text-sm leading-relaxed"><Field data={data.motive} onViewSource={onViewSource} /></div>
               </div>
               <div>
                   <h4 className="text-sm font-bold text-judicial-800 mb-2 uppercase tracking-wide border-b border-gray-100 pb-1">Hechos</h4>
                   <div className="text-gray-700 text-sm leading-relaxed text-justify"><Field data={data.facts} onViewSource={onViewSource} /></div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );

  const toggleDossierItem = (key: string) => {
    setExpandedDossierItem(expandedDossierItem === key ? null : key);
  };

  const renderDossierCard = (key: string, title: string, item: DossierItem, icon: React.ReactNode) => {
    const isExpanded = expandedDossierItem === key;
    const theme = DOSSIER_THEMES[key] || DOSSIER_THEMES.default;
    
    // Quick preview text (first 100 chars)
    const previewText = typeof item.content === 'string' ? item.content.substring(0, 120) + "..." : "Sin información";

    return (
      <div className={`rounded-xl border transition-all duration-300 mb-5 overflow-hidden shadow-sm ${isExpanded ? 'ring-2 ring-offset-2 ring-gray-100' : 'hover:shadow-md'}`}>
        {/* Header Clickable - High Contrast */}
        <button 
          onClick={() => toggleDossierItem(key)}
          className={`w-full text-left px-5 py-4 flex items-center justify-between focus:outline-none transition-colors ${theme.bgHeader} ${theme.textHeader}`}
        >
          <div className="flex items-center space-x-4">
            <div className={`p-2 rounded-lg ${theme.iconBg} backdrop-blur-sm`}>
              {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5 text-white" })}
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm md:text-base tracking-wide">{title}</h3>
              {!isExpanded && (
                <p className="text-xs opacity-80 mt-1 font-medium truncate max-w-md">{previewText}</p>
              )}
            </div>
          </div>
          <div className="transform transition-transform duration-300">
             {isExpanded ? <ChevronUp className="w-6 h-6 text-white" /> : <ChevronDown className="w-6 h-6 text-white/70 hover:text-white" />}
          </div>
        </button>

        {/* Expanded Content */}
        {isExpanded && (
           <div className="border-t border-gray-100 p-5 bg-white">
              <StrategicCanvas item={item} title={title} icon={icon} colorTheme={theme} />
           </div>
        )}
      </div>
    );
  };

  const renderDossierAnalysis = () => (
    <div className="space-y-2 pb-10">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 rounded-xl border border-slate-700 mb-8 flex items-start shadow-md text-white">
        <Lightbulb className="w-6 h-6 text-yellow-400 mr-4 mt-1 flex-shrink-0 animate-pulse" />
        <div>
          <h3 className="font-bold text-sm mb-1 text-white">Guía Metodológica Interactiva</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
             Haga clic en cada tarjeta de color para desplegar el <strong>Lienzo Estratégico</strong>. Hemos aplicado un filtro estricto para mostrar únicamente información relevante para la derivación a <strong>DCE San Bernardo</strong>.
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        {renderDossierCard("identification", "1. Identificación del NNA", data.dossier.identification, <User />)}
        {renderDossierCard("typologies", "2. Tipologías de Maltrato", data.dossier.typologies, <AlertTriangle />)}
        {renderDossierCard("gravity", "3. Nivel de Gravedad", data.dossier.gravity, <Scale />)}
        {renderDossierCard("careNeeds", "4. Necesidades de Cuidado", data.dossier.careNeeds, <CheckSquare />)}
        {renderDossierCard("impact", "5. Impacto Biopsicosocial", data.dossier.impact, <Zap />)}
        {renderDossierCard("methodologies", "6. Metodologías Recomendadas", data.dossier.methodologies, <Search />)}
        {renderDossierCard("parentalCapabilities", "7. Capacidades Parentales", data.dossier.parentalCapabilities, <User />)}
        {renderDossierCard("riskFactors", "8. Factores de Riesgo y Protección", data.dossier.riskFactors, <ShieldAlert />)}
        {renderDossierCard("synthesis", "9. Síntesis Técnica", data.dossier.synthesis, <FileText />)}
        {renderDossierCard("warnings", "10. Advertencias Técnicas", data.dossier.warnings, <AlertTriangle />)}
      </div>
    </div>
  );

  const renderTechnical = () => (
    <div className="space-y-4">
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
        <h3 className="text-lg font-serif font-bold text-slate-900 mb-4 flex items-center">
          <Scale className="w-5 h-5 mr-2" />
          Análisis Técnico-Jurídico
        </h3>
        <div className="prose prose-sm max-w-none text-slate-800 text-justify">
          <ReactMarkdown>{data.technicalAnalysis}</ReactMarkdown>
        </div>
      </div>
    </div>
  );

  const handleCopyJSON = () => {
    const textToCopy = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    // Generate a concise summary
    const rit = data.rit.value;
    const hearing = data.hearings.length > 0 ? data.hearings[0].date.value : "No programada";
    
    // Format parties
    const peopleList = data.people
      .map(p => `• ${p.role.value}: ${p.name.value}`)
      .join('\n');

    // Overview of complaint (truncate if very long for "concise" request)
    let overview = data.motive.value;
    if (overview.length > 500) {
      overview = overview.substring(0, 500) + " [...]";
    }

    const shareText = [
      `📁 FICHA DE CASO: ${rit}`,
      `📅 PRÓX. AUDIENCIA: ${hearing}`,
      ``,
      `👥 INVOLUCRADOS (DCE SAN BERNARDO):`,
      peopleList,
      ``,
      `📝 RESUMEN DENUNCIA:`,
      overview,
      ``,
      `--- Generado por Asistente Jurídico AI ---`
    ].join('\n');

    navigator.clipboard.writeText(shareText);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  // --- BUTTON CONFIG ---
  const views: { id: ViewMode; label: string; icon: React.ElementType }[] = [
    { id: 'narrative', label: 'Datos Básicos', icon: AlignLeft },
    { id: 'dossier', label: 'Análisis Dossier', icon: ClipboardCheck },
    { id: 'technical', label: 'Análisis Jurídico', icon: Scale },
  ];

  return (
    <div className={`w-full bg-white rounded-xl shadow-lg border border-judicial-200 overflow-hidden flex flex-col h-full ${isSplitView ? 'rounded-none border-0 shadow-none' : 'max-w-4xl mx-auto max-h-[calc(100vh-12rem)]'}`}>
      {/* Header */}
      {!isSplitView && (
        <div className="bg-judicial-800 px-4 py-3 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center space-x-2 text-white overflow-hidden">
            <FileText className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium text-sm truncate">{fileData?.name || 'Documento'}</span>
          </div>
          <div className="flex space-x-2">
            {onDownloadFile && (
              <button onClick={onDownloadFile} className="p-1.5 text-judicial-200 hover:text-white rounded hover:bg-judicial-700 transition-colors" title="Descargar Original">
                <Download className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={handleShare} 
              className={`p-1.5 rounded hover:bg-judicial-700 transition-colors ${shared ? 'text-green-400' : 'text-judicial-200 hover:text-white'}`}
              title="Copiar Resumen del Caso"
            >
              {shared ? <CheckCheck className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button onClick={handleCopyJSON} className="p-1.5 text-judicial-200 hover:text-white rounded hover:bg-judicial-700 transition-colors" title="Copiar Datos JSON">
              {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Toolbar for Views */}
      <div className="bg-judicial-50 border-b border-judicial-200 p-2 flex overflow-x-auto space-x-1 custom-scrollbar flex-shrink-0 sticky top-0 z-10">
        {views.map((v) => (
          <button
            key={v.id}
            onClick={() => setViewMode(v.id)}
            className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
              viewMode === v.id
                ? 'bg-white text-judicial-800 shadow-sm border border-judicial-200'
                : 'text-judicial-500 hover:bg-judicial-100 hover:text-judicial-700'
            }`}
          >
            <v.icon className={`w-4 h-4 ${viewMode === v.id ? 'text-judicial-600' : ''}`} />
            <span>{v.label}</span>
          </button>
        ))}
      </div>
      
      {/* Content Area */}
      <div className="p-6 overflow-y-auto flex-1 bg-white">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {viewMode === 'narrative' && renderStructuredReport()}
          {viewMode === 'dossier' && renderDossierAnalysis()}
          {viewMode === 'technical' && renderTechnical()}
        </div>
      </div>
      
      {/* Footer */}
      <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 text-[10px] text-gray-400 text-center flex-shrink-0">
        <span className="flex items-center justify-center">
          <Info className="w-3 h-3 mr-1" />
          Haga clic en los textos para ver la fuente original en el documento.
        </span>
      </div>
    </div>
  );
};
