import React, { useMemo } from 'react';
import { Activity, CurriculumItem } from '../types';
import { CURRICULUM_DATA, AREA_COLORS } from '../constants';
import { Calendar, Tag, ExternalLink, ListChecks, FileText, Check, GraduationCap, ArrowRight, Edit } from 'lucide-react';
import { CompetencyBadge } from './ui/CompetencyBadge';

interface ActivityDetailProps {
  activity: Activity;
  onClose: () => void;
  onEdit: (activity: Activity) => void;
}

export const ActivityDetail: React.FC<ActivityDetailProps> = ({ activity, onClose, onEdit }) => {
  
  // Resolve curriculum items
  const curriculumItems = useMemo(() => {
    return activity.curriculumIds
      .map(id => CURRICULUM_DATA.find(c => c.id === id))
      .filter(Boolean) as CurriculumItem[];
  }, [activity.curriculumIds]);

  // Group by Area
  const groupedItems = useMemo(() => {
    const groups: Record<string, CurriculumItem[]> = {};
    curriculumItems.forEach(item => {
      if (!groups[item.area]) groups[item.area] = [];
      groups[item.area].push(item);
    });
    return groups;
  }, [curriculumItems]);

  const groupedEntries = useMemo(() => Object.entries(groupedItems) as [string, CurriculumItem[]][], [groupedItems]);

  const hasCriteria = activity.criteria && activity.criteria.length > 0;

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      
      {/* Header Section */}
      <div className="flex-none p-6 bg-white border-b border-gray-100">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide border border-indigo-100">
                {activity.academicYear}
              </span>
              <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded text-xs font-medium border border-gray-200">
                {activity.grade}
              </span>
              <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded text-xs font-medium border border-gray-200">
                {activity.trimestre} Trimestre
              </span>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">
              {activity.title}
            </h2>

            {activity.tags && activity.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {activity.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-xs border border-gray-200">
                    <Tag size={10} /> {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          <button
            onClick={() => onEdit(activity)}
            className="flex-none flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
          >
            <Edit size={16} /> Editar
          </button>
        </div>

        <div className="mt-6">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Descripció i Metodologia</h3>
          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line bg-gray-50 p-4 rounded-xl border border-gray-100">
            {activity.description}
          </p>
          
          {activity.link && (
             <a 
                href={activity.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50/50 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors"
            >
                <ExternalLink size={14} />
                Accedir al Recurs / Enllaç
            </a>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Curriculum Coverage */}
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 uppercase tracking-wide mb-4">
             <GraduationCap size={18} className="text-gray-500" />
             Vinculació Curricular
          </h3>
          
          {groupedEntries.length === 0 ? (
             <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-300 text-gray-400 text-sm">
                Aquesta activitat no té competències vinculades.
             </div>
          ) : (
             <div className="grid grid-cols-1 gap-4">
               {groupedEntries.map(([area, items]) => (
                 <div key={area} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    {/* Area Header */}
                    <div className={`px-4 py-2 border-b border-gray-100 flex justify-between items-center ${AREA_COLORS[area]?.replace('border-', 'border-b-') || 'bg-gray-50'}`}>
                        <span className="font-bold text-xs uppercase tracking-wide">{area}</span>
                        <span className="text-[10px] font-bold bg-white/60 px-2 py-0.5 rounded-full">
                           {items.length} sabers
                        </span>
                    </div>
                    
                    {/* Items List */}
                    <div className="divide-y divide-gray-50">
                       {items.map(item => (
                         <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start gap-3">
                               <div className="flex-none pt-0.5">
                                  <CompetencyBadge code={item.competenciaEspecifica} description={item.description} />
                               </div>
                               <div>
                                  <p className="text-xs font-semibold text-gray-500 mb-1">{item.saber}</p>
                                  <p className="text-sm text-gray-800">{item.description}</p>
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
               ))}
             </div>
          )}
        </div>

        {/* Evaluation Section */}
        {(hasCriteria || activity.evaluation) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                {/* Specific Criteria */}
                {hasCriteria && (
                    <div>
                        <h3 className="flex items-center gap-2 text-sm font-bold text-indigo-800 uppercase tracking-wide mb-3">
                            <ListChecks size={18} /> Criteris d'Avaluació
                        </h3>
                        <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                            <ul className="space-y-3">
                                {activity.criteria.map((crit, idx) => (
                                    <li key={idx} className="flex gap-3 items-start">
                                        <div className="mt-1 w-4 h-4 rounded-full bg-indigo-200 flex items-center justify-center flex-none">
                                            <Check size={10} className="text-indigo-700" />
                                        </div>
                                        <span className="text-sm text-gray-700 leading-snug">{crit}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {/* Evaluation Text / Rubric */}
                {activity.evaluation && (
                    <div className={hasCriteria ? "" : "md:col-span-2"}>
                        <h3 className="flex items-center gap-2 text-sm font-bold text-purple-800 uppercase tracking-wide mb-3">
                            <FileText size={18} /> Indicadors i Rúbrica
                        </h3>
                        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 h-full">
                            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap font-sans">
                                {activity.evaluation}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

      </div>
      
      {/* Footer */}
      <div className="flex-none p-4 bg-white border-t border-gray-200 flex justify-end">
         <button 
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors"
         >
            Tancar
         </button>
      </div>
    </div>
  );
};