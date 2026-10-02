import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';
import { GraduationCap, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center transition-colors">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
        <GraduationCap className="w-8 h-8" />
      </div>

      <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
        404
      </h1>
      <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mt-2">
        Page Not Found
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-6">
        The academic resource or page you are looking for doesn't exist or has been relocated.
      </p>

      <Link to="/dashboard">
        <Button size="sm" leftIcon={ArrowLeft}>
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
};

export default NotFound;
