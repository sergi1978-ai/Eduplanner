import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Activity, CurriculumItem } from '../types';
import { CURRICULUM_DATA, AREA_COLORS } from '../constants';
import { Sparkles, Save, X, Wand2, Loader2, ChevronRight, Check, GraduationCap, Lightbulb, Tag, Link as LinkIcon, CalendarRange, ListChecks, FileText, Printer, Maximize2, FilePlus, ChevronDown, Copy, Search, ArrowRight, Filter } from 'lucide-react';
import { suggestActivityDetails, suggestCurriculumLinks, suggestEvaluation, generateRubricHTML, expandActivityContent } from '../services/gemini';
import { CompetencyBadge } from './ui/CompetencyBadge';
import { Modal } from './ui/Modal';

interface ActivityFormProps {
  initialData?: Activity;
  availableTags?: string[];
  onSave: (activity: Activity) => void;
  onCancel: () => void;
}

// Helper to remove markdown asterisks
const cleanText = (text: string) => {
  return text.replace(/\*\*/g, '').replace(/\*/g, '');
};

export const ActivityForm: React.FC<ActivityFormProps> = ({ initialData, availableTags = [], onSave, onCancel }) => {
  // Generate academic years
  const academicYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [
        `${currentYear - 1}-${currentYear}`,
        `${currentYear}-${currentYear + 1}`,
        `${currentYear + 1}-${currentYear + 2}`
    ];
  }, []);

  // Form Fields
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [link, setLink] = useState(initialData?.link || '');
  const [grade, setGrade] = useState(initialData?.grade || '5è');
  const [trimestre, setTrimestre] = useState(initialData?.trimestre || '1r');
  const [academicYear, setAcademicYear] = useState(initialData?.academicYear || '2024-2025');
  const [selectedIds, setSelectedIds] = useState<string[]>(initialData?.curriculumIds || []);
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>(initialData?.criteria || []);
  const [evaluation, setEvaluation] = useState(initialData?.evaluation || '');
  
  // Tag State
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const tagInputContainerRef = useRef<HTMLDivElement>(null);
  
  // Filter suggestions based on input and exclude already selected tags
  const filteredTags = useMemo(() => {
    const lowerInput = tagInput.toLowerCase().trim();
    const unselectedTags = availableTags.filter(tag => !tags.includes(tag));

    // If input is empty, show all unselected tags
    if (!lowerInput) return unselectedTags;
    
    return unselectedTags.filter(tag => 
        tag.toLowerCase().includes(lowerInput)
    );
  }, [tagInput, availableTags, tags]);

  // Navigation State for the 3-column view
  const [activeArea, setActiveArea] = useState<string | null>(null);
  const [activeCE, setActiveCE] = useState<string | null>(null); 
  const [curriculumSearch, setCurriculumSearch] = useState('');
  const [manualSearchArea, setManualSearchArea] = useState(''); // New dropdown state
  
  // AI State
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isExpandingDesc, setIsExpandingDesc] = useState(false);
  const [isGeneratingEval, setIsGeneratingEval] = useState(false);
  const [isSuggestingLinks, setIsSuggestingLinks] = useState(false);
  const [suggestions, setSuggestions] = useState<{ id: string; reason: string }[]>([]);

  // Rubric Document State
  const [isRubricModalOpen, setIsRubricModalOpen] = useState(false);
  const [rubricHTML, setRubricHTML] = useState('');
  const [isGeneratingRubricDoc, setIsGeneratingRubricDoc] = useState(false);

  // Derived Data
  const uniqueAreas = useMemo(() => Array.from(new Set(CURRICULUM_DATA.map(c => c.area))), []);
  
  // Filter items by the selected Grade (Used ONLY for the Browse Mode, not Search Mode)
  const filterByGrade = (item: CurriculumItem) => {
      // Always show if it's already selected
      if (selectedIds.includes(item.id)) return true;

      if (!item.planificat) return true; // Show items with no specific planning
      
      const g = grade;
      const p = item.planificat;

      if (['1r', '2n'].includes(g)) {
          return p.includes('1r') || p.includes('2n') || p.includes('Inicial');
      }
      if (['3r', '4t'].includes(g)) {
          return p.includes('3r') || p.includes('4t') || p.includes('Mitjà');
      }
      if (['5è', '6è'].includes(g)) {
          return p.includes('5è') || p.includes('6è') || p.includes('Superior');
      }
      
      return false; // Hide by default if no match
  };

  const specificCompetenciesForArea = useMemo(() => {
    if (!activeArea) return [];
    const items = CURRICULUM_DATA.filter(c => c.area === activeArea);
    const uniqueCEs = Array.from(new Set(items.map(c => c.competenciaEspecifica)));
    return uniqueCEs.map(ce => {
        const firstMatch = items.find(i => i.competenciaEspecifica === ce);
        return {
            code: ce,
            saber: firstMatch?.saber || '',
            description: firstMatch?.description || ''
        };
    });
  }, [activeArea]);

  const itemsForActiveCE = useMemo(() => {
    if (!activeArea || !activeCE) return [];
    return CURRICULUM_DATA.filter(c => 
        c.area === activeArea && 
        c.competenciaEspecifica === activeCE &&
        filterByGrade(c)
    );
  }, [activeArea, activeCE, grade, selectedIds]);

  // SEARCH RESULTS FOR MANUAL PICKER
  // Now includes dropdown filtering capability
  const searchResults = useMemo(() => {
    if (!curriculumSearch.trim() && !manualSearchArea) return [];
    const lowerSearch = curriculumSearch.toLowerCase();
    
    return CURRICULUM_DATA.filter(item => {
        // Filter by Area dropdown first if selected
        if (manualSearchArea && item.area !== manualSearchArea) return false;

        // Then check text match
        if (!lowerSearch) return true;

        const areaMatch = (item.area || '').toLowerCase().includes(lowerSearch);
        const saberMatch = (item.saber || '').toLowerCase().includes(lowerSearch);
        const descMatch = (item.description || '').toLowerCase().includes(lowerSearch);
        const ceMatch = (item.competenciaEspecifica || '').toLowerCase().includes(lowerSearch);
        const criteriaMatch = (item.criteris || []).some(c => c.toLowerCase().includes(lowerSearch));

        return areaMatch || saberMatch || descMatch || ceMatch || criteriaMatch;
    });
  }, [curriculumSearch, manualSearchArea]);


  // Initialize navigation if editing
  useEffect(() => {
    if (initialData && initialData.curriculumIds.length > 0 && !activeArea) {
      const firstItem = CURRICULUM_DATA.find(c => c.id === initialData.curriculumIds[0]);
      if (firstItem) {
        setActiveArea(firstItem.area);
        setActiveCE(firstItem.competenciaEspecifica);
      }
    } else if (!activeArea && uniqueAreas.length > 0) {
        setActiveArea(uniqueAreas[0]);
    }
  }, [initialData, uniqueAreas]);

  const getSelectedCount = (filterFn: (item: CurriculumItem) => boolean) => {
    return CURRICULUM_DATA.filter(item => filterFn(item) && selectedIds.includes(item.id)).length;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newActivity: Activity = {
      id: initialData?.id || Date.now().toString(),
      title,
      description,
      link,
      grade,
      trimestre,
      academicYear,
      curriculumIds: selectedIds,
      criteria: selectedCriteria,
      evaluation,
      tags,
      createdAt: initialData?.createdAt || Date.now(),
    };
    onSave(newActivity);
  };

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
      setShowTagSuggestions(false);
      setActiveSuggestionIndex(-1);
    } else {
      setTagInput('');
    }
  };

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setTagInput(e.target.value);
      setShowTagSuggestions(true);
      setActiveSuggestionIndex(-1); // Reset selection when typing
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If suggestion selected, add it. Otherwise add input text.
      if (showTagSuggestions && activeSuggestionIndex >= 0 && filteredTags[activeSuggestionIndex]) {
          handleAddTag(filteredTags[activeSuggestionIndex]);
      } else {
          handleAddTag(tagInput);
      }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (filteredTags.length > 0) {
            setShowTagSuggestions(true);
            setActiveSuggestionIndex(prev => (prev < filteredTags.length - 1 ? prev + 1 : prev));
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (filteredTags.length > 0) {
            setActiveSuggestionIndex(prev => (prev > -1 ? prev - 1 : -1));
        }
    } else if (e.key === 'Escape') {
        setShowTagSuggestions(false);
        setActiveSuggestionIndex(-1);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (tagInputContainerRef.current && !tagInputContainerRef.current.contains(event.target as Node)) {
              setShowTagSuggestions(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleGenerateDescription = async () => {
    if (!title) return;
    setIsGeneratingDesc(true);
    const suggested = await suggestActivityDetails(title, grade);
    if (suggested) setDescription(cleanText(suggested));
    setIsGeneratingDesc(false);
  };

  const handleExpandDescription = async () => {
    if (!description) return;
    setIsExpandingDesc(true);
    const expanded = await expandActivityContent(title, description, grade);
    if (expanded) setDescription(cleanText(expanded));
    setIsExpandingDesc(false);
  };

  const handleGenerateEvaluation = async () => {
    if (!title || !description) return;
    setIsGeneratingEval(true);
    const suggested = await suggestEvaluation(title, description, grade);
    if (suggested) setEvaluation(cleanText(suggested));
    setIsGeneratingEval(false);
  };

  const handleGenerateRubricDoc = async () => {
    if (!title) return;
    setIsGeneratingRubricDoc(true);

    // Enrich criteria with their Competency Code (CE)
    const enrichedCriteria = selectedCriteria.map(crit => {
        // Find the curriculum item that contains this criteria string
        const parentItem = CURRICULUM_DATA.find(item => item.criteris.includes(crit));
        if (parentItem) {
            // Prepend CE code if found, e.g., "CE1 - 1.1. ..."
            return `${parentItem.competenciaEspecifica} - ${crit}`;
        }
        return crit;
    });

    const html = await generateRubricHTML(title, description, enrichedCriteria, grade);
    setRubricHTML(html);
    setIsRubricModalOpen(true);
    setIsGeneratingRubricDoc(false);
  };

  const handlePrintRubric = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(`
            <html>
            <head>
                <title>Rúbrica - ${title}</title>
                <style>
                    body { font-family: sans-serif; padding: 40px; max-width: 1000px; margin: 0 auto; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                ${rubricHTML}
                <script>window.print();</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }
  };

  const handleCopyHTML = () => {
      const blob = new Blob([rubricHTML], { type: 'text/html' });
      const plainText = rubricHTML.replace(/<[^>]+>/g, '\n').trim();
      const textBlob = new Blob([plainText], { type: 'text/plain' });
      
      const clipboardItem = new ClipboardItem({ 
          'text/html': blob,
          'text/plain': textBlob
      });
      
      navigator.clipboard.write([clipboardItem]).then(() => {
          alert("Contingut copiat al porta-papers! Ara pots enganxar-lo (Ctrl+V) a Word, Docs o altres editors.");
      }).catch(err => {
          console.error('Error copying to clipboard', err);
          alert('No s\'ha pogut copiar automàticament.');
      });
  };

  const handleOpenGoogleDoc = () => {
      // Create HTML blob with a wrapper table to ensure Docs treats it well
      // Docs prefers simple tables. The AI generates a table, so we pass it directly.
      const blob = new Blob([rubricHTML], { type: 'text/html' });
      
      // Also create a plain text version for compatibility
      const plainText = rubricHTML.replace(/<[^>]+>/g, '\n').trim(); 
      const textBlob = new Blob([plainText], { type: 'text/plain' });

      const clipboardItem = new ClipboardItem({ 
          'text/html': blob,
          'text/plain': textBlob
      });
      
      navigator.clipboard.write([clipboardItem]).then(() => {
          // Open new Google Doc immediately after write success
          const win = window.open('https://docs.google.com/document/create', '_blank');
          
          if (win) {
             // Focus the new window
             win.focus();
             // We can't programmatically paste, so we rely on the user
          } else {
              alert("El navegador ha bloquejat la finestra emergent. Si us plau, obre 'docs.google.com' manualment i enganxa (Ctrl+V) el contingut.");
          }
      }).catch(err => {
          console.error('Error copying to clipboard', err);
          alert('No s\'ha pogut copiar automàticament. Si us plau, fes clic a "Copiar Text" i després obre Google Docs manualment.');
      });
  };

  const handleSuggestLinks = async () => {
    if (!title && !description) return;
    setIsSuggestingLinks(true);
    setSuggestions([]); 
    
    const results = await suggestCurriculumLinks(title, description);
    
    if (results.length > 0) {
        const ids = results.map(r => r.id);
        const merged = Array.from(new Set([...selectedIds, ...ids]));
        setSelectedIds(merged);
        setSuggestions(results);
        
        // Navigate to first suggestion
        const firstSuggested = CURRICULUM_DATA.find(c => c.id === ids[0]);
        if (firstSuggested) {
            setActiveArea(firstSuggested.area);
            setActiveCE(firstSuggested.competenciaEspecifica);
        }
    }
    setIsSuggestingLinks(false);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const isSelecting = !prev.includes(id);
      if (!isSelecting) {
        const item = CURRICULUM_DATA.find(c => c.id === id);
        if (item && item.criteris) {
           setSelectedCriteria(current => current.filter(c => !item.criteris.includes(c)));
        }
        return prev.filter(cid => cid !== id);
      }
      return [...prev, id];
    });
  };

  const toggleCriterion = (criterion: string) => {
    setSelectedCriteria(prev => 
      prev.includes(criterion) 
      ? prev.filter(c => c !== criterion) 
      : [...prev, criterion]
    );
  };

  const clearManualSearch = () => {
    setCurriculumSearch('');
    setManualSearchArea('');
  };

  return (
    <>
    {/* Explicit height on the form forces the Modal to expand to max-height, providing ample room for scrolling columns */}
    <form onSubmit={handleSubmit} className="flex flex-col h-[85vh]">
      {/* Top Section: Basic Info */}
      <div className="flex-none space-y-4 px-6 pt-6 pb-2 overflow-y-auto custom-scrollbar md:flex-shrink-0 md:max-h-[35vh]">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6">
                <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Títol</label>
                    <button
                        type="button"
                        onClick={handleGenerateDescription}
                        disabled={!title || isGeneratingDesc}
                        className="text-xs text-blue-600 flex items-center gap-1 hover:bg-blue-50 px-2 py-0.5 rounded transition-colors disabled:opacity-50"
                        title="Generar descripció completa basada en el títol"
                    >
                        {isGeneratingDesc ? <Loader2 className="animate-spin h-3 w-3"/> : <Sparkles className="h-3 w-3"/>}
                        {isGeneratingDesc ? 'Generant...' : 'Generar Descripció'}
                    </button>
                </div>
                <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="ex. Murs de fraccions"
                />
            </div>
            
            <div className="md:col-span-2">
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Curs Escolar</label>
                 <div className="relative">
                    <CalendarRange className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                        value={academicYear}
                        onChange={(e) => setAcademicYear(e.target.value)}
                        className="w-full pl-8 pr-2 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white appearance-none cursor-pointer"
                    >
                        {academicYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                 </div>
            </div>

            <div className="md:col-span-2">
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nivell</label>
                 <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white cursor-pointer"
                >
                    <option value="1r">1r Primària</option>
                    <option value="2n">2n Primària</option>
                    <option value="3r">3r Primària</option>
                    <option value="4t">4t Primària</option>
                    <option value="5è">5è Primària</option>
                    <option value="6è">6è Primària</option>
                </select>
            </div>
            <div className="md:col-span-2">
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Trimestre</label>
                 <select
                    value={trimestre}
                    onChange={(e) => setTrimestre(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white cursor-pointer"
                >
                    <option value="1r">1r</option>
                    <option value="2n">2n</option>
                    <option value="3r">3r</option>
                </select>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Descripció i Metodologia</label>
                     <button
                        type="button"
                        onClick={handleExpandDescription}
                        disabled={!description || isExpandingDesc}
                        className="text-xs text-indigo-600 flex items-center gap-1 hover:bg-indigo-50 px-2 py-0.5 rounded transition-colors disabled:opacity-50"
                        title="Expandir en activitat detallada"
                    >
                        {isExpandingDesc ? <Loader2 className="animate-spin h-3 w-3"/> : <Maximize2 className="h-3 w-3"/>}
                        {isExpandingDesc ? 'Detallant...' : 'Detallar Activitat'}
                    </button>
                </div>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"
                    placeholder="Descriu l'activitat o utilitza el botó per generar-la..."
                />
            </div>
            
            <div className="space-y-3">
                 {/* Evaluation Field */}
                 <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Indicadors i Avaluació</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleGenerateRubricDoc}
                                disabled={!description || isGeneratingRubricDoc}
                                className="text-xs text-teal-600 flex items-center gap-1 hover:bg-teal-50 px-2 py-0.5 rounded transition-colors disabled:opacity-50"
                            >
                                {isGeneratingRubricDoc ? <Loader2 className="animate-spin h-3 w-3"/> : <FileText className="h-3 w-3"/>}
                                {isGeneratingRubricDoc ? 'Generant...' : 'Generar Rúbrica (Doc)'}
                            </button>
                            <button
                                type="button"
                                onClick={handleGenerateEvaluation}
                                disabled={!description || isGeneratingEval}
                                className="text-xs text-purple-600 flex items-center gap-1 hover:bg-purple-50 px-2 py-0.5 rounded transition-colors disabled:opacity-50"
                            >
                                {isGeneratingEval ? <Loader2 className="animate-spin h-3 w-3"/> : <Sparkles className="h-3 w-3"/>}
                                {isGeneratingEval ? 'Generant...' : 'Generar Indicadors i Avaluació'}
                            </button>
                        </div>
                    </div>
                    <textarea
                        value={evaluation}
                        onChange={(e) => setEvaluation(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none resize-none text-sm bg-purple-50/10"
                        placeholder="Indicadors, criteris o instruments d'avaluació..."
                    />
                </div>
                
                {/* Selected Criteria Summary */}
                {selectedCriteria.length > 0 && (
                    <div className="mt-1 p-2.5 bg-indigo-50 rounded-lg border border-indigo-100 max-h-24 overflow-y-auto custom-scrollbar">
                        <div className="flex items-center gap-2 mb-1.5 sticky top-0 bg-indigo-50">
                            <ListChecks size={12} className="text-indigo-600" />
                            <span className="text-[10px] font-bold text-indigo-800 uppercase">Criteris Seleccionats ({selectedCriteria.length})</span>
                        </div>
                        <ul className="space-y-1">
                            {selectedCriteria.map((crit, i) => (
                                <li key={i} className="text-[10px] text-gray-700 flex items-start gap-1.5 leading-tight">
                                    <span className="mt-1 w-1 h-1 rounded-full bg-indigo-400 flex-none"></span>
                                    <span>{crit}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
        
        {/* Links and Tags Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Enllaç / Recurs (Opcional)</label>
                <div className="relative group">
                    <div className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 flex items-center justify-center">
                       <LinkIcon size={14} />
                    </div>
                    <input
                        type="url"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        placeholder="https://..."
                    />
                    {link && (
                        <div className="absolute right-2 top-2">
                            <a href={link} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-200 transition-colors">
                                Provar
                            </a>
                        </div>
                    )}
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Etiquetes</label>
                <div 
                    className="relative" 
                    ref={tagInputContainerRef}
                >
                    <div className="flex flex-wrap items-center gap-2 p-2 border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent min-h-[42px]">
                        <Tag className="w-4 h-4 text-gray-400 ml-1" />
                        {tags.map(tag => (
                            <span key={tag} className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm font-medium">
                                {tag}
                                <button
                                    type="button"
                                    onClick={() => removeTag(tag)}
                                    className="text-gray-400 hover:text-red-500"
                                >
                                    <X size={14} />
                                </button>
                            </span>
                        ))}
                        <div className="flex-1 flex items-center relative">
                            <input
                                type="text"
                                value={tagInput}
                                onChange={handleTagInputChange}
                                onKeyDown={handleTagKeyDown}
                                onFocus={() => setShowTagSuggestions(true)}
                                className="w-full min-w-[80px] outline-none text-sm py-1 bg-transparent"
                                placeholder={tags.length === 0 ? "Escriu o selecciona..." : ""}
                            />
                            <button
                                type="button"
                                onClick={() => setShowTagSuggestions(!showTagSuggestions)}
                                className="text-gray-400 hover:text-gray-600 p-1 -mr-1"
                                tabIndex={-1}
                            >
                                <ChevronDown size={14} />
                            </button>
                        </div>
                    </div>
                    
                    {/* Autocomplete Dropdown */}
                    {showTagSuggestions && filteredTags.length > 0 && (
                        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                            <ul className="py-1">
                                {filteredTags.map((tag, index) => (
                                    <li 
                                        key={tag}
                                        onClick={() => handleAddTag(tag)}
                                        onMouseEnter={() => setActiveSuggestionIndex(index)}
                                        className={`px-3 py-2 text-sm cursor-pointer transition-colors flex items-center justify-between ${
                                            index === activeSuggestionIndex ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        {tag}
                                        {index === activeSuggestionIndex && <span className="text-xs text-blue-400">Enter</span>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* Middle Section: Curriculum Selector Header */}
      <div className="flex-none flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 border-t border-b border-gray-100 bg-gray-50 px-6 gap-3">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Selecció Curricular
        </h3>

        {/* Manual Search Bar with Dropdown */}
        <div className="relative flex-1 max-w-2xl w-full flex gap-2">
             {/* Area Dropdown - Removed 'hidden sm:block' for better accessibility */}
             <div className="relative max-w-[180px] w-full">
                 <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    <Filter className="h-3.5 w-3.5 text-gray-400" />
                 </div>
                 <select
                    value={manualSearchArea}
                    onChange={(e) => setManualSearchArea(e.target.value)}
                    className="w-full pl-8 pr-4 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white shadow-sm appearance-none cursor-pointer truncate"
                 >
                    <option value="">Totes les àrees</option>
                    {uniqueAreas.map(area => (
                        <option key={area} value={area}>{area}</option>
                    ))}
                 </select>
                 <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                     <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                 </div>
             </div>

             {/* Search Input */}
             <div className="relative flex-1">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                 </div>
                 <input
                    type="text"
                    value={curriculumSearch}
                    onChange={(e) => setCurriculumSearch(e.target.value)}
                    placeholder="Cercar manualment (saber, criteri, descripció)..."
                    className="w-full pl-9 pr-8 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white shadow-sm"
                 />
                 {(curriculumSearch || manualSearchArea) && (
                     <button 
                        onClick={clearManualSearch}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        title="Netejar cerca i filtres"
                     >
                         <X size={14} />
                     </button>
                 )}
             </div>
        </div>

        <button
            type="button"
            onClick={handleSuggestLinks}
            disabled={(!title && !description) || isSuggestingLinks}
            className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 whitespace-nowrap"
        >
            {isSuggestingLinks ? <Loader2 className="animate-spin h-3 w-3"/> : <Wand2 className="h-3 w-3"/>}
            {isSuggestingLinks ? 'Analitzant...' : 'Suggerir vincles amb IA'}
        </button>
      </div>

      {/* Suggestions Panel */}
      {suggestions.length > 0 && (
        <div className="flex-none mx-6 my-4 p-4 bg-indigo-50/50 border border-indigo-100 rounded-lg relative animate-in fade-in slide-in-from-top-2">
            <button 
            onClick={() => setSuggestions([])}
            className="absolute top-2 right-2 text-indigo-400 hover:text-indigo-700 p-1 rounded-full hover:bg-indigo-100 transition-colors"
            >
            <X size={16} />
            </button>
            <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Suggeriments de la IA
            </h4>
            <div className="grid grid-cols-1 gap-3">
            {suggestions.map(s => {
                const item = CURRICULUM_DATA.find(c => c.id === s.id);
                if (!item) return null;
                const isSelected = selectedIds.includes(item.id);
                return (
                <div 
                    key={s.id} 
                    onClick={() => toggleSelection(item.id)}
                    className={`flex gap-3 text-sm bg-white p-3 rounded-lg border shadow-sm hover:shadow-md transition-all cursor-pointer group ${
                        isSelected 
                        ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/30' 
                        : 'border-indigo-100 hover:border-indigo-300'
                    }`}
                >
                    <div className="shrink-0 flex flex-col items-center gap-1 pt-0.5">
                         <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                             isSelected 
                             ? 'bg-indigo-600 border-indigo-600' 
                             : 'border-gray-300 bg-white group-hover:border-indigo-400'
                         }`}>
                             {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                         </div>
                         <div className={`w-1.5 h-full min-h-[20px] rounded-full ${AREA_COLORS[item.area]?.split(' ')[0].replace('bg-', 'bg-opacity-70 bg-') || 'bg-gray-200'}`}></div> 
                    </div>
                    
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${AREA_COLORS[item.area] || 'bg-gray-100 text-gray-800'}`}>
                            {item.area}
                            </span>
                            <CompetencyBadge code={item.competenciaEspecifica} description={item.description} />
                        </div>
                        <p className={`font-medium text-sm leading-snug mb-2 ${isSelected ? 'text-indigo-900' : 'text-gray-800'}`}>{item.description}</p>
                        <div className="flex items-start gap-1.5 bg-indigo-50/50 p-2 rounded text-xs text-indigo-700">
                            <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0 text-indigo-500" />
                            <span className="italic">{s.reason}</span>
                        </div>
                    </div>
                </div>
                )
            })}
            </div>
        </div>
      )}

      {/* Main Selector Area (Swap between 3-column browse and search list) */}
      {/* Critical Fix: flex-1 and min-h-0 ensures this container takes available space but allows content to scroll inside without clipping */}
      <div className={`flex-1 min-h-0 border-t bg-gray-50/50 relative overflow-hidden flex flex-col`}>
          
          {/* 1. SEARCH MODE (Active if text is typed OR area dropdown is selected) */}
          {(curriculumSearch.trim() || manualSearchArea) ? (
              <div className="h-full overflow-y-auto p-4 custom-scrollbar">
                 <div className="text-xs font-bold text-gray-500 px-2 py-2 uppercase tracking-wide flex justify-between">
                     <span>Resultats de la cerca manual ({searchResults.length})</span>
                     {manualSearchArea && <span className="text-blue-600">Filtrat per: {manualSearchArea}</span>}
                 </div>
                 
                 {searchResults.length === 0 ? (
                     <div className="text-center py-10 text-gray-400">
                         No s'han trobat resultats.
                     </div>
                 ) : (
                     <div className="space-y-2 pb-4">
                         {searchResults.map(item => {
                             const isSelected = selectedIds.includes(item.id);
                             return (
                                <div 
                                    key={item.id}
                                    className={`relative rounded-lg border transition-all hover:shadow-sm ${
                                        isSelected 
                                        ? 'bg-indigo-50 border-indigo-300 shadow-sm' 
                                        : 'bg-white border-gray-200 hover:border-indigo-200'
                                    }`}
                                 >
                                     <div 
                                        onClick={() => toggleSelection(item.id)}
                                        className="p-3 cursor-pointer flex gap-3"
                                     >
                                        <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center flex-none transition-colors ${
                                            isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                                        }`}>
                                            {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${AREA_COLORS[item.area] || 'bg-gray-100 text-gray-700'}`}>
                                                    {item.area}
                                                </span>
                                                <CompetencyBadge code={item.competenciaEspecifica} description={item.description} />
                                                
                                                {item.planificat && (
                                                    <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded border border-gray-200">
                                                        {item.planificat}
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`text-sm ${isSelected ? 'text-indigo-900 font-medium' : 'text-gray-700'}`}>
                                                {item.description}
                                            </p>
                                            <div className="text-xs text-gray-500 mt-1 font-medium">
                                                <span className="text-gray-400">Saber:</span> {item.saber}
                                            </div>
                                        </div>
                                     </div>

                                     {/* Manual Selection of Criteria inside search results */}
                                     {isSelected && item.criteris && item.criteris.length > 0 && (
                                         <div className="border-t border-indigo-200 bg-white/50 p-3 rounded-b-lg">
                                             <div className="text-xs font-bold text-indigo-800 mb-2 uppercase tracking-wide flex items-center gap-1">
                                                 <ListChecks size={12} /> Criteris d'Avaluació
                                             </div>
                                             <div className="space-y-1.5">
                                                 {item.criteris.map((crit, idx) => {
                                                     const isCritSelected = selectedCriteria.includes(crit);
                                                     return (
                                                         <label 
                                                            key={idx} 
                                                            className="flex items-start gap-2 p-1.5 rounded hover:bg-indigo-50 cursor-pointer group"
                                                         >
                                                             <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-none transition-colors ${
                                                                isCritSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 bg-white group-hover:border-indigo-300'
                                                             }`}>
                                                                 {isCritSelected && <Check className="w-3 h-3 text-white" />}
                                                             </div>
                                                             <input 
                                                                type="checkbox" 
                                                                className="hidden"
                                                                checked={isCritSelected}
                                                                onChange={() => toggleCriterion(crit)}
                                                             />
                                                             <span className={`text-xs leading-snug ${isCritSelected ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                                                                 {crit}
                                                             </span>
                                                         </label>
                                                     );
                                                 })}
                                             </div>
                                         </div>
                                     )}
                                </div>
                             );
                         })}
                     </div>
                 )}
              </div>
          ) : (
          
          /* 2. BROWSE MODE (3 COLUMNS) */
          /* Using h-full here combined with parent flex-1 min-h-0 ensures the columns fit the available screen space and scroll independently */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-0 h-full">
            {/* Column 1: Areas (Competències) */}
            <div className="md:col-span-3 border-r border-gray-100 overflow-visible md:overflow-y-auto bg-gray-50/50 h-auto md:h-full custom-scrollbar">
                <div className="p-2 space-y-1">
                    <div className="px-2 py-1 text-xs font-bold text-gray-400 uppercase">Àrees</div>
                    {uniqueAreas.map(area => {
                        const count = getSelectedCount(i => i.area === area);
                        const isActive = activeArea === area;
                        return (
                            <button
                                key={area}
                                type="button"
                                onClick={() => { setActiveArea(area); setActiveCE(null); }}
                                className={`w-full text-left px-3 py-3 rounded-lg text-sm font-medium transition-all flex justify-between items-center group ${
                                    isActive 
                                    ? 'bg-white shadow-md text-blue-700 ring-1 ring-black/5' 
                                    : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <span className="line-clamp-2">{area}</span>
                                <div className="flex items-center gap-1">
                                    {count > 0 && (
                                        <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 rounded-full font-bold">
                                            {count}
                                        </span>
                                    )}
                                    {isActive && <ChevronRight className="w-4 h-4 text-blue-500" />}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Column 2: Specific Competencies (CE) */}
            <div className="md:col-span-4 border-r border-gray-100 overflow-visible md:overflow-y-auto bg-white h-auto md:h-full custom-scrollbar">
                <div className="p-2 space-y-1">
                    <div className="px-2 py-1 text-xs font-bold text-gray-400 uppercase sticky top-0 bg-white z-10 border-b border-gray-100 shadow-sm">
                        {activeArea ? `Competències: ${activeArea.substring(0,15)}...` : 'Selecciona una àrea'}
                    </div>
                    
                    {!activeArea && (
                        <div className="p-4 text-center text-gray-400 text-sm italic mt-10">
                            <ArrowRight className="w-6 h-6 mx-auto mb-2 opacity-50" />
                            Primer selecciona una àrea
                        </div>
                    )}

                    {specificCompetenciesForArea.map(({code, saber, description}) => {
                        const count = getSelectedCount(i => i.competenciaEspecifica === code && i.area === activeArea);
                        const isActive = activeCE === code;
                        return (
                            <button
                                key={code}
                                type="button"
                                onClick={() => setActiveCE(code)}
                                className={`w-full text-left px-3 py-3 rounded-lg text-sm transition-all flex justify-between items-start gap-2 group ${
                                    isActive 
                                    ? 'bg-blue-50 text-blue-800 border-blue-100' 
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <CompetencyBadge code={code} description={description} />
                                    </div>
                                    <span className="line-clamp-2 font-medium">{saber}</span>
                                </div>
                                <div className="flex flex-col items-end gap-1 mt-0.5">
                                    {count > 0 && (
                                        <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 rounded-full font-bold">
                                            {count}
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Column 3: Criteria / Sabers */}
            <div className="md:col-span-5 overflow-visible md:overflow-y-auto bg-gray-50/30 h-auto md:h-full custom-scrollbar">
                <div className="p-2 space-y-2">
                    <div className="px-2 py-1 text-xs font-bold text-gray-400 uppercase sticky top-0 bg-gray-100 z-10 backdrop-blur-sm shadow-sm">
                        {activeCE ? 'Criteris i Sabers' : 'Selecciona una CE'}
                    </div>

                    {!activeCE && (
                        <div className="p-4 text-center text-gray-400 text-sm italic mt-10">
                            Selecciona una competència específica
                        </div>
                    )}

                    {itemsForActiveCE.map(item => {
                        const isSelected = selectedIds.includes(item.id);
                        const itemCriteriaCount = item.criteris?.filter(c => selectedCriteria.includes(c)).length || 0;
                        
                        return (
                            <div 
                                key={item.id}
                                className={`relative rounded-lg border transition-all hover:shadow-sm ${
                                    isSelected 
                                    ? 'bg-indigo-50 border-indigo-300 shadow-sm' 
                                    : 'bg-white border-gray-200 hover:border-indigo-200'
                                }`}
                            >
                                {/* Header (The Saber itself) */}
                                <div 
                                    onClick={() => toggleSelection(item.id)}
                                    className="p-3 cursor-pointer flex gap-3"
                                >
                                    <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center flex-none transition-colors ${
                                        isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                                    }`}>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-sm ${isSelected ? 'text-indigo-900 font-medium' : 'text-gray-700'}`}>
                                            {item.description}
                                        </p>
                                        
                                        {/* Metadata Tags */}
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {item.planificat && (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded border border-gray-200">
                                                {item.planificat}
                                                </span>
                                            )}
                                            {item.actuacio && (
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                                    item.actuacio === 'Alta' ? 'bg-green-50 text-green-700 border-green-100' :
                                                    item.actuacio === 'Baixa' ? 'bg-red-50 text-red-700 border-red-100' :
                                                    'bg-yellow-50 text-yellow-700 border-yellow-100'
                                                }`}>
                                                {item.actuacio}
                                                </span>
                                            )}
                                            {itemCriteriaCount > 0 && (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded border border-blue-200 flex items-center gap-1">
                                                    <ListChecks size={10} /> {itemCriteriaCount} criteris
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Expanded Criteria Section */}
                                {isSelected && item.criteris && item.criteris.length > 0 && (
                                    <div className="border-t border-indigo-200 bg-white/50 p-3 rounded-b-lg animate-in slide-in-from-top-1">
                                        <div className="text-xs font-bold text-indigo-800 mb-2 uppercase tracking-wide flex items-center gap-1">
                                            <ListChecks size={12} /> Criteris d'Avaluació
                                        </div>
                                        <div className="space-y-1.5">
                                            {item.criteris.map((crit, idx) => {
                                                const isCritSelected = selectedCriteria.includes(crit);
                                                return (
                                                    <label 
                                                        key={idx} 
                                                        className="flex items-start gap-2 p-1.5 rounded hover:bg-indigo-50 cursor-pointer group"
                                                    >
                                                        <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-none transition-colors ${
                                                            isCritSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 bg-white group-hover:border-indigo-300'
                                                        }`}>
                                                            {isCritSelected && <Check className="w-3 h-3 text-white" />}
                                                        </div>
                                                        <input 
                                                            type="checkbox" 
                                                            className="hidden"
                                                            checked={isCritSelected}
                                                            onChange={() => toggleCriterion(crit)}
                                                        />
                                                        <span className={`text-xs leading-snug ${isCritSelected ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                                                            {crit}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    
                    {activeCE && itemsForActiveCE.length === 0 && (
                        <div className="p-4 text-center text-gray-400 text-xs italic">
                            No hi ha criteris per a aquest curs ({grade}).
                        </div>
                    )}
                </div>
            </div>
          </div>
          )}
      </div>

      {/* Footer Actions */}
      <div className="flex-none flex justify-end gap-3 p-6 border-t mt-auto bg-white z-20 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)]">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <X size={18} /> Cancel·lar
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors flex items-center gap-2 shadow-sm text-sm font-medium"
        >
          <Save size={18} /> Guardar Activitat
        </button>
      </div>
    </form>

    {/* Rubric Modal */}
    <Modal
        isOpen={isRubricModalOpen}
        onClose={() => setIsRubricModalOpen(false)}
        title="Rúbrica d'Avaluació Generada"
        maxWidth="max-w-4xl"
    >
        <div className="flex flex-col h-[70vh]">
            <div className="flex-none mb-4 flex justify-between items-center bg-yellow-50 p-3 rounded-lg border border-yellow-100 flex-wrap gap-2">
                 <p className="text-xs text-yellow-800 flex items-center gap-2">
                    <Lightbulb size={14} />
                    Opcions d'exportació i impressió:
                 </p>
                 <div className="flex gap-2">
                     <button 
                        onClick={handleCopyHTML}
                        className="bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                        title="Copiar al porta-papers per enganxar manualment"
                     >
                        <Copy size={14} />
                        Copiar Text
                     </button>
                     <button 
                        onClick={handleOpenGoogleDoc}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 hover:bg-blue-700 transition-colors"
                        title="Copiar i obrir Google Docs"
                     >
                        <FilePlus size={14} />
                        Obrir a Google Docs
                     </button>
                     <button 
                        onClick={handlePrintRubric}
                        className="bg-gray-800 text-white px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 hover:bg-black transition-colors"
                     >
                        <Printer size={14} />
                        Imprimir / PDF
                     </button>
                 </div>
            </div>
            <div className="flex-1 overflow-y-auto border rounded-lg p-8 bg-white shadow-inner">
                <div dangerouslySetInnerHTML={{ __html: rubricHTML }} />
            </div>
        </div>
    </Modal>
    </>
  );
};