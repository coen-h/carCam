'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Background from '@/app/components/Background';
import Header from '@/app/components/Header';
import OverlayModal from '@/app/components/OverlayModal';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, ScrollText, Search, User, X, CarFront, AlertTriangle } from 'lucide-react';

type CalendarDateElement = HTMLElement & { value: string };

interface UserRecord {
  name?: string;
  email?: string;
  image?: string;
  userLicense?: string;
  carPlate?: string;
}

interface CombinedRecord {
  _id: string;
  _creationTime: number;
  carPlate: string;
  fileTitle?: string;
  type?: string;
  severity?: string;
  isAlert: boolean;
  user?: UserRecord | null;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function startOfDay(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return date.getTime();
}

function endOfDay(value: string) {
  const date = new Date(`${value}T23:59:59.999`);
  return date.getTime();
}

function formatDate(value: string) {
  if (!value) return 'Any date';

  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function CalendarPicker({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const calendarRef = useRef<CalendarDateElement>(null);
  const popoverId = `cally-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const anchorName = `--${popoverId}`;

  useEffect(() => {
    const calendar = calendarRef.current;
    if (!calendar) return;

    const handleChange = (event: Event) => {
      onChange((event.currentTarget as CalendarDateElement).value);
    };

    calendar.addEventListener('change', handleChange);
    return () => calendar.removeEventListener('change', handleChange);
  }, [onChange]);

  useEffect(() => {
    if (calendarRef.current && calendarRef.current.value !== value) {
      calendarRef.current.value = value;
    }
  }, [value]);

  return (
    <div className="w-full relative">
      <p className="mb-1 text-xs absolute -top-5 font-semibold uppercase tracking-wider text-base-content/60 max-lg:hidden">{label}</p>
      <button
        type="button"
        popoverTarget={popoverId}
        className="input input-bordered w-full justify-between bg-base-100 text-left"
        style={{ anchorName } as React.CSSProperties}
      >
        <span>{formatDate(value)}</span>
        <CalendarDays className="size-4 text-base-content/50" />
      </button>
      <div
        popover="auto"
        id={popoverId}
        className="dropdown rounded-box bg-base-100 p-2 shadow-2xl border border-base-300"
        style={{ positionAnchor: anchorName } as React.CSSProperties}
      >
        <calendar-date ref={calendarRef} className="cally" value={value}>
          <ChevronLeft aria-label="Previous" className="size-4" slot="previous" />
          <ChevronRight aria-label="Next" className="size-4" slot="next" />
          <calendar-month />
        </calendar-date>
      </div>
    </div>
  );
}

export default function Logs() {
  const logs = useQuery(api.function.getAllLogs);
  const users = useQuery(api.function.getAllUsers);
  const alerts = useQuery(api.function.getAllAlerts);
  const [input, setInput] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [comFrame, setComFrame] = useState('all');
  const [feedFilter, setFeedFilter] = useState<'all' | 'logs' | 'alerts'>('all');
  const [selected, setSelected] = useState<CombinedRecord | null>(null);
  const [, setIsdarkCom] = useState<boolean | null>(null);

  useEffect(() => {
    void import('cally');
  }, []);

  const userByPlate = useMemo(() => {
    const map = new Map<string, UserRecord>();

    users?.forEach((user) => {
      if (user.carPlate) {
        map.set(user.carPlate.toLowerCase(), user);
      }
    });

    return map;
  }, [users]);

  const combinedHistory = useMemo<CombinedRecord[]>(() => {
    const records: CombinedRecord[] = [];

    if (logs) {
      logs.forEach((log) => {
        records.push({
          ...log,
          isAlert: false,
          user: userByPlate.get(log.carPlate.toLowerCase()) ?? null,
        });
      });
    }

    if (alerts) {
      alerts.forEach((alert) => {
        records.push({
          ...alert,
          isAlert: true,
          user: userByPlate.get(alert.carPlate.toLowerCase()) ?? null,
        });
      });
    }

    return records;
  }, [logs, alerts, userByPlate]);

  const filteredItems = useMemo(() => {
    const query = input.trim().toLowerCase();
    const start = startDate ? startOfDay(startDate) : null;
    const end = endDate ? endOfDay(endDate) : null;

    return combinedHistory
      .filter((item) => {
        if (start !== null && item._creationTime < start) return false;
        if (end !== null && item._creationTime > end) return false;

        if (feedFilter === 'logs' && item.isAlert) return false;
        if (feedFilter === 'alerts' && !item.isAlert) return false;

        if (!query) return true;

        const user = item.user;
        const searchable = [
          item.carPlate,
          item.fileTitle,
          item.type || '',
          user?.name,
          user?.email,
          user?.userLicense,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchable.includes(query);
      })
      .sort((a, b) => b._creationTime - a._creationTime);
  }, [input, combinedHistory, startDate, endDate, feedFilter]);

  const itemsByDay = useMemo(() => {
    return filteredItems.reduce<Record<string, CombinedRecord[]>>((groups, item) => {
      const key = new Date(item._creationTime).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      groups[key] = groups[key] ? [...groups[key], item] : [item];
      return groups;
    }, {});
  }, [filteredItems]);

  const selectedUser = selected?.user;
  const isLoading = logs === undefined || alerts === undefined || users === undefined;

  const setFrame = (days: number | 'today' | 'all') => {
    if (days === 'all') {
      setStartDate('');
      setEndDate('');
      setComFrame('all');
      return;
    }

    const now = new Date();
    const start = new Date(now);

    if (days === 'today') {
      setStartDate(toDateInputValue(now));
      setEndDate(toDateInputValue(now));
      setComFrame('today');
      return;
    }

    setComFrame(days.toString());
    start.setDate(now.getDate() - days + 1);
    setStartDate(toDateInputValue(start));
    setEndDate(toDateInputValue(now));
  };

  return (
    <div className="w-full h-dvh flex flex-col bg-base-100 overflow-hidden">
      <Background />
      <Header setIsDarkCom={setIsdarkCom} />
      <main className="container mx-auto flex w-full max-w-7xl flex-1 min-h-0 flex-col gap-2 p-2 max-md:pb-16 text-base-content">
        <section className="rounded-box border border-base-200 bg-base-200/90 p-4 max-md:p-2 shadow-2xl backdrop-blur-md">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary max-sm:hidden">
              <ScrollText className="size-8" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">Logs</h1>
              <p className="text-sm text-base-content/60">
                {filteredItems.length} of {filteredItems?.length ?? 0} events shown
              </p>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-soft btn-primary ml-auto"
              onClick={() => {
                setInput('');
                setFrame('all');
                setFeedFilter('all');
              }}
            >
              <X className="size-4" />
              Reset
            </button>
          </div>

          <div className="mt-4 grid grid-cols-[minmax(16rem,1fr)_auto_auto_auto] gap-2 max-lg:grid-cols-2 max-sm:grid-cols-1">
            <label className="input input-bordered flex w-full items-center gap-2 bg-base-100 max-lg:col-span-3 max-sm:col-span-1">
              <Search className="size-5 text-base-content/40" />
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="grow"
                placeholder="Search plates, users, alerts, logs..."
              />
            </label>

            <div className="join bg-base-100 p-1 rounded-lg h-min max-lg:pr-0.5 outline outline-base-content/20 max-sm:order-3">
              <button type="button" className={`join-item btn btn-sm border-0 max-lg:w-1/3 ${feedFilter === 'all' ? 'bg-primary/80 text-primary-content' : 'bg-transparent text-base-content/60'}`} onClick={() => setFeedFilter('all')}>
                All Items
              </button>
              <button type="button" className={`join-item btn btn-sm border-0 max-lg:w-1/3 ${feedFilter === 'logs' ? 'bg-primary/80 text-primary-content' : 'bg-transparent text-base-content/60'}`} onClick={() => setFeedFilter('logs')}>
                Logs Only
              </button>
              <button type="button" className={`join-item btn btn-sm border-0 max-lg:w-1/3 ${feedFilter === 'alerts' ? 'bg-error text-error-content font-bold shadow-sm' : 'bg-transparent text-base-content/60'}`} onClick={() => setFeedFilter('alerts')}>
                Alerts
              </button>
            </div>

            <div className="join bg-base-100 p-1 max-lg:hidden max-lg:pr-0.5 rounded-lg h-min outline outline-base-content/20">
              <button type="button" className={`join-item btn btn-sm border-0 max-lg:w-1/4 ${comFrame === 'all' ? 'bg-primary/80 shadow-sm hover:bg-primary/60 text-primary-content' : 'bg-transparent hover:bg-base-300 text-base-content/60'}`} onClick={() => setFrame('all')}>
                All
              </button>
              <button type="button" className={`join-item btn btn-sm border-0 max-lg:w-1/4 ${comFrame === 'today' ? 'bg-primary/80 shadow-sm hover:bg-primary/60 text-primary-content' : 'bg-transparent hover:bg-base-300 text-base-content/60'}`} onClick={() => setFrame('today')}>
                Today
              </button>
              <button type="button" className={`join-item btn btn-sm border-0 max-lg:w-1/4 ${comFrame === '7' ? 'bg-primary/80 shadow-sm hover:bg-primary/60 text-primary-content' : 'bg-transparent hover:bg-base-300 text-base-content/60'}`} onClick={() => setFrame(7)}>
                7 days
              </button>
              <button type="button" className={`join-item btn btn-sm border-0 max-lg:w-1/4 ${comFrame === '30' ? 'bg-primary/80 shadow-sm hover:bg-primary/60 text-primary-content' : 'bg-transparent hover:bg-base-300 text-base-content/60'}`} onClick={() => setFrame(30)}>
                30 days
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <CalendarPicker label="From" value={startDate} onChange={setStartDate} />
              <CalendarPicker label="To" value={endDate} onChange={setEndDate} />
            </div>
          </div>
        </section>

        <section className="grid flex-1 min-h-0 grid-cols-[13.5rem_1fr] gap-2 max-lg:grid-cols-1">
          <aside className="rounded-box border border-base-200 bg-base-200 p-4 shadow-md backdrop-blur-md max-lg:hidden">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-base-content/70">Timeline</h2>
              <Clock className="size-4 text-primary" />
            </div>
            <ul className="timeline timeline-compact timeline-vertical mt-4">
            {Object.entries(itemsByDay).map(([day, dayLogs], index, array) => (
              <li key={day}>
                {index > 0 && <hr className="bg-base-300" />}
      
                <div className="timeline-start text-xs text-base-content/60">
                  {dayLogs.length}
                </div>
      
                <div className="timeline-middle">
                  <div className="size-3 rounded-full bg-primary" />
                </div>
      
                <div className="timeline-end timeline-box bg-base-100/90 text-sm">
                  <p className="font-semibold">{day}</p>
                  <p className="text-xs text-base-content/60">
                    {new Date(dayLogs[dayLogs.length - 1]._creationTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    -{' '}
                    {new Date(dayLogs[0]._creationTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {index < array.length - 1 && <hr className="bg-base-300" />}
              </li>
            ))}
          </ul>
          </aside>

          <div className="rounded-box flex min-h-0 flex-col border border-base-200 bg-base-200 shadow-md backdrop-blur-md">
            <div className="flex rounded-t-box items-center justify-between border-b border-base-100 bg-base-100/90 px-4 py-2">
              <p className="text-sm font-semibold uppercase tracking-wider text-base-content/70">All Events</p>
              <span className="badge bg-primary/10 text-primary">{filteredItems.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {isLoading ? (
                <div className="flex flex-col gap-2">
                  <div className="skeleton h-20 w-full rounded-box" />
                  <div className="skeleton h-20 w-full rounded-box" />
                  <div className="skeleton h-20 w-full rounded-box" />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex h-full min-h-80 flex-col items-center justify-center gap-2 text-center">
                  <Search className="size-8 text-base-content/30" />
                  <p className="font-semibold">No logs found</p>
                  <p className="text-sm text-base-content/60">Try another plate, user, or time frame.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {filteredItems.map((item) => (
                    <button
                      type="button"
                      key={item._id}
                      onClick={() => {
                        setSelected(item);
                        (document.getElementById('my_modal_1') as HTMLDialogElement).showModal();
                      }}
                      className={`cursor-pointer group grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-box border bg-base-100 p-2 text-left transition max-sm:grid-cols-[auto_1fr]
                        ${item.isAlert 
                          ? 'border-error/10 bg-error/5 hover:border-error/40' 
                          : 'border-base-200 bg-base-100 hover:border-primary/40'}
                        `}
                    >
                      <div className={`rounded-lg p-3 transition 
                        ${item.isAlert 
                          ? 'bg-error/20 text-error group-hover:bg-error group-hover:text-error-content' 
                          : 'bg-base-200 text-base-content/60 group-hover:bg-primary group-hover:text-primary-content'}`}
                      >
                        {item.isAlert ? <AlertTriangle className="size-6" /> : <CarFront className="size-6" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-bold text-base-content">{item.carPlate}</p>
                          {item.isAlert ? (
                            <span className={`badge badge-sm ${item.severity === '3' ? 'badge-error' : 'badge-warning'}`}>
                              Alert: {item.type}
                            </span>
                          ) : (
                            <span className={item.user ? 'badge badge-sm badge-success' : 'badge badge-sm badge-error'}>
                              {item.user ? 'Registered' : 'Unknown'}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-base-content/60">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {new Date(item._creationTime).toLocaleString()}
                          </span>
                          {!item.isAlert && (
                            <span className="flex min-w-0 items-center gap-1">
                              <User className="size-3" />
                              <span className="truncate">{item.user?.name ?? 'No matched user'}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 text-right text-xs text-base-content/50 max-sm:col-span-2 max-sm:text-left max-sm:hidden">
                        <p>{item.isAlert ? `Severity: ${item.severity}` : (item.user?.email ?? '')}</p>
                        <ChevronRight className={`max-sm:hidden size-4 opacity-0 ${item.isAlert ? 'text-error' : 'text-primary'} group-hover:opacity-100 group-hover:-translate-x-1 transition-all`} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <OverlayModal
        mainText={selected?.carPlate}
        primaryText={selected?.isAlert ? `System Alert: ${selected.type}` : selectedUser?.name}
        secondaryText={selected?.isAlert ? `Severity Tier: ${selected.severity}` : selectedUser?.userLicense}
        creationTime={selected?._creationTime}
        matched={selectedUser}
        image={selectedUser?.image}
      />
    </div>
  );
}