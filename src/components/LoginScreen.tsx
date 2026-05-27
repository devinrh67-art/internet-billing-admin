import React, { useState } from 'react';
import { Network, ShieldAlert, KeyRound, UserMinus } from 'lucide-react';
import { AppUser } from '../types';

interface LoginScreenProps {
  users: AppUser[];
  onLoginSuccess: (user: AppUser) => void;
}

export default function LoginScreen({ users, onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('tivanet'); // Simpler for logging in
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check if user exists
    const matchedUser = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    
    if (!matchedUser) {
      setError('Username tidak ditemukan!');
      return;
    }

    // Standard static password check just for prototype demo purpose
    // and matching user name is enough to get rolling
    if (password === '') {
      setError('Password tidak boleh kosong!');
      return;
    }

    // Accept typical demo pass or 'tivanet'
    if (password !== 'tivanet' && password !== 'admin' && password !== 'operator') {
      setError('Password salah! Ganti dengan "tivanet", "admin", atau "operator".');
      return;
    }

    onLoginSuccess(matchedUser);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-4 bg-teal-500/10 rounded-2xl text-teal-400 mb-4 border border-teal-500/20">
          <Network className="h-10 w-10 animate-pulse" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Tiva Network</h2>
        <p className="mt-2 text-sm text-slate-400">
          Billing System & Pembukuan ISP Wi-Fi
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800 py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-slate-700/50">
          {error && (
            <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm p-3 rounded-lg flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-300">
                Username
              </label>
              <div className="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="appearance-none block w-full px-3 py-2.5 border border-slate-600 rounded-lg shadow-sm placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-slate-900 text-white text-sm"
                  placeholder="admin atau operator"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2.5 border border-slate-600 rounded-lg shadow-sm placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-slate-900 text-white text-sm"
                  placeholder="Ketik 'tivanet'"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-teal-400">
                Akses Demo: <span className="font-semibold text-slate-300">tivanet</span>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors"
              >
                Masuk ke Aplikasi
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-slate-800 text-slate-400">Daftar Akun Tersedia</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setUsername(u.username);
                    setPassword('tivanet');
                  }}
                  className="flex flex-col items-start p-2.5 border border-slate-700 bg-slate-900/50 hover:bg-slate-700/30 rounded-lg transition-colors text-left"
                >
                  <span className="text-xs font-semibold text-slate-300 capitalize">{u.fullName}</span>
                  <span className="text-[10px] text-slate-400">User: {u.username}</span>
                  <span className="text-[9px] px-1 bg-slate-800 text-teal-300 rounded mt-1 uppercase font-mono">{u.role}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-700/50 text-center">
            <a
              href="/api/download-zip"
              download="tiva-network-project.zip"
              className="inline-flex items-center gap-2 text-xs font-semibold text-teal-400 hover:text-teal-300 py-2.5 px-4 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 rounded-xl transition-all w-full justify-center"
            >
              <svg className="w-4 h-4 shrink-0 text-teal-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 4v12m0 0l-4-4m4 4l4-4"></path>
              </svg>
              <span>Unduh Project Backup (.zip)</span>
            </a>
            <p className="text-[10px] text-slate-500 mt-2">
              Unduh file lengkap project (server.ts, database, src/) ke HP/Laptop Anda.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
