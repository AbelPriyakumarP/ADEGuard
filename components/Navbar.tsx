import React from 'react';
import { Activity, Sun, Moon } from 'lucide-react';
import { User as UserType, Theme } from '../types';

interface NavbarProps {
  user: UserType | null;
  onLogin: () => void;
  onLogout: () => void;
  onToggleHistory: () => void;
  onToggleChat: () => void;
  theme: Theme;
  toggleTheme: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogin, onLogout, onToggleHistory, onToggleChat, theme, toggleTheme }) => {
  return (
    <nav className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-blue-500/30 transition-all duration-300">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                ADEGuard
              </span>
            </div>

            {/* Navigation Links (Desktop) */}
            <div className="hidden md:flex items-center gap-6">
               <button onClick={onToggleChat} className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                  Assistant
               </button>
               {user && (
                 <button onClick={onToggleHistory} className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                    History
                 </button>
               )}
            </div>
          </div>

          <div className="flex items-center gap-4">
             {/* Theme Toggle */}
             <button 
               onClick={toggleTheme}
               className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
               title="Toggle Theme"
             >
               {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
             </button>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800"></div>

            {/* Auth Section */}
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{user.name}</span>
                </div>
                <button onClick={onLogout} className="relative group">
                   <img 
                    src={user.avatar} 
                    alt={user.name} 
                    className="h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-sm" 
                   />
                   <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                     <span className="text-[8px] text-white font-bold">OUT</span>
                   </div>
                </button>
              </div>
            ) : (
              <button
                onClick={onLogin}
                className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg text-sm font-medium shadow-lg shadow-slate-200 dark:shadow-none hover:opacity-90 transition-all"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;