"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center justify-center h-full text-center">
      <h2 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h2>
      <button onClick={reset} className="bg-acca-dark text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-colors mt-4">
        Try again
      </button>
    </div>
  );
}
