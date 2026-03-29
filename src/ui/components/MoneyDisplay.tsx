import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';

export function MoneyDisplay() {
  const cash = useGameStore((s) => s.economy.cash);
  const income = useGameStore((s) => s.economy.income);
  const expenses = useGameStore((s) => s.economy.expenses);
  const transactions = useGameStore((s) => s.economy.transactionHistory);
  const [showDetails, setShowDetails] = useState(false);

  const isLow = cash < 50_000;
  const isNegative = cash < 0;

  const formatted = cash.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  // Get last 5 transactions
  const recentTransactions = transactions.slice(-5).reverse();

  const colorClass = isNegative
    ? 'text-red-400 animate-pulse'
    : isLow
      ? 'text-red-400'
      : 'text-emerald-400';

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`font-mono text-sm font-semibold ${colorClass} hover:brightness-125 transition-all cursor-pointer`}
      >
        {formatted}
      </button>

      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-gray-900/95 backdrop-blur-sm border border-amber-900/40 rounded-lg p-3 shadow-xl z-50">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">
            Financial Summary
          </div>

          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Weekly Income</span>
            <span className="text-emerald-400">
              +${income.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm mb-3">
            <span className="text-gray-400">Weekly Expenses</span>
            <span className="text-red-400">
              -${expenses.toLocaleString()}
            </span>
          </div>

          <div className="border-t border-gray-800 pt-2">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              Recent Transactions
            </div>
            {recentTransactions.length === 0 ? (
              <div className="text-xs text-gray-600 italic">
                No transactions yet
              </div>
            ) : (
              recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex justify-between text-xs py-0.5"
                >
                  <span className="text-gray-400 truncate mr-2">
                    {tx.description}
                  </span>
                  <span
                    className={
                      tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }
                  >
                    {tx.amount >= 0 ? '+' : ''}
                    ${Math.abs(tx.amount).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
