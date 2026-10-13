import React from 'react';

const Card = ({ children, className = '', hover = true, ...props }) => (
  <div
    className={`app-card rounded-[1.35rem] transition-all duration-200 ${
      hover ? 'hover:-translate-y-0.5 hover:shadow-lg' : ''
    } ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader = ({ children, className = '', title, subtitle, action }) => (
  <div className={`flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800/80 sm:px-6 ${className}`}>
    <div className="min-w-0">
      {title && <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-[15px]">{title}</h3>}
      {subtitle && <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{subtitle}</p>}
      {children}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export const CardContent = ({ children, className = '' }) => (
  <div className={`p-5 sm:p-6 ${className}`}>{children}</div>
);

export const CardFooter = ({ children, className = '' }) => (
  <div className={`flex items-center justify-between border-t border-slate-100 px-5 py-4 dark:border-slate-800/80 sm:px-6 ${className}`}>
    {children}
  </div>
);

export default Card;
