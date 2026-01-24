import ClientShell from "../app/layout/ClientShell";

export default function SystemExplanationPage() {
    return (
        <ClientShell title="System Guide / راهنمای سیستم" subtitle="How the reservation engine works / نحوه کار موتور رزرو">
            <div className="space-y-12 text-slate-700 pb-20">
                {/* Intro Section */}
                <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex flex-col md:flex-row gap-6 items-start">
                    <div className="flex-1 space-y-2">
                        <h3 className="font-black text-blue-900 text-lg">Smart Seating Engine</h3>
                        <p className="text-sm leading-relaxed text-blue-800">
                            The system uses a "Best Fit" algorithm. It automatically blocks inappropriate tables to maximize your restaurant's capacity. A small group will never be given a large table if a smaller one is available.
                        </p>
                    </div>
                    <div className="flex-1 space-y-2 text-right">
                        <h3 className="font-black text-blue-900 text-lg" dir="rtl">موتور هوشمند جایابی</h3>
                        <p className="text-sm leading-relaxed text-blue-800" dir="rtl">
                            سیستم از الگوریتم "بهترین انتخاب" استفاده می‌کند. برای افزایش ظرفیت رستوران، میزهای نامناسب را به‌طور خودکار قفل می‌کند. گروه کوچک هرگز میز بزرگ را اشغال نخواهد کرد مگر اینکه مجبور باشد.
                        </p>
                    </div>
                </div>

                {/* Section 1: Logic */}
                <section className="space-y-6">
                    <div className="flex justify-between items-baseline border-b-2 border-slate-100 pb-2">
                        <h2 className="text-2xl font-black text-slate-900">1. Table Assignment Rules</h2>
                        <h2 className="text-xl font-bold text-slate-400 font-sans" dir="rtl">قوانین تخصیص میز</h2>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        {/* English Rule Explanation */}
                        <div className="space-y-4">
                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">Scenario A</span>
                                <h4 className="font-bold text-lg">Small groups (1-2 people)</h4>
                                <p className="text-sm text-slate-600">
                                    A party of 2 will <strong>ONLY</strong> be shown tables with a capacity of 2-4 (e.g. Standard Tables).
                                    They <span className="text-red-600 font-bold">cannot</span> book a table for 6 or 8. The system hides those options to save them for larger groups.
                                </p>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">Scenario B</span>
                                <h4 className="font-bold text-lg">Medium groups (5-7 people)</h4>
                                <p className="text-sm text-slate-600">
                                    These groups are prioritized for <strong>Circular Tables (T4, T6)</strong> or merged tables.
                                    They cannot book a huge combined table meant for 12 people.
                                </p>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">Scenario C</span>
                                <h4 className="font-bold text-lg">Large groups (8+ people)</h4>
                                <ul className="text-sm text-slate-600 list-disc list-inside space-y-1">
                                    <li><strong>3 Tables:</strong> 13–15 People</li>
                                    <li><strong>4 Tables:</strong> 18–20 People</li>
                                    <li><strong>5 Tables:</strong> 23–25 People</li>
                                    <li><strong>6 Tables:</strong> 28–30 People</li>
                                    <li><strong>7 Tables (Max Combo):</strong> 33–40 People</li>
                                </ul>
                                <p className="text-sm text-slate-500 italic mt-2">
                                    The system automatically calculates the best combination of adjacent tables.
                                </p>
                            </div>
                        </div>

                        {/* Farsi Rule Explanation */}
                        <div className="space-y-4" dir="rtl">
                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">سناریو الف</span>
                                <h4 className="font-bold text-lg">گروه‌های کوچک (۱-۲ نفر)</h4>
                                <p className="text-sm text-slate-600">
                                    یک گروه ۲ نفره <strong>فقط</strong> می‌تواند میزهای ۲ تا ۴ نفره را ببیند.
                                    آنها <span className="text-red-600 font-bold">نمی‌توانند</span> میز ۶ یا ۸ نفره رزرو کنند. سیستم این گزینه‌ها را پنهان می‌کند تا برای گروه‌های بزرگتر حفظ شوند.
                                </p>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">سناریو ب</span>
                                <h4 className="font-bold text-lg">گروه‌های متوسط (۵-۷ نفر)</h4>
                                <p className="text-sm text-slate-600">
                                    این گروه‌ها برای <strong>میزهای گرد (T4, T6)</strong> یا میزهای ترکیبی اولویت دارند.
                                    آنها نمی‌توانند میزهای بسیار بزرگ (مثلاً ۱۲ نفره) را بی‌دلیل اشغال کنند.
                                </p>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">سناریو پ</span>
                                <h4 className="font-bold text-lg">گروه‌های بزرگ (۸+ نفر)</h4>
                                <ul className="text-sm text-slate-600 list-disc list-inside space-y-1">
                                    <li><strong>۳ میز:</strong> ۱۳ تا ۱۵ نفر</li>
                                    <li><strong>۴ میز:</strong> ۱۸ تا ۲۰ نفر</li>
                                    <li><strong>۵ میز:</strong> ۲۳ تا ۲۵ نفر</li>
                                    <li><strong>۶ میز:</strong> ۲۸ تا ۳۰ نفر</li>
                                    <li><strong>۷ میز (حداکثر):</strong> ۳۳ تا ۴۰ نفر</li>
                                </ul>
                                <p className="text-sm text-slate-500 italic mt-2">
                                    سیستم به‌طور خودکار بهترین ترکیب میزهای کنار هم را محاسبه می‌کند.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 2: Colors */}
                <section className="space-y-6">
                    <div className="flex justify-between items-baseline border-b-2 border-slate-100 pb-2">
                        <h2 className="text-2xl font-black text-slate-900">2. Floor Map Colors</h2>
                        <h2 className="text-xl font-bold text-slate-400 font-sans" dir="rtl">رنگ‌های نقشه</h2>
                    </div>

                    <ul className="grid gap-4 sm:grid-cols-2">
                        <li className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                            <div className="flex justify-between">
                                <p className="font-black text-emerald-600">Green / سبز</p>
                                <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-1 rounded">AVAILABLE</span>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-slate-600"><strong>English:</strong> Table is free. No bookings for 2.5 hours.</p>
                                <p className="text-sm text-slate-500 text-right border-t border-slate-50 pt-2" dir="rtl"><strong>فارسی:</strong> میز آزاد است. تا ۲.۵ ساعت آینده رزروی ندارد.</p>
                            </div>
                        </li>
                        <li className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                            <div className="flex justify-between">
                                <p className="font-black text-amber-600">Amber / زرد تیره</p>
                                <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded">OCCUPIED</span>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-slate-600"><strong>English:</strong> Guests are currently seated (Checked In).</p>
                                <p className="text-sm text-slate-500 text-right border-t border-slate-50 pt-2" dir="rtl"><strong>فارسی:</strong> مهمان روی میز نشسته است.</p>
                            </div>
                        </li>
                        <li className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                            <div className="flex justify-between">
                                <p className="font-black text-indigo-600">Indigo / بنفش</p>
                                <span className="text-xs font-bold bg-indigo-100 text-indigo-800 px-2 py-1 rounded">RESERVED</span>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-slate-600"><strong>English:</strong> Empty now, but a reservation is coming soon.</p>
                                <p className="text-sm text-slate-500 text-right border-t border-slate-50 pt-2" dir="rtl"><strong>فارسی:</strong> الان خالی است، اما به زودی رزرو دارد.</p>
                            </div>
                        </li>
                        <li className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                            <div className="flex justify-between">
                                <p className="font-black text-slate-400">Gray / خاکستری</p>
                                <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded">LOCKED</span>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-slate-600"><strong>English:</strong> Manually locked by admin (or closed).</p>
                                <p className="text-sm text-slate-500 text-right border-t border-slate-50 pt-2" dir="rtl"><strong>فارسی:</strong> دستی قفل شده (یا خراب است).</p>
                            </div>
                        </li>
                    </ul>
                </section>

                {/* Section 3: FAQ */}
                <section className="space-y-6">
                    <div className="bg-slate-900 rounded-[2rem] p-8 text-white space-y-8">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-black">Admin Controls</h2>
                            <p className="text-slate-400">You have full power / شما کنترل کامل دارید</p>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 text-left">
                            <div className="space-y-2">
                                <h4 className="font-bold text-blue-300">Can I force a booking?</h4>
                                <p className="text-sm text-slate-300">Yes. In the Admin Panel, you can override rules. You can put 1 person on a 10-person table if you really want to.</p>
                            </div>
                            <div className="space-y-2 text-right" dir="rtl">
                                <h4 className="font-bold text-blue-300">آیا می‌توانم به زور رزرو کنم؟</h4>
                                <p className="text-sm text-slate-300">بله. در پنل ادمین، شما می‌توانید قوانین را نادیده بگیرید. مثلاً می‌توانید ۱ نفر را روی میز ۱۰ نفره بنشانید.</p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-bold text-blue-300">How do I free a table?</h4>
                                <p className="text-sm text-slate-300">Click the table on the map → Click "Free Table". This makes it green immediately.</p>
                            </div>
                            <div className="space-y-2 text-right" dir="rtl">
                                <h4 className="font-bold text-blue-300">چگونه میز را آزاد کنم؟</h4>
                                <p className="text-sm text-slate-300">روی میز در نقشه کلیک کنید ← "Free Table" را بزنید. میز بلافاصله سبز می‌شود.</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-center gap-4 pt-4">
                            <a href="/admin/floor" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-black transition-all">
                                Open Floor Map
                            </a>
                        </div>
                    </div>
                </section>
            </div>
        </ClientShell>
    );
}
