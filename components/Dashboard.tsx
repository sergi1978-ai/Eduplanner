
import React, { useMemo, useState, useEffect } from 'react';
import { Activity } from '../types';
import { CURRICULUM_DATA } from '../constants';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { Book, TrendingUp, Calendar, Target, BookOpen, Filter } from 'lucide-react';

interface DashboardProps {
  activities: Activity[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#387908', '#ff0000'];

// Helper to shorten area names
const getShortAreaName = (area: string) => {
    if (area.includes('MEDI')) return 'MEDI';
    if (area.includes('ARTÍSTICA')) return 'ART';
    if (area.includes('FÍSICA')) return 'EF';
    if (area === 'LLENGÜES') return 'LLENG';
    if (area.includes('ESTRANGERA')) return 'ANGLÈS';
    if (area.includes('MATEMÀTIQUES')) return 'MATES';
    if (area.includes('VALORS')) return 'VALORS';
    if (area.includes('DIGITAL')) return 'DIGITAL';
    if (area.includes('EMPRENEDORA')) return 'EMPR';
    if (area.includes('PERSONAL')) return 'PERS';
    if (area.includes('CIUTADANA')) return 'CIUT';
    return area.substring(0, 5);
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg max-w-xs z-50">
          <p className="font-bold text-sm text-gray-800 mb-1">{label}</p>
          <p className="text-xs text-gray-600 mb-2">{data.description}</p>
          <p className="text-xs font-semibold text-blue-600">Activitats: {payload[0].value}</p>
        </div>
      );
    }
    return null;
};

const CustomXAxisTick = ({ x, y, payload, sourceData }: any) => {
    const match = sourceData.find((d: any) => d.name === payload.value);
    const tooltipText = match ? match.description : '';
    
    return (
      <g transform={`translate(${x},${y})`}>
        <title>{tooltipText}</title>
        <text x={0} y={0} dy={16} textAnchor="middle" fill="#666" fontSize={10} fontWeight="bold">
          {payload.value}
        </text>
      </g>
    );
};

