import React from 'react';
import { Link } from 'react-router-dom';
import Card, { CardHeader, CardContent } from '../common/Card';
import Badge from '../common/Badge';
import { CheckSquare, ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { getDaysRemaining, getPriorityBadgeVariant } from '../../utils/formatters';

const PendingTasksCard = ({ tasks = [], onToggleTask }) => {
  return (
    <Card className="h-full">
      <CardHeader
        title="Pending Tasks"
        subtitle="Priority deadlines & assignments"
        action={
          <Link
            to="/tasks"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
      />
      <CardContent>
        {tasks.length === 0 ? (
          <div className="py-8 text-center text-slate-500 dark:text-slate-400">
            <CheckSquare className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">No pending tasks or deadlines right now.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {tasks.map((task) => (
              <div
                key={task._id}
                className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => onToggleTask && onToggleTask(task._id)}
                    className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex-shrink-0"
                    title="Mark task complete"
                  >
                    {task.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>
                  <div className="min-w-0">
                    <h5 className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {task.title}
                    </h5>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {task.subject && (
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {task.subject.code}
                        </span>
                      )}
                      <span>•</span>
                      <span className={task.dueDate && new Date(task.dueDate) < new Date() ? 'text-rose-500 font-semibold' : ''}>
                        {getDaysRemaining(task.dueDate)}
                      </span>
                    </div>
                  </div>
                </div>

                <Badge variant={getPriorityBadgeVariant(task.priority)} size="xs">
                  {task.priority}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PendingTasksCard;
