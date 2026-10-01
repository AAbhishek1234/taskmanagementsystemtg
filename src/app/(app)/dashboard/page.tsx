"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Truck,
  AlertTriangle,
  Layers,
  CalendarDays,
  ClipboardList,
  BarChart3,
  ListChecks,
  ArrowRight,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/format";

interface StageSummaryRow {
  key: string;
  label: string;
  count: number;
}
interface OverdueRow {
  id: string;
  title: string;
  dueDate: string;
  stage: string;
  assignees: string[];
}

const ATTENTION_LIMIT = 5;

export default function DashboardPage() {
  const { user } = useAuth();
  const [stageSummary, setStageSummary] = useState<StageSummaryRow[]>([]);
  const [overdue, setOverdue] = useState<OverdueRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<{ stages: StageSummaryRow[] }>("/reports/stage-summary").then((r) => r.stages),
      apiGet<{ overdue: OverdueRow[] }>("/reports/overdue").then((r) => r.overdue),
    ])
      .then(([stages, overdueRows]) => {
        setStageSummary(stages);
        setOverdue(overdueRows);
      })
      .catch(() => {
        setStageSummary([]);
        setOverdue([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalOpen = stageSummary.reduce((sum, s) => sum + s.count, 0);

  // Only show the latest 5 in the "Needs attention" card.
  // Newest due date first. To show the most overdue first, swap `b` and `a`.
  const latestOverdue = [...overdue]
    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
    .slice(0, ATTENTION_LIMIT);

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#dfe6fb] to-[#eef1fb] p-6 sm:p-8">
        <div className="relative z-10 max-w-md">
          <p className="text-sm text-navy-500">Welcome back,</p>
          <h1 className="mt-1 text-3xl font-bold text-navy-900">{user?.name}</h1>
          <p className="mt-2 text-sm text-navy-500">Here&apos;s where things stand across your work.</p>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[45%] sm:block">
          <Image
            src="/images/dashboardbanner.png"
            alt=""
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#dfe6fb] via-[#dfe6fb]/40 to-transparent" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Truck size={20} />}
          iconBg="bg-blue-100 text-blue-600"
          label="Total deliverables"
          value={loading ? "-" : totalOpen}
          href="/tasks"
        />
        <StatCard
          icon={<AlertTriangle size={20} />}
          iconBg="bg-orange-100 text-orange-600"
          label="Needs attention"
          value={loading ? "-" : overdue.length}
          valueClassName="text-orange"
          href="/tasks"
        />
        <StatCard
          icon={<Layers size={20} />}
          iconBg="bg-purple-100 text-purple-600"
          label="Stages tracked"
          value={loading ? "-" : stageSummary.length}
          href="/tasks"
        />
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-3">
        <QuickLink
          href="/calendar"
          icon={<CalendarDays size={20} />}
          iconBg="bg-emerald-100 text-emerald-600"
          title="Content calendar"
          description="See what's planned across every client"
        />
        <QuickLink
          href="/tasks"
          icon={<ClipboardList size={20} />}
          iconBg="bg-purple-100 text-purple-600"
          title="Tasks"
          description="Your board of deliverables by stage"
        />
        <QuickLink
          href="/publishing"
          icon={<BarChart3 size={20} />}
          iconBg="bg-blue-100 text-blue-600"
          title="Publishing status"
          description="Client x date view of what's live"
        />
      </div>

      {loading ? (
        <p className="text-sm text-navy-300">Loading reports...</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <ListChecks size={18} />
                </span>
                <h2 className="text-sm font-semibold text-navy-900">Deliverables by stage</h2>
              </div>
              <Link href="/tasks" className="text-xs font-medium text-blue-600 hover:underline">
                View all
              </Link>
            </div>
            {stageSummary.length === 0 ? (
              <p className="mt-4 text-sm text-navy-300">Nothing to show yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-navy-50">
                {stageSummary.map((s) => (
                  <li key={s.key} className="flex items-center justify-between py-3 text-sm">
                    <span className="font-medium text-navy-700">{s.label}</span>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-50 text-xs font-semibold text-navy-700">
                      {s.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                  <AlertTriangle size={18} />
                </span>
                <h2 className="text-sm font-semibold text-navy-900">Needs attention</h2>
              </div>
              <Link href="/tasks" className="text-xs font-medium text-blue-600 hover:underline">
                View all{overdue.length > ATTENTION_LIMIT ? ` (${overdue.length})` : ""}
              </Link>
            </div>
            {overdue.length === 0 ? (
              <p className="mt-4 text-sm text-navy-300">Nothing overdue. Nice.</p>
            ) : (
              <ul className="mt-4 divide-y divide-navy-50">
                {latestOverdue.map((o) => (
                  <li key={o.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <Link href={`/deliverables/${o.id}`} className="font-semibold text-navy-800 hover:text-orange">
                        {o.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-navy-400">
                        {o.stage} &middot; Due {formatDate(o.dueDate)}
                      </p>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs text-navy-500">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-100 text-[10px] font-semibold text-navy-600">
                        {(o.assignees[0]?.[0] ?? "U").toUpperCase()}
                      </span>
                      {o.assignees.join(", ") || "Unassigned"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  iconBg,
  label,
  value,
  valueClassName = "text-navy-900",
  href,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string | number;
  valueClassName?: string;
  href?: string;
}) {
  const card = (
    <div className="flex h-full items-start justify-between rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(15,23,42,0.1)]">
      <div>
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-full ${iconBg}`}
        >
          {icon}
        </span>

        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-navy-400">
          {label}
        </p>

        <p className={`mt-1 text-3xl font-bold ${valueClassName}`}>
          {value}
        </p>
      </div>

      {/* Arrow kept */}
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-navy-100 text-navy-400 transition-colors group-hover:bg-navy-50">
        <ArrowRight size={14} />
      </span>
    </div>
  );

  return href ? (
    <Link href={href} className="group block">
      {card}
    </Link>
  ) : (
    card
  );
}

function QuickLink({
  href,
  icon,
  iconBg,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-[0_4px_16px_rgba(15,23,42,0.1)]"
    >
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconBg}`}>{icon}</span>
        <div>
          <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
          <p className="mt-0.5 text-xs text-navy-400">{description}</p>
        </div>
      </div>
      <ArrowRight size={16} className="shrink-0 text-navy-300" />
    </Link>
  );
}