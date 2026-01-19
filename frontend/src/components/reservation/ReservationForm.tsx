import { useEffect, useMemo, useState } from "react";
import { useCreateReservation } from "../../hooks/useCreateReservation";
import { useRestaurantTime } from "../../hooks/useRestaurantTime";
import { normalizePhone } from "../../utils/phone";
import { reservationRequestSchema } from "../../utils/validation";
import type { FieldErrors, ReservationRequest } from "../../utils/validation";
import PartySizeStepper from "./PartySizeStepper";
import TimeSlotGrid from "./TimeSlotGrid";
import PhoneInput from "./PhoneInput";
import CalendarSelector from "./CalendarSelector";
import FloorMap from "./FloorMap";
import { useLayout, useAvailability } from "../../hooks/useLayout";
import { ApiError } from "../../api/httpClient";
import { useKioskReset } from "../kiosk/InactivityGuard";
import clsx from "clsx";

export type ReservationDraft = {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  specialRequests?: string;
  partySize: number;
  startTime: string;
};

type ReservationFormProps = {
  defaultValues?: Partial<ReservationDraft>;
  onSuccess: (response: unknown) => void;
  onConflict: (args: { payload: ReservationRequest; draft: ReservationDraft }) => void;
};

const SLOT_COUNT = 48; // generated pool; UI shows a smaller window at a time
const SLOT_PAGE_SIZE = 24;

