import useSWR, { SWRConfiguration } from "swr";
import type { Campaign, Message, Script, Setting } from "@prisma/client";
import { jsonFetcher } from "@/lib/fetcher";

const sharedOptions: SWRConfiguration = {
  dedupingInterval: 5000,
  revalidateOnFocus: false,
  shouldRetryOnError: true,
  errorRetryInterval: 10000,
};

export function useScripts(enabled = true) {
  return useSWR<Script[]>(enabled ? "/api/scripts" : null, jsonFetcher, sharedOptions);
}

export function useCampaigns(enabled = true) {
  return useSWR<Campaign[]>(enabled ? "/api/campaigns" : null, jsonFetcher, sharedOptions);
}

export function useSettings(enabled = true, fallbackData?: Setting | null) {
  return useSWR<Setting | null>(enabled ? "/api/settings" : null, jsonFetcher, {
    ...sharedOptions,
    fallbackData,
  });
}

export function useMessages(sessionId: string | null, enabled = true) {
  const key = enabled && sessionId ? `/api/messages?sessionId=${encodeURIComponent(sessionId)}` : null;
  return useSWR<Message[]>(key, jsonFetcher, {
    ...sharedOptions,
    keepPreviousData: true,
  });
}
