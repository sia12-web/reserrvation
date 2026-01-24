import ClientShell from "../app/layout/ClientShell";

export default function SystemExplanationPage() {
    return (
        <ClientShell title="How the System Works" subtitle="A guide for the owner">
            <div className="space-y-8 text-slate-700">
                <section className="space-y-3">
                    <h2 className="text-xl font-bold text-slate-900 border-b pb-2">1. Smart Reservation Engine</h2>
                    <p>
                        This isn't just a form; it's a <strong>smart engine</strong>. When a customer (or you) picks a time and party size, the system runs a complex algorithm to check every single table against existing reservations.
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>No Double Booking:</strong> The system strictly forbids two people booking the same table at the same time. It's mathematically impossible.</li>
                        <li><strong>Optimization:</strong> It automatically tries to find the "best" table (e.g., fitting a party of 2 at a 2-top instead of wasting a 6-top).</li>
                        <li><strong>Collision Detection:</strong> If you verify tables manually, it warns you if you try to overlap reservations.</li>
                    </ul>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-bold text-slate-900 border-b pb-2">2. Kiosk vs. Online Mode</h2>
                    <p>
                        The system works in two ways automatically:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Online (Guest View):</strong> Guests see a simplified view. They can pick a time, or (if you enabled it) pick a specific table from the visual map.</li>
                        <li><strong>Kiosk (Staff/Admin View):</strong> In the Admin panel, you have a <strong>Live Floor Map</strong>. You can see exactly which tables are Occupied (Red), Reserved (Yellow), or Free (Green) in real-time.</li>
                    </ul>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-bold text-slate-900 border-b pb-2">3. Notifications (Telegram & Email)</h2>
                    <p>
                        You don't need to check the screen constantly.
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Instant Alerts:</strong> When a new reservation comes in, you get a ping on your dedicated <strong>Telegram Group</strong> instantly.</li>
                        <li><strong>Late Warnings:</strong> If a guest hasn't checked in 15 minutes after their start time, the system will nudge you on Telegram: "Table T4 is late!".</li>
                        <li><strong>Email:</strong> Guests get confirmation emails automatically.</li>
                    </ul>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xl font-bold text-slate-900 border-b pb-2">4. Reliability Tricks</h2>
                    <p>
                        To make sure this never breaks during a busy Friday night:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Auto-Healing Database:</strong> If the server restarts, it automatically reconnects.</li>
                        <li><strong>Anti-Crash Validation:</strong> Checks are in place to ensure phone numbers and names are valid before they even reach the database.</li>
                        <li><strong>Time-Zone Aware:</strong> It knows you are in Montreal/Eastern Time, so bookings are always accurate to your local time.</li>
                    </ul>
                </section>

                <div className="pt-6 border-t mt-8">
                    <p className="font-bold text-slate-900">Try it out:</p>
                    <p>1. Go to <a href="/admin/login" className="text-blue-600 underline">Admin Login</a> (Use PIN: 1234)</p>
                    <p>2. Open this page in another tab (or phone) and make a reservation.</p>
                    <p>3. Watch it appear instantly on the Admin Dashboard!</p>
                </div>
            </div>
        </ClientShell>
    );
}
