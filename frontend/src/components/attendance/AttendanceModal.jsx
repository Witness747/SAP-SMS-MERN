import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';

const AttendanceModal = ({ isOpen, onClose, onSave, record = null }) => {
  const [attendedClasses, setAttendedClasses] = useState(0);
  const [totalClasses, setTotalClasses] = useState(0);
  const [targetPercentage, setTargetPercentage] = useState(75);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (record) {
      setAttendedClasses(record.attendedClasses || 0);
      setTotalClasses(record.totalClasses || 0);
      setTargetPercentage(record.targetPercentage || 75);
    }
    setErrors({});
  }, [record, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    const att = Number(attendedClasses);
    const tot = Number(totalClasses);
    const tgt = Number(targetPercentage);

    if (isNaN(att) || att < 0) newErrors.attended = 'Attended classes must be 0 or more';
    if (isNaN(tot) || tot < 0) newErrors.total = 'Total classes must be 0 or more';
    if (att > tot) newErrors.attended = 'Attended cannot exceed total classes';
    if (isNaN(tgt) || tgt < 0 || tgt > 100) newErrors.target = 'Target must be between 0 and 100%';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        attendedClasses: att,
        totalClasses: tot,
        targetPercentage: tgt,
      });
      onClose();
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Adjust Attendance: ${record?.subject?.name || 'Subject'}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-900">
            {errors.form}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Attended Classes
            </label>
            <input
              type="number"
              min="0"
              value={attendedClasses}
              onChange={(e) => setAttendedClasses(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.attended && <p className="text-xs text-rose-500 mt-1">{errors.attended}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Total Classes Held
            </label>
            <input
              type="number"
              min="0"
              value={totalClasses}
              onChange={(e) => setTotalClasses(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.total && <p className="text-xs text-rose-500 mt-1">{errors.total}</p>}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Target Attendance Requirement (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={targetPercentage}
            onChange={(e) => setTargetPercentage(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.target && <p className="text-xs text-rose-500 mt-1">{errors.target}</p>}
        </div>

        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            Save Figures
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AttendanceModal;
