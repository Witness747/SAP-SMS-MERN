import React, { useState, useEffect } from 'react';
import { eventService } from '../services/eventService';
import { useNotifications } from '../hooks/useNotifications';
import Card, { CardContent } from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import { TableSkeleton } from '../components/common/Skeleton';
import EventModal from '../components/events/EventModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import {
  Calendar,
  Plus,
  Clock,
  MapPin,
  Edit2,
  Trash2,
  CalendarCheck,
} from 'lucide-react';
import { formatDate, getCategoryBadgeVariant, getDaysRemaining } from '../utils/formatters';

const CATEGORY_TABS = [
  { id: 'all', label: 'All Events' },
  { id: 'exam', label: 'Exams & Tests' },
  { id: 'assignment', label: 'Assignments' },
  { id: 'presentation', label: 'Presentations' },
  { id: 'deadline', label: 'Project Deadlines' },
  { id: 'meeting', label: 'Meetings' },
];

const Events = () => {
  const [events, setEvents] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [upcomingOnly, setUpcomingOnly] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { showToast } = useNotifications();

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const params = {};
      if (categoryFilter !== 'all') {
        params.category = categoryFilter;
      }
      if (upcomingOnly) {
        params.upcoming = 'true';
      }

      const res = await eventService.getAll(params);
      setEvents(res.data || []);
    } catch (err) {
      showToast(err.message || 'Failed to load events', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [categoryFilter, upcomingOnly]);

  const handleSaveEvent = async (eventData) => {
    try {
      if (selectedEvent) {
        await eventService.update(selectedEvent._id, eventData);
        showToast('Event updated successfully', 'success');
      } else {
        await eventService.create(eventData);
        showToast('Event created successfully', 'success');
      }
      loadEvents();
    } catch (err) {
      showToast(err.message || 'Failed to save event', 'error');
      throw err;
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;
    try {
      setIsDeleting(true);
      await eventService.delete(eventToDelete._id);
      showToast('Event deleted', 'success');
      setEventToDelete(null);
      loadEvents();
    } catch (err) {
      showToast(err.message || 'Failed to delete event', 'error');
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
            Academic Calendar & Exam Events
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Keep track of examinations, project submissions, presentations, and academic milestones.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            setSelectedEvent(null);
            setIsEventModalOpen(true);
          }}
          leftIcon={Plus}
        >
          Add Event
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                categoryFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={upcomingOnly}
            onChange={(e) => setUpcomingOnly(e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700 focus:ring-indigo-500"
          />
          <span>Upcoming only</span>
        </label>
      </div>

      {/* Events List */}
      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : events.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No events found"
          description="Schedule exam dates, presentations, or submission deadlines."
          actionLabel="Add Event"
          onAction={() => {
            setSelectedEvent(null);
            setIsEventModalOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((event) => {
            const isPast = event.date && new Date(event.date) < new Date(new Date().setHours(0, 0, 0, 0));

            return (
              <Card
                key={event._id}
                className={`p-5 flex flex-col justify-between ${isPast ? 'opacity-70' : ''}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={getCategoryBadgeVariant(event.category)} size="xs">
                        {event.category}
                      </Badge>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {formatDate(event.date)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setSelectedEvent(event);
                          setIsEventModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit Event"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEventToDelete(event)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete Event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {event.title}
                  </h3>

                  {event.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-3">
                    {event.time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        {event.time}
                      </span>
                    )}
                    {event.location && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {event.location}
                      </span>
                    )}
                  </div>

                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {getDaysRemaining(event.date)}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Event Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setSelectedEvent(null);
        }}
        onSave={handleSaveEvent}
        event={selectedEvent}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(eventToDelete)}
        onClose={() => setEventToDelete(null)}
        onConfirm={handleDeleteEvent}
        title="Delete Event"
        message={`Are you sure you want to delete "${eventToDelete?.title}"?`}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default Events;
