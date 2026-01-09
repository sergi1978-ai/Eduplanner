import React, { ReactNode } from 'react';
import { LayoutGrid, BookOpen, List, MessageCircle } from 'lucide-react';
import { ViewState } from '../types';

interface LayoutProps {
  children: ReactNode;
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
  onOpenChat: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onViewChange, onOpenChat }) => {
  const navItems = [
    { id: 'dashboard', label: 'Tauler', icon: LayoutGrid },
    { id: 'activities', label: 'Activitats', icon: List },
    { id: 'curriculum', label: 'Currículum', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col sticky top-0 h-auto md:h-screen z-10">
        <div className="p-6 border-b border-gray-100 flex-none">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            EduPlan AI
          </h1>
          <p className="text-xs text-gray-400 mt-1">Primary Education Planner</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as ViewState)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                currentView === item.id 
                  ? 'bg-blue-50 text-blue-700 font-medium shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 flex flex-col gap-4 flex-none">
            <button 
                onClick={onOpenChat}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl px-4 py-3 flex items-center justify-center gap-2 hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
            >
                <MessageCircle size={20} />
                <span>Chat IA</span>
            </button>
            
            <div className="text-[10px] text-gray-400 text-center leading-tight">
              Dissenyat pel <br/>
              <strong className="text-gray-600">Servei Educatiu Vallès Occidental VIII</strong>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
        <div className="max-w-5xl mx-auto">
          <header className="mb-8 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800 capitalize">
                {navItems.find(n => n.id === currentView)?.label}
            </h2>
            {/* API Key Warning - Hidden if valid, but good practice */}
            {!process.env.API_KEY && (
                <div className="bg-red-100 text-red-700 px-3 py-1 rounded text-xs font-bold border border-red-200">
                    API Key Missing
                </div>
            )}
          </header>
          {children}
        </div>
      </main>
    </div>
  );
};