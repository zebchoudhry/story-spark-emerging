import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Radar, RefreshCw, PenLine, X, ExternalLink, Sparkles, TrendingUp, Zap,
} from "lucide-react";

// Data source: static radar.json produced daily by the GitHub Action (Neon engine).
// No live DB from the browser. Override host with VITE_RADAR_JSON_URL if needed.
const RADAR_URL = (import.meta as any).env?.VITE_RADAR_JSON_URL || "/radar.json";
const SIGNALFORGE_URL =
  (import.meta as any).env?.VITE_SIGNALFORGE_URL || "http://localhost:3000";
const DISMISS_KEY = "radar_dismissed";

interface EmergingItem {
  name: string;
  entity_type: string;
  why_it_matters: string | null;
  getvisus_relevant: boolean;
  getvisus_reason: string | null;
  first_seen_at: string;
  last_seen_at: string;
  mention_count: number;
  source_count: number;
  velocity_24h: number;
  emerging_score: number;
  status: string;
  sample_urls: string[];
}

const STATUS_STYLE: Record<string, string> = {
  new: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  rising: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  established: "bg-sky-500/15 text-sky-500 border-sky-500/30",
  fading: "bg-muted text-muted-foreground border-border",
};

function timeAgo(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 3600000;
  if (d < 1) return "just now";
  if (d < 24) return `${Math.round(d)}h ago`;
  return `${Math.round(d / 24)}d ago`;
}

const loadDismissed = (): Set<string> => {
  try { return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]")); }
  catch { return new Set(); }
};

export default function EmergingRadar() {
  const { toast } = useToast();
  const [items, setItems] = useState<EmergingItem[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${RADAR_URL}?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`radar.json ${res.status}`);
      const data = await res.json();
      setItems((data.items ?? []) as EmergingItem[]);
      setUpdatedAt(data.generated_at ?? null);
    } catch (e: any) {
      toast({ title: "Couldn't load radar", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const dismiss = (name: string) => {
    const next = new Set(dismissed); next.add(name);
    setDismissed(next);
    localStorage.setItem(DISMISS_KEY, JSON.stringify([...next]));
  };

  const draft = (e: EmergingItem) => {
    const params = new URLSearchParams({
      topic: e.name,
      sourceMode: "radar",
      sourceText: e.why_it_matters ?? "",
      sourceUrl: e.sample_urls?.[0] ?? "",
      site: "beyond",
    });
    window.open(`${SIGNALFORGE_URL}/?${params.toString()}`, "_blank");
  };

  const visible = items.filter((e) => !dismissed.has(e.name));

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Radar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl">Emerging Radar</h1>
              <p className="text-sm text-muted-foreground">
                New AI &amp; dev things gaining traction across sources — before they peak.
                {updatedAt && <> · updated {timeAgo(updatedAt)}</>}
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading radar…</div>
        ) : visible.length === 0 ? (
          <Card className="p-10 text-center">
            <Sparkles className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium">Nothing on the radar yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              The daily job builds this. Run the <strong>Emerging Radar</strong> GitHub Action to populate it.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {visible.map((e) => (
              <Card key={e.name} className="p-5 hover:border-primary/40 transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-lg truncate">{e.name}</h3>
                      <Badge variant="outline" className="capitalize">{e.entity_type}</Badge>
                      <Badge variant="outline" className={`capitalize ${STATUS_STYLE[e.status] ?? ""}`}>
                        {e.status}
                      </Badge>
                      {e.getvisus_relevant && (
                        <Badge className="bg-primary text-primary-foreground">GetVisus</Badge>
                      )}
                    </div>
                    {e.why_it_matters && (
                      <p className="text-sm text-muted-foreground mt-2">{e.why_it_matters}</p>
                    )}
                    {e.getvisus_relevant && e.getvisus_reason && (
                      <p className="text-xs text-primary mt-1.5">↳ GetVisus: {e.getvisus_reason}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" />{e.velocity_24h} in 24h</span>
                      <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" />{e.source_count} sources · {e.mention_count} mentions</span>
                      <span>first seen {timeAgo(e.first_seen_at)}</span>
                      <span className="font-mono">score {e.emerging_score}</span>
                    </div>
                    {e.sample_urls?.length > 0 && (
                      <div className="flex flex-wrap gap-3 mt-2">
                        {e.sample_urls.slice(0, 3).map((u, i) => (
                          <a key={i} href={u} target="_blank" rel="noreferrer"
                             className="text-xs text-sky-500 hover:underline flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />source {i + 1}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button size="sm" onClick={() => draft(e)}>
                      <PenLine className="h-4 w-4 mr-2" />Draft post
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => dismiss(e.name)}>
                      <X className="h-4 w-4 mr-2" />Dismiss
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
