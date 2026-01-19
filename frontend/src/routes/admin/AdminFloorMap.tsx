import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchFloorState, freeTable, createWalkin } from "../../api/admin.api";
import FloorMap from "../../components/reservation/FloorMap";
import { UserPlus, Power, Info, AlertCircle, CheckCircle2, Loader2, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import dayjs from "dayjs";
import { clsx } from "clsx";

export default function AdminFloorMap() {
    const queryClient = useQueryClient();
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isWalkinModalOpen, setIsWalkinModalOpen] = useState(false);
    const [isFreeModalOpen, setIsFreeModalOpen] = useState(false);
    const [reason, setReason] = useState("");
    const [partySize, setPartySize] = useState(2);

    const { data: floor, isLoading } = useQuery({
        queryKey: ["admin_floor_state", selectedDate],
        queryFn: () => fetchFloorState(selectedDate),
        refetchInterval: 5000,
    });

    const isToday = selectedDate === new Date().toISOString().split('T')[0];

    // Helper to change date by offset
    const changeDate = (offset: number) => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + offset);
        setSelectedDate(date.toISOString().split('T')[0]);
    };



    const quickDates = [
        { label: "Tomorrow", date: dayjs().add(1, 'day') },
        { label: "Fri", date: dayjs().day(5).isBefore(dayjs(), 'day') ? dayjs().add(1, 'week').day(5) : dayjs().day(5) },
        { label: "Sat", date: dayjs().day(6).isBefore(dayjs(), 'day') ? dayjs().add(1, 'week').day(6) : dayjs().day(6) },
        { label: "Sun", date: dayjs().day(0).isBefore(dayjs(), 'day') ? dayjs().add(1, 'week').day(0) : dayjs().day(0) },
    ];

    const freeMutation = useMutation({
        mutationFn: (tid: string) => freeTable(tid, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin_floor_state"] });
            setIsFreeModalOpen(false);
            setSelectedTableId(null);
            setReason("");
        },
    });

    const walkinMutation = useMutation({
        mutationFn: (data: any) => createWalkin(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin_floor_state"] });
            setIsWalkinModalOpen(false);
            setPartySize(2);
        },
    });

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <p className="text-slate-500 font-medium animate-pulse">Loading floor state...</p>
        </div>
    );

    const selectedTable = floor?.tables.find(t => t.id === selectedTableId);

    // "OCCUPIED" means currently seated guest (checked_in or confirmed during current time)
    const isOccupied = selectedTable?.status === "OCCUPIED";

    // Find the currently active reservation if occupied
    const activeReservation = selectedTable?.reservations.find(r =>
        new Date(r.startTime) <= new Date() && new Date(r.endTime) >= new Date() &&
        ['CONFIRMED', 'CHECKED_IN'].includes(r.status)
    );

    const handleTableSelect = (id: string) => {
        if (selectedTableId === id) {
            setSelectedTableId(null);
        } else {
            setSelectedTableId(id);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col xl:flex-row gap-8">
                {/* Map Section */}
                <div className="flex-grow bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col min-h-[600px] relative overflow-hidden">

                    {/* Date Toolbar */}
                    <div className="flex flex-col gap-4 mb-6 z-10 relative">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                                <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white hover:shadow rounded-lg transition-all text-slate-500">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="bg-transparent border-none outline-none font-bold text-slate-700 text-sm w-32 text-center cursor-pointer"
                                />
                                <button onClick={() => changeDate(1)} className="p-2 hover:bg-white hover:shadow rounded-lg transition-all text-slate-500">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex items-center gap-3">
                                {!isToday && (
                                    <button
                                        onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                                        className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
                                    >
                                        Jump to Today
                                    </button>
                                )}
                                <div className={clsx(
                                    "flex items-center gap-2 px-4 py-2 rounded-full border border-blue-100 transition-all",
                                    isToday ? "bg-blue-50 text-blue-800" : "bg-purple-50 text-purple-800 border-purple-100"
                                )}>
                                    {isToday ? <CheckCircle2 className="w-4 h-4" /> : <CalendarDays className="w-4 h-4" />}
                                    <span className="text-sm font-bold">{isToday ? "Live View" : "Historical/Future View"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Dates */}
                        <div className="flex gap-2 pb-2 overflow-x-auto">
                            {quickDates.map((item, idx) => {
                                // Deduplicate if "Friday" is the same as "Tomorrow"
                                if (idx > 0 && (item.date.isSame(dayjs().add(1, 'day'), 'day'))) return null;

                                const dateStr = item.date.format("YYYY-MM-DD");
                                const isSelected = selectedDate === dateStr;

                                return (
                                    <button
                                        key={item.label}
                                        onClick={() => setSelectedDate(dateStr)}
                                        className={clsx(
                                            "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all whitespace-nowrap",
                                            isSelected
                                                ? "bg-slate-800 text-white border-slate-800"
                                                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700"
                                        )}
                                    >
                                        {item.label} <span className="font-normal opacity-70 ml-1">{item.date.format("MMM D")}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {floor && (
                        <div className="flex-grow flex items-center justify-center">
                            <FloorMap
                                layout={{ layoutId: floor.layoutId, tables: floor.tables as any, name: "Floor View" }}
                                selectedTableIds={selectedTableId ? [selectedTableId] : []}
                                unavailableTableIds={[]}
                                onSelectTable={handleTableSelect}
                            />
                        </div>
                    )}
                </div>

                {/* Info/Action Sidebar */}
                <div className="xl:w-96 space-y-6">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <Info className="w-5 h-5 text-blue-500" />
                            Table Details
                        </h3>

                        {selectedTable ? (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Table Name</p>
                                        <p className="text-3xl font-black text-slate-900">{selectedTable.id}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Capacity</p>
                                        <p className="text-xl font-bold text-slate-700">{selectedTable.minCapacity}-{selectedTable.maxCapacity} Seats</p>
                                    </div>
                                </div>

                                <div className={clsx(
                                    "p-4 rounded-2xl border flex flex-col gap-1",
                                    isOccupied ? "bg-amber-50 border-amber-100 text-amber-900" :
                                        selectedTable.status === "RESERVED" ? "bg-purple-50 border-purple-100 text-purple-900" :
                                            "bg-emerald-50 border-emerald-100 text-emerald-900"
                                )}>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Live Status</p>
                                    <p className="text-lg font-black uppercase text-nowrap truncate">{selectedTable.status}</p>

                                    {isOccupied && activeReservation && (
                                        <div className="mt-2 space-y-1 py-2 border-t border-amber-200/50">
                                            <p className="text-sm font-bold truncate">{activeReservation.clientName}</p>
                                            <p className="text-xs font-mono bg-amber-100 px-2 py-0.5 rounded inline-block">#{activeReservation.shortId}</p>
                                            <p className="text-xs opacity-75">Party of {activeReservation.partySize}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Schedule List */}
                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Today's Schedule</p>
                                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                                        {selectedTable.reservations.length === 0 ? (
                                            <p className="text-sm text-slate-400 italic py-2">No bookings for today.</p>
                                        ) : (
                                            selectedTable.reservations.map(res => {
                                                const start = new Date(res.startTime);
                                                const end = new Date(res.endTime);
                                                const isPast = end < new Date();
                                                const isCurrent = start <= new Date() && end >= new Date();

                                                return (
                                                    <div key={res.id} className={clsx(
                                                        "p-3 rounded-xl border text-sm transition-all",
                                                        isCurrent ? "bg-blue-50 border-blue-200 shadow-sm" :
                                                            isPast ? "bg-slate-50 border-slate-100 opacity-60 grayscale" :
                                                                "bg-white border-slate-200"
                                                    )}>
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="font-bold text-slate-700 truncate max-w-[120px]">{res.clientName}</span>
                                                            <span className="text-xs font-mono text-slate-400">#{res.shortId}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs text-slate-500">
                                                            <span>{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            <span className={clsx(
                                                                "px-1.5 py-0.5 rounded font-bold text-[10px]",
                                                                res.status === 'CONFIRMED' ? "bg-emerald-100 text-emerald-700" :
                                                                    res.status === 'CHECKED_IN' ? "bg-blue-100 text-blue-700" :
                                                                        "bg-slate-100 text-slate-600"
                                                            )}>{res.status}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                <div className="grid gap-3 pt-2">
                                    {isOccupied ? (
                                        <button
                                            onClick={() => setIsFreeModalOpen(true)}
                                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-red-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <Power className="w-5 h-5" />
                                            Free Table Now
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setIsWalkinModalOpen(true)}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <UserPlus className="w-5 h-5" />
                                            Add Walk-in
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="py-12 text-center space-y-3 opacity-40">
                                <AlertCircle className="w-12 h-12 mx-auto" />
                                <p className="font-bold">Select a table to see details</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Walk-in Modal */}
            {isWalkinModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                            <UserPlus className="w-8 h-8 text-blue-600" />
                            Add Walk-in
                        </h2>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Party Size</label>
                                <div className="flex gap-4">
                                    {[2, 4, 6, 8].map(size => (
                                        <button
                                            key={size}
                                            onClick={() => setPartySize(size)}
                                            className={clsx(
                                                "flex-grow py-4 rounded-xl font-black text-xl border-2 transition-all",
                                                partySize === size
                                                    ? "bg-blue-600 border-blue-600 text-white shadow-lg scale-105"
                                                    : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200"
                                            )}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsWalkinModalOpen(false)}
                                    className="flex-grow py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all border border-slate-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => walkinMutation.mutate({ partySize, tableIds: selectedTableId ? [selectedTableId] : undefined })}
                                    disabled={walkinMutation.isPending}
                                    className="flex-[2] bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                                >
                                    {walkinMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm & Seat"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Free Table Modal */}
            {isFreeModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                            <Power className="w-8 h-8 text-red-600" />
                            Free Table {selectedTableId}
                        </h2>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Reason für Freigabe</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Guest left early..."
                                    className="w-full px-4 py-4 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsFreeModalOpen(false)}
                                    className="flex-grow py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all border border-slate-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => selectedTableId && freeMutation.mutate(selectedTableId)}
                                    disabled={!reason || freeMutation.isPending}
                                    className="flex-[2] bg-red-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {freeMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Free Now"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
