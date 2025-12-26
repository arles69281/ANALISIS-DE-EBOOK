
import { GoogleGenAI, Type } from "@google/genai";
import { FileData, SearchResult, CaseData, SourceData, DossierItem, PersonEntity } from '../types';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

const ANALYSIS_SYSTEM_PROMPT = `Actúa como un/a supervisor/a clínico/a experto/a en infancia vulnerada y auditoría forense de expedientes del Poder Judicial Chileno (Tribunales de Familia).

**INSTRUCCIÓN CRÍTICA DE PROCESAMIENTO:**
Realiza una lectura **EXHAUSTIVA Y DETALLADA** de todo el documento. Tu prioridad es la **COMPLETITUD** de la información. No resumas si eso implica perder nombres, fechas exactas o detalles sutiles.

**FILTRO DE POBLACIÓN OBJETIVO (MANDATORIO):**
Al extraer los datos, debes aplicar el siguiente filtro estricto:
1. **CRITERIO DE INCLUSIÓN:** Informar ÚNICAMENTE sobre los NNA (Niños, Niñas y Adolescentes) que han sido derivados o mantienen medida de protección vigente en **DCE SAN BERNARDO** (o programas residenciales de administración directa relacionados a esa ubicación específica).
2. **CRITERIO DE EXCLUSIÓN:** NO extraer datos ni generar fichas de NNA que hayan sido derivados exclusivamente a otros programas como **TIKUM**, PPF, PRM, u otras residencias, a menos que también tengan una medida simultánea en DCE San Bernardo.

Tus objetivos son:
1. **EXTRACCIÓN FORENSE:** Localizar cada dato solicitado con precisión quirúrgica (citando página y texto textual).
2. **ANÁLISIS ESTRATÉGICO:** Para el Dossier, no solo describas, **DISEÑA** una intervención evaluativa compleja.

--- DIRECTRICES DE EXTRACCIÓN ---

1. **IDENTIFICACIÓN DE NNA (APLICAR FILTRO DCE SAN BERNARDO):**
   - Busca la resolución judicial más reciente.
   - Extrae como Rol "NNA" solo a los que cumplan el criterio de inclusión.

2. **IDENTIFICACIÓN DEL ADULTO RESPONSABLE:**
   - Identifica quién tiene el cuidado personal actual o quién es el adulto protector principal.
   - Si hay dudas sobre la competencia parental, regístralo en "Observaciones".

3. **ANÁLISIS TÉCNICO (DOSSIER - 10 DIMENSIONES):**
   - **Contenido:** Debe ser rico en detalles. Si el expediente menciona un episodio de violencia, describe: quién, cuándo, cómo y qué consecuencias hubo.
   - **Estrategia (IMPORTANTE):** Piensa paso a paso. ¿Qué harías tú como perito? Ej: "1. Solicitar antecedentes escolares", "2. Entrevista reservada para evaluar x", "3. Aplicar escala de parentalidad".
   - **Herramientas:** Sé técnico. Sugiere instrumentos reales (NCFAS-G, PSI, E2P, Test de Rorschach, Hora de Juego, Genograma Trigeneracional).

4. **MATRIZ DE DATOS:**
   - RIT, Fechas, Rut y Nombres deben ser exactos.
   - Si un dato aparece en múltiples páginas, cita la ocurrencia más relevante o reciente.

La respuesta debe seguir estrictamente el siguiente esquema JSON, sin texto adicional fuera del JSON.
`;

// Helper to define the specific source schema to avoid repetition
const sourceSchema = {
  type: Type.OBJECT,
  properties: {
    value: { type: Type.STRING, description: "El dato extraído con el máximo detalle posible." },
    page: { type: Type.INTEGER, description: "Número de página donde aparece (1-indexed). 0 si no existe." },
    quote: { type: Type.STRING, description: "Cita textual exacta del documento que respalda el dato." }
  },
  required: ["value", "page", "quote"]
};

