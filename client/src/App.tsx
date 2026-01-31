import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AuthPage from "./pages/auth";
import PatientDashboard from "./pages/patient-dashboard";
import DoctorDashboard from "./pages/doctor-dashboard";
import AiSummaryPage from "./pages/ai-summary";
import CategoryReportsPage from "./pages/category-reports";
import VisitDetailPage from "./pages/visit-detail";

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/auth" />
      </Route>
      <Route path="/auth" component={AuthPage} />
      <Route path="/patient" component={PatientDashboard} />
      <Route path="/doctor" component={DoctorDashboard} />
      <Route path="/ai" component={AiSummaryPage} />
      <Route path="/reports/:category" component={CategoryReportsPage} />
      <Route path="/visit/:visitId" component={VisitDetailPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
