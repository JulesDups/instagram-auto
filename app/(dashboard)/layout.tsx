import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FBFAF8] text-[#1C343A]">
      <Sidebar />
      <main className="ml-60">
        <div className="mx-auto max-w-[1280px] px-12 py-12">{children}</div>
      </main>
    </div>
  );
}
