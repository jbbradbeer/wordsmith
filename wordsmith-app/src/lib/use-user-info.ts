import { useCallback, useEffect, useState } from "react";
import { useSession } from "@supabase/auth-helpers-react";
import type { UserInfo } from "./types";

/** Profile info for the signed-in user; null while signed out. */
export function useUserInfo() {
  const session = useSession();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  const refresh = useCallback(async () => {
    if (!session) {
      setUserInfo(null);
      return;
    }
    try {
      const res = await fetch("/api/user");
      if (res.ok) {
        setUserInfo(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch user info:", err);
    }
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { userInfo, setUserInfo, refresh, session };
}
