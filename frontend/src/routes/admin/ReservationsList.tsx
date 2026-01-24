import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAdminReservations, cancelReservation, createReservation } from "../../api/admin.api";
import type { ReservationAdmin } from "../../api/admin.api";
import dayjs from "dayjs";
import { Search as SearchIcon, Phone, Users, Info, CalendarDays } from "lucide-react";
import { clsx } from "clsx";
import { Link } from "react-router-dom";

export default function ReservationsList() {
    const queryClient = useQueryClient();
    const [filterStatus, setFilterStatus] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [filterDate, setFilterDate] = useState(dayjs().format("YYYY-MM-DD"));
    const [viewMode, setViewMode] = useState<'day' | 'upcoming'>('day');

    // Cancel modal state
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [selectedResId, setSelectedResId] = useState<string | null>(null);
    const [cancelReason, setCancelReason] = useState("");

    // Create modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createForm, setCreateForm] = useState({
        clientName: "",
        clientPhone: "",
        partySize: 2,
        date: dayjs().format("YYYY-MM-DD"),
        time: "19:00",
        internalNotes: ""
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => createReservation({
            clientName: data.clientName,
            clientPhone: data.clientPhone,
            partySize: data.partySize,
            startTime: dayjs(`${data.date} ${data.time}`).toISOString(),
            internalNotes: data.internalNotes
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin_reservations"] });
            setIsCreateModalOpen(false);
            setCreateForm({
                clientName: "",
                clientPhone: "",
                partySize: 2,
                date: dayjs().format("YYYY-MM-DD"),
                time: "19:00",
                internalNotes: ""
            });
        },
    });

    const handleCreate = () => {
        createMutation.mutate(createForm);
    };

    const cancelMutation = useMutation({
        mutationFn: (id: string) => cancelReservation(id, cancelReason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin_reservations"] });
            setIsCancelModalOpen(false);
            setCancelReason("");
            setSelectedResId(null);
        },
    });

    const { data: reservations, isLoading, error } = useQuery({
        queryKey: ["admin_reservations", filterStatus, filterDate, viewMode],
        queryFn: () => {
            if (viewMode === 'upcoming') {
                return fetchAdminReservations({
                    status: filterStatus,
                    from: new Date().toISOString(),
                    // fetch future events (default limit applies)
                });
            }
            const startOfDay = dayjs(filterDate).startOf('day').toISOString();
            const endOfDay = dayjs(filterDate).endOf('day').toISOString();
            return fetchAdminReservations({
                status: filterStatus,
                from: startOfDay,
                to: endOfDay
            });
        },
        refetchInterval: 15000,
    });

    const filtered = (reservations || []).filter((r: ReservationAdmin) =>
        r.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.clientPhone.includes(searchTerm) ||
        r.shortId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) return <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;

    if (error) return <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl flex items-center gap-3">
        <Info className="w-6 h-6" />
        <p className="font-semibold">Failed to load reservations. Please check your connection.</p>
    </div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="relative w-full md:w-96">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search by name, phone or ID..."
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 items-center">
                    <div className="flex gap-1">
                        <button
                            onClick={() => { setViewMode('day'); setFilterDate(dayjs().format("YYYY-MM-DD")); }}
                            className={clsx(
                                "px-3 py-1 text-xs font-bold rounded-lg transition-colors border",
                                viewMode === 'day' && filterDate === dayjs().format("YYYY-MM-DD")
                                    ? "text-blue-600 bg-blue-50 border-blue-200"
                                    : "text-slate-500 bg-white border-slate-200 hover:bg-slate-50"
                            )}
                        >
                            Today
                        </button>
                        <button
                            onClick={() => { setViewMode('day'); setFilterDate(dayjs().add(1, 'day').format("YYYY-MM-DD")); }}
                            className={clsx(
                                "px-3 py-1 text-xs font-bold rounded-lg transition-colors border",
                                viewMode === 'day' && filterDate === dayjs().add(1, 'day').format("YYYY-MM-DD")
                                    ? "text-blue-600 bg-blue-50 border-blue-200"
                                    : "text-slate-500 bg-white border-slate-200 hover:bg-slate-50"
                            )}
                        >
                            Tomorrow
                        </button>
                        <button
                            onClick={() => { setViewMode('upcoming'); setFilterStatus('CONFIRMED'); }}
                            className={clsx(
                                "px-3 py-1 text-xs font-bold rounded-lg transition-colors border",
                                viewMode === 'upcoming'
                                    ? "text-purple-600 bg-purple-50 border-purple-200"
                                    : "text-slate-500 bg-white border-slate-200 hover:bg-slate-50"
                            )}
                        >
                            Upcoming
                        </button>
                    </div>
                    <input
                        type="date"
                        className={clsx(
                            "px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold text-slate-700 bg-white",
                            viewMode === 'upcoming' && "opacity-50"
                        )}
                        value={viewMode === 'day' ? filterDate : ""}
                        disabled={viewMode === 'upcoming'}
                        onChange={(e) => { setViewMode('day'); setFilterDate(e.target.value); }}
                    />
                    <select
                        className={clsx(
                            "flex-grow md:flex-grow-0 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold text-slate-700 appearance-none bg-white cursor-pointer",
                            viewMode === 'upcoming' && "opacity-70 bg-slate-100 cursor-not-allowed"
                        )}
                        value={filterStatus}
                        disabled={viewMode === 'upcoming'}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="">All Statuses</option>
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="CHECKED_IN">Checked In</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex-none bg-blue-600 text-white px-4 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
                    >
                        <Users className="w-5 h-5" />
                        <span className="hidden md:inline">New Booking</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Guest</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Party</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[120px]">Tables</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map((res: ReservationAdmin) => (
                                <tr key={res.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-600">
                                            #{res.shortId}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900">{res.clientName}</span>
                                            <div className="flex items-center gap-3 text-slate-500 text-xs mt-1">
                                                <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {res.clientPhone}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                                        <div className="flex flex-col">
                                            <span className="font-semibold">{dayjs(res.startTime).format("MMM D, YYYY")}</span>
                                            <span className="text-slate-500">{dayjs(res.startTime).format("HH:mm")} - {dayjs(res.endTime).format("HH:mm")}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                            <Users className="w-4 h-4 text-slate-400" />
                                            {res.partySize}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex flex-wrap gap-1.5 min-w-[120px] max-w-[200px]">
                                            {res.tableIds.map((tid: string) => (
                                                <span key={tid} className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-[11px] font-bold border border-blue-100 shadow-sm">
                                                    {tid}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <StatusBadge status={res.status} />
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                                        <div className="flex gap-2">
                                            {["CONFIRMED", "PENDING_DEPOSIT"].includes(res.status) && (
                                                <button
                                                    onClick={() => { setSelectedResId(res.id); setIsCancelModalOpen(true); }}
                                                    className="text-red-600 hover:text-red-900 font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                            <Link
                                                to={`/admin/reservations/${res.id}`}
                                                className="text-blue-600 hover:text-blue-900 font-bold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100"
                                            >
                                                Details
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <CalendarDays className="w-12 h-12 opacity-20" />
                                            <p className="text-lg font-medium">No reservations found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Cancel Modal */}
            {isCancelModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-black text-slate-900 mb-6 text-red-600">Cancel Reservation</h2>
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-2">Reason</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-red-500 transition-all font-medium text-slate-700 bg-slate-50"
                                    placeholder="e.g. Customer request, No show..."
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setIsCancelModalOpen(false); setCancelReason(""); setSelectedResId(null); }}
                                    className="flex-grow py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all border border-slate-100"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => selectedResId && cancelMutation.mutate(selectedResId)}
                                    disabled={!cancelReason || cancelMutation.isPending}
                                    className="flex-[2] bg-red-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-all disabled:opacity-50"
                                >
                                    {cancelMutation.isPending ? "Cancelling..." : "Confirm Cancel"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Reservation Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-black text-slate-900 mb-6">New Reservation</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-2">Guest Name</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-700 bg-slate-50"
                                        value={createForm.clientName}
                                        onChange={(e) => setCreateForm({ ...createForm, clientName: e.target.value })}
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-2">Phone</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-700 bg-slate-50"
                                        value={createForm.clientPhone}
                                        onChange={(e) => setCreateForm({ ...createForm, clientPhone: e.target.value })}
                                        placeholder="555-0123"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-2">Quick Dates</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {[
                                            { label: "Today", date: dayjs() },
                                            { label: "Tomorrow", date: dayjs().add(1, 'day') },
                                            { label: "Fri", date: dayjs().day(5).isBefore(dayjs()) ? dayjs().add(1, 'week').day(5) : dayjs().day(5) },
                                            { label: "Sat", date: dayjs().day(6).isBefore(dayjs()) ? dayjs().add(1, 'week').day(6) : dayjs().day(6) },
                                            { label: "Next Fri", date: dayjs().add(1, 'week').day(5) },
                                            { label: "Next Sat", date: dayjs().add(1, 'week').day(6) },
                                        ].map((item, idx) => {
                                            // Deduplicate: Don't show "Fri" if it's the same as "Today" or "Tomorrow"
                                            if (idx > 1 && (item.date.isSame(dayjs(), 'day') || item.date.isSame(dayjs().add(1, 'day'), 'day'))) return null;

                                            const isSelected = createForm.date === item.date.format("YYYY-MM-DD");
                                            return (
                                                <button
                                                    key={item.label + idx}
                                                    onClick={() => setCreateForm({ ...createForm, date: item.date.format("YYYY-MM-DD") })}
                                                    className={clsx(
                                                        "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5",
                                                        isSelected
                                                            ? "bg-blue-600 text-white border-blue-600"
                                                            : "bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                                                    )}
                                                >
                                                    <span>{item.label}</span>
                                                    <span className={clsx("opacity-75 font-medium", isSelected ? "text-blue-100" : "text-slate-400")}>
                                                        {item.date.format("MMM D")}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-2">Date</label>
                                    <div className="relative">
                                        <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                        <input
                                            type="date"
                                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-700 bg-slate-50"
                                            value={createForm.date}
                                            onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-2">Time</label>
                                    <input
                                        type="time"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-700 bg-slate-50"
                                        value={createForm.time}
                                        onChange={(e) => setCreateForm({ ...createForm, time: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-2">Party Size</label>
                                <div className="flex gap-2 flex-wrap">
                                    {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(size => (
                                        <button
                                            key={size}
                                            onClick={() => setCreateForm({ ...createForm, partySize: size })}
                                            className={clsx(
                                                "px-3 py-2 rounded-lg text-sm font-bold border transition-all",
                                                createForm.partySize === size
                                                    ? "bg-blue-600 text-white border-blue-600"
                                                    : "bg-white text-slate-500 border-slate-200 hover:border-blue-300"
                                            )}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                    <input
                                        type="number"
                                        className="w-16 px-2 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-center font-bold"
                                        value={createForm.partySize}
                                        onChange={(e) => setCreateForm({ ...createForm, partySize: parseInt(e.target.value) || 1 })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-2">Notes</label>
                                <textarea
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-700 bg-slate-50 min-h-[100px]"
                                    placeholder="Allergies, special requests..."
                                    value={createForm.internalNotes}
                                    onChange={(e) => setCreateForm({ ...createForm, internalNotes: e.target.value })}
                                />
                            </div>

                            {createMutation.isError && (
                                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium">
                                    {(createMutation.error as any)?.body?.message || "Failed to create reservation"}
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-grow py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all border border-slate-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleCreate()}
                                    disabled={createMutation.isPending || !createForm.clientName || !createForm.clientPhone}
                                    className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
                                >
                                    {createMutation.isPending ? "Creating..." : "Create Reservation"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-100",
        CHECKED_IN: "bg-blue-50 text-blue-700 border-blue-100",
        COMPLETED: "bg-slate-100 text-slate-600 border-slate-200",
        CANCELLED: "bg-red-50 text-red-700 border-red-100",
        NO_SHOW: "bg-orange-50 text-orange-700 border-orange-100",
        PENDING_DEPOSIT: "bg-amber-50 text-amber-700 border-amber-100",
    };

    return (
        <span className={clsx(
            "px-3 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wide shadow-sm inline-block",
            styles[status] || "bg-slate-100 text-slate-600"
        )}>
            {status.replace("_", " ")}
        </span>
    );
}
