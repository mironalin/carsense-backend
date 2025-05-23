import type { QueryClient } from "@tanstack/react-query";

import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { Toaster } from "sonner";

type RouterContext = {
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  errorComponent: () => <div>Error</div>,
  component: () => (
    <>
      <Outlet />
      <Toaster />
    </>
  ),
});
