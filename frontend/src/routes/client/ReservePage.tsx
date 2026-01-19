import { useNavigate } from "react-router-dom";
import ClientShell from "../../app/layout/ClientShell";
import ClientReservationForm from "../../components/client/ClientReservationForm";
import type { ReservationResponse } from "../../api/reservations.api";

export default function ReservePage() {
  const navigate = useNavigate();

  const handleSuccess = (response: unknown) => {
    const reservation = response as ReservationResponse;
    navigate(`/reserve/success/${reservation.reservationId}`, {
      state: { reservation },
      replace: true,
    });
  };

  return (
    <ClientShell
      title="Reserve a table"
      subtitle="Choose a time and we will confirm availability."
    >
      <ClientReservationForm onSuccess={handleSuccess} />
    </ClientShell>
  );
}
