import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/Dashboard";

export const Route = createFileRoute("/inquilino")({
  component: () => <Dashboard role="tenant" />,
});
