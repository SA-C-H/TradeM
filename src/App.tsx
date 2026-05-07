import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AccountProvider } from "@/contexts/AccountContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Trades from "./pages/Trades";
import NewTrade from "./pages/NewTrade";
import EditTrade from "./pages/EditTrade";
import Gallery from "./pages/Gallery";
import Analytics from "./pages/Analytics";
import CalendarView from "./pages/CalendarView";
import Playbook from "./pages/Playbook";
import SettingsPage from "./pages/SettingsPage";
import AIAssistant from "./pages/AIAssistant";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import FxReplay from "./pages/FxReplay";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AccountProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/trades" element={<Trades />} />
              <Route path="/trades/new" element={<NewTrade />} />
              <Route path="/trades/:id/edit" element={<EditTrade />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/calendar" element={<CalendarView />} />
              <Route path="/playbook" element={<Playbook />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/fx-replay" element={<FxReplay />} />
              <Route path="/ai" element={<AIAssistant />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </AccountProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
