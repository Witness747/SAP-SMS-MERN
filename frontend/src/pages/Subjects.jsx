import React, { useState, useEffect } from 'react';
import { subjectService } from '../services/subjectService';
import { useNotifications } from '../hooks/useNotifications';
import Card, { CardContent } from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import { CardSkeleton } from '../components/common/Skeleton';
import SubjectModal from '../components/subjects/SubjectModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import {
  BookOpen,
  Plus,
  User,
  Award,
  PieChart,
  Edit2,
  Trash2,
} from 'lucide-react';

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjectToDelete, setSubjectToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { showToast } = useNotifications();

  const loadSubjects = async () => {
    try {
      setIsLoading(true);
      const res = await subjectService.getAll();
      setSubjects(res.data || []);
    } catch (err) {
      showToast(err.message || 'Failed to load subjects', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const handleSaveSubject = async (subjectData) => {
    try {
      if (selectedSubject) {
        await subjectService.update(selectedSubject._id, subjectData);
        showToast('Subject updated successfully', 'success');
      } else {
        await subjectService.create(subjectData);
        showToast('Subject added successfully', 'success');
      }
      loadSubjects();
    } catch (err) {
      showToast(err.message || 'Failed to save subject', 'error');
      throw err;
    }
  };

  const handleDeleteSubject = async () => {
    if (!subjectToDelete) return;
    try {
      setIsDeleting(true);
      await subjectService.delete(subjectToDelete._id);
      showToast('Subject and associated attendance records deleted', 'success');
      setSubjectToDelete(null);
      loadSubjects();
    } catch (err) {
      showToast(err.message || 'Failed to delete subject', 'error');
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
            Academic Subjects & Courses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your enrolled courses, faculty instructors, and credit targets.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            setSelectedSubject(null);
            setIsSubjectModalOpen(true);
          }}
          leftIcon={Plus}
        >
          Add Subject
        </Button>
      </div>

      {/* Grid of Subjects */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No subjects registered"
          description="Add your semester courses to track attendance and weekly schedules."
          actionLabel="Add Subject"
          onAction={() => {
            setSelectedSubject(null);
            setIsSubjectModalOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {subjects.map((sub) => {
            const att = sub.attendance || { attendedClasses: 0, totalClasses: 0, percentage: 0 };
            const isTargetMet = att.percentage >= (sub.targetAttendance || 75);

            return (
              <Card key={sub._id} className="flex flex-col justify-between overflow-hidden">
                {/* Color Header Accent Stripe */}
                <div
                  className="h-2 w-full"
                  style={{ backgroundColor: sub.color || '#3B82F6' }}
                />

                <CardContent className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider"
                        style={{
                          backgroundColor: `${sub.color || '#3B82F6'}15`,
                          color: sub.color || '#3B82F6',
                        }}
                      >
                        {sub.code}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedSubject(sub);
                            setIsSubjectModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Subject"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSubjectToDelete(sub)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete Subject"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                      {sub.name}
                    </h3>

                    {/* Metadata: Instructor & Credits */}
                    <div className="space-y-1.5 mt-3 text-xs text-slate-600 dark:text-slate-400">
                      {sub.instructor && (
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{sub.instructor}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Award className="w-3.5 h-3.5 text-slate-400" />
                        <span>{sub.credits} Credits</span>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Mini-Tracker */}
                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <PieChart className="w-3.5 h-3.5" /> Attendance
                      </span>
                      <span
                        className={`font-bold ${
                          isTargetMet
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {att.percentage}% ({att.attendedClasses}/{att.totalClasses})
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, att.percentage)}%`,
                          backgroundColor: isTargetMet ? '#10B981' : '#F43F5E',
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Subject Modal */}
      <SubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => {
          setIsSubjectModalOpen(false);
          setSelectedSubject(null);
        }}
        onSave={handleSaveSubject}
        subject={selectedSubject}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(subjectToDelete)}
        onClose={() => setSubjectToDelete(null)}
        onConfirm={handleDeleteSubject}
        title="Delete Subject"
        message={`Deleting "${subjectToDelete?.name}" will also remove all its attendance logs and timetable slots. Are you sure?`}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default Subjects;
