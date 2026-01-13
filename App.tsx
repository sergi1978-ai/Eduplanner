
import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ActivityList } from './components/ActivityList';
import { CurriculumView } from './components/CurriculumView';
import { ActivityForm } from './components/ActivityForm';
import { AIChat } from './components/AIChat';
import { Modal } from './components/ui/Modal';
import { Activity, ViewState } from './types';
import { Plus, AlertCircle, RefreshCw, ShieldAlert } from 'lucide-react';
import { suggestActivityDetails } from './services/gemini';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | undefined>(undefined);
  const [apiStatus, setApiStatus] = useState<'testing' | 'ok' | 'error' | 'missing_key'>('testing');
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);

  const checkConnection = async () => {
    setApiStatus('testing');
    
    // Verificació prèvia de la variable d'entorn
    if (!process.env.API_KEY) {
      setApiStatus('missing_key');
      setApiErrorMessage("La variable API_KEY no està definida. Revisa la configuració de Vercel.");
      return;
    }

    try {
      const res = await suggestActivityDetails("Ping", "1r");
      if (res && !res.toLowerCase().includes("error")) {
        setApiStatus('ok');
        setApiErrorMessage(null);
      } else {
        setApiStatus('error');
        setApiErrorMessage(res || "La IA no ha retornat una resposta vàlida.");
      }
    } catch (e) {
      setApiStatus('error');
      setApiErrorMessage("Error inesperat de xarxa en connectar amb Gemini.");
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const [activities, setActivities] = useState<Activity[]>(() => {
    const saved = localStorage.getItem('eduplan_activities');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((a: any) => ({
          ...a,
          academicYear: a.academicYear || '2024-2025'
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('eduplan_activities', JSON.stringify(activities));
  }, [activities]);

  const availableTags = useMemo(() => {
    const allTags = activities.flatMap(a => a.tags || []);
    return Array.from(new Set(allTags)).sort();
  }, [activities]);

  const handleSaveActivity = (activity: Activity) => {
    setActivities(prev => {
      const exists = prev.find(a => a.id === activity.id);
      if (exists) return prev.map(a => a.id === activity.id ? activity : a);
      return [activity, ...prev];
    });
    setIsFormOpen(false);
    setEditingActivity(undefined);
    setCurrentView('activities');
  };

  const handleDeleteActivity = (id: string) => {
    if (window.confirm('Estàs segur que vols eliminar aquesta activitat?')) {
      setActivities(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
    setIsFormOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingActivity(undefined);
    setIsFormOpen(true);
  };

  return (
    <Layout 
      currentView={currentView} 
      onViewChange={setCurrentView}
      onOpenChat={() => setIsChatOpen(true)}
    >
      {/* Diagnòstic d'API */}
      {(apiStatus === 'error' || apiStatus === 'missing_key') && (
        <div className="mb-6 p-5 bg-white border-2 border-red-500 rounded-2xl shadow-xl animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-start gap-4">
            <div className="bg-red-100 p-2 rounded-full">
              <ShieldAlert className="text-red-600" size={24} />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-bold text-red-900">Problema de Connexió IA</h4>
              <p className="text-sm text-red-700 mt-1">{apiErrorMessage}</p>
              
              <div className="mt-4 flex flex-wrap gap-3">
                <button 
                  onClick={checkConnection}
                  className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 flex items-center gap-2 transition-all font-medium text-sm"
                >
                  <RefreshCw size={16} /> Reintentar Connexió
                </button>
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-white text-red-600 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-50 transition-all font-medium text-sm flex items-center gap-2"
                >
                  Obtenir nova clau gratuïta
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentView === 'dashboard' && <Dashboard activities={activities} />}
      {currentView === 'activities' && (
        <div className="relative">
          <div className="absolute top-[-60px] right-0 z-20">
            <button 
              onClick={handleOpenCreate}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg font-bold"
            >
              <Plus size={20} /> Nova Activitat
            </button>
          </div>
          <ActivityList activities={activities} onEdit={handleEditActivity} onDelete={handleDeleteActivity} />
        </div>
      )}
      {currentView === 'curriculum' && <CurriculumView />}

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingActivity ? 'Editar Activitat' : 'Nova Activitat'}
        maxWidth="max-w-4xl"
      >
        <ActivityForm 
            initialData={editingActivity}
            availableTags={availableTags}
            onSave={handleSaveActivity}
            onCancel={() => setIsFormOpen(false)}
        />
      </Modal>

      <AIChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </Layout>
  );
}

export default App;
