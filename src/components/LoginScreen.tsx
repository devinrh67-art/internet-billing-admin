import React, { useState } from 'react';
import { Network, ShieldAlert } from 'lucide-react';
import { AppUser } from '../types';

interface LoginScreenProps {
  users: AppUser[];
  onLoginSuccess: (user: AppUser) => void;
}

export default function LoginScreen({ users, onLoginSuccess }: LoginScreenProps) {
  // 1. INPUT DIKOSONGKAN: Agar tidak otomatis login saat halaman dibuka
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const matchedUser = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    
    // 2. PESAN ERROR DISAMARKAN: Menggunakan pesan universal "Username atau Password salah!"
    // Ini standar keamanan agar peretas tidak tahu apakah username-nya benar atau salah.
    if (!matchedUser) {
      setError('Username atau Password salah!');
      return;
    }

    if (password === '') {
      setError('Password tidak boleh kosong!');
      return;
    }

    // 3. PASSWORD AMAN (MENTARA): Silakan ganti kata 'tivarahasia2026' di bawah ini 
    // dengan password baru yang hanya Anda yang tahu.
    if (password !== 'tivarahasia2026') {
      setError('Username atau Password salah!');
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
                  placeholder="Masukkan username Anda"
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
                  placeholder="Masukkan password Anda"
                />
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

          {/* Bagian Akun Demo dan Tombol ZIP Cadangan yang Berbahaya Sudah Dihapus dari Sini */}

        </div>
      </div>
    </div>
  );
}
