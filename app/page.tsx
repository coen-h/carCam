"use client";

import React from "react";
import { Metadata } from "next";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";

const recentEvents = [
  {
    id: "evt-001",
    time: "08:12",
    type: "Entry",
    vehicle: "AB-1234",
    zone: "North Gate",
    badge: "success",
    note: "Student drop-off",
  },
  {
    id: "evt-002",
    time: "08:20",
    type: "Exit",
    vehicle: "CD-5678",
    zone: "Main Gate",
    badge: "muted",
    note: "Staff",
  },
  {
    id: "evt-003",
    time: "08:27",
    type: "Alert",
    vehicle: "—",
    zone: "Lot B",
    badge: "destructive",
    note: "Unauthorized parking",
  },
  {
    id: "evt-004",
    time: "09:05",
    type: "Entry",
    vehicle: "EF-9012",
    zone: "South Gate",
    badge: "success",
    note: "Visitor",
  },
  {
    id: "evt-005",
    time: "09:18",
    type: "Info",
    vehicle: "GH-3456",
    zone: "Lot A",
    badge: "secondary",
    note: "Permit check passed",
  },
];

const topEntries = [
  { place: 1, vehicle: "AB-1234", count: 42, owner: "Year 10 - A" },
  { place: 2, vehicle: "JK-7890", count: 36, owner: "Staff - Admin" },
  { place: 3, vehicle: "MN-1122", count: 33, owner: "Parent - Smith" },
  { place: 4, vehicle: "OP-3344", count: 28, owner: "Staff - Maintenance" },
  { place: 5, vehicle: "QR-5566", count: 21, owner: "Visitor - Sports" },
];

export default function Dashboard() {
  return (
    <>
    <Header />
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-[1200px] mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Carpark Monitoring
            </h1>
            <p className="text-sm text-slate-600">
              School carpark real-time overview — demo UI with sample data.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex sm:items-center sm:gap-2">
              <Button variant="ghost" size="sm">
                Search
              </Button>
              <Button variant="outline" size="sm">
                Export
              </Button>
            </div>

            <Avatar>
              <AvatarImage src="/images/admin-avatar.jpg" alt="Admin" />
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Top stats row */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Occupancy</CardTitle>
              <CardDescription>Active vehicles in carpark</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold text-slate-900">128</p>
                <p className="text-sm text-slate-500">of 180 spaces used</p>
              </div>
              <div className="text-right">
                <Badge variant="secondary">72%</Badge>
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-xs text-slate-500">Updated 2m ago</p>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alerts</CardTitle>
              <CardDescription>Open incidents requiring attention</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold text-amber-600">3</p>
                <p className="text-sm text-slate-500">Unauthorized parking &amp; access</p>
              </div>
              <div className="text-right">
                <Badge variant="destructive">Priority</Badge>
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-xs text-slate-500">2 unresolved</p>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Average Dwell</CardTitle>
              <CardDescription>Typical stay duration</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold text-slate-900">42m</p>
                <p className="text-sm text-slate-500">Average per vehicle</p>
              </div>
              <div className="text-right">
                <Badge variant="outline">School Day</Badge>
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-xs text-slate-500">Calculated today</p>
            </CardFooter>
          </Card>
        </section>

        <Separator />

        {/* Main grid: Recent events + Top 5 entries */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Events</CardTitle>
                <CardDescription>Latest movements and alerts in the carpark</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Zone</TableHead>
                      <TableHead className="text-right">Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentEvents.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="w-[80px] font-medium">{e.time}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {e.type === "Entry" && (
                              <Badge variant="outline" className="capitalize">
                                Entry
                              </Badge>
                            )}
                            {e.type === "Exit" && (
                              <Badge variant="secondary" className="capitalize">
                                Exit
                              </Badge>
                            )}
                            {e.type === "Alert" && (
                              <Badge variant="destructive" className="capitalize">
                                Alert
                              </Badge>
                            )}
                            {e.type === "Info" && (
                              <Badge className="capitalize">
                                Info
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback>{e.vehicle.split("-")[0]}</AvatarFallback>
                            </Avatar>
                            <div className="text-sm">
                              <div className="font-medium">{e.vehicle}</div>
                              <div className="text-xs text-slate-500">ID: {e.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{e.zone}</TableCell>
                        <TableCell className="text-right text-sm text-slate-700">{e.note}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableCaption>Showing the most recent 5 events</TableCaption>
                </Table>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button variant="ghost" size="sm">
                  View all events
                </Button>
              </CardFooter>
            </Card>
          </div>
          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Frequent Vehicles</CardTitle>
                <CardDescription>Most frequent carpark entries this month</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {topEntries.map((t) => (
                    <li
                      key={t.place}
                      className="flex items-center justify-between gap-3 rounded-md
                                 px-3 py-2 hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md
                                        bg-slate-100 text-sm font-semibold">
                          {t.place}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{t.vehicle}</div>
                          <div className="text-xs text-slate-500">{t.owner}</div>
                        </div>
                      </div>
                      <div className="text-sm text-slate-700">{t.count} visits</div>
                    </li>
                  ))}
                </ol>
              </CardContent>
              <CardFooter>
                <div className="w-full flex items-center justify-between text-xs text-slate-500">
                  <span>Data: Sample only</span>
                  <Button size="sm" variant="outline">
                    Manage permits
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </aside>
        </section>
      </div>
    </main>
    <Footer />
    </>
  );
}