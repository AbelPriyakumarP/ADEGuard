import React from 'react';
import { HistoryItem, User } from '../types';
import { X, Calendar, ChevronRight, FileText } from 'lucide-react';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onSelectHistory: (item: HistoryItem) => void;
  user: User | null;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ isOpen, onClose, history, onSelectHistory, user }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900 bg-opacity-30 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white shadow-2xl h-full flex flex-col animate-slide-in-right">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                H
             </div>
             <div>
               <h2 className="font-bold text-slate-800">Analysis History</h2>
               <p className="text-xs text-slate-500">{user?.name}'s Records</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
               <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
               <p>No analysis history found.</p>
               <p className="text-sm mt-1">Analyses you perform will appear here.</p>
            </div>
          ) : (
            history.map((item) => (
              <div 
                key={item.id}
                onClick={() => {
                    onSelectHistory(item);
                    onClose();
                }}
                className="group bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex justify-between items-start mb-2">
                   <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(item.timestamp).toLocaleString()}
                   </span>
                   <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                      item.result.overallRiskScore > 70 ? 'bg-red-100 text-red-700' : 
                      item.result.overallRiskScore > 40 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
                   }`}>
                      Risk: {item.result.overallRiskScore}
                   </div>
                </div>

                <p className="text-sm text-slate-800 line-clamp-2 font-medium mb-2">
                   {item.result.summary}
                </p>

                <div className="flex items-center justify-between mt-2">
                   <div className="flex items-center gap-1 text-xs text-slate-500">
                      <FileText className="h-3 w-3" />
                      {item.result.entities.length} entities
                   </div>
                   <ChevronRight className="h-4 w-4 text-indigo-400 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HistorySidebar;
