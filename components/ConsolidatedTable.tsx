
import React, { useState } from 'react';
import { CaseRecord } from '../types';
import { FileText, Copy, Check, ClipboardList } from 'lucide-react';

interface ConsolidatedTableProps {
  cases: CaseRecord[];
}

export const ConsolidatedTable: React.FC<ConsolidatedTableProps> = ({ cases }) => {
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null);
  const [tableCopied, setTableCopied] = useState(false);

  // --- HELPERS DE FORMATO ---

  // 1. Convertir a "Nombre Propio" (Title Case)
  const toTitleCase = (str: string) => {
    if (!str) return "";
    return str.toLowerCase().replace(/(?:^|\s|['"(-])\S/g, (match) => match.toUpperCase());
  };

  // 2. Separar nombres y apellidos aplicando Title Case
  const parseName = (fullName: string) => {
    const cleanName = fullName.replace(/['"]/g, '').trim();
    const titleCased = toTitleCase(cleanName);
    const parts = titleCased.split(/\s+/);
    
    if (parts.length === 0) return { names: '', last1: '', last2: '' };
    if (parts.length === 1) return { names: parts[0], last1: '', last2: '' };
    if (parts.length === 2) return { names: parts[0], last1: parts[1], last2: '' };
    
    // Asumimos formato estándar: [Nombres...] [Apellido1] [Apellido2]
    const last2 = parts.pop() || '';
    const last1 = parts.pop() || '';
    const names = parts.join(' ');
    
    return { names, last1, last2 };
  };

  // 3. Formatear Fecha a Numérico (DD-MM-YYYY)
  const formatDateNumeric = (dateStr: string) => {
    if (!dateStr || dateStr.toLowerCase().includes("no") || dateStr.length < 3) return "";

    // Mapeo de meses para conversión de texto
    const months: {[key: string]: string} = {
        'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04', 'mayo': '05', 'junio': '06',
        'julio': '07', 'agosto': '08', 'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
    };

    // Intento 1: Texto natural "16 de febrero de 2026" o "16 de febrero del 2026"
    const textMatch = dateStr.toLowerCase().match(/(\d{1,2})\s+de\s+([a-z]+)\s+(?:de|del)\s+(\d{4})/);
    if (textMatch) {
        const day = textMatch[1].padStart(2, '0');
        const month = months[textMatch[2]];
        const year = textMatch[3];
        if (month) return `${day}-${month}-${year}`;
    }

    // Intento 2: DD/MM/YYYY o DD-MM-YYYY
    const digitMatch = dateStr.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
    if (digitMatch) {
         return `${digitMatch[1].padStart(2, '0')}-${digitMatch[2].padStart(2, '0')}-${digitMatch[3]}`;
    }

    // Retornar original si falla (aunque intentaremos que sea numérico)
    return dateStr;
  };

  // 4. Formatear Teléfono (9 XXXX XXXX)
  const formatPhone = (phone: string) => {
    // Eliminar todo lo que no sea número
    const digits = phone.replace(/\D/g, '');
    
    // Manejar prefijo 56 si existe
    let core = digits;
    if (digits.startsWith('569')) {
        core = digits.substring(2); // Dejar solo desde el 9
    }

    // Si tiene 9 dígitos y empieza con 9
    if (core.length === 9 && core.startsWith('9')) {
        // Formato: 9 4003 6581
        return `${core[0]} ${core.substring(1, 5)} ${core.substring(5)}`;
    }
    
    // Si no calza, devolver original limpio
    return phone;
  };

  // 5. Simplificar Relación (Madre / Padre)
  const formatRelationship = (role: string) => {
      const lower = role.toLowerCase();
      if (lower.includes('madre')) return "Madre";
      if (lower.includes('padre')) return "Padre";
      return toTitleCase(role);
  };

  // 6. Formatear Dirección (Title Case + Comuna MAYÚSCULA)
  const formatAddress = (addr: string) => {
      let formatted = toTitleCase(addr);
      
      // Lista de comunas comunes para forzar mayúsculas
      const communes = [
          "San Bernardo", "Calera De Tango", "Buin", "Paine", "El Bosque", 
          "La Pintana", "San Ramon", "Santiago", "Puente Alto", "La Cisterna",
          "Lo Espejo", "San Miguel", "Talagante", "Isla De Maipo"
      ];

      communes.forEach(communeTitle => {
          // Reemplazar la versión Title Case por Upper Case
          const regex = new RegExp(communeTitle, "g"); // "g" para global
          formatted = formatted.replace(regex, communeTitle.toUpperCase());
      });

      return formatted;
  };


  // Función que ahora devuelve un ARRAY de filas (una por cada NNA)
  const processRows = (record: CaseRecord) => {
    const data = record.analysis;
    
    // 1. Filtrar TODOS los NNAs que la IA detectó
    const rawNnaList = data.people.filter(p => {
        const role = p.role.value.toLowerCase();
        return role.includes('nna') || role.includes('niño') || role.includes('niña') || role.includes('adolescente') || role.includes('hijo') || role.includes('hija');
    });

    // 2. DEDUPLICAR NNAs para la tabla (Safety net extra)
    // Aunque el servicio lo haga, la tabla necesita asegurarse de no pintar dos filas para la misma persona si el rol varía ligeramente.
    const uniqueNnaMap = new Map();
    rawNnaList.forEach(nna => {
        const cleanRut = nna.rut.value.replace(/[^0-9kK]/g, '').toUpperCase();
        const cleanName = nna.name.value.toLowerCase().trim();
        const key = cleanRut.length > 5 ? cleanRut : cleanName; // Usar RUT si existe, sino Nombre
        if (key && !uniqueNnaMap.has(key)) {
            uniqueNnaMap.set(key, nna);
        }
    });
    const nnaList = Array.from(uniqueNnaMap.values());


    // 3. Adulto Responsable (Se busca el mejor candidato y se usa para TODOS los NNA del caso)
    const adult = data.people.find(p => {
        const role = p.role.value.toLowerCase();
        return (role.includes('madre') || role.includes('padre') || role.includes('abuel') || role.includes('tía') || role.includes('tío') || role.includes('cuidada')) 
               && !role.includes('nna');
    });

    // Datos comunes para el caso
    const nextHearingRaw = data.hearings.length > 0 ? data.hearings[0].date.value : "";
    const nextHearingFormatted = formatDateNumeric(nextHearingRaw);
    const adultNameFull = adult ? toTitleCase(adult.name.value) : 'No Identificado';
    const adultRel = adult ? formatRelationship(adult.role.value) : '-';
    const adultPhone = adult ? formatPhone(adult.phones.value) : '-';
    const adultAddress = adult ? formatAddress(adult.address.value) : '-';

    // Si no hay NNA detectado, devolvemos una fila genérica
    if (nnaList.length === 0) {
        return [{
            id: record.id,
            uniqueKey: `${record.id}-0`,
            nnaNames: 'No Identificado',
            nnaLast1: '',
            nnaLast2: '',
            nnaRut: '-',
            fechaEntrega: "", 
            rit: data.rit.value,
            audiencia: nextHearingFormatted,
            adultoNombre: adultNameFull,
            adultoRelacion: adultRel,
            adultoRut: adult ? adult.rut.value : '-',
            adultoTelefono: adultPhone,
            adultoDireccion: adultAddress
        }];
    }

    // Generar una fila por cada NNA encontrado (Deduplicado)
    return nnaList.map((nna, index) => {
        const nnaNameParsed = parseName(nna.name.value);
        return {
            id: record.id,
            uniqueKey: `${record.id}-${index}`, // Clave única para React
            nnaNames: nnaNameParsed.names,
            nnaLast1: nnaNameParsed.last1,
            nnaLast2: nnaNameParsed.last2,
            nnaRut: nna.rut.value,
            fechaEntrega: "", 
            rit: data.rit.value,
            audiencia: nextHearingFormatted,
            adultoNombre: adultNameFull,
            adultoRelacion: adultRel,
            adultoRut: adult ? adult.rut.value : '-',
            adultoTelefono: adultPhone,
            adultoDireccion: adultAddress
        };
    });
  };

  // Aplanamos el array de arrays para tener una lista simple de filas
  const flatRows = cases.flatMap(processRows);

  // Genera el string formateado para el portapapeles (Separado por TABs)
  const generateRowString = (row: typeof flatRows[0]) => {
    return [
        row.nnaNames,
        row.nnaLast1,
        row.nnaLast2,
        row.nnaRut,
        row.fechaEntrega, 
        row.rit,
        row.audiencia,
        row.adultoNombre,
        row.adultoRelacion,
        row.adultoRut,
        row.adultoTelefono,
        `"${row.adultoDireccion}"` // Dirección entre comillas
    ].join('\t');
  };

  const handleCopyRow = (row: typeof flatRows[0]) => {
    const str = generateRowString(row);
    navigator.clipboard.writeText(str);
    setCopiedRowId(row.uniqueKey);
    setTimeout(() => setCopiedRowId(null), 2000);
  };

  const handleCopyTable = () => {
    const allRowsStr = flatRows.map(generateRowString).join('\n');
    navigator.clipboard.writeText(allRowsStr);
    setTableCopied(true);
    setTimeout(() => setTableCopied(false), 2000);
  };

  if (cases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
        <FileText className="w-12 h-12 mb-4 opacity-20" />
        <p>No hay casos cargados para mostrar en la tabla.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-judicial-200 overflow-hidden">
      <div className="bg-judicial-50 px-4 py-3 border-b border-judicial-200 flex justify-between items-center">
        <h3 className="font-serif font-bold text-judicial-800 text-sm flex items-center">
            <span className="bg-green-600 text-white p-1 rounded mr-2">
                <FileText className="w-3 h-3" />
            </span>
            Matriz Consolidada de Casos ({flatRows.length})
        </h3>
        <button 
            className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tableCopied 
                ? 'bg-green-100 text-green-700 border border-green-200' 
                : 'bg-white text-judicial-700 border border-judicial-200 hover:bg-judicial-50'
            }`}
            onClick={handleCopyTable}
        >
            {tableCopied ? <Check className="w-3 h-3 mr-1.5" /> : <ClipboardList className="w-3 h-3 mr-1.5" />}
            {tableCopied ? 'Copiada' : 'Copiar Tabla'}
        </button>
      </div>
      
      <div className="flex-1 overflow-auto">
        <table className="min-w-full text-xs text-left border-collapse">
          <thead className="bg-gray-100 text-gray-700 font-bold sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-3 py-3 border-b border-gray-300 min-w-[150px]">NOMBRES NNA</th>
              <th className="px-3 py-3 border-b border-gray-300 min-w-[120px]">PRIMER APELLIDO</th>
              <th className="px-3 py-3 border-b border-gray-300 min-w-[120px]">SEGUNDO APELLIDO</th>
              <th className="px-3 py-3 border-b border-gray-300 min-w-[100px]">RUT NNA</th>
              <th className="px-3 py-3 border-b border-gray-300 min-w-[100px] text-gray-400">FECHA ENTREGA</th>
              <th className="px-3 py-3 border-b border-gray-300 min-w-[100px]">RIT</th>
              <th className="px-3 py-3 border-b border-gray-300 min-w-[100px]">AUDIENCIA</th>
              <th className="px-3 py-3 border-b border-gray-300 min-w-[150px] bg-amber-50">ADULTO RESPONSABLE</th>
              <th className="px-3 py-3 border-b border-gray-300 min-w-[100px] bg-amber-50">RELACIÓN</th>
              <th className="px-3 py-3 border-b border-gray-300 min-w-[100px] bg-amber-50">RUT ADULTO</th>
              <th className="px-3 py-3 border-b border-gray-300 min-w-[120px] bg-amber-50">TELÉFONO</th>
              <th className="px-3 py-3 border-b border-gray-300 min-w-[200px] bg-amber-50">DIRECCIÓN</th>
              <th className="px-3 py-3 border-b border-gray-300 min-w-[50px] text-center sticky right-0 bg-gray-100 shadow-l-md">COPIAR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {flatRows.map((row) => (
              <tr key={row.uniqueKey} className="hover:bg-blue-50 transition-colors even:bg-slate-50 group">
                <td className="px-3 py-2 border-r border-gray-100 font-medium text-gray-900 truncate">{row.nnaNames}</td>
                <td className="px-3 py-2 border-r border-gray-100 text-gray-700 truncate">{row.nnaLast1}</td>
                <td className="px-3 py-2 border-r border-gray-100 text-gray-700 truncate">{row.nnaLast2}</td>
                <td className="px-3 py-2 border-r border-gray-100 font-mono text-gray-600 truncate">{row.nnaRut}</td>
                <td className="px-3 py-2 border-r border-gray-100 text-gray-300 bg-gray-50 truncate select-none"></td>
                <td className="px-3 py-2 border-r border-gray-100 font-bold text-judicial-700 truncate">{row.rit}</td>
                <td className="px-3 py-2 border-r border-gray-100 text-red-600 font-medium truncate font-mono">{row.audiencia}</td>
                <td className="px-3 py-2 border-r border-gray-100 bg-amber-50/30 text-gray-800 truncate">{row.adultoNombre}</td>
                <td className="px-3 py-2 border-r border-gray-100 bg-amber-50/30 text-gray-600 truncate">{row.adultoRelacion}</td>
                <td className="px-3 py-2 border-r border-gray-100 bg-amber-50/30 font-mono text-gray-600 truncate">{row.adultoRut}</td>
                <td className="px-3 py-2 border-r border-gray-100 bg-amber-50/30 text-gray-600 truncate font-mono">{row.adultoTelefono}</td>
                <td className="px-3 py-2 border-r border-gray-100 bg-amber-50/30 text-gray-600 truncate max-w-xs" title={row.adultoDireccion}>{row.adultoDireccion}</td>
                <td className="px-2 py-2 text-center sticky right-0 bg-white group-hover:bg-blue-50 border-l border-gray-200">
                    <button 
                        onClick={() => handleCopyRow(row)}
                        className={`p-1.5 rounded-md transition-colors ${copiedRowId === row.uniqueKey ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-judicial-600 hover:bg-white border border-transparent hover:border-gray-200'}`}
                        title="Copiar fila"
                    >
                        {copiedRowId === row.uniqueKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
