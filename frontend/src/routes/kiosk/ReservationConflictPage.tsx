import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCreateReservation } from "../../hooks/useCreateReservation";
import type { ReservationRequest } from "../../utils/validation";
import { addMinutesInRestaurant, toUtcIso, toRestaurantTime, formatTime } from "../../utils/time";
import { ApiError } from "../../api/httpClient";
import { useKioskReset } from "../../components/kiosk/InactivityGuard";
import type { ReservationDraft } from "../../components/reservation/ReservationForm";

type LocationState = {
  payload?: ReservationRequest;
  draft?: ReservationDraft;
};

const TRY_OPTIONS = [15, 30, 45];

export default function ReservationConflictPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetKiosk } = useKioskReset();
  const state = location.state as LocationState | null;
  const [payload, setPayload] = useState<ReservationRequest | null>(state?.payload ?? null);
  const [draft, setDraft] = useState<ReservationDraft | null>(state?.draft ?? null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const { mutate, isPending } = useCreateReservation();

  useEffect(() => {
    if (!payload) {
      navigate("/kiosk/new", { replace: true });
    }
  }, [navigate, payload]);

  if (!payload) {
    return null;
  }

  const submitPayload = (nextPayload: ReservationRequest) => {
    setErrorMessage(null);
    mutate(nextPayload, {
      onSuccess: (response) => {
        navigate(`/kiosk/reservations/${response.reservationId}/success`, {
          state: { reservation: response },
          replace: true,
        });
      },
      onError: (error) => {
        if (error instanceof ApiError && error.isNetworkError) {
          setShowNetworkModal(true);
          return;
        }

        if (error instanceof ApiError && error.status === 429) {
          setErrorMessage(error.message);
          return;
        }

        if (error instanceof ApiError && error.status === 409) {
          setErrorMessage(error.message || "Time not available. Try another option.");
          setPayload(nextPayload);
          setDraft((prev) =>
            prev ? { ...prev, startTime: nextPayload.startTime } : prev
          );
          return;
        }

        setErrorMessage(error instanceof ApiError ? error.message : "Something went wrong.");
      },
    });
  };

  const handleTry = (minutes: number) => {
    const newTime = addMinutesInRestaurant(payload.startTime, minutes);
    const nextPayload = { ...payload, startTime: toUtcIso(newTime) };
    submitPayload(nextPayload);
  };

  const draftToUse: ReservationDraft = draft ?? {
    clientName: payload.clientName,
    clientPhone: payload.clientPhone,
    partySize: payload.partySize,
    startTime: payload.startTime,
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-semibold">Time not available</h1>
        <p className="text-slate-600 text-lg">
          Requested time: {formatTime(toRestaurantTime(payload.startTime))}
        </p>
        <div className="grid gap-3">
          {TRY_OPTIONS.map((minutes) => (
            <button
              key={minutes}
              className="h-12 rounded-md bg-slate-900 text-white text-lg"
              onClick={() => handleTry(minutes)}
              disabled={isPending}
            >
              Try +{minutes} min
            </button>
          ))}
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex flex-col items-center gap-2">
          <p className="text-blue-800 font-medium">Need help or want to book for a different time?</p>
          <a
            href="tel:5144859999"
            className="flex items-center gap-2 text-2xl font-bold text-blue-900 hover:text-blue-700 transition-colors"
          >
            <span>Call us:</span>
            <span>(514) 485-9999</span>
          </a>
        </div>

        {errorMessage ? <p className="text-red-600 text-sm">{errorMessage}</p> : null}

        <div className="grid gap-3">
          <button
            className="h-12 rounded-md bg-white border border-slate-300 text-lg"
            onClick={() => navigate("/kiosk/new", { state: { draft: draftToUse } })}
          >
            Change time
          </button>
          <button
            className="h-12 rounded-md bg-white border border-slate-300 text-lg"
            onClick={() => navigate("/kiosk/new", { state: { draft: draftToUse } })}
          >
            Change party size
          </button>
          <button
            className="h-12 rounded-md bg-slate-200 text-slate-800 text-lg"
            onClick={resetKiosk}
          >
            Start over
          </button>
        </div>
      </div>

      {showNetworkModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4">
            <h2 className="text-xl font-semibold">Connection unstable</h2>
            <p className="text-slate-600">
              Reservation may or may not have been created. Do not retry blindly.
            </p>
            <div className="grid gap-3">
              <button
                type="button"
                className="h-12 rounded-md bg-slate-900 text-white text-lg"
                onClick={() => {
                  setShowNetworkModal(false);
                  submitPayload(payload);
                }}
              >
                Retry anyway
              </button>
              <button
                type="button"
                className="h-12 rounded-md bg-slate-200 text-slate-800 text-lg"
                onClick={resetKiosk}
              >
                Start over
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
