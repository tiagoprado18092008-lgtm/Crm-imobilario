import { useInfiniteQuery } from '@tanstack/react-query'
import { getContacts } from '../api/contacts.api'

export type ContactFilters = {
  search?: string
  type?: string
  status?: string
  source?: string
  tag?: string
  assignedToId?: string
}

const PAGE_SIZE = 50

/**
 * Infinite contacts list, paged by keyset cursor.
 *
 * No `page` is sent, which is what tells the API to seek from the last id
 * rather than OFFSET, and skips the filtered COUNT(*) that costs the same on
 * every page regardless of how few rows come back.
 */
export function useContactsList(filters: ContactFilters) {
  const query = useInfiniteQuery({
    queryKey: ['contacts', filters],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const res = await getContacts({
        ...Object.fromEntries(
          Object.entries(filters).filter(([, v]) => v !== '' && v != null),
        ),
        limit: PAGE_SIZE,
        cursor: pageParam,
      })
      const d = res.data
      // The endpoint returned a bare array before it was paged; tolerate both.
      if (Array.isArray(d)) return { data: d, nextCursor: null }
      return { data: d.data ?? [], nextCursor: d.nextCursor ?? null }
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })

  const contacts = query.data?.pages.flatMap((p) => p.data) ?? []

  return {
    contacts,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    error: query.error,
  }
}
