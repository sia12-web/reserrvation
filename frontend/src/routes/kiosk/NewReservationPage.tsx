import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ReservationForm from "../../components/reservation/ReservationForm";
import type { ReservationDraft } from "../../components/reservation/ReservationForm";
import type { ReservationRequest } from "../../utils/validation";
import type { ReservationResponse } from "../../api/reservations.api";
import { useRestaurantTime } from "../../hooks/useRestaurantTime";

type LocationState = {
  draft?: ReservationDraft;
};

export default function NewReservationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const { getRestaurantNow, timezone } = useRestaurantTime();
  const [currentTime, setCurrentTime] = useState(() => getRestaurantNow().format("h:mm A"));
  const [currentDate, setCurrentDate] = useState(() =>
    getRestaurantNow().format("ddd MMM D, YYYY")
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTime(getRestaurantNow().format("h:mm A"));
      setCurrentDate(getRestaurantNow().format("ddd MMM D, YYYY"));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [getRestaurantNow]);

  const handleSuccess = (response: unknown) => {
    const reservation = response as ReservationResponse;
    navigate(`/kiosk/reservations/${reservation.reservationId}/success`, {
      state: { reservation },
      replace: true,
    });
  };

  const handleConflict = (args: { payload: ReservationRequest; draft: ReservationDraft }) => {
    navigate("/kiosk/reservations/conflict", { state: args });
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 rounded-md flex items-center justify-center text-white font-bold text-lg">
            D
          </div>
          <span className="text-xl font-bold tracking-tight">Diba Restaurant</span>
        </div>
        <div className="flex items-baseline justify-between">
          <h1 className="text-3xl font-semibold">New Reservation</h1>
          <div className="text-right">
            <p className="text-sm text-slate-500">{currentDate}</p>
            <p className="text-lg font-semibold">{currentTime}</p>
            <p className="text-xs text-slate-500">{timezone}</p>
          </div>
        </div>
        <ReservationForm
          defaultValues={state?.draft}
          onSuccess={handleSuccess}
          onConflict={handleConflict}
        />
      </div>
    </div>
  );
}
