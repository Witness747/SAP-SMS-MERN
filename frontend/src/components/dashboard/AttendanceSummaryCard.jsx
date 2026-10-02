import React from 'react';
import { Link } from 'react-router-dom';
import Card, { CardHeader, CardContent } from '../common/Card';
import Badge from '../common/Badge';
import { AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

const AttendanceSummaryCard = ({ overallPercentage = 0, lowAttendanceSubjects = [] }) => {
  const isHealthy = overallPercentage >= 75;

  return (
    <Card className="h-full">
      <CardHeader
        title="Attendance Overview"
        subtitle="Aggregate attendance tracking"
        action={
          <Link
            to="/attendance"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1"
          >
            Manage <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
      />
      <CardContent>
        {/* Progress Bar & Percentage display */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Overall Academic Attendance
            </span>
            <span
              className={`text-lg font-bold ${
                isHealthy ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {overallPercentage}%
            </span>
          </div>

          <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isHealthy
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  : 'bg-gradient-to-r from-rose-500 to-amber-500'
              }`}
              style={{ width: `${Math.min(100, overallPercentage)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mt-2">
            <span>Minimum target: 75%</span>
            <span>{isHealthy ? 'Target met' : 'Below target requirement'}</span>
          </div>
        </div>

        {/* Warning alerts for subjects requiring attention */}
        <div>
          <h5 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
            Subject Alerts ({lowAttendanceSubjects.length})
          </h5>

          {lowAttendanceSubjects.length === 0 ? (
            <div className="flex items-center gap-2 p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>Great job! All your subjects meet or exceed their attendance targets.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {lowAttendanceSubjects.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-2.5 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 rounded-xl text-xs"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-rose-900 dark:text-rose-200">
                        {sub.code || sub.subject}
                      </span>
                      <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80">
                        Needs {sub.classesNeeded} more class{sub.classesNeeded === 1 ? '' : 'es'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="danger" size="xs">
                    {sub.percentage}% / {sub.targetPercentage}%
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceSummaryCard;
