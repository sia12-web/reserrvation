import { useLocation, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import ReservationSummary from "../../components/reservation/ReservationSummary";
import type { ReservationResponse } from "../../api/reservations.api";
import { useKioskReset } from "../../components/kiosk/InactivityGuard";

type LocationState = {
  reservation?: ReservationResponse;
};

export default function ReservationSuccessPage() {
  const { id } = useParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { resetKiosk } = useKioskReset();

  const state = location.state as LocationState | null;
  const cached = id ? (queryClient.getQueryData(["reservation", id]) as ReservationResponse) : null;
  const reservation = state?.reservation ?? cached;

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-semibold">Reservation created</h1>
        {reservation ? (
          <ReservationSummary reservation={reservation} />
        ) : (
          <div className="rounded-md bg-white p-6 border border-slate-200">
            <p className="text-lg font-semibold">Reservation ID</p>
            <p className="text-xl">{id?.slice(0, 8) ?? "—"}</p>
            <p className="text-amber-700 mt-3">Details unavailable — check system.</p>
          </div>
        )}
        <button
          className="h-12 w-full rounded-md bg-slate-900 text-white text-lg"
          onClick={resetKiosk}
        >
          New Reservation
        </button>
      </div>
    </div>
  );
}
