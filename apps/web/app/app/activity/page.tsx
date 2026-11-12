"use client";

import { Activity } from "lucide-react";
import { useApp } from "@/components/providers";
import { Badge, Card, Empty, ErrorNote, PageHeader, Spinner } from "@/components/ui";
import type { AuditEvent } from "@/lib/api";
import { shortDate } from "@/lib/format";
import { useApiData } from "@/lib/useApiData";

const tone = (a: string) =>
  a.includes("approved") || a.includes("completed") ? "success" : a.includes("reject") || a.includes("dismiss") ? "risk" : a.startsWith("trial") ? "caution" : "neutral";

export default function ActivityPage() {
  const { store } = useApp();
  const { data, error, loading, reload } = useApiData<AuditEvent[]>("/activity", store?.id);
  return (
    <div className="rise space-y-6">
      <PageHeader title="Activity" sub="Append-only audit trail: who logged, changed, approved and recorded what." />
      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <ErrorNote message={error} onRetry={reload} />
      ) : !data?.length ? (
        <Empty icon={<Activity className="size-6" />} title="No activity yet" body="Actions in this store will appear here." />
      ) : (
        <Card className="p-0">
          <ol className="divide-y divide-line">
            {data.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <Badge tone={tone(e.action) as "success" | "risk" | "caution" | "neutral"}>{e.action}</Badge>
                <span className="min-w-0 flex-1">{e.summary}</span>
                <span className="text-xs text-faint">{e.actor ?? "system"} · {shortDate(e.created_at)}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
