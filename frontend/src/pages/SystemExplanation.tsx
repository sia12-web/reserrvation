import ClientShell from "../app/layout/ClientShell";

export default function SystemExplanationPage() {
    return (
        <ClientShell title="How the System Works" subtitle="A guide for the owner">
            <div className="space-y-10 text-slate-700 pb-20">
                <section className="space-y-4">
                    <h2 className="text-2xl font-black text-slate-900 border-b-2 border-slate-100 pb-2">1. The Reservation Lifecycle</h2>
                    <p className="leading-relaxed">
                        The system is a <strong>real-time decision engine</strong>. Every time a slot is selected, the system simulates the entire restaurant floor to ensure no conflicts and optimal seating.
                    </p>
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-slate-400 text-[10px] uppercase tracking-widest text-left">
                                    <th className="pb-4">Party Size</th>
                                    <th className="pb-4">Duration</th>
                                    <th className="pb-4">Seating Logic</th>
                                </tr>
                            </thead>
                            <tbody className="font-medium text-slate-700 divide-y divide-slate-200/50">
                                <tr>
                                    <td className="py-3 pr-4">1 - 2 Guests</td>
                                    <td className="py-3">90 Minutes</td>
                                    <td className="py-3 italic text-slate-500">Fastest turnover, fits standard 2-tops/4-tops.</td>
                                </tr>
                                <tr>
                                    <td className="py-3 pr-4">3 - 4 Guests</td>
                                    <td className="py-3">105 Minutes</td>
                                    <td className="py-3 italic text-slate-500">Assigned to standard 4-top tables.</td>
                                </tr>
                                <tr>
                                    <td className="py-3 pr-4">5 - 7 Guests</td>
                                    <td className="py-3">120 Minutes</td>
                                    <td className="py-3 font-bold text-blue-600 underline decoration-blue-200">Priority: Circular Tables (T4, T6)</td>
                                </tr>
                                <tr>
                                    <td className="py-3 pr-4">8 - 10 Guests</td>
                                    <td className="py-3">135 Minutes</td>
                                    <td className="py-3 italic text-slate-500">Merged tables (e.g. T9+T10 or T11+T12).</td>
                                </tr>
                                <tr>
                                    <td className="py-3 pr-4">11 - 14 Guests</td>
                                    <td className="py-3">165 Minutes</td>
                                    <td className="py-3 font-bold text-amber-600 underline decoration-amber-200">Deposit Required + Large Table Combinations</td>
                                </tr>
                                <tr>
                                    <td className="py-3 pr-4">15 - 30+ Guests</td>
                                    <td className="py-3">195 Minutes</td>
                                    <td className="py-3 italic text-slate-500">"Total Floor Lock" mode. Uses the T15 overflow system.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-black text-slate-900 border-b-2 border-slate-100 pb-2">2. Visual Table Control</h2>
                    <ul className="grid gap-4 sm:grid-cols-2">
                        <li className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                            <p className="font-black text-slate-900">Green = Available</p>
                            <p className="text-sm text-slate-500">Ready to book. No overlapping reservations within the next 2.5 hours.</p>
                        </li>
                        <li className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                            <p className="font-black text-slate-900 text-amber-600">Amber = Occupied</p>
                            <p className="text-sm text-slate-500">Someone is currently seated. Admin can manually "Free Table" if they leave early.</p>
                        </li>
                        <li className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                            <p className="font-black text-slate-900 text-indigo-600">Indigo = Reserved</p>
                            <p className="text-sm text-slate-500">A reservation is starting soon. The engine "locks" this table 15 mins early.</p>
                        </li>
                        <li className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                            <p className="font-black text-slate-400">Gray = Locked</p>
                            <p className="text-sm text-slate-500">Manual lock by Admin (e.g. table is broken or reserved for VIP).</p>
                        </li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-black text-slate-900 border-b-2 border-slate-100 pb-2">3. Admin Superpowers</h2>
                    <div className="grid gap-6 md:grid-cols-3">
                        <div className="space-y-2">
                            <p className="font-bold text-blue-600">Override Engine</p>
                            <p className="text-sm leading-relaxed text-slate-600">As Admin, you can ignore all rules. Move a party of 1 to a table for 10, or force-book a table even if it's "locked".</p>
                        </div>
                        <div className="space-y-2">
                            <p className="font-bold text-blue-600">Instant Cleanup</p>
                            <p className="text-sm leading-relaxed text-slate-600">One-click to "Check-In" guests or "Free" a table. This updates the public kiosk immediately.</p>
                        </div>
                        <div className="space-y-2">
                            <p className="font-bold text-blue-600">Sheet Printing</p>
                            <p className="text-sm leading-relaxed text-slate-600">Export your daily reservations to a clean, printable sheet for your staff at the host stand.</p>
                        </div>
                    </div>
                </section>

                <div className="bg-slate-900 rounded-[2rem] p-8 text-white text-center space-y-4 shadow-2xl">
                    <p className="text-xl font-black">Ready to take control?</p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <a href="/admin/reservations" className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-xl font-black transition-all">Go to Admin Dashboard</a>
                        <a href="/kiosk/new" className="bg-white text-slate-900 hover:bg-slate-100 px-8 py-4 rounded-xl font-black transition-all">Start Kiosk Demo</a>
                    </div>
                </div>
            </div>
        </ClientShell>
    );
}
