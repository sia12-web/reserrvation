import { useState, useMemo } from "react";
import { UserPlus, Clock, Users, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { clsx } from "clsx";
import dayjs from "dayjs";
import { FloorState } from "../../api/admin.api";
import { toRestaurantTime, getRestaurantNow } from "../../utils/time";

type Table = FloorState['tables'][0];

interface SmartWalkinModalProps {
    isOpen: boolean;
    onClose: () => void;
    tables: Table[];
    onConfirm: (tableId: string, partySize: number) => void;
}

export default function SmartWalkinModal({ isOpen, onClose, tables, onConfirm }: SmartWalkinModalProps) {
    const [partySize, setPartySize] = useState(2);
    const [durationValues, setDurationValues] = useState([60, 90, 120]);
    const [duration, setDuration] = useState(90);

    const recommendations = useMemo(() => {
        if (!isOpen) return [];
        const now = getRestaurantNow();

        // 1. Filter Candidates
        const candidates = tables.filter(t => {
            // Must be strictly AVAILABLE (not occupied/reserved right now)
            if (t.status !== "AVAILABLE") return false;

            // Capacity Check (T15 is infinite)
            if (t.id === "T15") return true;
            return t.minCapacity <= partySize && t.maxCapacity >= partySize;
        });

        // 2. Score Candidates
        const scored = candidates.map(t => {
            let score = 100;
            const reasons: { text: string; type: 'good' | 'bad' | 'neutral' }[] = [];

            // A. Capacity Fit
            if (t.id === "T15") {
                // T15 is our "Overflow/Infinite" table.
                // If normal tables fit, prefer them (penalize T15).
                // If it's a huge group (e.g. 50), T15 is the ONLY choice, so it wins by default.
                // If it's small group (2), huge waste -> penalty.
                score -= 40;
                reasons.push({ text: "Overflow Table", type: 'neutral' });
            } else {
                const waste = t.maxCapacity - partySize;
                score -= waste * 5; // -5 pts per wasted seat
                if (waste === 0) {
                    score += 15;
                    reasons.push({ text: "Perfect Size Match", type: 'good' });
                } else if (waste <= 2) {
                    reasons.push({ text: "Good Size Match", type: 'good' });
                }
            }

            // B. Schedule / Time Gap
            // Find next reservation today
            // Note: `t.reservations` is already sorted by date usually, but let's be safe
            // Filter only future reservations locally
            // `t.reservations` contains all reservations for selected date.
            // We assume selected date is TODAY for walk-ins.
            // If selectedDate != Today, walk-in logic is weird, but we use `now` anyway.

            const nextRes = t.reservations
                .map(r => ({ ...r, start: toRestaurantTime(r.startTime) }))
                .filter(r => r.start.isAfter(now))
                .sort((a, b) => a.start.diff(b.start))[0];

            if (nextRes) {
                const minutesUntil = nextRes.start.diff(now, 'minute');

                if (minutesUntil < duration) {
                    score = -9999; // DISQUALIFIED
                    reasons.push({ text: `Conflict in ${minutesUntil}m (Need ${duration}m)`, type: 'bad' });
                } else if (minutesUntil < duration + 15) {
                    score -= 30; // Very tight
                    reasons.push({ text: `Tight Gap: ${minutesUntil}m free`, type: 'bad' });
                } else if (minutesUntil < duration + 45) {
                    score += 0; // Neutral
                    reasons.push({ text: `${minutesUntil}m free`, type: 'neutral' });
                } else {
                    score += 10; // Plenty of time
                    reasons.push({ text: `${minutesUntil}m free`, type: 'good' });
                }
            } else {
                score += 20; // Wide open
                reasons.push({ text: "Free rest of day", type: 'good' });
            }

            return { table: t, score, reasons, nextRes };
        });

        // 3. Sort
        return scored.filter(s => s.score > -9000).sort((a, b) => b.score - a.score);

    }, [isOpen, tables, partySize, duration]); // recalculate when inputs change

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-8 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                            <Clock className="w-8 h-8 text-indigo-600" />
                            Smart Walk-in
                        </h2>
                        <p className="text-slate-500 font-medium mt-1">
                            Find the best table based on fit & schedule.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        {/* Simple Close Icon */}
                        <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
                    <div className="space-y-3">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Users className="w-4 h-4" /> Party Size
                        </label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5, 6, 8].map(size => (
                                <button
                                    key={size}
                                    onClick={() => setPartySize(size)}
                                    className={clsx(
                                        "w-10 h-10 rounded-lg font-black text-sm transition-all border-2",
                                        partySize === size
                                            ? "bg-indigo-600 border-indigo-600 text-white shadow-md scale-110"
                                            : "bg-white border-slate-200 text-slate-400 hover:border-indigo-200"
                                    )}
                                >
                                    {size}
                                </button>
                            ))}
                            {/* Manual input if needed, but 1-8 covers most walk-ins. User specified inputs. */}
                            <input
                                type="number"
                                value={partySize}
                                onChange={e => setPartySize(parseInt(e.target.value) || 0)}
                                className="w-16 h-10 rounded-lg border-2 border-slate-200 px-2 font-bold text-center focus:border-indigo-600 outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Est. Duration
                        </label>
                        <div className="flex gap-2">
                            {durationValues.map(mins => (
                                <button
                                    key={mins}
                                    onClick={() => setDuration(mins)}
                                    className={clsx(
                                        "px-4 h-10 rounded-lg font-bold text-sm transition-all border-2",
                                        duration === mins
                                            ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
                                            : "bg-white border-slate-200 text-slate-400 hover:border-indigo-200"
                                    )}
                                >
                                    {mins}m
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recommendations List */}
                <div className="flex-grow overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2">Recommended Tables</h3>

                    {recommendations.length > 0 ? (
                        recommendations.map(({ table, score, reasons, nextRes }, idx) => (
                            <div
                                key={table.id}
                                className={clsx(
                                    "flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer group",
                                    idx === 0 ? "border-indigo-100 bg-indigo-50/50 hover:border-indigo-300" : "border-slate-100 bg-white hover:border-slate-200"
                                )}
                                onClick={() => onConfirm(table.id, partySize)}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Rank Badge */}
                                    <div className={clsx(
                                        "w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-sm",
                                        idx === 0 ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"
                                    )}>
                                        #{idx + 1}
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl font-black text-slate-900">{table.id}</span>
                                            <span className="text-xs font-bold text-slate-400">({table.minCapacity}-{table.maxCapacity === 999 ? '∞' : table.maxCapacity} ppl)</span>
                                            {/* Top Pick Badge */}
                                            {idx === 0 && (
                                                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                                                    Best Match
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {reasons.map((r, i) => (
                                                <span key={i} className={clsx(
                                                    "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                                                    r.type === 'good' ? "bg-emerald-100 text-emerald-700" :
                                                        r.type === 'bad' ? "bg-red-100 text-red-700" :
                                                            "bg-slate-100 text-slate-500"
                                                )}>
                                                    {r.text}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    className={clsx(
                                        "text-sm font-bold bg-white border-2 px-4 py-2 rounded-lg transition-all flex items-center gap-2",
                                        idx === 0
                                            ? "border-indigo-600 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white"
                                            : "border-slate-200 text-slate-400 group-hover:border-slate-300 group-hover:text-slate-600"
                                    )}
                                >
                                    Seat
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                            <p className="font-bold text-slate-900">No safe tables found</p>
                            <p className="text-sm text-slate-500">All tables are full or reserved within {duration} mins.</p>
                            <p className="text-sm text-slate-500 mt-2">Try T15 (Overflow) explicitly?</p>
                        </div>
                    )}
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end">
                    <button onClick={onClose} className="px-6 py-3 font-bold text-slate-500 hover:text-slate-800 transition-colors">
                        Cancel Logic
                    </button>
                </div>
            </div>
        </div>
    );
}
