import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { GalleryVerticalEnd } from "lucide-react";

import { SignInForm } from "@/features/auth/components/sign-in-form";

export const Route = createFileRoute("/_auth/sign-in")({
  validateSearch: (search) => {
    // Define and validate the search parameters
    return {
      mode: search.mode as string | undefined,
      redirect: search.redirect as string | undefined,
      state: search.state as string | undefined,
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  // Get search parameters using the hook properly
  const { mode, redirect, state } = useSearch({
    from: "/_auth/sign-in",
  });

  const isMobileMode = mode === "mobile";

  // Use compact layout for mobile webview
  if (isMobileMode) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center p-4">
        <div className="flex w-full max-w-sm flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEnd className="size-4" />
            </div>
            <span className="font-medium">CarSense</span>
          </div>
          <SignInForm
            redirectUri={redirect}
            state={state}
            isMobileMode={true}
          />
        </div>
      </div>
    );
  }

  // Regular desktop layout
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link to="/" className="flex items-center gap-2 font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEnd className="size-4" />
            </div>
            CarSense
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <SignInForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <img
          src="/placeholder.svg"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
