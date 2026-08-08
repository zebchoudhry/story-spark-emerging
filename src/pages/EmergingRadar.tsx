import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Radar, RefreshCw, PenLine, X, ExternalLink, Sparkles, TrendingUp, Zap,
} from "lucide-react";

// New tables aren't in the generated Database types yet; cast to any for queries.
const db = supabase as any;

const SIGNALFORGE_URL =
  (import.meta as any).env?.VITE_SIGNALFORGE_URL || "http://localhost:3000";

interface EmergingEntity {
  id: string;
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
  drafted: boolean;
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

export default function EmergingRadar() {
  const { toast } = useToast();
  const [items, setItems] = useState<EmergingEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [showFading, setShowFading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let q = db
      .from("emerging_entities")
      .select("*")
      .eq("genre_id", "ai")
      .eq("dismissed", false)
      .order("emerging_score", { ascending: false })
      .limit(100);
    if (!showFading) q = q.neq("status", "fading");
    const { data, error } = await q;
    if (error) {
      toast({ title: "Failed to load radar", description: error.message, variant: "destructive" });
    } else {
      setItems((data ?? []) as EmergingEntity[]);
    }
    setLoading(false);
  }, [showFading, toast]);

  useEffect(() => { load(); }, [load]);

  const scanNow = async () => {
    setScanning(true);
    toast({ title: "Scanning…", description: "Detecting emerging things from recent stories." });
    const { data, error } = await supabase.functions.invoke("detect-emerging", {
      body: { genre_id: "ai" },
    });
    setScanning(false);
    if (error) {
      toast({ title: "Scan failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Scan complete", description: `Found ${(data as any)?.entities ?? 0} entities from ${(data as any)?.scanned ?? 0} stories.` });
    load();
  };

  const dismiss = async (id: string) => {
    await db.from("emerging_entities").update({ dismissed: true }).eq("id", id);
    setItems((prev) => prev.filter((x) => x.id !== id));
  };

  const draft = async (e: EmergingEntity) => {
    await db.from("emerging_entities").update({ drafted: true }).eq("id", e.id);
    const params = new URLSearchParams({
      topic: e.name,
      sourceMode: "radar",
      sourceText: e.why_it_matters ?? "",
      sourceUrl: e.sample_urls?.[0] ?? "",
      storySparkId: e.id,
      site: "beyond",
    });
    window.open(`${SIGNALFORGE_URL}/?${params.toString()}`, "_blank");
    setItems((prev) => prev.map((x) => (x.id === e.id ? { ...x, drafted: true } : x)));
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div>
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Radar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="font-display font-bold text-2xl">Emerging Radar</h1>
                <p className="text-sm text-muted-foreground">
                  New AI &amp; dev things gaining traction across sources — before they peak.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowFading((s) => !s)}>
                {showFading ? "Hide fading" : "Show fading"}
              </Button>
              <Button size="sm" onClick={scanNow} disabled={scanning}>
                <RefreshCw className={`h-4 w-4 mr-2 ${scanning ? "animate-spin" : ""}`} />
                {scanning ? "Scanning…" : "Scan now"}
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 text-muted-foreground">Loading radar…</div>
          ) : items.length === 0 ? (
            <Card className="p-10 text-center">
              <Sparkles className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">Nothing on the radar yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Run the daily ingest, then hit <strong>Scan now</strong> to detect emerging things.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {items.map((e) => (
                <Card key={e.id} className="p-5 hover:border-primary/40 transition-colors">
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
                      <Button size="sm" onClick={() => draft(e)} variant={e.drafted ? "outline" : "default"}>
                        <PenLine className="h-4 w-4 mr-2" />{e.drafted ? "Drafted" : "Draft post"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => dismiss(e.id)}>
                        <X className="h-4 w-4 mr-2" />Dismiss
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
