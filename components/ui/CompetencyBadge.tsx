import React, { useMemo } from 'react';
import { CURRICULUM_DATA, AREA_COLORS } from '../../constants';

interface CompetencyBadgeProps {
  code: string;
  description: string;
  className?: string;
}

export const CompetencyBadge: React.FC<CompetencyBadgeProps> = ({ code, description, className }) => {
  const areaInfo = useMemo(() => {
    // Find the item that matches both code and description to ensure uniqueness across areas
    const item = CURRICULUM_DATA.find(i => 
      i.competenciaEspecifica === code && 
      i.description === description
    );
    
    if (!item) return null;
    
    return {
      name: item.area,
      // Use the defined colors from constants, or a default fallback
      colorClass: AREA_COLORS[item.area] || 'bg-gray-700 text-gray-200 border-gray-600'
    };
  }, [code, description]);

  return (
    <div className="relative group/badge cursor-help inline-block z-10 hover:z-50">
      <span className={`text-[10px] font-bold px-2 py-1 rounded bg-gray-800 text-white border border-gray-700 shadow-sm ${className}`}>
          {code}
      </span>
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-72 p-3 bg-gray-900/95 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover/badge:opacity-100 group-hover/badge:visible transition-all duration-200 z-50 pointer-events-none backdrop-blur-sm border border-gray-700 text-center">
        <div className="font-bold mb-2 text-gray-300 border-b border-gray-700 pb-2 flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-2 flex-wrap justify-center">
                <span className="text-sm text-white">{code}</span>
                {areaInfo && (
                    <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border shadow-sm ${areaInfo.colorClass}`}>
                        {areaInfo.name}
                    </span>
                )}
            </div>
        </div>
        <div className="leading-relaxed text-gray-100 text-left">{description}</div>
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900 border-r border-b border-gray-700"></div>
      </div>
    </div>
  );
};