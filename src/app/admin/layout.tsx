import { Sidebar } from "@/components/admin/Sidebar";
import { MobileSidebarToggle } from "@/components/admin/MobileSidebarToggle";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <MobileSidebarToggle>
        <Sidebar />
      </MobileSidebarToggle>
      <div className="flex-1 bg-system-background p-4 pt-20 md:p-6 md:pt-6">{children}</div>
    </div>
  );
}
