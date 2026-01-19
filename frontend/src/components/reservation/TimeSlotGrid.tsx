import { Dayjs } from "dayjs";
import { formatTime } from "../../utils/time";
import clsx from "clsx";

type TimeSlotGridProps = {
  slots: Dayjs[];
  selected: Dayjs | null;
  onSelect: (slot: Dayjs) => void;
  columns?: 3 | 4;
};

export default function TimeSlotGrid({
  slots,
  selected,
  onSelect,
  columns = 3,
}: TimeSlotGridProps) {
  const gridColsClass = columns === 4 ? "grid-cols-4" : "grid-cols-3";

  return (
    <div className={clsx("grid gap-3", gridColsClass)}>
      {slots.map((slot) => {
        const isSelected = selected?.valueOf() === slot.valueOf();
        return (
          <button
            key={slot.toISOString()}
            type="button"
            className={clsx(
              "h-10 rounded-md border text-base font-medium",
              isSelected
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white border-slate-300"
            )}
            onClick={() => onSelect(slot)}
          >
            {formatTime(slot)}
          </button>
        );
      })}
    </div>
  );
}
