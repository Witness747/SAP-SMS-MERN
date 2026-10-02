import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TimetableModal = ({ isOpen, onClose, onSave, entry = null, subjects = [], defaultDay = 'Monday' }) => {
  const [formData, setFormData] = useState({
    subject: '',
    day: 'Monday',
    startTime: '09:00',
    endTime: '10:00',
    room: '',
    type: 'lecture',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (entry) {
      setFormData({
        subject: entry.subject?._id || entry.subject || '',
        day: entry.day || 'Monday',
        startTime: entry.startTime || '09:00',
        endTime: entry.endTime || '10:00',
        room: entry.room || '',
        type: entry.type || 'lecture',
      });
    } else {
      setFormData({
        subject: subjects.length > 0 ? subjects[0]._id : '',
        day: defaultDay || 'Monday',
        startTime: '09:00',
        endTime: '10:00',
        room: '',
        type: 'lecture',
      });
    }
    setErrors({});
  }, [entry, isOpen, subjects, defaultDay]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.subject) newErrors.subject = 'Subject is required';
    if (!formData.startTime) newErrors.startTime = 'Start time is required';
    if (!formData.endTime) newErrors.endTime = 'End time is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(formData);
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
      title={entry ? 'Edit Timetable Slot' : 'Add Class to Timetable'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-900">
            {errors.form}
          </div>
        )}

        {/* Subject */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Subject *
          </label>
          <select
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select subject...</option>
            {subjects.map((sub) => (
              <option key={sub._id} value={sub._id}>
                {sub.code} - {sub.name}
              </option>
            ))}
          </select>
          {errors.subject && <p className="text-xs text-rose-500 mt-1">{errors.subject}</p>}
        </div>

        {/* Day of the Week & Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Day of Week *
            </label>
            <select
              name="day"
              value={formData.day}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Class Type
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="lecture">Lecture</option>
              <option value="lab">Lab Practical</option>
              <option value="tutorial">Tutorial</option>
              <option value="seminar">Seminar</option>
            </select>
          </div>
        </div>

        {/* Start Time & End Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Start Time *
            </label>
            <input
              type="time"
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.startTime && <p className="text-xs text-rose-500 mt-1">{errors.startTime}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              End Time *
            </label>
            <input
              type="time"
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.endTime && <p className="text-xs text-rose-500 mt-1">{errors.endTime}</p>}
          </div>
        </div>

        {/* Room / Location */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Room / Hall / Lab Number
          </label>
          <input
            type="text"
            name="room"
            value={formData.room}
            onChange={handleChange}
            placeholder="e.g., LH-102 or CS-Lab-1"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Footer */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            {entry ? 'Save Slot' : 'Add to Schedule'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TimetableModal;
