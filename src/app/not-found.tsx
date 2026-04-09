import Link from "next/link";
import "./globals.css";

export default function NotFound() {
  return (
    <html lang="sv">
      <body className="h-screen bg-[#cde0d4] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Page not found</h2>
          <p className="text-sm text-gray-500 mb-6">
            The page you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link
            href="/"
            className="inline-block bg-acca-dark text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-colors"
          >
            Go to dashboard
          </Link>
        </div>
      </body>
    </html>
  );
}
