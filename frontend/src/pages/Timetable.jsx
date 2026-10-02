import React, { useState, useEffect } from 'react';
import { timetableService } from '../services/timetableService';
import { subjectService } from '../services/subjectService';
import { useNotifications } from '../hooks/useNotifications';
import Card, { CardContent } from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import { TableSkeleton } from '../components/common/Skeleton';
import TimetableModal from '../components/timetable/TimetableModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import {
  CalendarDays,
  Plus,
  Clock,
  MapPin,
  User,
  Edit2,
  Trash2,
} from 'lucide-react';
import { formatTime } from '../utils/formatters';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const Timetable = () => {
  const [entries, setEntries] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Current day determination
  const todayName = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const [selectedDay, setSelectedDay] = useState(todayName);

  // Modals
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { showToast } = useNotifications();

  const loadTimetable = async () => {
    try {
      setIsLoading(true);
      const [ttRes, subRes] = await Promise.all([
        timetableService.getAll(selectedDay === 'all' ? null : selectedDay),
        subjectService.getAll(),
      ]);
      setEntries(ttRes.data || []);
      setSubjects(subRes.data || []);
    } catch (err) {
      showToast(err.message || 'Failed to load timetable', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTimetable();
  }, [selectedDay]);

  const handleSaveSlot = async (slotData) => {
    try {
      if (selectedEntry) {
        await timetableService.update(selectedEntry._id, slotData);
        showToast('Timetable entry updated', 'success');
      } else {
        await timetableService.create(slotData);
        showToast('Timetable entry added', 'success');
      }
      loadTimetable();
    } catch (err) {
      showToast(err.message || 'Failed to save timetable slot', 'error');
      throw err;
    }
  };

  const handleDeleteSlot = async () => {
    if (!entryToDelete) return;
    try {
      setIsDeleting(true);
      await timetableService.delete(entryToDelete._id);
      showToast('Timetable slot removed', 'success');
      setEntryToDelete(null);
      loadTimetable();
    } catch (err) {
      showToast(err.message || 'Failed to delete entry', 'error');
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
            Weekly Class Schedule
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Organize lectures, lab sessions, and classroom allocations.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            setSelectedEntry(null);
            setIsSlotModalOpen(true);
          }}
          leftIcon={Plus}
        >
          Add Class Slot
        </Button>
      </div>

      {/* Day Selector Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {DAYS.map((day) => {
          const isToday = day === todayName;
          const isSelected = selectedDay === day;

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>{day}</span>
              {isToday && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSelected ? 'bg-white' : 'bg-indigo-600'
                  }`}
                />
              )}
            </button>
          );
        })}

        <button
          onClick={() => setSelectedDay('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
            selectedDay === 'all'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Full Week
        </button>
      </div>

      {/* Timetable Slot List */}
      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={`No classes on ${selectedDay === 'all' ? 'any day' : selectedDay}`}
          description="Add a class session or select another day of the week."
          actionLabel="Add Class Slot"
          onAction={() => {
            setSelectedEntry(null);
            setIsSlotModalOpen(true);
          }}
        />
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const subject = entry.subject || { name: 'Academic Session', code: 'SUB', color: '#3B82F6' };

            return (
              <div
                key={entry._id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:shadow-sm transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Left: Time & Subject Color Accent */}
                <div className="flex items-start gap-4">
                  <div
                    className="w-2.5 h-12 rounded-full flex-shrink-0"
                    style={{ backgroundColor: subject.color || '#3B82F6' }}
                  />

                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {subject.code}
                      </span>
                      {selectedDay === 'all' && (
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          {entry.day}
                        </span>
                      )}
                      <Badge variant={entry.type === 'lab' ? 'purple' : 'default'} size="xs">
                        {entry.type}
                      </Badge>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {subject.name}
                    </h4>

                    <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
                      </span>

                      {entry.room && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {entry.room}
                        </span>
                      )}

                      {subject.instructor && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {subject.instructor}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center justify-end gap-1 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setSelectedEntry(entry);
                      setIsSlotModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Edit Slot"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEntryToDelete(entry)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete Slot"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Timetable Slot Modal */}
      <TimetableModal
        isOpen={isSlotModalOpen}
        onClose={() => {
          setIsSlotModalOpen(false);
          setSelectedEntry(null);
        }}
        onSave={handleSaveSlot}
        entry={selectedEntry}
        subjects={subjects}
        defaultDay={selectedDay !== 'all' ? selectedDay : 'Monday'}
      />

      {/* Delete Slot Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(entryToDelete)}
        onClose={() => setEntryToDelete(null)}
        onConfirm={handleDeleteSlot}
        title="Delete Schedule Entry"
        message={`Remove class on ${entryToDelete?.day} at ${entryToDelete?.startTime}?`}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default Timetable;
