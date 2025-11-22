'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { redirect } from 'next/navigation';

import { LogoutButton } from '../logout-button';
import { searchPolymarketEvents } from '../actions/polymarket';

interface Trade {
  proxyWallet: string;
  side: string;
  asset: string;
  conditionId: string;
  size: number;
  price: number;
  timestamp: number;
  transactionHash: string;
  title: string;
  name: string;
  outcome: string;
}

interface Market {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
}

export default function TradesPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login');
    }
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchMarkets = async () => {
    if (!searchTerm) {
      return;
    }

    setLoading(true);
    setError('');
    setMarkets([]);
    setSelectedMarket(null);
    setTrades([]);

    try {
      const result = await searchPolymarketEvents(searchTerm);

      if (!result.success) {
        setError(result.error || 'Failed to search events');
        return;
      }

      setMarkets(result.data || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrades = async (conditionId: string) => {
    setLoading(true);
    setError('');
    setTrades([]);

    try {
      const response = await fetch(`https://data-api.polymarket.com/trades?market=${conditionId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch trades: ${response.statusText}`);
      }
      const data = await response.json();
      setTrades(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleMarketSelect = (market: Market) => {
    setSelectedMarket(market);
    fetchTrades(market.conditionId);
  };

  if (status === 'loading') {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Image className="dark:invert" src="/next.svg" alt="Logo" width={80} height={20} priority />
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Backoffice</h1>
          </div>
          <div className="flex items-center gap-4">
            {session?.user && (
              <div className="flex items-center gap-3">
                {session.user.image && (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || ''}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full"
                  />
                )}
                <div className="text-sm">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{session.user.name}</p>
                  <p className="text-zinc-600 dark:text-zinc-400">{session.user.email}</p>
                </div>
              </div>
            )}
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Trades Explorer</h1>
          </div>

          <div className="mb-8 space-y-6">
            {/* Search Section */}
            <div className="flex gap-4 items-end">
              <div className="flex-1 max-w-xl">
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Search by Event Title / Slug
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchMarkets()}
                    placeholder="e.g. What will Trump say..."
                    className="flex-1 rounded-md border border-zinc-300 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    onClick={searchMarkets}
                    disabled={loading || !searchTerm}
                    className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Search
                  </button>
                </div>
                <p className="mt-1 text-xs text-zinc-500">Try keywords or the full question from the Polymarket URL.</p>
              </div>
            </div>

            {/* Markets Selection */}
            {markets.length > 0 && (
              <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="mb-3 font-medium text-zinc-900 dark:text-zinc-100">Select a Market:</h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {markets.map(market => (
                    <button
                      key={market.id}
                      onClick={() => handleMarketSelect(market)}
                      className={`flex flex-col items-start rounded-md border p-3 text-left transition-colors ${
                        selectedMarket?.id === market.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2">
                        {market.question}
                      </span>
                      <span className="mt-1 text-xs text-zinc-500 font-mono truncate w-full">
                        ID: {market.conditionId.slice(0, 10)}...
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-md bg-red-50 p-4 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30">
                {error}
              </div>
            )}
          </div>

          {/* Trades Table */}
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-700">
                  <tr>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Title</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Name</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Side</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Outcome</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Price</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Size</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Date</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Tx Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                  {trades.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                        {loading
                          ? 'Loading...'
                          : selectedMarket
                            ? 'No trades found for this market.'
                            : 'Search for an event and select a market to view trades.'}
                      </td>
                    </tr>
                  ) : (
                    trades.map((trade, index) => (
                      <tr
                        key={`${trade.transactionHash}-${index}`}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                      >
                        <td
                          className="px-4 py-4 text-zinc-900 dark:text-zinc-100 whitespace-nowrap max-w-[200px] truncate"
                          title={trade.title}
                        >
                          {trade.title}
                        </td>
                        <td
                          className="px-4 py-4 text-zinc-900 dark:text-zinc-100 whitespace-nowrap max-w-[150px] truncate"
                          title={trade.name}
                        >
                          {trade.name}
                        </td>
                        <td className="px-4 py-4 font-medium">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              trade.side === 'BUY'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                          >
                            {trade.side}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-zinc-900 dark:text-zinc-100 font-medium">{trade.outcome}</td>
                        <td className="px-4 py-4 text-zinc-900 dark:text-zinc-100 font-mono">{trade.price}</td>
                        <td className="px-4 py-4 text-zinc-900 dark:text-zinc-100 font-mono">{trade.size}</td>
                        <td className="px-4 py-4 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                          {new Date(trade.timestamp * 1000).toLocaleString()}
                        </td>
                        <td
                          className="px-4 py-4 text-zinc-500 dark:text-zinc-400 font-mono text-xs truncate max-w-[100px]"
                          title={trade.transactionHash}
                        >
                          {trade.transactionHash}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
