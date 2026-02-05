import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAdminReservations, cancelReservation, createReservation, resetReservations } from "../../api/admin.api";
import type { ReservationAdmin } from "../../api/admin.api";
import dayjs from "dayjs";
import { parseInRestaurantTime, toUtcIso, toRestaurantTime, getRestaurantNow } from "../../utils/time";


import { Search as SearchIcon, Phone, Users, CalendarDays, Printer, Trash2, TriangleAlert } from "lucide-react";
import { clsx } from "clsx";
import { Link } from "react-router-dom";

export default function ReservationsList() {
    const queryClient = useQueryClient();
    const [filterStatus, setFilterStatus] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [filterDate, setFilterDate] = useState(getRestaurantNow().format("YYYY-MM-DD"));

    const [viewMode, setViewMode] = useState<'day' | 'upcoming'>('day');

    // Reset modal state
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);

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
        date: getRestaurantNow().format("YYYY-MM-DD"),

        time: "19:00",
        internalNotes: ""
    });

    const resetMutation = useMutation({
        mutationFn: () => resetReservations(),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["admin_reservations"] });
            setIsResetModalOpen(false);
            alert(data.message);
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => createReservation({
            clientName: data.clientName,
            clientPhone: data.clientPhone,
            partySize: data.partySize,
            startTime: toUtcIso(parseInRestaurantTime(data.date, data.time)),
            internalNotes: data.internalNotes
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin_reservations"] });
            setIsCreateModalOpen(false);
            setCreateForm({
                clientName: "",
                clientPhone: "",
                partySize: 2,
                date: getRestaurantNow().format("YYYY-MM-DD"),

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
            let statusParam = filterStatus;

            // If in upcoming mode and no specific status filter is selected, show both active statuses
            if (viewMode === 'upcoming' && !statusParam) {
                statusParam = "CONFIRMED,PENDING_DEPOSIT";
            }

            if (viewMode === 'upcoming') {
                return fetchAdminReservations({
                    status: statusParam,
                    from: new Date().toISOString(),
                    // fetch future events (default limit applies)
                });
            }
            const d = parseInRestaurantTime(filterDate, "00:00");
            const startOfDay = d.startOf('day').toISOString();
            const endOfDay = d.endOf('day').toISOString();
            return fetchAdminReservations({
                status: statusParam,
                from: startOfDay,
                to: endOfDay
            });
        },
        refetchInterval: 15000,
        enabled: viewMode === 'upcoming' || (!!filterDate && dayjs(filterDate).isValid())
    });

    const filtered = (reservations || []).filter((r: ReservationAdmin) =>
        r.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.clientPhone.includes(searchTerm) ||
        r.shortId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
            <style>
                {`
                @media print {
                    aside, header, .no-print, button, .actions-column {
                        display: none !important;
                    }
                    main {
                        margin-left: 0 !important;
                        padding: 0 !important;
                    }
                    .bg-white {
                        box-shadow: none !important;
                        border: none !important;
                    }
                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                    }
                    th, td {
                        border-bottom: 1px solid #e2e8f0 !important;
                        padding: 12px 8px !important;
                    }
                    .print-header {
                        display: block !important;
                        margin-bottom: 24px;
                        text-align: center;
                    }
                }
                .print-header { display: none; }
                `}
            </style>

            <div className="print-header">
                <h1 className="text-2xl font-black">Daily Reservations - {dayjs(filterDate).isValid() ? parseInRestaurantTime(filterDate, "00:00").format("dddd, MMMM D, YYYY") : "Please select a valid date"}</h1>
                <p className="text-slate-500">Diba Restaurant Seating List</p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100 no-print">
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
                    <button
                        onClick={() => setIsResetModalOpen(true)}
                        className="flex-none bg-red-50 text-red-600 border border-red-100 px-4 py-3 rounded-xl font-bold hover:bg-red-100 transition-all flex items-center gap-2 shadow-sm no-print mr-2"
                        title="Reset System"
                    >
                        <Trash2 className="w-5 h-5" />
                        <span className="hidden xl:inline">Reset System</span>
                    </button>

                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => { setViewMode('day'); setFilterDate(getRestaurantNow().format("YYYY-MM-DD")); }}
                            className={clsx(
                                "px-3 py-1 text-xs font-bold rounded-lg transition-colors border",
                                viewMode === 'day' && filterDate === getRestaurantNow().format("YYYY-MM-DD")
                                    ? "text-blue-600 bg-blue-50 border-blue-200"
                                    : "text-slate-500 bg-white border-slate-200 hover:bg-slate-50"
                            )}
                        >
                            Today
                        </button>
                        <button
                            onClick={() => { setViewMode('day'); setFilterDate(getRestaurantNow().add(1, 'day').format("YYYY-MM-DD")); }}
                            className={clsx(
                                "px-3 py-1 text-xs font-bold rounded-lg transition-colors border",
                                viewMode === 'day' && filterDate === getRestaurantNow().add(1, 'day').format("YYYY-MM-DD")
                                    ? "text-blue-600 bg-blue-50 border-blue-200"
                                    : "text-slate-500 bg-white border-slate-200 hover:bg-slate-50"
                            )}
                        >
                            Tomorrow
                        </button>

                        <button
                            onClick={() => { setViewMode('upcoming'); setFilterStatus(''); }}
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
                    <button
                        onClick={() => window.print()}
                        className="flex-none bg-white text-slate-700 border border-slate-200 px-4 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm no-print"
                    >
                        <Printer className="w-5 h-5" />
                        <span className="hidden md:inline">Print List</span>
                    </button>
                    <input
                        type="date"
                        className="px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold text-slate-700 bg-white"
                        value={filterDate}
                        onChange={(e) => { setViewMode('day'); setFilterDate(e.target.value); }}
                    />
                    <select
                        className="flex-grow md:flex-grow-0 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold text-slate-700 appearance-none bg-white cursor-pointer"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="">All Statuses</option>
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="PENDING_DEPOSIT">Pending Deposit</option>
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

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative min-h-[400px]">
                {isLoading ? (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : error ? (
                    <div className="p-12 text-center text-red-600">
                        <TriangleAlert className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-bold">Failed to load reservations</p>
                        <p className="text-slate-500 text-sm">Please check your connection or try refreshing.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Guest</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Party</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Tables</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider no-print">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map((res: ReservationAdmin) => (
                                    <tr key={res.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="font-mono text-xs font-black bg-slate-100 px-2 py-1.5 rounded text-slate-700 border border-slate-200">
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
                                                <span className="font-semibold">{toRestaurantTime(res.startTime).format("MMM D, YYYY")}</span>
                                                <span className="text-slate-500">{toRestaurantTime(res.startTime).format("HH:mm")} - {toRestaurantTime(res.endTime).format("HH:mm")}</span>
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
                                                    <span key={tid} className="bg-blue-50 text-blue-800 px-3 py-1.5 rounded-lg text-[13px] font-black border border-blue-200 shadow-sm transition-transform hover:scale-105">
                                                        {tid}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <StatusBadge status={res.status} />
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium no-print">
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
                )}
            </div>

            {/* Reset Confirmation Modal */}
            {isResetModalOpen && (
                <div className="fixed inset-0 bg-red-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200 border-2 border-red-500">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                                <TriangleAlert className="w-8 h-8 text-red-600" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900">Reset Entire System?</h2>
                            <p className="text-slate-600">
                                This will <strong>permanently delete</strong> all reservations, customer data, and logs from the database. This action cannot be undone.
                            </p>
                            {/* Simplified confirmation logic */}
                            <div className="flex gap-3 w-full pt-2">
                                <button
                                    onClick={() => setIsResetModalOpen(false)}
                                    className="flex-grow py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all border border-slate-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => resetMutation.mutate()}
                                    disabled={resetMutation.isPending}
                                    className="flex-[2] bg-red-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-all animate-pulse"
                                >
                                    {resetMutation.isPending ? "Wiping Data..." : "YES, DELETE ALL"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                                        onChange={(e) => {
                                            const raw = e.target.value.replace(/\D/g, "");
                                            let formatted = raw;
                                            if (raw.length > 3 && raw.length <= 6) {
                                                formatted = `${raw.slice(0, 3)}-${raw.slice(3)}`;
                                            } else if (raw.length > 6) {
                                                formatted = `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6, 10)}`;
                                            }
                                            setCreateForm({ ...createForm, clientPhone: formatted });
                                        }}
                                        placeholder="555-0123"
                                        maxLength={12}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-2">Quick Dates</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {[
                                            { label: "Today", date: getRestaurantNow() },
                                            { label: "Tomorrow", date: getRestaurantNow().add(1, 'day') },
                                            { label: "Fri", date: getRestaurantNow().day(5).isBefore(getRestaurantNow()) ? getRestaurantNow().add(1, 'week').day(5) : getRestaurantNow().day(5) },
                                            { label: "Sat", date: getRestaurantNow().day(6).isBefore(getRestaurantNow()) ? getRestaurantNow().add(1, 'week').day(6) : getRestaurantNow().day(6) },
                                            { label: "Next Fri", date: getRestaurantNow().add(1, 'week').day(5) },
                                            { label: "Next Sat", date: getRestaurantNow().add(1, 'week').day(6) },
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
                                    {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30].map(size => (
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
                                        type="text"
                                        inputMode="numeric"
                                        className="w-20 px-2 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-center font-bold"
                                        value={createForm.partySize === 0 ? "" : createForm.partySize}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (/^\d*$/.test(val)) {
                                                setCreateForm({ ...createForm, partySize: val === "" ? 0 : parseInt(val) });
                                            }
                                        }}
                                        placeholder="Custom"
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
                                    disabled={createMutation.isPending || !createForm.clientName || !createForm.clientPhone || !createForm.partySize}
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
            "px-3 py-1.5 rounded-full text-[12px] font-black border uppercase tracking-widest shadow-sm inline-block",
            styles[status] || "bg-slate-100 text-slate-600"
        )}>
            {status.replace("_", " ")}
        </span>
    );
}
