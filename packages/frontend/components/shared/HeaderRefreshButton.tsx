'use client';

import { RefreshCw } from 'lucide-react';

type Props = {
  onClick: () => void;
  loading?: boolean;
  label?: string;
  className?: string;
};

export default function HeaderRefreshButton({
  onClick,
  loading = false,
  label = 'Actualizar',
  className = '',
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`inline-flex h-11 min-h-11 items-center gap-2 px-4 py-2 rounded-lg border border-blue-500 bg-blue-100 text-blue-800 font-medium hover:bg-blue-600 hover:text-white hover:border-blue-700 hover:shadow-md transition-all duration-150 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-300 disabled:opacity-70 disabled:cursor-not-allowed ${className}`}
    >
      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      {label}
    </button>
  );
}
