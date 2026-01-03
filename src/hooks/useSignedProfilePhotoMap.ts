import { useEffect, useState } from "react";
import { getSignedProfilePhotoUrl } from "@/lib/storage/profilePhotos";

type Row = { id: string; profile_photo: string | null };

export function useSignedProfilePhotoMap(rows: Row[], deps: any[] = []) {
  const [urlById, setUrlById] = useState<Record<string, string | null>>({});

  useEffect(() => {
    let cancelled = false;

    async function run() {
      // Only fetch for ids we don't already have
      const missing = rows.filter((r) => urlById[r.id] === undefined);

      if (missing.length === 0) return;

      const pairs = await Promise.all(
        missing.map(async (r) => [r.id, await getSignedProfilePhotoUrl(r.profile_photo)] as const)
      );

      if (cancelled) return;

      setUrlById((prev) => {
        const next = { ...prev };
        for (const [id, url] of pairs) next[id] = url;
        return next;
      });
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, ...deps]);

  return urlById;
}