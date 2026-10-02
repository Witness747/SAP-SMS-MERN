import React, { useState, useEffect } from 'react';
import { dashboardService } from '../services/dashboardService';
import { taskService } from '../services/taskService';
import { eventService } from '../services/eventService';
import { subjectService } from '../services/subjectService';
import { useNotifications } from '../hooks/useNotifications';
import StatCard from '../components/dashboard/StatCard';
import TodayClassesCard from '../components/dashboard/TodayClassesCard';
import PendingTasksCard from '../components/dashboard/PendingTasksCard';
import AttendanceSummaryCard from '../components/dashboard/AttendanceSummaryCard';
import UpcomingEventsCard from '../components/dashboard/UpcomingEventsCard';
import Button from '../components/common/Button';
import TaskModal from '../components/tasks/TaskModal';
import EventModal from '../components/events/EventModal';
import { TableSkeleton } from '../components/common/Skeleton';
import {
  PieChart,
  CheckSquare,
  CalendarDays,
  Calendar,
  Plus,
  RefreshCw,
} from 'lucide-react';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [subjects, setSubjects] = useState([]);

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const { showToast } = useNotifications();

  const fetchDashboardData = async (refresh = false) => {
    try {
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);

      const [dashRes, subRes] = await Promise.all([
        dashboardService.getDashboardData(),
        subjectService.getAll(),
      ]);

      setData(dashRes.data);
      setSubjects(subRes.data || []);
    } catch (err) {
      showToast(err.message || 'Failed to load dashboard data', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleToggleTask = async (taskId) => {
    try {
      await taskService.toggleStatus(taskId);
      showToast('Task status updated', 'success');
      fetchDashboardData(true);
    } catch (err) {
      showToast(err.message || 'Failed to update task', 'error');
    }
  };

  const handleCreateTask = async (taskData) => {
    try {
      await taskService.create(taskData);
      showToast('Task created successfully', 'success');
      fetchDashboardData(true);
    } catch (err) {
      showToast(err.message || 'Failed to create task', 'error');
      throw err;
    }
  };

  const handleCreateEvent = async (eventData) => {
    try {
      await eventService.create(eventData);
      showToast('Event scheduled successfully', 'success');
      fetchDashboardData(true);
    } catch (err) {
      showToast(err.message || 'Failed to create event', 'error');
      throw err;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-1/3 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <TableSkeleton rows={4} />
      </div>
    );
  }

  const stats = data?.stats || {};

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {data?.greeting || 'Academic Dashboard'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Overview of your schedule, attendance, and upcoming deadlines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboardData(true)}
            isLoading={isRefreshing}
            leftIcon={RefreshCw}
          >
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsEventModalOpen(true)}
            leftIcon={Calendar}
          >
            Add Event
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsTaskModalOpen(true)}
            leftIcon={Plus}
          >
            New Task
          </Button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Overall Attendance"
          value={`${stats.overallAttendance || 0}%`}
          subtitle={
            stats.lowAttendanceCount > 0
              ? `${stats.lowAttendanceCount} subject(s) below target`
              : 'All targets satisfied'
          }
          icon={PieChart}
          color={stats.overallAttendance >= 75 ? 'emerald' : 'rose'}
        />

        <StatCard
          title="Pending Tasks"
          value={stats.pendingTasks || 0}
          subtitle={
            stats.overdueTasks > 0 ? (
              <span className="text-rose-500 font-semibold">{stats.overdueTasks} overdue</span>
            ) : (
              `${stats.completedTasks || 0} completed so far`
            )
          }
          icon={CheckSquare}
          color={stats.overdueTasks > 0 ? 'rose' : 'indigo'}
        />

        <StatCard
          title="Today's Classes"
          value={stats.todayClassesCount || 0}
          subtitle={`Day: ${data?.todayName || 'Today'}`}
          icon={CalendarDays}
          color="purple"
        />

        <StatCard
          title="Upcoming Events"
          value={stats.upcomingEventsCount || 0}
          subtitle="Next 30 days"
          icon={Calendar}
          color="amber"
        />
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Today's Schedule & Pending Tasks */}
        <div className="space-y-6">
          <TodayClassesCard
            classes={data?.todayClasses || []}
            todayName={data?.todayName || 'Today'}
          />

          <PendingTasksCard
            tasks={data?.pendingTasks || []}
            onToggleTask={handleToggleTask}
          />
        </div>

        {/* Right Column: Attendance Overview & Upcoming Events */}
        <div className="space-y-6">
          <AttendanceSummaryCard
            overallPercentage={stats.overallAttendance || 0}
            lowAttendanceSubjects={data?.lowAttendanceSubjects || []}
          />

          <UpcomingEventsCard events={data?.upcomingEvents || []} />
        </div>
      </div>

      {/* Task Creation Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleCreateTask}
        subjects={subjects}
      />

      {/* Event Creation Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSave={handleCreateEvent}
      />
    </div>
  );
};

export default Dashboard;
