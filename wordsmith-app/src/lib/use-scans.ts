import { useEffect, useState } from "react";
import { useSession } from "@supabase/auth-helpers-react";
import type { Scan, ScanStats } from "./types";

/** Pro Slop Score history for the signed-in user. pro=false for free/anon. */
export function useScans() {
  const session = useSession();
  const [loading, setLoading] = useState(false);
  const [pro, setPro] = useState(false);
  const [recent, setRecent] = useState<Scan[]>([]);
  const [stats, setStats] = useState<ScanStats | null>(null);

  useEffect(() => {
    if (!session) {
      setPro(false);
      setRecent([]);
      setStats(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch("/api/scans")
      .then((res) => (res.ok ? res.json() : { pro: false }))
      .then((data) => {
        if (cancelled) return;
        if (data?.pro) {
          setPro(true);
          setRecent(data.recent ?? []);
          setStats(data.stats ?? null);
        } else {
          setPro(false);
        }
      })
      .catch(() => {
        if (!cancelled) setPro(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  return { loading, pro, recent, stats };
}
