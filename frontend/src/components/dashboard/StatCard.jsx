import React from 'react';
import Card from '../common/Card';

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'indigo' }) => {
  const colorMap = {
    indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300',
    purple: 'bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300',
  };

  return (
    <Card className="group flex min-h-[142px] items-start justify-between gap-4 p-5 sm:p-6">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </p>
        <h4 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-[2.1rem]">
          {value}
        </h4>
        {subtitle && (
          <p className="mt-1.5 flex items-center gap-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>

      {Icon && (
        <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${colorMap[color] || colorMap.indigo} transition-transform duration-200 group-hover:scale-105`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      )}
    </Card>
  );
};

export default StatCard;
