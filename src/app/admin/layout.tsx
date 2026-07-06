import { Sidebar } from "@/components/admin/Sidebar";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 bg-system-background p-6">{children}</div>
    </div>
  );
}
