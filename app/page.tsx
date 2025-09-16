"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import fetchEvents from "@/app/lib/fetchEvents"; // your event fetch
import fetchList from "@/app/lib/fetchSearch";     // your list fetch

type Event = {
  id: string;
  plate_number: string;
  entry_time?: string;
  exit_time?: string;
};

type List = {
  plate_number: string;
  name?: string;
};

export default function Dashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [topEntries, setTopEntries] = useState<
    { plate_number: string; count: number }[]
  >([]);

  useEffect(() => {
  const loadData = async () => {
    try {
      const evts: Event[] = await fetchEvents();
      const lst: List[] = await fetchList();

      // only include entry + exit events
      const filtered = evts.filter((e) => e.entry_time || e.exit_time);

      // sort newest first
      const sorted = filtered.sort((a, b) => {
        const timeA = new Date(a.entry_time || a.exit_time || 0).getTime();
        const timeB = new Date(b.entry_time || b.exit_time || 0).getTime();
        return timeB - timeA;
      });

      // only keep 10 most recent
      setEvents(sorted.slice(0, 10));

      // count frequency of vehicles
      const counts: Record<string, number> = {};
      filtered.forEach((e) => {
        counts[e.plate_number] = (counts[e.plate_number] || 0) + 1;
      });

      const top = Object.entries(counts)
        .map(([plate_number, count]) => ({ plate_number, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setTopEntries(top);
    } catch (err) {
      console.error("Failed to load data", err);
    }
  };

  loadData();
}, []);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-[1200px] mx-auto space-y-6">
          <header className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Carpark Monitoring
              </h1>
              <p className="text-sm text-slate-600">
                Real-time carpark overview from server data.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex sm:items-center sm:gap-2">
                <Button variant="outline" size="sm">
                  Export
                </Button>
              </div>
            </div>
          </header>

          <Separator />

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Events</CardTitle>
                  <CardDescription>Latest entry and exit movements</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((e) => {
                        const isEntry = Boolean(e.entry_time);
                        return (
                          <TableRow key={e.id}>
                            <TableCell className="w-[80px] font-medium">
                              {new Date(
                                e.entry_time || e.exit_time || ""
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </TableCell>
                            <TableCell>
                              {isEntry ? (
                                <Badge variant="outline">Entry</Badge>
                              ) : (
                                <Badge variant="secondary">Exit</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-medium">
                                {e.plate_number}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-medium">
                                <Badge variant="outline">{e.known ? "Known" : "Unknown"}</Badge>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button size="sm">
                    View all events
                  </Button>
                </CardFooter>
              </Card>
            </div>
            <aside className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top 5 Frequent Vehicles</CardTitle>
                  <CardDescription>Most frequent carpark entries</CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-3">
                    {topEntries.map((t, i) => (
                      <li
                        key={t.plate_number}
                        className="flex items-center justify-between gap-3 rounded-md
                                   px-3 py-2 hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-9 w-9 items-center justify-center rounded-md
                                          bg-slate-100 text-sm font-semibold"
                          >
                            {i + 1}
                          </div>
                          <div className="text-sm font-medium">
                            {t.plate_number}
                          </div>
                        </div>
                        <div className="text-sm text-slate-700">
                          {t.count} visits
                        </div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </aside>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
