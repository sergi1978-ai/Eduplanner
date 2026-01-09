import React, { useState, useMemo } from 'react';
import { Activity, CurriculumItem } from '../types';
import { CURRICULUM_DATA, AREA_COLORS } from '../constants';
import { Edit, Trash2, Calendar, Tag, FileJson, FileSpreadsheet, ExternalLink, Search, X, ListChecks, ChevronDown, ChevronUp, FileText, Eye } from 'lucide-react';
import { CompetencyBadge } from './ui/CompetencyBadge';
import { Modal } from './ui/Modal';
import { ActivityDetail } from './ActivityDetail';

interface ActivityListProps {
  activities: Activity[];
  onEdit: (activity: Activity) => void;
  onDelete: (id: string) => void;
}

export const ActivityList: React.FC<ActivityListProps> = ({ activities, onEdit, onDelete }) => {
  // Filters State
  const [searchText, setSearchText] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  
  // Expanded Criteria State (Activity IDs) - Keep for quick view in list
  const [expandedActivityIds, setExpandedActivityIds] = useState<string[]>([]);

  // Detailed View State
  const [viewingActivity, setViewingActivity] = useState<Activity | null>(null);

  // Filter Options Derived from Data
  const filterOptions = useMemo(() => {
    const years = Array.from(new Set(activities.map(a => a.academicYear).filter(Boolean))).sort().reverse();
    const grades = Array.from(new Set(activities.map(a => a.grade))).sort();
    // For Areas, we check all curriculum items linked to activities
    const areas = Array.from(new Set(CURRICULUM_DATA.map(c => c.area))).sort();
    return { years, grades, areas };
  }, [activities]);

  // Filter Logic
  const filtered = useMemo(() => {
      return activities.filter(a => {
        const matchText = searchText === '' || 
            a.title.toLowerCase().includes(searchText.toLowerCase()) || 
            a.description.toLowerCase().includes(searchText.toLowerCase()) ||
            (a.tags || []).some(tag => tag.toLowerCase().includes(searchText.toLowerCase()));

        const matchYear = selectedYear === '' || a.academicYear === selectedYear;
        const matchGrade = selectedGrade === '' || a.grade === selectedGrade;
        
        const matchArea = selectedArea === '' || a.curriculumIds.some(id => {
            const item = CURRICULUM_DATA.find(c => c.id === id);
            return item && item.area === selectedArea;
        });

        return matchText && matchYear && matchGrade && matchArea;
      });
  }, [activities, searchText, selectedYear, selectedGrade, selectedArea]);

  const getCurriculumItems = (ids: string[]) => {
    return ids.map(id => CURRICULUM_DATA.find(c => c.id === id)).filter(Boolean) as CurriculumItem[];
  };

  const groupItemsByArea = (items: CurriculumItem[]) => {
    const groups: Record<string, CurriculumItem[]> = {};
    items.forEach(item => {
      if (!groups[item.area]) groups[item.area] = [];
      groups[item.area].push(item);
    });
    return groups;
  };

  const toggleCriteriaExpand = (e: React.MouseEvent, id: string) => {
      e.stopPropagation(); // Prevent opening modal
      setExpandedActivityIds(prev => 
        prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
      );
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(activities, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `activitats_eduplan_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Títol', 'Descripció', 'Curs Escolar', 'Enllaç', 'Curs', 'Trimestre', 'Data', 'Etiquetes', 'Competències Específiques', 'Criteris Avaluació', 'Indicadors/Rúbrica'];
    
    const rows = activities.map(a => {
      const items = getCurriculumItems(a.curriculumIds);
      const ces = Array.from(new Set(items.map(i => i.competenciaEspecifica))).join(', ');
      const tags = (a.tags || []).join(', ');
      const criteria = (a.criteria || []).join('; ');
      const evaluation = a.evaluation || '';
      
      return [
        a.id,
        `"${a.title.replace(/"/g, '""')}"`,
        `"${a.description.replace(/"/g, '""')}"`,
        a.academicYear,
        `"${a.link || ''}"`,
        a.grade,
        a.trimestre,
        new Date(a.createdAt).toLocaleDateString(),
        `"${tags}"`,
        `"${ces}"`,
        `"${criteria.replace(/"/g, '""')}"`,
        `"${evaluation.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `activitats_eduplan_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
      setSearchText('');
      setSelectedArea('');
      setSelectedGrade('');
      setSelectedYear('');
  };

  const handleEditInternal = (activity: Activity) => {
      setViewingActivity(null); // Close detail view
      onEdit(activity); // Open edit form
  };

  if (activities.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="mb-4 bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
            <Calendar className="w-8 h-8 text-blue-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">No hi ha activitats</h3>
        <p className="text-sm max-w-xs mx-auto mb-6">Comença creant la teva primera activitat planificada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4 sm:space-y-0 sm:flex sm:gap-4 items-center flex-wrap z-10 relative">
         
         {/* Search */}
         <div className="relative flex-1 min-w-[200px]">
             <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
             <input
                type="text"
                placeholder="Buscar activitat..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
         </div>

         {/* Dropdowns */}
         <div className="flex gap-2 flex-wrap">
             <select 
                value={selectedYear} 
                onChange={e => setSelectedYear(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
             >
                 <option value="">Tots els anys</option>
                 {filterOptions.years.map(y => <option key={y} value={y}>{y}</option>)}
             </select>

             <select 
                value={selectedGrade} 
                onChange={e => setSelectedGrade(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
             >
                 <option value="">Tots els cursos</option>
                 {filterOptions.grades.map(g => <option key={g} value={g}>{g}</option>)}
             </select>

             <select 
                value={selectedArea} 
                onChange={e => setSelectedArea(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer max-w-[150px]"
             >
                 <option value="">Tots els àmbits</option>
                 {filterOptions.areas.map(a => <option key={a} value={a}>{a}</option>)}
             </select>
             
             {(searchText || selectedYear || selectedGrade || selectedArea) && (
                 <button 
                    onClick={clearFilters}
                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Netejar filtres"
                 >
                     <X size={18} />
                 </button>
             )}
         </div>

         <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>

         {/* Exports */}
         <div className="flex gap-2">
             <button 
                onClick={handleExportCSV}
                className="p-2 text-gray-500 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                title="Exportar Excel/CSV"
            >
                <FileSpreadsheet size={18} />
            </button>
            <button 
                onClick={handleExportJSON}
                className="p-2 text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                title="Còpia de Seguretat (JSON)"
            >
                <FileJson size={18} />
            </button>
         </div>
      </div>

      <div className="text-xs text-gray-500 px-1">
          Mostrant {filtered.length} activitats
      </div>

      {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400 bg-gray-50/50 border border-dashed border-gray-300 rounded-xl">
              No s'han trobat activitats amb aquests filtres.
              <br/>
              <button onClick={clearFilters} className="mt-2 text-blue-600 font-medium hover:underline">Netejar filtres</button>
          </div>
      )}

      {filtered.map(activity => {
        const linkedItems = getCurriculumItems(activity.curriculumIds);
        const groupedItems = groupItemsByArea(linkedItems);
        const hasCriteria = activity.criteria && activity.criteria.length > 0;
        const hasEvaluation = !!activity.evaluation;
        const isExpanded = expandedActivityIds.includes(activity.id);
        
        return (
            <div 
                key={activity.id} 
                onClick={() => setViewingActivity(activity)}
                className="bg-white rounded-xl p-5 border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all group cursor-pointer"
            >
                <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                        <div className="flex items-center flex-wrap gap-2 mb-2">
                            <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-700 transition-colors">{activity.title}</h3>
                            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                                {activity.academicYear}
                            </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            <span className="bg-gray-100 px-2 py-0.5 rounded font-medium text-gray-600 border border-gray-200">
                                {activity.grade}
                            </span>
                            <span className="bg-gray-100 px-2 py-0.5 rounded font-medium text-gray-600 border border-gray-200">
                                {activity.trimestre} Trimestre
                            </span>
                            <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                {new Date(activity.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                         <button 
                            onClick={(e) => { e.stopPropagation(); setViewingActivity(activity); }}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors sm:hidden"
                        >
                            <Eye size={18} />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onEdit(activity); }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                        >
                            <Edit size={18} />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(activity.id); }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{activity.description}</p>

                <div className="flex flex-wrap gap-3 items-center mb-4">
                    {/* Link Button */}
                    {activity.link && (
                        <a 
                            href={activity.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 text-xs font-medium bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
                        >
                            <ExternalLink size={12} />
                            Obrir Recurs
                        </a>
                    )}

                    {/* Tags */}
                    {activity.tags && activity.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {activity.tags.map(tag => (
                                <span key={tag} className="flex items-center gap-1 text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full border border-gray-200">
                                    <Tag size={10} /> {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Curriculum Coverage Indicators */}
                {(linkedItems.length > 0 || hasCriteria || hasEvaluation) && (
                    <div className="border-t border-gray-100 pt-3">
                        <div className="flex flex-wrap gap-2 items-center justify-between">
                            <div className="flex flex-wrap gap-2 items-center">
                                {Object.entries(groupedItems).map(([area, items]) => (
                                    <div key={area} className={`text-[10px] px-2 py-1 rounded border flex items-center gap-1.5 ${AREA_COLORS[area]}`}>
                                        <span className="font-bold uppercase">{area}</span>
                                        <span className="bg-white/50 px-1.5 rounded-full text-current font-bold">
                                            {items.length}
                                        </span>
                                    </div>
                                ))}
                                <div className="w-px h-4 bg-gray-200 mx-1 hidden sm:block"></div>
                                {/* Unique Competencies Display */}
                                {Array.from(new Set(linkedItems.map(i => i.competenciaEspecifica))).map(ce => {
                                    const item = linkedItems.find(i => i.competenciaEspecifica === ce);
                                    return (
                                        <CompetencyBadge 
                                            key={ce} 
                                            code={ce} 
                                            description={item?.description || ''} 
                                        />
                                    );
                                })}
                            </div>
                            
                            {(hasCriteria || hasEvaluation) && (
                                <button 
                                    onClick={(e) => toggleCriteriaExpand(e, activity.id)}
                                    className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-600 font-medium transition-colors p-1"
                                >
                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    {hasEvaluation ? 'Detalls i Avaluació' : `${activity.criteria.length} criteris`}
                                </button>
                            )}
                        </div>
                        
                        {/* Expanded Criteria / Evaluation View (Inline) */}
                        {isExpanded && (
                            <div className="mt-3 space-y-3 animate-in slide-in-from-top-2 cursor-default" onClick={(e) => e.stopPropagation()}>
                                {hasCriteria && (
                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-sm">
                                        <h5 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                            <ListChecks size={12} /> Criteris d'Avaluació seleccionats
                                        </h5>
                                        <ul className="space-y-1">
                                            {activity.criteria.map((crit, idx) => (
                                                <li key={idx} className="flex gap-2 text-gray-700 items-start">
                                                    <span className="text-blue-500 mt-1.5 w-1 h-1 rounded-full bg-current flex-none"></span>
                                                    <span className="text-xs leading-relaxed">{crit}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                
                                {hasEvaluation && (
                                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-100 text-sm">
                                         <h5 className="text-xs font-bold text-purple-700 uppercase mb-2 flex items-center gap-1">
                                            <FileText size={12} /> Indicadors i Rúbrica
                                        </h5>
                                        <div className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                                            {activity.evaluation}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
      })}

      {/* Detail Modal */}
      <Modal
         isOpen={!!viewingActivity}
         onClose={() => setViewingActivity(null)}
         title="Detall de l'Activitat"
         maxWidth="max-w-4xl"
      >
         {viewingActivity && (
             <ActivityDetail 
                activity={viewingActivity} 
                onClose={() => setViewingActivity(null)} 
                onEdit={handleEditInternal}
             />
         )}
      </Modal>

    </div>
  );
};