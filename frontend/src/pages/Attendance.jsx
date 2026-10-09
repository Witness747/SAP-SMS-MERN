import React, { useState, useEffect } from 'react';
import { attendanceService } from '../services/attendanceService';
import { useNotifications } from '../hooks/useNotifications';
import Card, { CardContent } from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import { TableSkeleton } from '../components/common/Skeleton';
import AttendanceModal from '../components/attendance/AttendanceModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Pagination from '../components/common/Pagination';
import {
  PieChart,
  Check,
  X,
  AlertTriangle,
  RotateCcw,
  Sliders,
  CheckCircle2,
  CalendarCheck,
} from 'lucide-react';

const Attendance = () => {
  const [records, setRecords] = useState([]);
  const [meta, setMeta] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  // Modals
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [recordToReset, setRecordToReset] = useState(null);
  const [isResetting, setIsResetting] = useState(false);

  const { showToast } = useNotifications();

  const loadAttendance = async (requestedPage = page) => {
    try {
      setIsLoading(true);
      const res = await attendanceService.getAll({ page: requestedPage, pageSize: 12 });
      setRecords(res.data || []);
      setMeta(res.meta || {});
      setPagination(res.meta?.pagination || null);
    } catch (err) {
      showToast(err.message || 'Failed to load attendance records', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [page]);

  const handleQuickLog = async (id, action) => {
    try {
      await attendanceService.log(id, action);
      showToast(action === 'present' ? 'Marked Present (+1)' : 'Marked Absent (+1)', 'success');
      loadAttendance();
    } catch (err) {
      showToast(err.message || 'Failed to log attendance', 'error');
    }
  };

  const handleSaveAdjustment = async (formData) => {
    if (!selectedRecord) return;
    try {
      await attendanceService.update(selectedRecord._id, formData);
      showToast('Attendance figures updated successfully', 'success');
      loadAttendance();
    } catch (err) {
      showToast(err.message || 'Failed to update attendance', 'error');
      throw err;
    }
  };

  const handleResetAttendance = async () => {
    if (!recordToReset) return;
    try {
      setIsResetting(true);
      await attendanceService.reset(recordToReset._id);
      showToast('Attendance reset to 0', 'success');
      setRecordToReset(null);
      loadAttendance();
    } catch (err) {
      showToast(err.message || 'Failed to reset attendance', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Attendance Tracker & Bunk Calculator
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Real-time percentage calculation with safe bunk thresholds and target recovery recommendations.
        </p>
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Attended</p>
          <h4 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {meta.totalAttendedAll || 0}
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Classes present</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Conducted</p>
          <h4 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {meta.totalHeldAll || 0}
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Total classes held</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Aggregate Rate</p>
          <h4
            className={`text-2xl font-bold mt-1 ${
              (meta.overallPercentage || 0) >= 75
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {meta.overallPercentage || 0}%
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Standard minimum: 75%</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Low Attendance</p>
          <h4
            className={`text-2xl font-bold mt-1 ${
              (meta.lowAttendanceCount || 0) > 0 ? 'text-rose-500' : 'text-emerald-500'
            }`}
          >
            {meta.lowAttendanceCount || 0}
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Subjects below target</p>
        </div>
      </div>

      {/* Subject Attendance Cards */}
      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : records.length === 0 ? (
        <EmptyState
          icon={PieChart}
          title="No attendance records available"
          description="Enrolling in subjects will automatically initialize your attendance tracker."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {records.map((rec) => {
            const subject = rec.subject || { name: 'Unknown Subject', code: 'SUB', color: '#3B82F6' };
            const isSafe = rec.status === 'safe';
            const isWarning = rec.status === 'warning' || rec.status === 'critical';

            return (
              <Card key={rec._id} className="p-5 flex flex-col justify-between">
                <div>
                  {/* Top Bar: Subject code + Color + Actions */}
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: subject.color || '#3B82F6' }}
                      />
                      <span className="font-bold text-xs uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {subject.code}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setSelectedRecord(rec);
                          setIsAdjustModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Adjust numbers manually"
                      >
                        <Sliders className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setRecordToReset(rec)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Reset to 0"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Subject Title */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {subject.name}
                  </h3>

                  {/* Attendance Stats & Ratio */}
                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <span
                        className={`text-3xl font-extrabold ${
                          isSafe
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isWarning
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {rec.percentage}%
                      </span>
                      <span className="text-xs text-slate-400 ml-2">
                        Target: {rec.targetPercentage}%
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {rec.attendedClasses} / {rec.totalClasses}
                      </span>
                      <p className="text-[11px] text-slate-400">Classes Attended</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2.5 w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isSafe
                          ? 'bg-emerald-500'
                          : isWarning
                          ? 'bg-rose-500'
                          : 'bg-slate-400'
                      }`}
                      style={{ width: `${Math.min(100, rec.percentage)}%` }}
                    />
                  </div>

                  {/* Bunk / Needed Advice Banner */}
                  <div className="mt-4 p-3 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    {rec.totalClasses === 0 ? (
                      <span className="text-slate-500 dark:text-slate-400">
                        No classes recorded yet. Log attendance below as classes occur.
                      </span>
                    ) : isSafe ? (
                      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span>
                          On track! You can safely miss{' '}
                          <strong className="font-bold underline">{rec.bunksAvailable}</strong> more class
                          {rec.bunksAvailable === 1 ? '' : 'es'} and stay above {rec.targetPercentage}%.
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
                        <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                        <span>
                          Below target! You must attend the next{' '}
                          <strong className="font-bold underline">{rec.classesNeeded}</strong> consecutive class
                          {rec.classesNeeded === 1 ? '' : 'es'} to reach {rec.targetPercentage}%.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Log Buttons */}
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <button
                    onClick={() => handleQuickLog(rec._id, 'present')}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>Present (+1)</span>
                  </button>

                  <button
                    onClick={() => handleQuickLog(rec._id, 'absent')}
                    className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-rose-600/20 active:scale-95"
                  >
                    <X className="w-4 h-4" />
                    <span>Absent (+1)</span>
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Pagination pagination={pagination} onPageChange={setPage} label="subjects" />

      {/* Adjust Modal */}
      <AttendanceModal
        isOpen={isAdjustModalOpen}
        onClose={() => {
          setIsAdjustModalOpen(false);
          setSelectedRecord(null);
        }}
        onSave={handleSaveAdjustment}
        record={selectedRecord}
      />

      {/* Reset Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(recordToReset)}
        onClose={() => setRecordToReset(null)}
        onConfirm={handleResetAttendance}
        title="Reset Attendance"
        message={`Are you sure you want to reset attendance for "${recordToReset?.subject?.name}" to 0?`}
        confirmText="Reset"
        confirmVariant="danger"
        isLoading={isResetting}
      />
    </div>
  );
};

export default Attendance;
