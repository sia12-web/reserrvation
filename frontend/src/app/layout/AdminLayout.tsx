import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, CalendarDays, LogOut } from "lucide-react";
import PromptSystem from "../../components/admin/PromptSystem";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const location = useLocation();

    const handleLogout = () => {
        localStorage.removeItem("admin_pin");
        window.location.href = "/admin/login";
    };

    const navItems = [
        { label: "Floor Map", path: "/admin/floor", icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: "Reservations", path: "/admin/reservations", icon: <CalendarDays className="w-5 h-5" /> },
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col fixed inset-y-0 shadow-xl">
                <div className="p-6 flex items-center gap-3 border-b border-slate-800">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                        A
                    </div>
                    <span className="text-xl font-bold tracking-tight">Admin Portal</span>
                </div>
                <nav className="flex-grow p-4 space-y-2 mt-4">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname === item.path
                                ? "bg-blue-600 text-white shadow-lg"
                                : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                }`}
                        >
                            {item.icon}
                            <span className="font-semibold">{item.label}</span>
                        </Link>
                    ))}
                </nav>
                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-900/40 hover:text-red-400 transition-all w-full font-semibold"
                    >
                        <LogOut className="w-5 h-5" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-grow ml-64 min-h-screen">
                <header className="bg-white border-b border-slate-200 h-20 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
                    <h1 className="text-2xl font-bold text-slate-900">
                        {navItems.find((n) => n.path === location.pathname)?.label ?? "Dashboard"}
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-slate-900">Administrator</p>
                            <p className="text-xs text-slate-500">Diba Restaurant</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-slate-100 flex items-center justify-center text-slate-600">
                            <span className="text-xs font-bold">ADM</span>
                        </div>
                    </div>
                </header>
                <div className="p-8">
                    {children}
                </div>
            </main>
            <PromptSystem />
        </div>
    );
}
