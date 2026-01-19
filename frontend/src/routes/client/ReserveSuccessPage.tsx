import { useLocation, useParams } from "react-router-dom";
import ClientShell from "../../app/layout/ClientShell";
import type { ReservationResponse } from "../../api/reservations.api";
import { formatDateTimeWindow } from "../../utils/time";
import clsx from "clsx";

type LocationState = {
  reservation?: ReservationResponse;
};

export default function ReserveSuccessPage() {
  const { id } = useParams();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const reservation = state?.reservation;

  const shortId = reservation?.reservationId?.slice(0, 8) || id?.slice(0, 8) || "—";
  const status = reservation?.status ?? "CONFIRMED";
  const statusClass =
    status === "CONFIRMED"
      ? "bg-green-100 text-green-800"
      : status === "PENDING_DEPOSIT"
      ? "bg-amber-100 text-amber-800"
      : "bg-slate-200 text-slate-800";

  return (
    <ClientShell title="Reservation created" subtitle="We look forward to seeing you.">
      {reservation ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Reservation ID</p>
              <p className="text-xl font-semibold">{shortId}</p>
            </div>
            <span className={clsx("px-3 py-1 rounded-full text-sm font-medium", statusClass)}>
              {status}
            </span>
          </div>

          <div className="rounded-md border border-slate-200 p-4 space-y-3">
            <div>
              <p className="text-sm text-slate-500">Tables</p>
              <p className="text-base font-medium">{reservation.tableIds?.join(", ")}</p>
            </div>
            {reservation.startTime && reservation.endTime ? (
              <div>
                <p className="text-sm text-slate-500">Time</p>
                <p className="text-base font-medium">
                  {formatDateTimeWindow(reservation.startTime, reservation.endTime)}
                </p>
              </div>
            ) : null}
          </div>

          {status === "PENDING_DEPOSIT" ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-800">
              Deposit required to confirm ($50). Payment will be added next.
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <p className="text-base font-medium">Reservation created.</p>
          <p className="text-sm text-slate-600">
            Please check your confirmation details.
          </p>
          <p className="mt-3 text-sm text-slate-500">Reservation ID: {shortId}</p>
        </div>
      )}
    </ClientShell>
  );
}
