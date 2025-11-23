import React from 'react';
import { EntityType, SeverityLevel } from '../types';

interface EntityTagProps {
  type: EntityType;
  text: string;
  severity?: SeverityLevel;
}

const EntityTag: React.FC<EntityTagProps> = ({ type, text, severity }) => {
  let baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all shadow-sm border";
  
  switch (type) {
    case EntityType.DRUG:
      baseClasses += " bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-800";
      break;
    case EntityType.ADE:
      if (severity === SeverityLevel.SEVERE) {
        baseClasses += " bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800";
      } else if (severity === SeverityLevel.MODERATE) {
        baseClasses += " bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800";
      } else {
        baseClasses += " bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800";
      }
      break;
    case EntityType.MODIFIER:
      baseClasses += " bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800";
      break;
    default:
      baseClasses += " bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  }

  return (
    <span className={baseClasses}>
      {text}
      {type === EntityType.ADE && severity && severity !== SeverityLevel.UNKNOWN && (
        <span className="ml-1.5 pl-1.5 border-l border-current opacity-75 text-[10px] uppercase tracking-wider">
          {severity}
        </span>
      )}
    </span>
  );
};

export default EntityTag;