export default function ReservationForm({
  defaultValues,
  onSuccess,
  onConflict,
}: ReservationFormProps) {
  const { resetKiosk } = useKioskReset();
  const { generateTimeSlots, getNextStartSlot, getRestaurantNow, toRestaurantTime, toUtcIso } =
    useRestaurantTime();
  const [clientName, setClientName] = useState(defaultValues?.clientName ?? "");
  const [clientPhone, setClientPhone] = useState(defaultValues?.clientPhone ?? "");
  const [clientEmail, setClientEmail] = useState(defaultValues?.clientEmail ?? "");
  const [specialRequests, setSpecialRequests] = useState(defaultValues?.specialRequests ?? "");
  const [partySize, setPartySize] = useState(defaultValues?.partySize ?? 2);
  const [selectedSlot, setSelectedSlot] = useState(() => {
    if (defaultValues?.startTime) {
      return toRestaurantTime(defaultValues.startTime);
    }
    return getNextStartSlot(getRestaurantNow());
  });
  const [selectedDay, setSelectedDay] = useState(() => selectedSlot.startOf("day"));
  const [slotPage, setSlotPage] = useState(0);
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<ReservationRequest | null>(null);

  const { data: layoutData } = useLayout();
  // Valid start time string for availability check
  const availabilityTime = selectedSlot ? toUtcIso(selectedSlot) : null;
  const { data: availabilityData } = useAvailability(availabilityTime, partySize);

  // Reset table selection when time/day or party size changes
  useEffect(() => {
    setSelectedTableIds([]);
    setFormError(null);
  }, [selectedSlot, partySize]);

  const { mutate, isPending } = useCreateReservation();

  useEffect(() => {
    if (defaultValues?.startTime) {
      const t = toRestaurantTime(defaultValues.startTime);
      setSelectedSlot(t);
      setSelectedDay(t.startOf("day"));
    }
  }, [defaultValues?.startTime, toRestaurantTime]);

  useEffect(() => {
    setSelectedDay(selectedSlot.startOf("day"));
  }, [selectedSlot]);



  const slots = useMemo(() => {
    const now = getRestaurantNow();
    const dayNoon = selectedDay.hour(12).minute(0).second(0).millisecond(0);
    const fromTime = dayNoon.isAfter(now) ? dayNoon : now;
    const generated = generateTimeSlots(SLOT_COUNT, fromTime);
    if (!selectedSlot) return generated;
    const exists = generated.some((slot) => slot.valueOf() === selectedSlot.valueOf());
    if (exists) return generated;
    const merged = [...generated, selectedSlot].sort((a, b) => a.valueOf() - b.valueOf());
    return merged;
  }, [generateTimeSlots, getRestaurantNow, selectedDay, selectedSlot]);

  useEffect(() => {
    const index = slots.findIndex((slot) => slot.valueOf() === selectedSlot.valueOf());
    if (index >= 0) {
      setSlotPage(Math.floor(index / SLOT_PAGE_SIZE));
    }
  }, [selectedSlot, slots]);

  const pagedSlots = useMemo(() => {
    const start = slotPage * SLOT_PAGE_SIZE;
    return slots.slice(start, start + SLOT_PAGE_SIZE);
  }, [slotPage, slots]);

  const canPrevSlots = slotPage > 0;
  const canNextSlots = (slotPage + 1) * SLOT_PAGE_SIZE < slots.length;

  const submitPayload = (payload: ReservationRequest) => {
    setPendingPayload(payload);
    mutate(payload, {
      onSuccess: (data) => {
        setFormError(null);
        setFieldErrors({});
        onSuccess(data);
      },
      onError: (error) => {
        if (error instanceof ApiError && error.isNetworkError) {
          setShowNetworkModal(true);
          return;
        }

        if (error instanceof ApiError && error.status === 429) {
          setFormError(error.message);
          return;
        }

        if (error instanceof ApiError && error.status === 409) {
          onConflict({
            payload,
            draft: {
              clientName,
              clientPhone,
              clientEmail,
              specialRequests,
              partySize,
              startTime: payload.startTime,
            },
          });
          return;
        }

        if (error instanceof ApiError && (error.status === 400 || error.status === 422)) {
          const nextErrors: FieldErrors = {};
          const details = error.details as Array<{ path?: string[]; message?: string }> | undefined;
          details?.forEach((issue) => {
            const field = issue.path?.[0];
            if (field && typeof field === "string") {
              nextErrors[field as keyof ReservationRequest] = issue.message || "Invalid value";
            }
          });

          if (Object.keys(nextErrors).length === 0) {
            nextErrors.startTime = error.message || "Please choose a different time";
          }

          if (
            error.message?.toLowerCase().includes("starttime") ||
            error.message?.toLowerCase().includes("align") ||
            error.message?.toLowerCase().includes("future")
          ) {
            setSelectedSlot(getNextStartSlot(getRestaurantNow()));
          }

          setFieldErrors(nextErrors);
          return;
        }

        setFormError("Something went wrong. Please try again.");
      },
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    if (!selectedSlot) {
      setFieldErrors({ startTime: "Please select a time." });
      return;
    }

    const normalizedPhone = normalizePhone(clientPhone);
    const payload: ReservationRequest = {
      clientName: clientName.trim(),
      clientPhone: normalizedPhone,
      clientEmail: clientEmail.trim() || undefined,
      partySize,
      startTime: toUtcIso(selectedSlot),
      source: "KIOSK",
      tableIds: selectedTableIds.length > 0 ? selectedTableIds : undefined,
      customerNotes: specialRequests.trim() || undefined,
    };

    const validation = reservationRequestSchema.safeParse(payload);
    if (!validation.success) {
      const nextErrors: FieldErrors = {};
      validation.error.issues.forEach((issue) => {
        const field = issue.path?.[0] as keyof ReservationRequest | undefined;
        if (field) {
          nextErrors[field] = issue.message;
        }
      });
      setFieldErrors(nextErrors);
      return;
    }

    submitPayload(payload);
  };

  const handleRetry = () => {
    if (pendingPayload) {
      setShowNetworkModal(false);
      submitPayload(pendingPayload);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {Object.keys(fieldErrors).length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 font-semibold">Please correct the following errors:</p>
          <ul className="list-disc list-inside text-red-700 text-sm mt-1">
            {Object.values(fieldErrors).map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4">
        <label className="block space-y-2">
          <span className="text-lg font-medium">Name</span>
          <input
            className="h-12 w-full rounded-md border border-slate-300 px-4 text-lg"
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
            placeholder="Guest name"
            autoComplete="off"
          />
          {fieldErrors.clientName ? (
            <span className="text-red-600 text-sm">{fieldErrors.clientName}</span>
          ) : null}
        </label>

        <PhoneInput
          label="Phone"
          value={clientPhone}
          onChange={setClientPhone}
          error={fieldErrors.clientPhone}
        />

        <label className="block space-y-2">
          <span className="text-lg font-medium">Email (optional)</span>
          <input
            type="email"
            className="h-12 w-full rounded-md border border-slate-300 px-4 text-lg"
            value={clientEmail}
            onChange={(event) => setClientEmail(event.target.value)}
            placeholder="name@example.com"
            autoComplete="off"
          />
          {fieldErrors.clientEmail ? (
            <p className="text-red-600 text-sm mt-1">{fieldErrors.clientEmail}</p>
          ) : null}
        </label>

        <div className="space-y-2">
          <span className="text-lg font-medium">Party Size</span>
          <PartySizeStepper value={partySize} onChange={setPartySize} />
          {fieldErrors.partySize ? (
            <span className="text-red-600 text-sm">{fieldErrors.partySize}</span>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="space-y-2">
            <span className="text-lg font-medium">Date of Reservation</span>
            <CalendarSelector
              selectedDay={selectedDay}
              onSelectDay={(day) => {
                setSelectedDay(day.startOf("day"));
                const now = getRestaurantNow();
                const noon = day.hour(12).minute(0).second(0).millisecond(0);
                const fromTime = noon.isAfter(now) ? noon : now;
                const next = getNextStartSlot(fromTime);
                setSelectedSlot(next);
              }}
            />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-medium">Time</span>
            <span className="text-sm text-slate-500">{selectedSlot.format("ddd MMM D")}</span>
          </div>
          <TimeSlotGrid
            slots={pagedSlots}
            selected={selectedSlot}
            onSelect={setSelectedSlot}
            columns={4} // We can keep 4 or increase to 6 if space allows, but let's stick to 4 for now and see the height reduction
          />
          <div className="flex gap-3">
            <button
              type="button"
              className="h-12 flex-1 rounded-md border border-slate-300 bg-white text-lg"
              onClick={() => setSlotPage((p) => Math.max(0, p - 1))}
              disabled={!canPrevSlots}
            >
              Earlier
            </button>
            <button
              type="button"
              className="h-12 flex-1 rounded-md border border-slate-300 bg-white text-lg"
              onClick={() => setSlotPage((p) => p + 1)}
              disabled={!canNextSlots}
            >
              Later
            </button>
          </div>
          {fieldErrors.startTime ? (
            <span className="text-red-600 text-sm">{fieldErrors.startTime}</span>
          ) : null}


          {layoutData && partySize <= 10 && (
            <div className="space-y-2 pt-2">
              <span className="text-lg font-medium">Select a Table (Optional)</span>
              <FloorMap
                layout={layoutData}
                unavailableTableIds={availabilityData?.unavailableTableIds}
                selectedTableIds={selectedTableIds}
                partySize={partySize}
                onSelectTable={(id) => {
                  const table = layoutData.tables.find(t => t.id === id);
                  if (!table) return;

                  // 1. Identification
                  const isCircular = table.type === "CIRCULAR";
                  const isLarge = table.type === "MERGED_FIXED" || table.maxCapacity >= 8;
                  const isOverflow = table.id === "T15";

                  // 2. Strict Rules

                  // Rule A: Circular Tables (T4, T6) -> Party 5-7 only
                  if (isCircular) {
                    if (partySize < 5) {
                      setFormError("Circular tables are reserved for parties of 5 or more.");
                      return;
                    }
                    if (partySize > 7) {
                      // Though max capacity check handles this, this helps guide behavior if capacity was somehow higher
                      // But sticking to capacity check below is cleaner.
                    }
                  }

                  // Rule B: Large Tables (T9, T11, T13) -> Conform to Min Capacity
                  if (isLarge) {
                    if (partySize < table.minCapacity) {
                      setFormError(`Table ${id} requires a minimum of ${table.minCapacity} guests.`);
                      return;
                    }
                  }

                  // Rule C: Standard Tables -> Preference for Circular if party is 5-7
                  let hasPreferenceWarning = false;
                  if (!isCircular && partySize >= 5 && partySize <= 7) {
                    const anyCircularAvailable = layoutData.tables.some(t =>
                      t.type === "CIRCULAR" && !availabilityData?.unavailableTableIds.includes(t.id)
                    );
                    if (anyCircularAvailable) {
                      setFormError("Parties of 5-7 are preferred at our circular tables.");
                      hasPreferenceWarning = true;
                    }
                  }

                  // Capacity check (Global)
                  if (partySize > table.maxCapacity && !isOverflow) {
                    setFormError(`Table ${id} only seats up to ${table.maxCapacity} people.`);
                    return;
                  }

                  // Special check for T15 if we want to enforce max cap even if overflow?
                  // T15 is max 20, so simple capacity check works fine.
                  if (isOverflow && partySize > table.maxCapacity) {
                    setFormError(`Overflow table only seats up to ${table.maxCapacity} people.`);
                    return;
                  }

                  if (!hasPreferenceWarning) {
                    setFormError(null);
                  }

                  setSelectedTableIds((prev) =>
                    prev.includes(id)
                      ? prev.filter((t) => t !== id)
                      : [...prev, id]
                  );
                }}
              />
              {selectedTableIds.length > 0 && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <h3 className="text-sm font-semibold text-blue-900 mb-1">Selected Tables:</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    {selectedTableIds.map((id) => {
                      const t = layoutData.tables.find((table) => table.id === id);
                      if (!t) return null;
                      return (
                        <li key={id} className="flex items-center gap-2">
                          <span className="font-bold">Table {id}:</span>
                          {id !== "T15" && (
                            <span>
                              Capacity {t.minCapacity}-{t.maxCapacity} people
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <label className="block space-y-2">
          <span className="text-lg font-medium">Special Requests (optional)</span>
          <textarea
            className="w-full rounded-md border border-slate-300 px-4 py-3 text-lg min-h-[96px]"
            value={specialRequests}
            onChange={(event) => setSpecialRequests(event.target.value)}
            placeholder="Allergies, seating preferences, etc."
            autoComplete="off"
          />
          <p className="text-xs text-slate-500">
            Not sent to the reservation system yet.
          </p>
        </label>
      </div>

      {formError ? <p className="text-red-600 text-sm">{formError}</p> : null}

      <button
        type="submit"
        className={clsx(
          "h-12 w-full rounded-md text-lg font-semibold",
          isPending ? "bg-slate-300 text-slate-600" : "bg-slate-900 text-white"
        )}
        disabled={isPending}
      >
        {isPending ? "Creating reservation…" : "Create reservation"}
      </button>

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
                onClick={handleRetry}
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
    </form>
  );
}
