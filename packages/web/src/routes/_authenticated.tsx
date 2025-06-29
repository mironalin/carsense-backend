import { createFileRoute, redirect } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data: sessionPayload, error: sessionError } = await authClient.getSession();

    if (sessionError) {
      console.warn("Error fetching session in _auth beforeLoad:", sessionError);
    }

    if (!sessionPayload?.session) {
      throw redirect({
        to: "/sign-in",
        search: {
          mode: undefined,
          redirect: undefined,
          state: undefined,
        },
      });
    }
  },
});
