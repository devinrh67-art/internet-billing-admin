import React, { useState } from 'react';
import { 
  UserPlus, UserMinus, ShieldAlert, CheckCircle2, 
  Trash2, User, KeyRound, Shield, AlertTriangle
} from 'lucide-react';
import { AppUser } from '../types';
import { formatIndonesianDate } from '../utils/billing';

interface AccountsTabProps {
  users: AppUser[];
  currentUser: AppUser;
  onAddUser: (username: string, fullName: string, role: 'admin' | 'operator') => void;
  onDeleteUser: (id: string) => void;
}

export default function AccountsTab({
  users,
  currentUser,
  onAddUser,
  onDeleteUser
}: AccountsTabProps) {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'admin' | 'operator'>('operator');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!username.trim() || !fullName.trim()) {
      setErrorMsg('Semua kolom wajib diisi!');
      return;
    }

    const cleanUser = username.trim().toLowerCase();
    
    // Check duplication
    if (users.some(u => u.username.toLowerCase() === cleanUser)) {
      setErrorMsg(`Username "${cleanUser}" sudah digunakan! Sila gunakan username unik.`);
      return;
    }

    onAddUser(cleanUser, fullName.trim(), role);

    // Reset Form
    setSuccessMsg(`Akun operator "${fullName.trim()}" berhasil dibuat! Password default untuk login: "tivanet"`);
    setUsername('');
    setFullName('');
    setRole('operator');
    setIsFormOpen(false);
  };

  const handleDeleteTrigger = (id: string, name: string) => {
    if (currentUser.id === id) {
      alert('Anda tidak bisa menghapus akun Anda sendiri yang sedang aktif digunakan log in!');
      return;
    }

    if (window.confirm(`Hapus hak akses login untuk operator bernama "${name}"? Operator ini tidak akan bisa membuka Tiva Network lagi.`)) {
      onDeleteUser(id);
      setSuccessMsg(`Akun operator "${name}" telah dihapus.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800 p-5 rounded-2xl border border-slate-700/40">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-teal-400" />
            Manajemen Akun Operator Tiva Network
          </h2>
          <p className="text-xs text-slate-400 mt-1 mt-0.5">Kelola hak akses operator, administrator lapangan, atau petugas billing ISP.</p>
        </div>

        <button
          id="btn-open-add-user"
          onClick={() => {
            setErrorMsg('');
            setSuccessMsg('');
            setIsFormOpen(!isFormOpen);
          }}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-555 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
        >
          <UserPlus className="h-4 w-4" />
          {isFormOpen ? 'Tutup Formulir' : 'Daftarkan Akun Baru'}
        </button>
      </div>

      {/* Success or Error banners */}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs p-3.5 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-350 text-xs p-3.5 rounded-xl flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid Layout (List vs Form) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Users list (2/3 width) */}
        <div className="lg:col-span-2 space-y-3.5">
          <div className="bg-slate-800 rounded-xl border border-slate-700/40 overflow-hidden">
            <div className="bg-slate-900/60 p-4 border-b border-slate-700">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300">Daftar Akun Operator yang Memiliki Akses</h3>
            </div>

            <div className="divide-y divide-slate-700/40">
              {users.map((item) => (
                <div 
                  key={item.id}
                  id={`operator-access-card-${item.id}`}
                  className="p-4 flex justify-between items-center gap-4 hover:bg-slate-750/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-900 text-teal-400 border border-slate-700/60 rounded-xl">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-white text-sm">{item.fullName}</h4>
                        {currentUser.id === item.id && (
                          <span className="text-[9px] px-1.5 bg-sky-505/10 text-sky-400 font-bold font-mono rounded tracking-wider uppercase">LOGGED IN</span>
                        )}
                        <span className={`text-[9px] px-1.5 font-bold font-mono rounded uppercase tracking-wider ${item.role === 'admin' ? 'bg-red-500/10 text-red-400' : 'bg-slate-750 text-slate-350'}`}>
                          {item.role}
                        </span>
                      </div>
                      <p className="text-2xs text-slate-455 mt-1 font-mono">
                        Username: <span className="text-slate-300">@{item.username}</span> | Tanggal Dibuat: {item.createdAt ? formatIndonesianDate(item.createdAt.slice(0, 10)) : '-'}
                      </p>
                    </div>
                  </div>

                  {currentUser.id !== item.id && (
                    <button
                      id={`btn-delete-operator-${item.id}`}
                      onClick={() => handleDeleteTrigger(item.id, item.fullName)}
                      className="p-2 bg-rose-900/10 hover:bg-rose-950/25 text-rose-455 hover:text-rose-450 border border-rose-900/20 rounded-lg transition-colors"
                      title="Hapus Hak Akses Operator"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Create Form Drawer layout side panel */}
        <div>
          {isFormOpen ? (
            <div className="bg-slate-800 p-5 rounded-2xl border border-teal-500/20 shadow-xl space-y-4">
              <div className="pb-2 border-b border-slate-700">
                <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                  <UserPlus className="h-4 w-4 text-teal-400" />
                  Buat Akun Akses Baru
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-2xs font-bold text-slate-400 uppercase">Username Login *</label>
                  <input
                    id="new-operator-username"
                    type="text"
                    required
                    placeholder="Contoh: andika123"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
                    className="mt-1.5 w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white uppercase focus:outline-none focus:border-teal-550"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Hanya huruf kecil/angka, tanpa spasi.</span>
                </div>

                <div>
                  <label className="block text-2xs font-bold text-slate-400 uppercase">Nama Lengkap Operator *</label>
                  <input
                    id="new-operator-fullName"
                    type="text"
                    required
                    placeholder="Contoh: Andika Prasetya"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1.5 w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-slate-400 uppercase text-slate-400">Hak Akses Role *</label>
                  <select
                    id="new-operator-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="mt-1.5 w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="operator">Operator Lapangan (Buka-Tutup Pelanggan)</option>
                    <option value="admin">Super Administrator (Akses Penuh)</option>
                  </select>
                </div>

                <div className="p-3 bg-teal-500/5 text-slate-350 rounded border border-teal-500/10 text-3xs space-y-1">
                  <p className="font-semibold text-teal-350">PROTOL LOGIN DEFAULT:</p>
                  <p>Seluruh akun baru yang didaftarkan menggunakan sandi awal: <span className="font-bold text-white font-mono">tivanet</span></p>
                </div>

                <div className="pt-2 flex justify-end gap-2 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-3.5 py-2 bg-slate-700 text-slate-300 rounded"
                  >
                    Batal
                  </button>
                  <button
                    id="btn-save-new-operator"
                    type="submit"
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-555 text-white rounded"
                  >
                    Simpan Akun
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700/40 space-y-3.5 text-slate-400 text-xs">
              <div className="inline-flex p-2.5 bg-slate-900 border border-slate-750 rounded-xl text-teal-400">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <h4 className="font-bold text-white">Batasan & Keamanan Akun</h4>
              <p className="text-2xs leading-relaxed text-slate-450">
                Fitur ini membantu menjaga transparansi administrasi ISP. Harap hapus akun operator yang telah keluar atau berganti penugasan lapangan agar data rekap KTP dan koordinat GPS pelanggan Tiva Net tetap terlindungi dan aman.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