export const Dashboard: React.FC<DashboardProps> = ({ activities }) => {
  // Unique areas list for dropdown
  const uniqueAreas = useMemo(() => Array.from(new Set(CURRICULUM_DATA.map(c => c.area))).sort(), []);
  
  // Filter State
  const [selectedYear, setSelectedYear] = useState<string>('Tots');
  const [selectedChartArea, setSelectedChartArea] = useState<string>(uniqueAreas[0] || '');
  
  // Available Years
  const availableYears = useMemo(() => {
     const years = Array.from(new Set(activities.map(a => a.academicYear).filter(Boolean))).sort().reverse();
     return ['Tots', ...years];
  }, [activities]);

  // Filter activities based on dashboard selection
  const filteredActivities = useMemo(() => {
      if (selectedYear === 'Tots') return activities;
      return activities.filter(a => a.academicYear === selectedYear);
  }, [activities, selectedYear]);

  // 1. Statistics
  const stats = useMemo(() => {
    const allLinkedIds = filteredActivities.flatMap(a => a.curriculumIds);
    const uniqueLinkedIds = new Set(allLinkedIds);
    const totalItems = CURRICULUM_DATA.length;
    const coveragePct = totalItems > 0 ? Math.round((uniqueLinkedIds.size / totalItems) * 100) : 0;

    return {
      totalActivities: filteredActivities.length,
      totalLinks: allLinkedIds.length,
      uniqueCoverage: coveragePct,
      uniqueCount: uniqueLinkedIds.size,
      totalDbItems: totalItems
    };
  }, [filteredActivities]);

  // 2. Sabers més treballats (Top 10 Sabers)
  const topSabersData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredActivities.forEach(act => {
        act.curriculumIds.forEach(id => {
            const item = CURRICULUM_DATA.find(c => c.id === id);
            if (item && item.saber) {
                counts[item.saber] = (counts[item.saber] || 0) + 1;
            }
        });
    });

    return Object.entries(counts)
        .map(([name, count]) => ({ name: name.length > 30 ? name.substring(0, 30) + '...' : name, fullName: name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
  }, [filteredActivities]);

  // 3. Specific Area Chart Data (Detailed view)
  const specificAreaChartData = useMemo(() => {
    if (!selectedChartArea) return [];

    // Find all CEs for this area to ensure we list them even if count is 0
    const areaItems = CURRICULUM_DATA.filter(c => c.area === selectedChartArea);
    
    // Get unique Specific Competency Codes (CE1, CE2...)
    const distinctCEs = Array.from(new Set(areaItems.map(c => c.competenciaEspecifica))).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        return numA - numB;
    });

    // Count frequency
    const counts: Record<string, number> = {};
    distinctCEs.forEach(ce => counts[ce] = 0);

    filteredActivities.forEach(act => {
        act.curriculumIds.forEach(id => {
            const item = CURRICULUM_DATA.find(c => c.id === id);
            if (item && item.area === selectedChartArea) {
                counts[item.competenciaEspecifica] = (counts[item.competenciaEspecifica] || 0) + 1;
            }
        });
    });

    return distinctCEs.map(ce => {
        // Find a representative item to get the description
        const item = areaItems.find(i => i.competenciaEspecifica === ce);
        return {
            name: ce,
            count: counts[ce],
            description: item?.description || 'Sense descripció'
        };
    });
  }, [filteredActivities, selectedChartArea]);

  // 4. Radar Data (Competency Balance)
  const radarData = useMemo(() => {
    const allAreas = Array.from(new Set(CURRICULUM_DATA.map(c => c.area)));
    
    return allAreas.map(area => {
      let count = 0;
      filteredActivities.forEach(act => {
        count += act.curriculumIds.filter(id => {
          const item = CURRICULUM_DATA.find(c => c.id === id);
          return item?.area === area;
        }).length;
      });
      
      return {
        subject: getShortAreaName(area),
        fullSubject: area,
        A: count
      };
    });
  }, [filteredActivities]);

  return (
    <div className="space-y-6 pb-10">
        
        {/* Header Filter */}
        <div className="flex justify-end mb-4">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border shadow-sm">
                <Filter size={14} className="text-gray-400" />
                <span className="text-xs font-bold text-gray-500 uppercase">Curs Escolar:</span>
                <select 
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="text-sm font-medium text-blue-600 bg-transparent outline-none cursor-pointer"
                >
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
        </div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                <div>
                    <p className="text-gray-500 text-sm font-medium">Total Activitats</p>
                    <h3 className="text-3xl font-bold text-gray-800 mt-1">{stats.totalActivities}</h3>
                </div>
                <div className="bg-blue-50 p-3 rounded-full">
                    <Book className="w-6 h-6 text-blue-600" />
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                <div>
                    <p className="text-gray-500 text-sm font-medium">Cobertura Real</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <h3 className="text-3xl font-bold text-gray-800">{stats.uniqueCoverage}%</h3>
                        <span className="text-xs text-gray-400">({stats.uniqueCount}/{stats.totalDbItems})</span>
                    </div>
                </div>
                <div className={`p-3 rounded-full ${stats.uniqueCoverage > 50 ? 'bg-green-50' : 'bg-orange-50'}`}>
                    <Target className={`w-6 h-6 ${stats.uniqueCoverage > 50 ? 'text-green-600' : 'text-orange-500'}`} />
                </div>
            </div>

             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                <div>
                    <p className="text-gray-500 text-sm font-medium">Impacte (Items)</p>
                    <h3 className="text-3xl font-bold text-gray-800 mt-1">{stats.totalLinks}</h3>
                </div>
                <div className="bg-purple-50 p-3 rounded-full">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                <div>
                    <p className="text-gray-500 text-sm font-medium">Context</p>
                    <h3 className="text-lg font-bold text-gray-800 mt-1">{selectedYear === 'Tots' ? 'Global' : selectedYear}</h3>
                </div>
                <div className="bg-indigo-50 p-3 rounded-full">
                    <Calendar className="w-6 h-6 text-indigo-600" />
                </div>
            </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 1. Sabers més treballats (Bar Chart Horizontal) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-gray-500" />
                    Sabers més treballats (Top 10)
                </h3>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topSabersData} layout="vertical" margin={{ left: 40 }}>
                            <XAxis type="number" hide />
                            <YAxis 
                                type="category" 
                                dataKey="name" 
                                width={150} 
                                style={{ fontSize: '11px' }}
                                tick={({ x, y, payload }) => (
                                    <g transform={`translate(${x},${y})`}>
                                        <title>{payload.value}</title>
                                        <text x={-10} y={4} textAnchor="end" fill="#666" fontSize={11}>{payload.value}</text>
                                    </g>
                                )} 
                            />
                            <Tooltip 
                                cursor={{fill: '#f3f4f6'}}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20} fill="#82ca9d">
                                {topSabersData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 2. Competency Weight per Area (Simple Bar with Filter) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Target className="w-5 h-5 text-gray-500" />
                        Pes Competencial
                    </h3>
                    <select
                        value={selectedChartArea}
                        onChange={(e) => setSelectedChartArea(e.target.value)}
                        className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700 max-w-[200px] cursor-pointer"
                    >
                        {uniqueAreas.map(area => (
                            <option key={area} value={area}>{area}</option>
                        ))}
                    </select>
                </div>
                
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={specificAreaChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <XAxis 
                                dataKey="name" 
                                style={{ fontSize: '11px', fontWeight: 'bold' }}
                                tick={(props) => <CustomXAxisTick {...props} sourceData={specificAreaChartData} />}
                            />
                            <YAxis allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: '#f3f4f6'}} />
                            <Bar dataKey="count" name="Activitats" radius={[4, 4, 0, 0]} barSize={40}>
                                {specificAreaChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

             {/* 3. Competency Balance (Radar) */}
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <Target className="w-5 h-5 text-gray-500" />
                    Equilibri Competencial (Àmbits)
                </h3>
                <p className="text-sm text-gray-500 mb-6">Distribució global de les activitats per àmbits curriculars.</p>
                <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                            <PolarGrid stroke="#e5e7eb" />
                            <PolarAngleAxis 
                                dataKey="subject" 
                                tick={({ payload, x, y, textAnchor, ...rest }: any) => {
                                     const fullText = radarData[payload.index]?.fullSubject || payload.value;
                                     return (
                                        <g transform={`translate(${x},${y})`}>
                                            <title>{fullText}</title>
                                            <text textAnchor={textAnchor} {...rest} fill="#111827" fontSize={12} fontWeight={600}>
                                                {payload.value}
                                            </text>
                                        </g>
                                     );
                                }}
                            />
                            <PolarRadiusAxis angle={30} domain={[0, 'auto']} stroke="#9ca3af" />
                            <Radar
                                name="Activitats"
                                dataKey="A"
                                stroke="#4f46e5"
                                strokeWidth={3}
                                fill="#6366f1"
                                fillOpacity={0.6}
                            />
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

        </div>
    </div>
  );
};
