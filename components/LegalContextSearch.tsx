import React, { useState } from 'react';
import { Search, ExternalLink, BookOpen, Loader2 } from 'lucide-react';
import { searchLegalContext } from '../services/geminiService';
import { SearchResult } from '../types';

export const LegalContextSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const data = await searchLegalContext(query);
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-judicial-200 p-4 h-full flex flex-col">
      <div className="flex items-center space-x-2 mb-4 text-judicial-800">
        <BookOpen className="w-5 h-5" />
        <h3 className="font-serif font-semibold">Investigación Legal (Web)</h3>
      </div>

      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej: Competencia tribunal familia..."
            className="w-full pl-3 pr-10 py-2 text-sm border border-judicial-300 rounded-lg focus:ring-2 focus:ring-judicial-500 focus:border-transparent outline-none"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="absolute right-2 top-2 text-judicial-400 hover:text-judicial-600 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>
      </form>

      <div className="flex-1 overflow-y-auto min-h-0">
        {result ? (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-judicial-400 uppercase tracking-wider">Respuesta</div>
            <p className="text-sm text-judicial-800 leading-relaxed bg-judicial-50 p-3 rounded-lg border border-judicial-100">
              {result.answer}
            </p>
            
            {result.sources.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-semibold text-judicial-400 uppercase tracking-wider mb-2">Fuentes</div>
                <ul className="space-y-2">
                  {result.sources.map((source, idx) => (
                    <li key={idx}>
                      <a 
                        href={source.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-start space-x-2 group p-2 hover:bg-judicial-50 rounded transition-colors"
                      >
                        <ExternalLink className="w-3 h-3 text-judicial-400 mt-1 flex-shrink-0 group-hover:text-judicial-600" />
                        <span className="text-xs text-judicial-600 group-hover:underline line-clamp-2">
                          {source.title}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-judicial-400 text-sm">
            <Search className="w-8 h-8 mb-2 opacity-20" />
            <p>Realiza consultas sobre leyes o procedimientos actualizados.</p>
          </div>
        )}
      </div>
    </div>
  );
};
