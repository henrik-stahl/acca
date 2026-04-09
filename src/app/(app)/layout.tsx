import Sidebar from "@/components/layout/Sidebar";
import SearchBar from "@/components/layout/SearchBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-4 p-4 h-full">
      <Sidebar />
      <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-hidden">
        <div className="bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center flex-shrink-0">
          <SearchBar />
        </div>
        <main className="flex-1 overflow-y-auto min-h-0">{children}</main>
      </div>
    </div>
  );
}
