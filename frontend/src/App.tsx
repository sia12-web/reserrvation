import React from "react";
import { Route, Routes, Navigate, Outlet } from "react-router-dom";
import NewReservationPage from "./routes/kiosk/NewReservationPage";
import ReservationSuccessPage from "./routes/kiosk/ReservationSuccessPage";
import ReservationConflictPage from "./routes/kiosk/ReservationConflictPage";
import InactivityGuard from "./components/kiosk/InactivityGuard";
import ReservePage from "./routes/client/ReservePage";
import ReserveSuccessPage from "./routes/client/ReserveSuccessPage";
import AdminGuard, { AdminLogin } from "./components/admin/AdminGuard";
import AdminLayout from "./app/layout/AdminLayout";
import AdminFloorMap from "./routes/admin/AdminFloorMap";
import ReservationsList from "./routes/admin/ReservationsList";
import ReservationDetails from "./routes/admin/ReservationDetails";
import ManageReservationPage from "./routes/client/ManageReservationPage";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      const isAdmin = window.location.pathname.startsWith("/admin");

      return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-3">
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="text-slate-600">
              {isAdmin ? "Please return to the admin dashboard." : "Please return to the kiosk start screen."}
            </p>
            <a
              className="inline-flex items-center justify-center rounded-md bg-slate-900 text-white h-12 px-6 text-lg font-bold shadow-lg hover:bg-slate-800 transition-colors"
              href={isAdmin ? "/admin/reservations" : "/kiosk/new"}
            >
              {isAdmin ? "Return to Dashboard" : "Start New Reservation"}
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Navigate to="/kiosk/new" replace />} />
        <Route
          element={
            <InactivityGuard>
              <Outlet />
            </InactivityGuard>
          }
        >
          <Route path="/kiosk/new" element={<NewReservationPage />} />
          <Route
            path="/kiosk/reservations/:id/success"
            element={<ReservationSuccessPage />}
          />
          <Route
            path="/kiosk/reservations/conflict"
            element={<ReservationConflictPage />}
          />
        </Route>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={<AdminGuard />}>
          <Route element={<AdminLayout><Outlet /></AdminLayout>}>
            <Route path="/admin/floor" element={<AdminFloorMap />} />
            <Route path="/admin/reservations" element={<ReservationsList />} />
            <Route path="/admin/reservations/:id" element={<ReservationDetails />} />
          </Route>
        </Route>
        <Route path="/reserve" element={<ReservePage />} />
        <Route path="/reserve/success/:id" element={<ReserveSuccessPage />} />
        <Route path="/reservations/manage/:shortId" element={<ManageReservationPage />} />
        <Route path="*" element={<Navigate to="/kiosk/new" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
