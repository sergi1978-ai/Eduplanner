import React, { useState, useMemo } from 'react';
import { CURRICULUM_DATA, AREA_COLORS } from '../constants';
import { Search, Filter, BookOpen, GraduationCap } from 'lucide-react';
import { CompetencyBadge } from './ui/CompetencyBadge';

export const CurriculumView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');

  // Extract unique areas for the filter dropdown
  const uniqueAreas = useMemo(() => {
    const areas = new Set(CURRICULUM_DATA.map(item => item.area));
    return Array.from(areas).sort();
  }, []);

  const filteredData = CURRICULUM_DATA.filter(item => {
    const matchesSearch = 
      item.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.saber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.competenciaEspecifica.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesArea = selectedArea ? item.area === selectedArea : true;
    
    // Check if the item's planned grades include the selected grade
    const matchesGrade = selectedGrade ? item.planificat.includes(selectedGrade) : true;

    return matchesSearch && matchesArea && matchesGrade;
  });

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-4">
        {/* Search Bar */}
        <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <Search className="text-gray-400" />
          <input 
            type="text"
            placeholder="Buscar per paraula clau, saber, criteri..."
            className="flex-1 outline-none text-gray-700 bg-transparent text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <BookOpen className="h-4 w-4 text-gray-400" />
            </div>
            <select
              className="block w-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-gray-700 appearance-none cursor-pointer hover:bg-gray-50 transition-colors"
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
            >
              <option value="">Tots els Àmbits</option>
              {uniqueAreas.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <GraduationCap className="h-4 w-4 text-gray-400" />
            </div>
            <select
              className="block w-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-gray-700 appearance-none cursor-pointer hover:bg-gray-50 transition-colors"
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
            >
              <option value="">Tots els Cursos</option>
              <option value="1r">1r Primària</option>
              <option value="2n">2n Primària</option>
              <option value="3r">3r Primària</option>
              <option value="4t">4t Primària</option>
              <option value="5è">5è Primària</option>
              <option value="6è">6è Primària</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-xs text-gray-500 px-1">
        Mostrant {filteredData.length} resultats
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredData.map(item => (
          <div key={item.id} className="bg-white rounded-xl p-5 border border-gray-200 hover:border-blue-300 transition-all shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-3">
                <div className="flex flex-wrap gap-2 items-center">
                     <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide ${AREA_COLORS[item.area] || 'bg-gray-100 text-gray-800'}`}>
                        {item.area}
                    </span>
                    <CompetencyBadge code={item.competenciaEspecifica} description={item.description} />
                </div>
                <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded border border-gray-200 whitespace-nowrap">
                    {item.planificat}
                </span>
            </div>
            
            <h4 className="font-semibold text-gray-800 mb-3 text-sm leading-relaxed flex-1">{item.description}</h4>
            
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-3">
                <div className="flex gap-2">
                  <div className="min-w-[4px] rounded-full bg-blue-400/50 self-stretch"></div>
                  <div className="text-xs text-gray-600">
                    <span className="font-bold text-gray-700 block mb-0.5">Saber:</span> 
                    {item.saber}
                  </div>
                </div>
            </div>

            <div className="flex items-center gap-4 text-[10px] text-gray-500 border-t pt-3 mt-auto">
                <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                    <span className="font-medium text-gray-700">Trimestre:</span> {item.trimestre || 'No assignat'}
                </div>
                <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                        item.actuacio === 'Alta' ? 'bg-green-500' : 
                        item.actuacio === 'Baixa' ? 'bg-red-500' : 'bg-yellow-500'
                    }`}></span>
                    <span className="font-medium text-gray-700">Intensitat:</span> {item.actuacio}
                </div>
                {item.observacions && (
                    <div className="ml-auto group/obs relative">
                         <span className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                           Observacions
                         </span>
                         <div className="absolute bottom-full right-0 mb-2 w-56 bg-white text-gray-700 p-3 rounded-lg shadow-xl border border-gray-200 text-xs opacity-0 invisible group-hover/obs:opacity-100 group-hover/obs:visible transition-all duration-200 z-10">
                            {item.observacions}
                         </div>
                    </div>
                )}
            </div>
          </div>
        ))}
      </div>
      
      {filteredData.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500 text-sm">No s'han trobat resultats amb els filtres actuals.</p>
          <button 
            onClick={() => { setSearchTerm(''); setSelectedArea(''); setSelectedGrade(''); }}
            className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Netejar filtres
          </button>
        </div>
      )}
    </div>
  );
};
