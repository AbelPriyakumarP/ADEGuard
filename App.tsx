import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import HistorySidebar from './components/HistorySidebar';
import ChatBot from './components/ChatBot';
import { User, AnalysisResult, HistoryItem, Theme } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<{text: string, result: AnalysisResult} | null>(null);
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const storedUser = localStorage.getItem('adeguard_user');
    if (storedUser) setUser(JSON.parse(storedUser));

    const storedHistory = localStorage.getItem('adeguard_history');
    if (storedHistory) setHistory(JSON.parse(storedHistory));

    // Check system preference for theme
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLogin = () => {
    // Simulate Google OAuth Popup
    const width = 500;
    const height = 600;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    
    const popup = window.open("", "Google Sign In", `width=${width},height=${height},top=${top},left=${left}`);
    
    if (popup) {
      popup.document.write(`
        <html>
          <head><title>Sign in - Google Accounts</title></head>
          <body style="display:flex;justify-content:center;align-items:center;height:100%;font-family:sans-serif;background:#fff;">
            <div style="text-align:center;">
              <h2 style="color:#555;">Connecting to Google...</h2>
              <div style="width:40px;height:40px;border:4px solid #f3f3f3;border-top:4px solid #3498db;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto;"></div>
            </div>
            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
          </body>
        </html>
      `);
      
      setTimeout(() => {
        popup.close();
        const mockUser: User = {
          name: "Dr. Peter Pandey",
          email: "peter.pandey@curevia.ai",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Peter"
        };
        setUser(mockUser);
        localStorage.setItem('adeguard_user', JSON.stringify(mockUser));
      }, 1500);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('adeguard_user');
  };

  const handleAnalyzeComplete = (text: string, result: AnalysisResult) => {
    if (user) {
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        text,
        result
      };
      const updatedHistory = [newItem, ...history];
      setHistory(updatedHistory);
      localStorage.setItem('adeguard_history', JSON.stringify(updatedHistory));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      <Navbar 
        user={user} 
        onLogin={handleLogin} 
        onLogout={handleLogout} 
        onToggleHistory={() => setIsHistoryOpen(true)}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      
      <HistorySidebar 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        user={user}
        onSelectHistory={(item) => setSelectedHistoryItem({ text: item.text, result: item.result })}
      />

      <Dashboard 
        onAnalyzeComplete={handleAnalyzeComplete}
        initialData={selectedHistoryItem}
      />

      <ChatBot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}

export default App;
