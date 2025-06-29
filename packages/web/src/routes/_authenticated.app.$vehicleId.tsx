import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getVehiclesQueryOptions } from "@/features/vehicles/api/use-get-vehicles";

export const Route = createFileRoute("/_authenticated/app/$vehicleId")({
  beforeLoad: async ({ context }) => {
    const queryClient = context.queryClient;
    const vehicles = await queryClient.fetchQuery(getVehiclesQueryOptions);

    if (vehicles.length === 0) {
      throw redirect({ to: "/app/register-vehicle" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div>
              <Outlet />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
