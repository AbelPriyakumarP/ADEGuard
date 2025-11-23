import React from 'react';
import { Entity, EntityType, SeverityLevel } from '../types';

interface HighlightedTextProps {
  text: string;
  entities: Entity[];
}

const HighlightedText: React.FC<HighlightedTextProps> = ({ text, entities }) => {
  if (!text || entities.length === 0) {
    return <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{text}</p>;
  }

  // This is a simplified highlighter for the demo. 
  // In a production app, we would map strict offsets from the NLP model.
  // Here we split by regex to find the terms.
  
  const renderText = () => {
    // Create a safe way to wrap known entities
    // We sort entities by length (longest first) to avoid partial matches of substrings
    const sortedEntities = [...entities].sort((a, b) => b.text.length - a.text.length);
    
    let parts = [{ text, type: 'text', entity: null as Entity | null }];

    sortedEntities.forEach(entity => {
      const newParts: typeof parts = [];
      parts.forEach(part => {
        if (part.type !== 'text') {
          newParts.push(part);
          return;
        }

        const regex = new RegExp(`(${escapeRegExp(entity.text)})`, 'gi');
        const split = part.text.split(regex);
        
        split.forEach(str => {
          if (!str) return;
          if (str.toLowerCase() === entity.text.toLowerCase()) {
             // Check if this segment was already processed (simplification for overlapping)
             newParts.push({ text: str, type: 'match', entity: entity });
          } else {
            newParts.push({ text: str, type: 'text', entity: null });
          }
        });
      });
      parts = newParts;
    });

    return parts.map((part, index) => {
      if (part.type === 'match' && part.entity) {
        const ent = part.entity;
        let colorClass = "bg-slate-200";
        
        if (ent.type === EntityType.DRUG) colorClass = "bg-blue-100 text-blue-800 border-b-2 border-blue-400";
        if (ent.type === EntityType.ADE) {
             if (ent.severity === SeverityLevel.SEVERE) colorClass = "bg-red-100 text-red-800 border-b-2 border-red-400";
             else if (ent.severity === SeverityLevel.MODERATE) colorClass = "bg-orange-100 text-orange-800 border-b-2 border-orange-400";
             else colorClass = "bg-amber-100 text-amber-800 border-b-2 border-amber-400";
        }
        if (ent.type === EntityType.MODIFIER) colorClass = "bg-purple-100 text-purple-800 border-b-2 border-purple-400";

        return (
          <span key={index} className={`mx-0.5 px-1 rounded-t ${colorClass} cursor-help relative group`}>
            {part.text}
            {/* Tooltip */}
            <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-max bg-slate-800 text-white text-xs py-1 px-2 rounded shadow-lg z-10">
               {ent.type} {ent.severity ? `(${ent.severity})` : ''}
            </span>
          </span>
        );
      }
      return <span key={index}>{part.text}</span>;
    });
  };

  function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <h3 className="text-sm uppercase tracking-wide text-slate-400 font-semibold mb-4">Annotated Narrative</h3>
      <div className="text-lg leading-8 text-slate-700 font-normal">
        {renderText()}
      </div>
      
      <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-500 border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-blue-100 border border-blue-400 rounded"></span> Drug
        </div>
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-red-100 border border-red-400 rounded"></span> Severe ADE
        </div>
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-orange-100 border border-orange-400 rounded"></span> Moderate ADE
        </div>
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-purple-100 border border-purple-400 rounded"></span> Modifier
        </div>
      </div>
    </div>
  );
};

export default HighlightedText;