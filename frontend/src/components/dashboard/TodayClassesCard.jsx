import React from 'react';
import Card, { CardHeader, CardContent } from '../common/Card';
import Badge from '../common/Badge';
import { CalendarDays, Clock, MapPin } from 'lucide-react';
import { formatTime } from '../../utils/formatters';

const TodayClassesCard = ({ classes = [], todayName = 'Today' }) => {
  return (
    <Card className="h-full">
      <CardHeader
        title={`Classes for ${todayName}`}
        subtitle={`${classes.length} session${classes.length === 1 ? '' : 's'} scheduled`}
        action={
          <Badge variant="primary" size="xs">
            {todayName}
          </Badge>
        }
      />
      <CardContent>
        {classes.length === 0 ? (
          <div className="py-8 text-center text-slate-500 dark:text-slate-400">
            <CalendarDays className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium">No classes scheduled for today.</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Enjoy your free time or revise assignments.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {classes.map((cls) => (
              <div
                key={cls._id}
                className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-2.5 h-10 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cls.subject?.color || '#3B82F6' }}
                  />
                  <div>
                    <h5 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {cls.subject?.name || 'Academic Class'}
                    </h5>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTime(cls.startTime)} - {formatTime(cls.endTime)}
                      </span>
                      {cls.room && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {cls.room}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Badge variant={cls.type === 'lab' ? 'purple' : 'default'} size="xs">
                  {cls.type}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TodayClassesCard;