// Helper for the new Dossier Item structure
const dossierItemSchema = {
  type: Type.OBJECT,
  properties: {
    content: { type: Type.STRING, description: "Análisis factual detallado y extenso de la dimensión." },
    strategy: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING }, 
      description: "Pasos secuenciales detallados para evaluar esta dimensión." 
    },
    tools: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING }, 
      description: "Nombres técnicos de instrumentos o técnicas sugeridas." 
    }
  },
  required: ["content", "strategy", "tools"]
};

// Helper function to deduplicate people list
const deduplicatePeople = (people: PersonEntity[]): PersonEntity[] => {
  const uniqueMap = new Map<string, PersonEntity>();

  const normalizeRUT = (rut: string) => {
    if (!rut || rut.length < 5) return null;
    return rut.replace(/[^0-9kK]/g, '').toUpperCase();
  };

  const normalizeName = (name: string) => {
    if (!name) return "";
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  };

  people.forEach(person => {
    const rawRut = person.rut.value;
    const rawName = person.name.value;
    
    const cleanRut = normalizeRUT(rawRut);
    const cleanName = normalizeName(rawName);

    // Prioridad 1: Clave por RUT
    let key = cleanRut ? `RUT:${cleanRut}` : null;
    
    // Prioridad 2: Clave por Nombre (si no hay RUT)
    if (!key && cleanName.length > 3) {
      key = `NAME:${cleanName}`;
    }

    if (key) {
      if (uniqueMap.has(key)) {
        // Si ya existe, nos quedamos con el que tenga rol "NNA" explícito si el actual no lo es
        const existing = uniqueMap.get(key)!;
        const currentIsNNA = person.role.value.toUpperCase().includes('NNA');
        const existingIsNNA = existing.role.value.toUpperCase().includes('NNA');

        if (currentIsNNA && !existingIsNNA) {
           uniqueMap.set(key, person); // Reemplazar con la versión que tiene rol NNA
        }
        // Si ambos son NNA o ninguno, mantenemos el primero (asumiendo que es el principal detectado)
      } else {
        uniqueMap.set(key, person);
      }
    } else {
      // Si no hay datos suficientes para identificar unicidad, lo agregamos (caso borde)
      uniqueMap.set(`RAW:${rawName}`, person);
    }
  });

  return Array.from(uniqueMap.values());
};

