import React from 'react';

const Card = ({ children, className = '', hover = true, ...props }) => {
  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl shadow-sm ${
        hover ? 'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '', title, subtitle, action }) => {
  if (title || action) {
    return (
      <div className={`p-5 pb-3 flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800/60 ${className}`}>
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    );
  }
  return <div className={`p-5 pb-3 ${className}`}>{children}</div>;
};

export const CardContent = ({ children, className = '' }) => {
  return <div className={`p-5 ${className}`}>{children}</div>;
};

export const CardFooter = ({ children, className = '' }) => {
  return (
    <div className={`p-5 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between ${className}`}>
      {children}
    </div>
  );
};

export default Card;
