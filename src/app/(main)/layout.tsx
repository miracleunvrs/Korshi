import { isDemoMode } from "@/lib/supabase/config";
import Sidebar from "@/components/layout/Sidebar";
import RightWidgetPanel from "@/components/layout/RightWidgetPanel";
import BottomNav from "@/components/layout/BottomNav";
import MobileTopBar from "@/components/layout/MobileTopBar";
import BackendErrorBanner from "@/components/auth/BackendErrorBanner";
import PlatformRuntime from "@/components/runtime/PlatformRuntime";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-x-clip bg-[#f8f7f2] text-stone-900">
      <a href="#main-content" className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-xl bg-green-900 px-4 py-3 text-sm font-bold text-white transition focus:translate-y-0">Перейти к содержанию</a>
      {isDemoMode() && <div role="status" className="bg-amber-100 px-4 py-3 text-center text-sm font-bold text-amber-950">Демонстрационный режим — вымышленные данные, действия не отправляются на сервер</div>}
      <BackendErrorBanner />
      <PlatformRuntime />
      <MobileTopBar />
      <div className="mx-auto flex min-h-screen w-full max-w-[1480px] justify-center">
        <Sidebar />

        <main id="main-content" className="min-h-screen min-w-0 flex-1 overflow-x-clip border-stone-200/80 bg-[#fffefb] pb-24 md:max-w-3xl md:border-x md:pb-8">
          {children}
        </main>

        <RightWidgetPanel />
      </div>

      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
