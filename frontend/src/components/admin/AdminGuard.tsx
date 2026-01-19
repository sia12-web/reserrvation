import React, { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

export default function AdminGuard() {
    const pin = localStorage.getItem("admin_pin") || "";

    if (!pin) {
        return <Navigate to="/admin/login" replace />;
    }

    return <Outlet />;
}

export function AdminLogin() {
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.length >= 4) {
            localStorage.setItem("admin_pin", pin);
            window.location.href = "/admin/floor";
        } else {
            setError("PIN must be at least 4 digits");
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
            <div className="max-w-md w-full space-y-8 bg-slate-800 p-10 rounded-2xl shadow-2xl border border-slate-700">
                <div className="text-center">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4 shadow-lg">
                        A
                    </div>
                    <h2 className="text-3xl font-extrabold tracking-tight">Admin Portal</h2>
                    <p className="mt-2 text-slate-400">Enter your administrative PIN to continue</p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div>
                        <input
                            type="password"
                            required
                            className="appearance-none rounded-xl relative block w-full px-4 py-4 border border-slate-600 bg-slate-700 placeholder-slate-400 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-[1em]"
                            placeholder="••••"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                        />
                    </div>
                    {error && <p className="text-red-400 text-sm text-center font-medium">{error}</p>}
                    <button
                        type="submit"
                        className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-lg font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-lg active:scale-95"
                    >
                        Authenticate
                    </button>
                </form>
            </div>
        </div>
    );
}
