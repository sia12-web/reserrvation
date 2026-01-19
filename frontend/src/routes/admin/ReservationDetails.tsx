import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAdminReservation, reassignTables, fetchFloorState } from "../../api/admin.api";
import { ChevronLeft, Table as TableIcon, Users, Clock, Phone, Mail, Hash, AlertCircle, Loader2, CalendarDays, X, User, Info } from "lucide-react";
import dayjs from "dayjs";
import { clsx } from "clsx";

export default function ReservationDetails() {
    const { id } = useParams();
    const queryClient = useQueryClient();
    const [isReassigning, setIsReassigning] = useState(false);
    const [newTableIds, setNewTableIds] = useState<string[]>([]);
    const [reason, setReason] = useState("");
    const [error, setError] = useState<string | null>(null);

    const { data: res, isLoading: isResLoading } = useQuery({
        queryKey: ["admin_reservation", id],
        queryFn: () => fetchAdminReservation(id!),
        enabled: !!id,
    });

    const { data: floor } = useQuery({
        queryKey: ["admin_floor_availability"],
        queryFn: () => fetchFloorState(),
        enabled: isReassigning,
    });

    const reassignMutation = useMutation({
        mutationFn: (data: { newTableIds: string[]; reason: string }) => reassignTables(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin_reservation", id] });
            setIsReassigning(false);
            setReason("");
            setError(null);
        },
        onError: (err: any) => {
            setError(err.message || "Failed to reassign tables");
        },
    });

    if (isResLoading || !res) return <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
    </div>;

    const handleToggleTable = (tid: string) => {
        setNewTableIds(prev => prev.includes(tid) ? prev.filter(x => x !== tid) : [...prev, tid]);
    };

    return (
        <div className="space-y-8 max-w-4xl animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <Link to="/admin/reservations" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold transition-all group">
                    <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center group-hover:bg-slate-50">
                        <ChevronLeft className="w-5 h-5" />
                    </div>
                    Back to List
                </Link>
                <div className="flex items-center gap-2">
                    <Hash className="w-5 h-5 text-slate-400" />
                    <span className="font-mono text-lg font-black bg-slate-900 text-white px-3 py-1 rounded-lg">#{res.shortId}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-8">
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                        <User className="w-6 h-6 text-blue-600" />
                        Guest Information
                    </h3>

                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                                <User className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</p>
                                <p className="font-bold text-lg">{res.clientName}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                                <Phone className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phone Number</p>
                                <p className="font-bold text-lg">{res.clientPhone}</p>
                            </div>
                        </div>

                        {res.clientEmail && (
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                                    <Mail className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</p>
                                    <p className="font-bold text-lg">{res.clientEmail}</p>
                                </div>
                            </div>
                        )}

                        {res.internalNotes && (
                            <div className="flex items-start gap-4 pt-4 border-t border-slate-100">
                                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 shrink-0">
                                    <Info className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Internal Notes</p>
                                    <p className="font-medium text-slate-700 leading-relaxed bg-yellow-50/50 p-3 rounded-xl border border-yellow-100 text-sm">
                                        {res.internalNotes}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-8">
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                        <Clock className="w-6 h-6 text-amber-500" />
                        Schedule & Seating
                    </h3>

                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                                <CalendarDays className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date & Window</p>
                                <p className="font-bold text-lg">
                                    {dayjs(res.startTime).format("MMM D, YYYY")}
                                </p>
                                <p className="text-slate-500 font-semibold italic">
                                    {dayjs(res.startTime).format("HH:mm")} - {dayjs(res.endTime).format("HH:mm")}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Party Size</p>
                                <p className="font-bold text-lg">{res.partySize} People</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                                <TableIcon className="w-6 h-6" />
                            </div>
                            <div className="flex-grow">
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned Tables</p>
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100 text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                                            {['WEB', 'KIOSK'].includes(res?.source) ? (
                                                <>
                                                    <Users className="w-3 h-3" />
                                                    <span>User Selection</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Phone className="w-3 h-3" />
                                                    <span>Admin Assignment</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setIsReassigning(true);
                                            setNewTableIds(res.tableIds);
                                        }}
                                        className="text-xs font-black text-blue-600 hover:underline"
                                    >
                                        Change
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {res.tableIds.map((tid: string) => (
                                        <span key={tid} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-black shadow-sm">
                                            {tid}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isReassigning && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl p-10 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                                <TableIcon className="w-10 h-10 text-blue-600" />
                                Reassign Tables
                            </h2>
                            <button onClick={() => setIsReassigning(false)} className="text-slate-300 hover:text-slate-600 p-2">
                                <X className="w-8 h-8" />
                            </button>
                        </div>

                        <div className="space-y-8">
                            <div className="space-y-4">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Select new tables (Party Size: {res.partySize})</p>
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                                    {floor?.tables.map((table: any) => {
                                        const isBusy = table.status !== "AVAILABLE" && !table.reservations?.some((r: any) => r.id === id);
                                        const isSelected = newTableIds.includes(table.id);
                                        return (
                                            <button
                                                key={table.id}
                                                disabled={isBusy}
                                                onClick={() => handleToggleTable(table.id)}
                                                className={clsx(
                                                    "aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border-b-4 active:border-b-0 active:translate-y-1 relative",
                                                    isSelected ? "bg-blue-600 border-blue-800 text-white" :
                                                        isBusy ? "bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed opacity-40" :
                                                            "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                                )}
                                            >
                                                <span className="text-lg font-black">{table.id}</span>
                                                <span className="text-[8px] font-bold opacity-60">MAX {table.maxCapacity}</span>
                                                {isBusy && <Clock className="w-3 h-3 absolute top-1 right-1" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Reason for manual change</p>
                                <input
                                    type="text"
                                    placeholder="e.g. VIP request, table broken..."
                                    className="w-full px-6 py-5 rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-blue-500 font-bold text-lg transition-all"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                />
                            </div>

                            {error && (
                                <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700 flex items-center gap-3 rounded-r-xl animate-in shake duration-500">
                                    <AlertCircle className="w-5 h-5" />
                                    <p className="text-sm font-bold">{error}</p>
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setIsReassigning(false)}
                                    className="flex-grow py-5 rounded-2xl font-black text-slate-500 hover:bg-slate-50 transition-all border border-slate-100 uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => reassignMutation.mutate({ newTableIds, reason })}
                                    disabled={!reason || newTableIds.length === 0 || reassignMutation.isPending}
                                    className="flex-[2] bg-blue-600 text-white py-5 rounded-2xl font-black shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2 border-b-4 border-blue-900 active:border-b-0 active:translate-y-1"
                                >
                                    {reassignMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Apply Reassignment"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
