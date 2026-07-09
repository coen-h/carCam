'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Background from '@/app/components/Background';
import Header from '@/app/components/Header';
import OverlayModal from '@/app/components/OverlayModal';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, ScrollText, Search, User, X, CarFront } from 'lucide-react';

type CalendarDateElement = HTMLElement & { value: string };

interface UserRecord {
  name?: string;
  email?: string;
  image?: string;
  userLicense?: string;
  carPlate?: string;
}

interface LogRecord {
  _id: string;
  _creationTime: number;
  carPlate: string;
  fileTitle: string;
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
  const [input, setInput] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [comFrame, setComFrame] = useState('all');
  const [selected, setSelected] = useState<LogRecord | null>(null);
  const [isdark, setIsdarkCom] = useState<boolean | null>(null);

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

  const logsWithUsers = useMemo<LogRecord[]>(() => {
    if (!logs) return [];

    return logs.map((log) => ({
      ...log,
      user: userByPlate.get(log.carPlate.toLowerCase()) ?? null,
    }));
  }, [logs, userByPlate]);

  const filteredLogs = useMemo(() => {
    const query = input.trim().toLowerCase();
    const start = startDate ? startOfDay(startDate) : null;
    const end = endDate ? endOfDay(endDate) : null;

    return logsWithUsers
      .filter((log) => {
        if (start !== null && log._creationTime < start) return false;
        if (end !== null && log._creationTime > end) return false;

        if (!query) return true;

        const user = log.user;
        const searchable = [
          log.carPlate,
          log.fileTitle,
          user?.name,
          user?.email,
          user?.userLicense,
          user?.carPlate,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchable.includes(query);
      })
      .sort((a, b) => b._creationTime - a._creationTime);
  }, [input, logsWithUsers, startDate, endDate]);

  const logsByDay = useMemo(() => {
    return filteredLogs.reduce<Record<string, LogRecord[]>>((groups, log) => {
      const key = new Date(log._creationTime).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      groups[key] = groups[key] ? [...groups[key], log] : [log];
      return groups;
    }, {});
  }, [filteredLogs]);

  const selectedUser = selected?.user;
  const isLoading = logs === undefined || users === undefined;

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
                {filteredLogs.length} of {logs?.length ?? 0} events shown
              </p>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-soft btn-primary ml-auto"
              onClick={() => {
                setInput('');
                setFrame('all');
              }}
            >
              <X className="size-4" />
              Reset
            </button>
          </div>

          <div className="mt-4 grid grid-cols-[minmax(16rem,1fr)_auto_auto] gap-2 max-lg:grid-cols-2 max-sm:grid-cols-1">
            <label className="input input-bordered flex w-full items-center gap-2 bg-base-100 max-lg:col-span-2 max-sm:col-span-1">
              <Search className="size-5 text-base-content/40" />
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="grow"
                placeholder="Search plates, users, email, license..."
              />
            </label>

            <div className="join bg-base-100 p-1 max-sm:hidden max-lg:pr-0.5 rounded-lg h-min outline outline-base-content/20 max">
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

        <section className="grid flex-1 min-h-0 grid-cols-[14rem_1fr] gap-2 max-lg:grid-cols-1">
          <aside className="rounded-box border border-base-200 bg-base-100/90 p-4 shadow-md backdrop-blur-md max-lg:hidden">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-base-content/70">Timeline</h2>
              <Clock className="size-4 text-primary" />
            </div>
            <ul className="timeline timeline-compact timeline-vertical mt-4">
            {Object.entries(logsByDay).map(([day, dayLogs], index, array) => (
              <li key={day}>
                {index > 0 && <hr className="bg-base-300" />}
      
                <div className="timeline-start text-xs text-base-content/60">
                  {dayLogs.length}
                </div>
      
                <div className="timeline-middle">
                  <div className="size-3 rounded-full bg-primary" />
                </div>
      
                <div className="timeline-end timeline-box bg-base-200 text-sm">
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
              <span className="badge bg-primary/10 text-primary">{filteredLogs.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {isLoading ? (
                <div className="flex flex-col gap-2">
                  <div className="skeleton h-20 w-full rounded-box" />
                  <div className="skeleton h-20 w-full rounded-box" />
                  <div className="skeleton h-20 w-full rounded-box" />
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="flex h-full min-h-80 flex-col items-center justify-center gap-2 text-center">
                  <Search className="size-8 text-base-content/30" />
                  <p className="font-semibold">No logs found</p>
                  <p className="text-sm text-base-content/60">Try another plate, user, or time frame.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {filteredLogs.map((log) => (
                    <button
                      type="button"
                      key={log._id}
                      onClick={() => {
                        setSelected(log);
                        (document.getElementById('my_modal_1') as HTMLDialogElement).showModal();
                      }}
                      className="cursor-pointer group grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-box border border-base-200 bg-base-100 p-2 text-left transition hover:border-primary/40 max-sm:grid-cols-[auto_1fr]"
                    >
                      <div className="rounded-lg bg-base-200 p-3 text-base-content/60 transition group-hover:bg-primary group-hover:text-primary-content">
                        <CarFront className="size-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-bold text-base-content">{log.carPlate}</p>
                          <span className={log.user ? 'badge badge-sm badge-success' : 'badge badge-sm badge-error'}>
                            {log.user ? 'Registered' : 'Unknown'}
                          </span>
                        </div>
                        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-base-content/60">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {new Date(log._creationTime).toLocaleString()}
                          </span>
                          <span className="flex min-w-0 items-center gap-1">
                            <User className="size-3" />
                            <span className="truncate">{log.user?.name ?? 'No matched user'}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 text-right text-xs text-base-content/50 max-sm:col-span-2 max-sm:text-left max-sm:hidden">
                        <p>{log.user?.email ?? log.user?.userLicense ?? ''}</p>
                        <ChevronRight className='max-sm:hidden size-4 opacity-0 text-primary group-hover:opacity-100 group-hover:-translate-x-1 transition-all' />
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
        primaryText={selectedUser?.name}
        secondaryText={selectedUser?.userLicense}
        creationTime={selected?._creationTime}
        matched={selectedUser}
        image={selectedUser?.image}
      />
    </div>
  );
}