import React, { useState, useEffect } from 'react';
import { taskService } from '../services/taskService';
import { subjectService } from '../services/subjectService';
import { useNotifications } from '../hooks/useNotifications';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import { TableSkeleton } from '../components/common/Skeleton';
import TaskModal from '../components/tasks/TaskModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Pagination from '../components/common/Pagination';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Circle,
  CheckCircle2,
  Trash2,
  Edit2,
  Calendar,
} from 'lucide-react';
import { formatDate, getDaysRemaining, getPriorityBadgeVariant } from '../utils/formatters';
import { deleteAndRefreshPage } from '../utils/pagination';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  // Filters & search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { showToast } = useNotifications();

  const loadData = async (requestedPage = page) => {
    try {
      setIsLoading(true);
      const params = {};
      if (statusFilter === 'overdue') {
        params.overdue = 'true';
      } else if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (priorityFilter !== 'all') {
        params.priority = priorityFilter;
      }
      if (subjectFilter !== 'all') {
        params.subject = subjectFilter;
      }
      if (search.trim()) {
        params.search = search.trim();
      }
      params.page = requestedPage;
      params.pageSize = 12;

      const [taskRes, subRes] = await Promise.all([
        taskService.getAll(params),
        subjectService.getAll(),
      ]);

      setTasks(taskRes.data || []);
      setPagination(taskRes.meta?.pagination || null);
      setSubjects(subRes.data || []);
      return taskRes;
    } catch (err) {
      showToast(err.message || 'Failed to load tasks', 'error');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, priorityFilter, subjectFilter, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadData(1);
  };

  const handleToggleTask = async (taskId) => {
    try {
      await taskService.toggleStatus(taskId);
      showToast('Task updated', 'success');
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to update task', 'error');
    }
  };

  const handleSaveTask = async (taskData) => {
    try {
      if (selectedTask) {
        await taskService.update(selectedTask._id, taskData);
        showToast('Task updated successfully', 'success');
      } else {
        await taskService.create(taskData);
        showToast('Task created successfully', 'success');
      }
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to save task', 'error');
      throw err;
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      setIsDeleting(true);
      const { nextPage } = await deleteAndRefreshPage(
        page,
        () => taskService.delete(taskToDelete._id),
        loadData
      );
      showToast('Task removed', 'success');
      setTaskToDelete(null);
      if (nextPage !== page) setPage(nextPage);
    } catch (err) {
      showToast(err.message || 'Failed to delete task', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Academic Tasks & Assignments
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Organize homework, lab sheets, and revision milestones.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            setSelectedTask(null);
            setIsTaskModalOpen(true);
          }}
          leftIcon={Plus}
        >
          Create Task
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks by title or keywords..."
              className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Filters:
          </span>

          {/* Status Tabs */}
          {[
            { id: 'all', label: 'All' },
            { id: 'pending', label: 'Pending' },
            { id: 'in-progress', label: 'In Progress' },
            { id: 'completed', label: 'Completed' },
            { id: 'overdue', label: 'Overdue' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => { setPage(1); setStatusFilter(s.id); }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === s.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {s.label}
            </button>
          ))}

          {/* Priority Select */}
          <select
            value={priorityFilter}
            onChange={(e) => { setPage(1); setPriorityFilter(e.target.value); }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Subject Select */}
          <select
            value={subjectFilter}
            onChange={(e) => { setPage(1); setSubjectFilter(e.target.value); }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Subjects</option>
            {subjects.map((sub) => (
              <option key={sub._id} value={sub._id}>
                {sub.code} - {sub.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Task List */}
      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks found"
          description="Try adjusting your filters or create a new assignment task."
          actionLabel="Create Task"
          onAction={() => {
            setSelectedTask(null);
            setIsTaskModalOpen(true);
          }}
        />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isOverdue = !isCompleted && task.dueDate && new Date(task.dueDate) < new Date();

            return (
              <div
                key={task._id}
                className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isCompleted
                    ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-80'
                    : isOverdue
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/50'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-sm'
                }`}
              >
                {/* Left: Checkbox + Title + Meta */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <button
                    onClick={() => handleToggleTask(task._id)}
                    className="mt-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex-shrink-0"
                    title={isCompleted ? 'Mark as incomplete' : 'Mark as completed'}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <h4
                      className={`text-sm font-semibold truncate ${
                        isCompleted
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {task.title}
                    </h4>

                    {task.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                      {task.subject && (
                        <span
                          className="font-medium px-2 py-0.5 rounded-md text-[11px]"
                          style={{
                            backgroundColor: `${task.subject.color || '#3B82F6'}15`,
                            color: task.subject.color || '#3B82F6',
                          }}
                        >
                          {task.subject.code}
                        </span>
                      )}

                      <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(task.dueDate)}
                      </span>

                      <span
                        className={`font-medium ${
                          isOverdue
                            ? 'text-rose-600 dark:text-rose-400 font-semibold'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        ({getDaysRemaining(task.dueDate)})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Badges & Action Buttons */}
                <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Badge variant={getPriorityBadgeVariant(task.priority)} size="xs">
                      {task.priority}
                    </Badge>
                    <Badge
                      variant={isCompleted ? 'success' : task.status === 'in-progress' ? 'info' : 'default'}
                      size="xs"
                    >
                      {task.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setSelectedTask(task);
                        setIsTaskModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit Task"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setTaskToDelete(task)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete Task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination pagination={pagination} onPageChange={setPage} label="tasks" />

      {/* Task Create / Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
        onSave={handleSaveTask}
        task={selectedTask}
        subjects={subjects}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(taskToDelete)}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleDeleteTask}
        title="Delete Academic Task"
        message={`Are you sure you want to delete "${taskToDelete?.title}"? This action cannot be undone.`}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default Tasks;
