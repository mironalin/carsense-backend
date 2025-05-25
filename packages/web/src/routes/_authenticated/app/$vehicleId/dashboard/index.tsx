import { createFileRoute } from "@tanstack/react-router";

import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";

import data from "../../../../data.json";

export const Route = createFileRoute(
  "/_authenticated/app/$vehicleId/dashboard/",
)({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <SectionCards />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>
      <DataTable data={data} />
    </>
  );
}
