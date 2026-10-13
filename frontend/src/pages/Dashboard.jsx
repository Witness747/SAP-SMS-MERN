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
  const totalClassesHeld = subjects.reduce((sum, s) => sum + (s.attendance?.totalClasses || 0), 0);
  const hasAttendanceData = totalClassesHeld > 0;

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* Top Header & Actions */}
      <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-indigo-700 via-indigo-700 to-violet-700 px-5 py-6 text-white shadow-xl shadow-indigo-950/10 sm:px-7 sm:py-7 lg:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-24 -z-10 h-72 w-72 rounded-full border-[36px] border-white/[0.07]" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-36 right-1/4 -z-10 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-indigo-100/80">Your academic overview</p>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-[2.1rem]">
              {data?.greeting || 'Academic Dashboard'}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-indigo-100/90 sm:text-[15px]">
              Keep your classes, attendance, and deadlines in view. Here’s what your day looks like.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboardData(true)}
            isLoading={isRefreshing}
            leftIcon={RefreshCw}
            className="border-white/25 bg-white/10 text-white hover:bg-white/20 focus:ring-white"
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEventModalOpen(true)}
            leftIcon={Calendar}
            className="border-white/25 bg-white/10 text-white hover:bg-white/20 focus:ring-white"
          >
            Add Event
          </Button>
          <Button
            variant="white"
            size="sm"
            onClick={() => setIsTaskModalOpen(true)}
            leftIcon={Plus}
          >
            New Task
          </Button>
          </div>
        </div>
      </section>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatCard
          title="Overall Attendance"
          value={hasAttendanceData ? `${stats.overallAttendance || 0}%` : '—'}
          subtitle={
            !hasAttendanceData
              ? 'No classes logged yet'
              : stats.lowAttendanceCount > 0
              ? `${stats.lowAttendanceCount} subject(s) below target`
              : 'All targets satisfied'
          }
          icon={PieChart}
          color={!hasAttendanceData ? 'indigo' : stats.overallAttendance >= 75 ? 'emerald' : 'rose'}
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
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 xl:gap-6">
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
            hasAttendanceData={hasAttendanceData}
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
