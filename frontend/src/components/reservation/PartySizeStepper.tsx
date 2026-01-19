type PartySizeStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
};

export default function PartySizeStepper({
  value,
  onChange,
  min = 1,
  max = 50,
}: PartySizeStepperProps) {
  const decrement = () => onChange(Math.max(min, value - 1));
  const increment = () => onChange(Math.min(max, value + 1));

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        className="h-12 w-12 rounded-md bg-slate-200 text-2xl font-semibold"
        onClick={decrement}
        disabled={value <= min}
      >
        −
      </button>
      <div className="text-2xl font-semibold w-12 text-center">{value}</div>
      <button
        type="button"
        className="h-12 w-12 rounded-md bg-slate-900 text-white text-2xl font-semibold"
        onClick={increment}
        disabled={value >= max}
      >
        +
      </button>
    </div>
  );
}
