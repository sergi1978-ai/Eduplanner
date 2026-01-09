import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ActivityList } from './components/ActivityList';
import { CurriculumView } from './components/CurriculumView';
import { ActivityForm } from './components/ActivityForm';
import { AIChat } from './components/AIChat';
import { Modal } from './components/ui/Modal';
import { Activity, ViewState } from './types';
import { Plus } from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | undefined>(undefined);

  // Initial state with mock data or empty array + Migration logic
  const [activities, setActivities] = useState<Activity[]>(() => {
    const saved = localStorage.getItem('eduplan_activities');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration: Add default academicYear to old records
        return parsed.map((a: any) => ({
          ...a,
          academicYear: a.academicYear || '2024-2025'
        }));
      } catch (e) {
        console.error("Error parsing activities", e);
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('eduplan_activities', JSON.stringify(activities));
  }, [activities]);

  // Calculate all unique tags currently in use across all activities
  const availableTags = useMemo(() => {
    const allTags = activities.flatMap(a => a.tags || []);
    return Array.from(new Set(allTags)).sort();
  }, [activities]);

  const handleSaveActivity = (activity: Activity) => {
    setActivities(prev => {
      const exists = prev.find(a => a.id === activity.id);
      if (exists) {
        return prev.map(a => a.id === activity.id ? activity : a);
      }
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
      {currentView === 'dashboard' && (
        <Dashboard activities={activities} />
      )}

      {currentView === 'activities' && (
        <div className="relative">
            <div className="absolute top-[-60px] right-0 z-20">
                <button 
                    onClick={handleOpenCreate}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm font-medium"
                >
                    <Plus size={20} /> Nova Activitat
                </button>
            </div>
            <ActivityList 
                activities={activities} 
                onEdit={handleEditActivity}
                onDelete={handleDeleteActivity}
            />
        </div>
      )}

      {currentView === 'curriculum' && (
        <CurriculumView />
      )}

      {/* Modals */}
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

      <AIChat 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
      />
    </Layout>
  );
}

export default App;