import React, { useState, useEffect, useRef } from 'react';
import { analyzeClinicalContent, generateSpeech } from '../services/geminiService';
import { AnalysisResult, EntityType, SeverityLevel } from '../types';
import EntityTag from './EntityTag';
import Toast from './Toast';
import { ArrowRight, FileText, Loader2, Download, Globe, Paperclip, Mic, MicOff, Volume2, X, PlayCircle, CheckCircle2, StopCircle, Image as ImageIcon, FileIcon, Settings, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { jsPDF } from 'jspdf';

const SAMPLE_NOTE = `Patient is a 68-year-old male with a history of hypertension. He was prescribed Lisinopril 10mg daily two weeks ago. He presented today complaining of a persistent, dry hacking cough that worsens at night.`;

interface DashboardProps {
  onAnalyzeComplete: (text: string, result: AnalysisResult) => void;
  initialData?: { text: string; result: AnalysisResult } | null;
}

// Audio Helper Functions
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const Dashboard: React.FC<DashboardProps> = ({ onAnalyzeComplete, initialData }) => {
  const [input, setInput] = useState(SAMPLE_NOTE);
  const [triageLevel, setTriageLevel] = useState('Routine');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [showTamil, setShowTamil] = useState(false);
  
  // Dashboard Customization
  const [visibleSections, setVisibleSections] = useState({
    summary: true,
    entities: true,
    reasoning: true,
    actions: true
  });
  const [showViewOptions, setShowViewOptions] = useState(false);

  // File Upload State
  const [attachment, setAttachment] = useState<{ name: string, data: string, mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice Agent State (MediaRecorder)
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Playback
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    if (initialData) {
      setInput(initialData.text);
      setResult(initialData.result);
      setShowTamil(false);
      setAttachment(null);
      setToast({ msg: "History restored", type: 'success' });
    }
  }, [initialData]);

  useEffect(() => {
    return () => {
      if (audioSource) audioSource.stop();
      if (audioContext && audioContext.state !== 'closed') audioContext.close();
    };
  }, []);

  // --- VOICE AGENT LOGIC (GEMINI AUDIO) ---
  const startVoiceAgent = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await processVoiceInput(audioBlob);
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      setToast({ msg: "Microphone access denied", type: 'error' });
    }
  };

  const stopVoiceAgent = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processVoiceInput = async (audioBlob: Blob) => {
    setLoading(true);
    setToast({ msg: "Processing voice input...", type: 'success' });
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        // Analyze directly with Audio Attachment
        const data = await analyzeClinicalContent(
          null, 
          triageLevel,
          { data: base64Audio, mimeType: 'audio/wav' }
        );

        // Update State
        if (data.transcript) setInput(data.transcript);
        setResult(data);
        onAnalyzeComplete(data.transcript || "Voice Input", data);
        
        // Auto-play response (if detected language implies it, or default to English)
        // If detected language is Tamil, play Tamil summary.
        if (data.detectedLanguage?.toLowerCase().includes('tamil')) {
           setShowTamil(true);
           await playTTS(data.tamilAnalysis.summary, 'Puck');
        } else {
           setShowTamil(false);
           await playTTS(data.summary, 'Kore');
        }
        
        setLoading(false);
        setToast({ msg: "Voice Analysis Complete", type: 'success' });
      };
    } catch (err) {
      console.error(err);
      setLoading(false);
      setToast({ msg: "Voice analysis failed", type: 'error' });
    }
  };
  // ---------------------------------------

  const handleAnalyze = async () => {
    if (!input.trim() && !attachment) {
      setToast({ msg: "Please enter text or attach a file", type: 'error' });
      return;
    }
    setLoading(true);
    setShowTamil(false);
    
    if (isPlayingAudio && audioSource) {
      audioSource.stop();
      setIsPlayingAudio(false);
    }

    try {
      const data = await analyzeClinicalContent(
        input, 
        triageLevel,
        attachment ? { data: attachment.data, mimeType: attachment.mimeType } : undefined
      );
      setResult(data);
      onAnalyzeComplete(input || (attachment ? `[File: ${attachment.name}]` : "Analysis"), data);
      setToast({ msg: "Report Generated", type: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ msg: "Analysis failed. Check input.", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setToast({ msg: "File too large (Max 5MB)", type: 'error' });
      return;
    }
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setToast({ msg: "Only PDF and Images supported", type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      setAttachment({
        name: file.name,
        data: base64Data,
        mimeType: file.type
      });
      setToast({ msg: "File Attached", type: 'success' });
    };
    reader.readAsDataURL(file);
  };

  const playTTS = async (text: string, voice: 'Kore' | 'Puck') => {
    if (isPlayingAudio) {
       audioSource?.stop();
       setIsPlayingAudio(false);
    }
    
    try {
      const audioDataBase64 = await generateSpeech(text, voice);
      let ctx = audioContext;
      if (!ctx || ctx.state === 'closed') {
        ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        setAudioContext(ctx);
      }

      const pcmBytes = decodeBase64(audioDataBase64);
      const audioBuffer = await decodeAudioData(pcmBytes, ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      source.onended = () => {
        setIsPlayingAudio(false);
        setAudioSource(null);
      };
      
      source.start(0);
      setAudioSource(source);
      setIsPlayingAudio(true);
    } catch (e) {
      console.error(e);
      setToast({ msg: "Audio playback failed", type: 'error' });
    }
  };

  const handleDownloadPDF = () => {
    if (!result) return;
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 25, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("ADEGuard Clinical Report", 15, 17);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 195, 17, { align: 'right' });

    let y = 40;

    // Patient Context
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "bold");
    doc.text(`Classification: ${result.classification}`, 15, y);
    doc.text(`Sentiment: ${result.sentiment}`, 120, y);
    y += 7;
    doc.text(`Patient Cohort: ${result.patientAgeGroup}`, 15, y);
    doc.text(`Risk Score: ${result.overallRiskScore}/100`, 120, y);
    y += 15;

    // Helper to add section
    const addSection = (title: string, content: string | string[], italic = false) => {
       doc.setFillColor(240, 240, 240);
       doc.rect(15, y-6, 180, 8, 'F');
       doc.setFont("helvetica", "bold");
       doc.setTextColor(0, 0, 0);
       doc.text(title, 17, y);
       y += 10;
       doc.setFont("helvetica", italic ? "italic" : "normal");
       doc.setFontSize(10);
       doc.setTextColor(50, 50, 50);

       if (Array.isArray(content)) {
           content.forEach(line => {
             const lines = doc.splitTextToSize(`• ${line}`, 180);
             doc.text(lines, 15, y);
             y += (lines.length * 5) + 2;
           });
       } else {
           const lines = doc.splitTextToSize(content, 180);
           doc.text(lines, 15, y);
           y += (lines.length * 5) + 5;
       }
       y += 5;
    };

    if (visibleSections.summary) addSection("Executive Summary", result.summary);
    if (visibleSections.reasoning) addSection("Clinical Reasoning", result.clinicalReasoning, true);
    if (visibleSections.actions) addSection("Recommended Actions", result.suggestedActions);

    // Entities Table
    if (visibleSections.entities) {
        doc.setFillColor(240, 240, 240);
        doc.rect(15, y-6, 180, 8, 'F');
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("Identified Entities", 17, y);
        y += 10;

        // Table Headers
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("Entity Name", 15, y);
        doc.text("Type", 100, y);
        doc.text("Severity", 150, y);
        y += 2;
        doc.setDrawColor(200);
        doc.line(15, y, 195, y);
        y += 5;

        // Table Rows
        doc.setFont("helvetica", "normal");
        result.entities.forEach(e => {
            if (y > 270) { doc.addPage(); y = 20; }
            
            // Text Wrapping for Entity Name
            const entityLines = doc.splitTextToSize(e.text, 80); // Width 80 for entity name
            const rows = entityLines.length;
            const height = rows * 5;

            doc.text(entityLines, 15, y);
            doc.text(e.type, 100, y);
            doc.text(e.severity || "-", 150, y);
            
            y += height + 3; // Add buffer
        });
    }

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("This report is AI-generated and must be verified by a medical professional.", 105, 285, { align: 'center' });

    doc.save("ADEGuard_Report.pdf");
  };

  const isCritical = result && (result.overallRiskScore > 80 || result.entities.some(e => e.severity === SeverityLevel.SEVERE));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* LEFT: Input & Controls */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-1">
            
            {/* Input Area */}
            <div className="p-4">
               <div className="flex justify-between items-center mb-3">
                 <div className="flex gap-2">
                    {['Routine', 'Urgent', 'Emergency'].map(level => (
                        <button
                          key={level}
                          onClick={() => setTriageLevel(level)}
                          className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md border transition-all ${
                             triageLevel === level 
                             ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300' 
                             : 'border-transparent text-slate-400 hover:text-slate-600'
                          }`}
                        >
                           {level}
                        </button>
                    ))}
                 </div>
               </div>

               <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="w-full h-40 bg-transparent text-slate-800 dark:text-slate-100 text-base placeholder-slate-300 focus:outline-none resize-none leading-relaxed"
                  placeholder="Describe symptoms, attach reports, or speak..."
                />

                {/* Attachment Tag */}
                {attachment && (
                   <div className="mt-2 inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full text-xs">
                       {attachment.mimeType.includes('image') ? <ImageIcon className="h-3 w-3" /> : <FileIcon className="h-3 w-3" />}
                       <span className="truncate max-w-[150px]">{attachment.name}</span>
                       <button onClick={() => setAttachment(null)} className="ml-1 hover:text-red-500"><X className="h-3 w-3" /></button>
                   </div>
                )}
            </div>

            {/* Toolbar */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-b-3xl p-3 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
               <div className="flex items-center gap-2">
                  {/* File Upload */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600 transition-all cursor-pointer"
                    title="Attach PDF or Image"
                  >
                     <Paperclip className="h-5 w-5" />
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf,image/*" onChange={handleFileChange} />

                  {/* Voice Agent Button */}
                  <div 
                     onClick={isRecording ? stopVoiceAgent : startVoiceAgent}
                     className={`p-2 rounded-xl cursor-pointer transition-all flex items-center gap-2 ${
                        isRecording 
                        ? 'bg-red-50 text-red-600 ring-1 ring-red-200 animate-pulse' 
                        : 'hover:bg-white dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600'
                     }`}
                     title="Voice Agent"
                  >
                     {isRecording ? <StopCircle className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </div>
               </div>

               <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl shadow-md shadow-blue-500/20 font-medium text-xs flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Analyze"}
                </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Results */}
        <div className="lg:col-span-8">
          {!result ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl min-h-[300px]">
                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-3">
                   <FileText className="h-6 w-6" />
                </div>
                <p className="font-medium text-sm">Ready for analysis</p>
             </div>
          ) : (
             <div className="space-y-6 animate-fade-in">
                
                {/* Critical Alert */}
                {isCritical && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-start gap-3">
                       <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0" />
                       <div>
                          <h3 className="text-sm font-bold text-red-700 dark:text-red-300">Critical Safety Alert</h3>
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                             High risk score detected or severe adverse events identified. Immediate medical attention recommended.
                          </p>
                       </div>
                    </div>
                )}

                {/* Result Header & Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                   <div>
                      <h1 className="text-xl font-bold text-slate-900 dark:text-white">Analysis Report</h1>
                      <div className="flex items-center gap-3 mt-1">
                         <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${result.overallRiskScore > 70 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                             Risk: {result.overallRiskScore}
                         </span>
                         <span className="text-xs text-slate-400 px-2 border-l border-slate-200 dark:border-slate-700">
                             {result.classification}
                         </span>
                         <span className="text-xs text-slate-400">
                             Sentiment: {result.sentiment}
                         </span>
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-2">
                       {/* Customize View Toggle */}
                       <div className="relative">
                          <button 
                             onClick={() => setShowViewOptions(!showViewOptions)}
                             className="p-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600"
                          >
                             <Settings className="h-4 w-4" />
                          </button>
                          {showViewOptions && (
                             <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-20 p-2">
                                <h4 className="text-xs font-bold text-slate-400 uppercase px-2 mb-2">View Options</h4>
                                {Object.keys(visibleSections).map(key => (
                                   <div key={key} className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer" 
                                        onClick={() => setVisibleSections(prev => ({...prev, [key]: !prev[key as keyof typeof visibleSections]}))}>
                                      <span className="text-sm capitalize text-slate-700 dark:text-slate-300">{key}</span>
                                      {visibleSections[key as keyof typeof visibleSections] ? <Eye className="h-3 w-3 text-blue-500" /> : <EyeOff className="h-3 w-3 text-slate-400" />}
                                   </div>
                                ))}
                             </div>
                          )}
                       </div>
                       
                       <button onClick={() => setShowTamil(!showTamil)} className={`p-2 rounded-full border border-slate-200 dark:border-slate-700 transition-colors ${showTamil ? 'text-blue-600 bg-blue-50' : 'text-slate-500'}`}>
                          <Globe className="h-4 w-4" />
                       </button>
                       <button 
                         onClick={() => playTTS(showTamil ? result.tamilAnalysis.summary : result.summary, showTamil ? 'Puck' : 'Kore')} 
                         className="p-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600"
                       >
                         {isPlayingAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
                       </button>
                       <button onClick={handleDownloadPDF} className="p-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 shadow-lg">
                          <Download className="h-4 w-4" />
                       </button>
                   </div>
                </div>

                {/* Summary Card */}
                {visibleSections.summary && (
                   <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Executive Summary</h3>
                      <p className="text-base text-slate-800 dark:text-slate-200 leading-relaxed">
                         {showTamil ? result.tamilAnalysis.summary : result.summary}
                      </p>
                      
                      {visibleSections.reasoning && (
                         <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Clinical Reasoning</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                               {showTamil ? result.tamilAnalysis.clinicalReasoning : result.clinicalReasoning}
                            </p>
                         </div>
                      )}
                   </div>
                )}

                {/* Entities & Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {visibleSections.entities && (
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                         <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Identified Entities</h3>
                         <div className="flex flex-wrap gap-2">
                            {result.entities.map((e, i) => (
                               <EntityTag key={i} type={e.type} text={e.text} severity={e.severity} />
                            ))}
                         </div>
                      </div>
                   )}
                   
                   {visibleSections.actions && (
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                         <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Suggested Protocol</h3>
                         <ul className="space-y-3">
                            {(showTamil ? result.tamilAnalysis.suggestedActions : result.suggestedActions).map((action, i) => (
                               <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                                  {action}
                               </li>
                            ))}
                         </ul>
                      </div>
                   )}
                </div>
             </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;