'use server';

interface Market {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
}

export async function searchPolymarketEvents(
  searchTerm: string
): Promise<{ success: boolean; data?: Market[]; error?: string }> {
  try {
    // Convert search term to slug-like format or use as query
    const slug = searchTerm
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Try fetching events by slug from server side
    const response = await fetch(`https://gamma-api.polymarket.com/events?slug=${slug}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Backoffice/1.0'
      },
      cache: 'no-store' // Don't cache these requests
    });

    if (!response.ok) {
      return { success: false, error: `Failed to find event: ${response.statusText}` };
    }

    const events = await response.json();

    if (!events || events.length === 0) {
      return { success: false, error: 'No events found matching that title/slug' };
    }

    // Extract all markets from the found event(s)
    const foundMarkets: Market[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    events.forEach((event: any) => {
      if (event.markets) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        event.markets.forEach((market: any) => {
          foundMarkets.push({
            id: market.id,
            question: market.question,
            conditionId: market.conditionId,
            slug: market.slug
          });
        });
      }
    });

    return { success: true, data: foundMarkets };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'An error occurred';
    return { success: false, error: errorMessage };
  }
}
