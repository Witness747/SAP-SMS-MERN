import React from 'react';
import Card from '../common/Card';

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'indigo' }) => {
  const colorMap = {
    indigo: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50',
    amber: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50',
    rose: 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/50',
    purple: 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/50',
  };

  return (
    <Card className="p-5 flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {title}
        </p>
        <h4 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1.5 tracking-tight">
          {value}
        </h4>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            {subtitle}
          </p>
        )}
      </div>

      {Icon && (
        <div className={`p-3 rounded-2xl border ${colorMap[color] || colorMap.indigo} flex-shrink-0`}>
          <Icon className="w-6 h-6" />
        </div>
      )}
    </Card>
  );
};

export default StatCard;
