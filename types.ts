
export enum AnalysisStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface AnalysisResult {
  markdown: string;
  modelUsed: string;
  timestamp: Date;
}

export interface SearchResult {
  query: string;
  answer: string;
  sources: Array<{ title: string; uri: string }>;
}

export interface FileData {
  base64: string;
  mimeType: string;
  name: string;
}

// Nueva interfaz para trazabilidad de datos
export interface SourceData {
  value: string;
  page: number; // 0 si no se encuentra
  quote: string; // Cita textual del documento
}

// Nueva entidad detallada por persona con trazabilidad
export interface PersonEntity {
  role: SourceData;          
  name: SourceData;          
  rut: SourceData;           
  dob: SourceData;           
  phones: SourceData;        
  address: SourceData;       
  link: SourceData;          
  participation: SourceData; 
  observations: SourceData;
  nationality: SourceData; // Added field
}

export interface Hearing {
  date: SourceData;
  time: SourceData;
  type: SourceData;
  attendees: SourceData; 
  motive: SourceData;
  tribunal: SourceData;
}

// Estructura detallada para cada punto del Dossier
export interface DossierItem {
  content: string; // La información extraída del expediente
  strategy: string[]; // Lista de pasos o sugerencias metodológicas
  tools: string[]; // Herramientas sugeridas (Test, tipos de entrevista, etc)
}

// Estructura del Dossier basada en el prompt del usuario
export interface DossierAnalysis {
  identification: DossierItem;
  typologies: DossierItem;
  gravity: DossierItem;
  careNeeds: DossierItem;
  impact: DossierItem;
  methodologies: DossierItem;
  parentalCapabilities: DossierItem;
  riskFactors: DossierItem;
  synthesis: DossierItem;
  warnings: DossierItem;
}

export interface CaseData {
  rit: SourceData;
  // Metadata del proceso
  tribunal: SourceData;
  causeType: SourceData; 
  
  // Hechos y Denuncia (Extenso)
  denunciant: SourceData; 
  complaintMethod: SourceData;
  complaintDate: SourceData; // Added field
  receivingInstitution: SourceData; 
  motive: SourceData; 
  facts: SourceData; 
  measures: SourceData; 

  // Listas detalladas
  people: PersonEntity[]; 
  citations: Array<{ name: SourceData; date: SourceData; motive: SourceData }>;
  hearings: Hearing[];
  chronology: Array<{ date: SourceData; event: SourceData }>;
  
  // Nuevo Análisis Estructurado (Dossier)
  dossier: DossierAnalysis;
  missingInfo: string[];
  technicalAnalysis: string;
}

export interface CaseRecord {
  id: string;
  fileName: string;
  uploadDate: Date;
  analysis: CaseData;
  fileData: FileData;
  summary?: string; 
  status?: AnalysisStatus;
  pageCount?: number; // Added for sorting
}
