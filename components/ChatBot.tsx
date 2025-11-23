import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Mic, MicOff, MessageSquare, Bot, User as UserIcon, Loader2 } from 'lucide-react';
import { sendChatMessage } from '../services/geminiService';
import { ChatMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface ChatBotProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatBot: React.FC<ChatBotProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: "Hello. I am your AI Assistant. How can I help you with the dashboard today?", timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { id: uuidv4(), role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      const response = await sendChatMessage(userMsg.text, history);
      const botMsg: ChatMessage = { id: uuidv4(), role: 'model', text: response, timestamp: Date.now() };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = { id: uuidv4(), role: 'model', text: "I encountered an error. Please try again.", timestamp: Date.now() };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleMic = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Voice input requires Chrome or Edge.");
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => {
        setIsRecording(false);
        recognitionRef.current = null;
      };
      
      recognition.onerror = (event: any) => {
        if (event.error === 'aborted' || event.error === 'no-speech') {
           setIsRecording(false);
           return;
        }
        setIsRecording(false);
      };
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
      };
      
      recognition.start();
    } catch (e) {
      console.error("Failed to start speech recognition", e);
      setIsRecording(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 w-[400px] h-[600px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col z-50 animate-fade-in-up overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
             <Bot className="h-5 w-5" />
          </div>
          <div>
             <span className="font-semibold text-slate-900 dark:text-white block text-sm">AI Assistant</span>
             <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Online
             </span>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-950">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
              msg.role === 'user' 
              ? 'bg-blue-600 text-white rounded-br-none' 
              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-slate-700'
            }`}>
               {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-bl-none border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-xs text-slate-400">Thinking...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-full p-2 px-4">
           <input 
             type="text" 
             value={input}
             onChange={(e) => setInput(e.target.value)}
             onKeyDown={(e) => e.key === 'Enter' && handleSend()}
             placeholder="Ask ADEGuard..."
             className="flex-1 bg-transparent border-none outline-none text-sm text-slate-800 dark:text-white placeholder-slate-400"
           />
           
           <button 
             onClick={handleMic}
             className={`p-2 rounded-full transition-all ${
                isRecording 
                ? 'bg-red-100 text-red-600 animate-pulse' 
                : 'text-slate-400 hover:text-blue-600'
             }`}
           >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
           </button>

           <button 
             onClick={handleSend}
             disabled={!input.trim() || loading}
             className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
           >
              <Send className="h-4 w-4" />
           </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;