import React from 'react';
import { Link } from 'react-router-dom';
import Card, { CardHeader, CardContent } from '../common/Card';
import Badge from '../common/Badge';
import { Calendar, ArrowRight, MapPin, Clock } from 'lucide-react';
import { formatDate, getCategoryBadgeVariant } from '../../utils/formatters';

const UpcomingEventsCard = ({ events = [] }) => {
  return (
    <Card className="h-full">
      <CardHeader
        title="Upcoming Events & Exams"
        subtitle="Important dates and academic milestones"
        action={
          <Link
            to="/events"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1"
          >
            All Events <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
      />
      <CardContent>
        {events.length === 0 ? (
          <div className="py-8 text-center text-slate-500 dark:text-slate-400">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium">No upcoming events scheduled.</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Add exams, project deadlines, or seminars.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event._id}
                className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getCategoryBadgeVariant(event.category)} size="xs">
                      {event.category}
                    </Badge>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {formatDate(event.date)}
                    </span>
                  </div>
                  <h5 className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {event.title}
                  </h5>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {event.time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {event.time}
                      </span>
                    )}
                    {event.location && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingEventsCard;
