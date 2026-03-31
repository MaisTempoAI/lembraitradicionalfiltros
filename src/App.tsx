import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import ActiveReminders from "./pages/ActiveReminders";
import FinishedReminders from "./pages/FinishedReminders";
import ArchivedReminders from "./pages/ArchivedReminders";
import NewReminder from "./pages/NewReminder";
import MultipleReminderPage from "./pages/MultipleReminderPage";
import CategoriesPage from "./pages/CategoriesPage";
import ContactsPage from "./pages/ContactsPage";
import ImportContactsPage from "./pages/ImportContactsPage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import AgendaPage from "./pages/AgendaPage";
import ImportPdfPage from "./pages/ImportPdfPage";
import { ReactNode, useState, useEffect } from "react";
import WhatsAppSetupDialog from "@/components/WhatsAppSetupDialog";

const queryClient = new QueryClient();

function AuthenticatedApp({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('wa-setup-dismissed');
    if (user && !user.quepasakey && !dismissed) {
      setShowSetup(true);
    }
  }, [user]);

  const handleClose = () => {
    sessionStorage.setItem('wa-setup-dismissed', 'true');
    setShowSetup(false);
  };

  return (
    <>
      {children}
      <WhatsAppSetupDialog open={showSetup} onClose={handleClose} />
    </>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <AuthenticatedApp>{children}</AuthenticatedApp>;
}

const router = createBrowserRouter([
  { path: "/", element: <ProtectedRoute><Index /></ProtectedRoute> },
  { path: "/ativos", element: <ProtectedRoute><ActiveReminders /></ProtectedRoute> },
  { path: "/finalizados", element: <ProtectedRoute><FinishedReminders /></ProtectedRoute> },
  { path: "/arquivados", element: <ProtectedRoute><ArchivedReminders /></ProtectedRoute> },
  { path: "/categorias", element: <ProtectedRoute><CategoriesPage /></ProtectedRoute> },
  { path: "/contatos", element: <ProtectedRoute><ContactsPage /></ProtectedRoute> },
  { path: "/contatos/importar", element: <ProtectedRoute><ImportContactsPage /></ProtectedRoute> },
  { path: "/perfil", element: <ProtectedRoute><ProfilePage /></ProtectedRoute> },
  { path: "/novo", element: <ProtectedRoute><NewReminder /></ProtectedRoute> },
  { path: "/multiplo", element: <ProtectedRoute><MultipleReminderPage /></ProtectedRoute> },
  { path: "/agenda", element: <ProtectedRoute><AgendaPage /></ProtectedRoute> },
  { path: "/importar-pdf", element: <ProtectedRoute><ImportPdfPage /></ProtectedRoute> },
  { path: "*", element: <ProtectedRoute><NotFound /></ProtectedRoute> },
]);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