export const analyzeCaseFile = async (caseFile: FileData, referenceFiles: FileData[] = []): Promise<{ rit: string; data: CaseData }> => {
  try {
    const parts: any[] = [{ text: ANALYSIS_SYSTEM_PROMPT }];

    // 1. Add Reference Files
    if (referenceFiles.length > 0) {
        parts.push({ text: "--- INICIO DE DOCUMENTOS DE REFERENCIA TÉCNICA (Usar como base metodológica) ---" });
        for (const refFile of referenceFiles) {
            parts.push({
                inlineData: {
                    mimeType: refFile.mimeType,
                    data: refFile.base64
                }
            });
        }
        parts.push({ text: "--- FIN DE DOCUMENTOS DE REFERENCIA ---" });
    }

    // 2. Add the Case File
    parts.push({ text: "--- INICIO DEL EXPEDIENTE DEL CASO A ANALIZAR ---" });
    parts.push({
        inlineData: {
            mimeType: caseFile.mimeType,
            data: caseFile.base64
        }
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: {
        thinkingConfig: {
          thinkingBudget: 32768, // Maximum thinking budget for thorough analysis
        },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rit: { ...sourceSchema, description: "RIT de la causa (Ej: P-1234-2024)." },
            tribunal: { ...sourceSchema, description: "Tribunal competente (Ej: Juzgado de Familia de San Bernardo)." },
            causeType: { ...sourceSchema, description: "Materia o tipo de causa (Ej: Medida de Protección)." },
            
            denunciant: { ...sourceSchema, description: "Nombre completo de quien realiza la denuncia o requerimiento." },
            complaintMethod: { ...sourceSchema, description: "Vía de ingreso (Ej: Oficio, Parte Policial, Demanda)." },
            complaintDate: { ...sourceSchema, description: "Fecha exacta de la denuncia o inicio de causa." },
            receivingInstitution: { ...sourceSchema, description: "Institución que acogió el requerimiento inicial (Carabineros, PDI, OPD)." },
            motive: { ...sourceSchema, description: "Motivo detallado y extenso de la vulneración o requerimiento." },
            facts: { ...sourceSchema, description: "Relato circunstanciado de los hechos constitutivos de vulneración." },
            measures: { ...sourceSchema, description: "Medidas cautelares o decretadas por el tribunal." },

            people: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  role: { ...sourceSchema, description: "Rol estandarizado (NNA, Madre, Padre, Abuela Materna, Agresor, etc)." },
                  name: sourceSchema,
                  rut: sourceSchema,
                  dob: sourceSchema,
                  phones: sourceSchema,
                  address: sourceSchema,
                  link: sourceSchema,
                  participation: sourceSchema,
                  observations: sourceSchema,
                  nationality: { ...sourceSchema, description: "Nacionalidad." }
                },
                required: ["role", "name", "rut", "nationality"]
              }
            },

            citations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: sourceSchema,
                  date: sourceSchema,
                  motive: sourceSchema
                }
              }
            },
            hearings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: sourceSchema,
                  time: sourceSchema,
                  type: sourceSchema,
                  attendees: sourceSchema,
                  motive: sourceSchema,
                  tribunal: sourceSchema
                }
              }
            },
            chronology: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: sourceSchema,
                  event: sourceSchema
                }
              }
            },
            
            dossier: {
                type: Type.OBJECT,
                description: "Análisis técnico estructurado en 10 dimensiones.",
                properties: {
                    identification: { ...dossierItemSchema, description: "1. Identificación del NNA" },
                    typologies: { ...dossierItemSchema, description: "2. Tipologías de Maltrato" },
                    gravity: { ...dossierItemSchema, description: "3. Nivel de Gravedad" },
                    careNeeds: { ...dossierItemSchema, description: "4. Necesidades de Cuidado" },
                    impact: { ...dossierItemSchema, description: "5. Impacto Biopsicosocial" },
                    methodologies: { ...dossierItemSchema, description: "6. Metodologías de Observación" },
                    parentalCapabilities: { ...dossierItemSchema, description: "7. Capacidades Parentales" },
                    riskFactors: { ...dossierItemSchema, description: "8. Factores de Riesgo y Protectores" },
                    synthesis: { ...dossierItemSchema, description: "9. Síntesis Técnica" },
                    warnings: { ...dossierItemSchema, description: "10. Advertencias Técnicas" }
                },
                required: ["identification", "typologies", "gravity", "careNeeds", "impact", "methodologies", "parentalCapabilities", "riskFactors", "synthesis", "warnings"]
            },

            technicalAnalysis: { type: Type.STRING, description: "Resumen ejecutivo legal del caso." }, 
            missingInfo: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["rit", "people", "motive", "facts", "tribunal", "dossier"]
        }
      }
    });

    if (response.text) {
      try {
        const jsonResponse = JSON.parse(response.text);
        
        const safeData = (input: any): SourceData => ({
            value: input?.value || "NO SE CONSIGNA",
            page: input?.page || 0,
            quote: input?.quote || ""
        });

        const safeDossierItem = (input: any): DossierItem => ({
            content: input?.content || "Información no disponible.",
            strategy: Array.isArray(input?.strategy) ? input.strategy : [],
            tools: Array.isArray(input?.tools) ? input.tools : []
        });

        // Extract and deduplicate people FIRST
        const rawPeople = Array.isArray(jsonResponse.people) ? jsonResponse.people.map((p: any) => ({
             role: safeData(p.role),
             name: safeData(p.name),
             rut: safeData(p.rut),
             dob: safeData(p.dob),
             phones: safeData(p.phones),
             address: safeData(p.address),
             link: safeData(p.link),
             participation: safeData(p.participation),
             observations: safeData(p.observations),
             nationality: safeData(p.nationality),
        })) : [];

        const cleanPeople = deduplicatePeople(rawPeople);

        const caseData: CaseData = {
          rit: safeData(jsonResponse.rit),
          tribunal: safeData(jsonResponse.tribunal),
          causeType: safeData(jsonResponse.causeType),
          denunciant: safeData(jsonResponse.denunciant),
          complaintMethod: safeData(jsonResponse.complaintMethod),
          complaintDate: safeData(jsonResponse.complaintDate),
          receivingInstitution: safeData(jsonResponse.receivingInstitution),
          motive: safeData(jsonResponse.motive),
          facts: safeData(jsonResponse.facts),
          measures: safeData(jsonResponse.measures),
          
          people: cleanPeople,

          citations: Array.isArray(jsonResponse.citations) ? jsonResponse.citations.map((c: any) => ({
            name: safeData(c.name),
            date: safeData(c.date),
            motive: safeData(c.motive)
          })) : [],

          hearings: Array.isArray(jsonResponse.hearings) ? jsonResponse.hearings.map((h: any) => ({
             date: safeData(h.date),
             time: safeData(h.time),
             type: safeData(h.type),
             attendees: safeData(h.attendees),
             motive: safeData(h.motive),
             tribunal: safeData(h.tribunal)
          })) : [],

          chronology: Array.isArray(jsonResponse.chronology) ? jsonResponse.chronology.map((c: any) => ({
             date: safeData(c.date),
             event: safeData(c.event)
          })) : [],
          
          dossier: {
            identification: safeDossierItem(jsonResponse.dossier?.identification),
            typologies: safeDossierItem(jsonResponse.dossier?.typologies),
            gravity: safeDossierItem(jsonResponse.dossier?.gravity),
            careNeeds: safeDossierItem(jsonResponse.dossier?.careNeeds),
            impact: safeDossierItem(jsonResponse.dossier?.impact),
            methodologies: safeDossierItem(jsonResponse.dossier?.methodologies),
            parentalCapabilities: safeDossierItem(jsonResponse.dossier?.parentalCapabilities),
            riskFactors: safeDossierItem(jsonResponse.dossier?.riskFactors),
            synthesis: safeDossierItem(jsonResponse.dossier?.synthesis),
            warnings: safeDossierItem(jsonResponse.dossier?.warnings),
          },

          technicalAnalysis: jsonResponse.technicalAnalysis || "No disponible",
          missingInfo: jsonResponse.missingInfo || []
        };

        return {
          rit: caseData.rit.value,
          data: caseData
        };
      } catch (e) {
        console.error("Error parsing JSON response", e);
        throw new Error("Error al procesar la respuesta de la IA.");
      }
    }
    throw new Error("No se pudo generar el análisis.");
  } catch (error) {
    console.error("Error analyzing file:", error);
    throw error;
  }
};

export const searchLegalContext = async (query: string): Promise<SearchResult> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Investiga y responde detalladamente sobre el siguiente tema legal en Chile: ${query}`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const answer = response.text || "No se pudo generar una respuesta.";
    const sources: Array<{ title: string; uri: string }> = [];

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (groundingChunks) {
      for (const chunk of groundingChunks) {
        if (chunk.web) {
          sources.push({
            title: chunk.web.title || "Fuente Web",
            uri: chunk.web.uri || "#"
          });
        }
      }
    }

    return {
      query,
      answer,
      sources
    };
  } catch (error) {
    console.error("Error in searchLegalContext:", error);
    throw new Error("Error al realizar la búsqueda legal.");
  }
};
