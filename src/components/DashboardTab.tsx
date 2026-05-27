import React from 'react';
import { 
  Users, UserCheck, UserX, UserMinus, 
  ArrowUpRight, ArrowDownRight, Wallet, 
  Percent, AlertCircle, Wifi, SignalHigh,
  Clock, Send, TrendingUp
} from 'lucide-react';
import { Customer, Invoice, Transaction } from '../types';
import { DEFAULT_PACKAGES, formatRupiah, getIndonesianMonthYear } from '../utils/billing';

interface DashboardTabProps {
  customers: Customer[];
  invoices: Invoice[];
  transactions: Transaction[];
  onNavigateToTab: (tabIndex: number) => void;
  onSendBill: (customer: Customer, invoice?: Invoice) => void;
}

export default function DashboardTab({ 
  customers, 
  invoices, 
  transactions, 
  onNavigateToTab,
  onSendBill
}: DashboardTabProps) {
  // Current month context (from metadata & system clocks is May 2026)
  const currentMonth = '2026-05';

  // Counts
  const activeCount = customers.filter(c => c.status === 'aktif').length;
  const isolatedCount = customers.filter(c => c.status === 'isolir').length;
  const terminatedCount = customers.filter(c => c.status === 'putus').length;
  const totalCount = customers.length;

  // Financial Stats for Current Month (May 2026)
  const currentMonthInvoices = invoices.filter(inv => inv.billingMonth === currentMonth);
  const paidAmount = currentMonthInvoices
    .filter(inv => inv.status === 'lunas')
    .reduce((sum, inv) => sum + inv.amount, 0);
  
  const unpaidAmount = currentMonthInvoices
    .filter(inv => inv.status === 'belum_bayar' || inv.status === 'terlambat')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const totalBilled = currentMonthInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  // Total income & operational expenses (all time)
  const totalIncomeAllTime = transactions
    .filter(tx => tx.type === 'pemasukan')
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const totalExpenseAllTime = transactions
    .filter(tx => tx.type === 'pengeluaran')
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Package Distribution calculation
  const pkgDistribution = DEFAULT_PACKAGES.map(pkg => {
    const clients = customers.filter(c => c.packageId === pkg.id && c.status === 'aktif');
    return {
      ...pkg,
      count: clients.length,
      percentage: totalCount > 0 ? (clients.length / totalCount) * 100 : 0
    };
  });

  // Isolated customers with pending invoices
  const pendingIsolatedCustomers = customers.filter(c => c.status === 'isolir');

  // Multi-month income calculation (visualize in custom SVG Chart)
  // Let's generate data for last 5 months: Jan, Feb, Mar, Apr, May 2026
  const lastMonths = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05'];
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei'];
  const monthlyStats = lastMonths.map((m, idx) => {
    const monthInvoices = invoices.filter(inv => inv.billingMonth === m);
    const monthIncome = monthInvoices
      .filter(inv => inv.status === 'lunas')
      .reduce((sum, inv) => sum + inv.amount, 0);
    const monthPending = monthInvoices
      .filter(inv => inv.status === 'belum_bayar' || inv.status === 'terlambat')
      .reduce((sum, inv) => sum + inv.amount, 0);
    const monthExpense = transactions
      .filter(tx => tx.date.startsWith(m) && tx.type === 'pengeluaran')
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      monthKey: m,
      name: monthNames[idx],
      income: monthIncome,
      pending: monthPending,
      expense: monthExpense,
    };
  });

  // Calculate highest income value for chart scaling
  const maxChartVal = Math.max(...monthlyStats.map(s => s.income + s.pending), 100000);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 transform translate-x-12 -translate-y-12 bg-teal-500/10 rounded-full blur-2xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">KONTROL PANEL TIVA NETWORK</h1>
            <p className="text-slate-400 mt-1 max-w-xl">
              Sistem manajemen penagihan Wi-Fi cerdas untuk ISP Tiva Net. Kelola tagihan pelanggan prorata tanggal 1, status isolir mikrotik otomatis, dan pembukuan dalam satu dasbor.
            </p>
          </div>
          <button 
            onClick={() => onNavigateToTab(1)}
            className="self-start md:self-auto px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-teal-700/20 flex items-center gap-2"
          >
            <UserCheck className="h-4 w-4" />
            + Tambah Pelanggan
          </button>
        </div>
      </div>

      {/* Grid Status Pelanggan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card Aktif */}
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700/40 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Aktif</p>
              <h3 className="text-2xl font-bold text-teal-400 mt-1">{activeCount}</h3>
            </div>
            <div className="p-2 bg-teal-500/10 text-teal-400 rounded-lg">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
            <span className="text-emerald-400 font-medium font-mono">{(totalCount ? (activeCount / totalCount) * 100 : 0).toFixed(0)}%</span>
            <span>dari total {totalCount} pelanggan</span>
          </div>
        </div>

        {/* Card Isolir */}
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700/40 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Terisolir</p>
              <h3 className="text-2xl font-bold text-amber-500 mt-1">{isolatedCount}</h3>
            </div>
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
            <span className="text-amber-400 font-medium font-mono">{(totalCount ? (isolatedCount / totalCount) * 100 : 0).toFixed(0)}%</span>
            <span>un-paid terisolir bypass</span>
          </div>
        </div>

        {/* Card Putus */}
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700/40 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Putas / Nonaktif</p>
              <h3 className="text-2xl font-bold text-slate-400 mt-1">{terminatedCount}</h3>
            </div>
            <div className="p-2 bg-slate-700/30 text-slate-400 rounded-lg">
              <UserMinus className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
            <span className="text-slate-400 font-medium font-mono">{(totalCount ? (terminatedCount / totalCount) * 100 : 0).toFixed(0)}%</span>
            <span>berhenti berlangganan</span>
          </div>
        </div>

        {/* Card Tagihan Lunas Bulan Ini */}
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700/40 relative overflow-hidden col-span-2 lg:col-span-1">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Lunas Bulan Ini</p>
              <h3 className="text-lg font-bold text-emerald-400 mt-1">{formatRupiah(paidAmount)}</h3>
            </div>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
            <span>Outstanding: </span>
            <span className="text-rose-400 font-semibold font-mono">{formatRupiah(unpaidAmount)}</span>
          </div>
        </div>
      </div>

      {/* Kesehatan & Realisasi Arus Kas (Expected vs Collected) */}
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700/40 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-teal-400" />
              <h3 className="font-bold text-white tracking-tight">Kesehatan Arus Kas Bulanan</h3>
            </div>
            <p className="text-xs text-slate-400">
              Analisis target pendapatan tagihan berkala murni vs pembayaran masuk bulan ini ({getIndonesianMonthYear(currentMonth)})
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-3xs font-bold px-2.5 py-1 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-full select-none">
              Rasio Kolektibilitas: {totalBilled > 0 ? ((paidAmount / totalBilled) * 100).toFixed(1) : 0}%
            </span>
            <span className={`text-3xs font-bold px-2.5 py-1 border rounded-full select-none ${
              (totalBilled > 0 ? (paidAmount / totalBilled) * 100 : 0) >= 80 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
            }`}>
              Status Kas: {(totalBilled > 0 ? (paidAmount / totalBilled) * 100 : 0) >= 80 ? 'Sangat Sehat' : 'Perlu Pemantauan'}
            </span>
          </div>
        </div>

        {/* Triple Bento Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Expected Revenue Card */}
          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-700/35 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Target Pendapatan (Expected)</span>
              <span className="text-3xs font-semibold px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-mono">100% Target</span>
            </div>
            <div>
              <p className="text-xl font-black text-slate-100 font-mono">{formatRupiah(totalBilled)}</p>
              <p className="text-4xs text-slate-500 mt-1">Total akumulasi dari seluruh lembar tagihan aktif di bulan ini.</p>
            </div>
          </div>

          {/* Collected Revenue Card */}
          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-700/35 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-3xs font-bold text-teal-400 uppercase tracking-wider">Pendapatan Masuk (Collected)</span>
              <span className="text-3xs font-semibold px-2 py-0.5 bg-teal-500/10 text-teal-400 rounded font-mono">
                {totalBilled > 0 ? ((paidAmount / totalBilled) * 100).toFixed(0) : 0}% Realisasi
              </span>
            </div>
            <div>
              <p className="text-xl font-black text-teal-400 font-mono">{formatRupiah(paidAmount)}</p>
              <p className="text-4xs text-slate-500 mt-1 font-sans">Total tagihan kas yang telah lunas dibayar oleh pelanggan.</p>
            </div>
          </div>

          {/* Remaining Revenue Card */}
          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-700/35 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-3xs font-bold text-rose-300 uppercase tracking-wider">Sisa Belum Tertagih (Uncollected)</span>
              <span className="text-3xs font-semibold px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded font-mono">
                {totalBilled > 0 ? ((unpaidAmount / totalBilled) * 100).toFixed(0) : 0}% Piutang
              </span>
            </div>
            <div>
              <p className="text-xl font-black text-rose-400 font-mono">{formatRupiah(unpaidAmount)}</p>
              <p className="text-4xs text-slate-500 mt-1 font-sans">Piutang berjalan dari tagihan 'belum bayar' atau 'terlambat'.</p>
            </div>
          </div>
        </div>

        {/* Progress Tracker Slider bar */}
        <div className="space-y-2 bg-slate-900/40 p-4 rounded-xl border border-slate-700/10">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
              Pratinjau Arus Kas Realtime
            </span>
            <span className="font-semibold text-slate-300 font-mono">
              <span className="text-teal-400">{formatRupiah(paidAmount)}</span>
              <span className="text-slate-500"> / {formatRupiah(totalBilled)}</span>
            </span>
          </div>
          
          <div className="relative h-4 bg-slate-950 rounded-full border border-slate-700/30 overflow-hidden p-0.5">
            <div 
              className="bg-gradient-to-r from-teal-500 via-teal-400 to-emerald-400 h-full rounded-full transition-all duration-700 shadow-inner flex items-center justify-end pr-2"
              style={{ width: `${totalBilled > 0 ? Math.min((paidAmount / totalBilled) * 100, 100) : 0}%` }}
            >
              {totalBilled > 0 && (paidAmount / totalBilled) >= 0.15 && (
                <span className="text-4xs font-bold text-slate-950 select-none">
                  {((paidAmount / totalBilled) * 100).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Double Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart Column (2/3 width) */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700/40 lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-700/45">
            <div>
              <h3 className="font-semibold text-white">Grafik Perkembangan Keuangan</h3>
              <p className="text-xs text-slate-400 mt-0.5">Pendapatan lunas (hijau) & piutang berjalan (abu) - Tahun 2026</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 bg-teal-500 rounded-sm"></span>
                <span className="text-slate-300">Lunas</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 bg-slate-600 rounded-sm"></span>
                <span className="text-slate-300">Belum Bayar</span>
              </span>
            </div>
          </div>

          {/* Elegant Custom SVG Chart Visualizer */}
          <div className="relative w-full h-64 pt-6 select-none font-mono text-[10px] text-slate-400">
            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
              const val = Math.round(maxChartVal * (1 - ratio));
              const topPercent = ratio * 80 + 5; // offset top and bottom margins within 100% viewport
              return (
                <div key={index} className="absolute left-0 w-full" style={{ top: `${topPercent}%` }}>
                  <div className="w-full flex justify-between items-center border-t border-slate-700/35">
                    <span className="bg-slate-800 pr-2 -translate-y-2">{formatRupiah(val)}</span>
                  </div>
                </div>
              );
            })}

            {/* Vertical Bars container */}
            <div className="absolute inset-x-12 bottom-8 top-4 flex justify-around items-end h-44">
              {monthlyStats.map((stat, i) => {
                const totalHeightFactor = (stat.income + stat.pending) / (maxChartVal || 1);
                
                // SVG percentage height breakdown
                const paidHeight = stat.income / (maxChartVal || 1) * 100;
                const pendingHeight = stat.pending / (maxChartVal || 1) * 100;

                return (
                  <div key={i} className="flex flex-col items-center group relative w-12 sm:w-16">
                    {/* Tooltip on Hover */}
                    <div className="absolute -top-16 bg-slate-950/95 border border-slate-700 shadow-xl px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 text-[10px] w-36 space-y-0.5">
                      <p className="font-bold text-white text-xs">{stat.name}</p>
                      <p className="text-teal-400">Lunas: {formatRupiah(stat.income)}</p>
                      <p className="text-amber-500">Unpaid: {formatRupiah(stat.pending)}</p>
                      <p className="text-rose-400 border-t border-slate-800 pt-1 mt-1">Sewa/Beban: {formatRupiah(stat.expense)}</p>
                    </div>

                    {/* Visual Stacked bar */}
                    <div className="w-full bg-slate-750/30 rounded-t-md overflow-hidden flex flex-col justify-end border border-slate-700/50" style={{ height: `${totalHeightFactor * 100}%`, minHeight: '4px' }}>
                      {/* Unpaid Part */}
                      {stat.pending > 0 && (
                        <div 
                          className="bg-slate-650 flex-1 hover:brightness-110 transition-all border-b border-slate-800" 
                          style={{ height: `${(stat.pending / (stat.income + stat.pending)) * 100}%` }}
                        />
                      )}
                      {/* Paid part */}
                      {stat.income > 0 && (
                        <div 
                          className="bg-teal-500 hover:brightness-110 transition-all" 
                          style={{ height: `${(stat.income / (stat.income + stat.pending)) * 100}%` }}
                        />
                      )}
                    </div>

                    {/* Month Label */}
                    <span className="absolute -bottom-6 text-2xs text-slate-300 font-sans tracking-tight">{stat.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Stats Banner below chart */}
          <div className="grid grid-cols-3 gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-700/30">
            <div>
              <p className="text-3xs text-slate-500 uppercase font-bold tracking-wider">Total Omset (Gross)</p>
              <p className="text-base font-bold text-white mt-1">{formatRupiah(totalIncomeAllTime)}</p>
            </div>
            <div>
              <p className="text-3xs text-slate-500 uppercase font-bold tracking-wider">Total Beban/Alat</p>
              <p className="text-base font-bold text-rose-400 mt-1">{formatRupiah(totalExpenseAllTime)}</p>
            </div>
            <div>
              <p className="text-3xs text-slate-500 uppercase font-bold tracking-wider">Arus Kas Bersih (Netto)</p>
              <p className="text-base font-bold text-teal-400 mt-1">{formatRupiah(totalIncomeAllTime - totalExpenseAllTime)}</p>
            </div>
          </div>
        </div>

        {/* Side Panel: Packages & Alerts (1/3 width) */}
        <div className="space-y-6">
          {/* Paket Wi-Fi Distribution */}
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700/40 space-y-4">
            <div>
              <h3 className="font-semibold text-white">Paket Terpopuler (Aktif)</h3>
              <p className="text-xs text-slate-400 mt-0.5">Sebaran pelanggan pada jenis paket</p>
            </div>

            <div className="space-y-3.5">
              {pkgDistribution.map(pkg => (
                <div key={pkg.id} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300/90 font-medium">{pkg.name}</span>
                    <span className="font-mono text-slate-400">{pkg.count} Pelanggan</span>
                  </div>
                  {/* Progress tracker */}
                  <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className="bg-teal-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${pkg.percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-4xs uppercase tracking-wider text-slate-500">
                    <span>Kecepatan: {pkg.speed}</span>
                    <span className="font-semibold text-slate-400">{formatRupiah(pkg.price)} / Bln</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alarm Isolir Bypass & Send Reminders */}
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-705/40 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-white">Menunggu Pembayaran</h3>
                <p className="text-xs text-rose-400 mt-0.5">Isolir / belum lunas bulan {getIndonesianMonthYear(currentMonth)}</p>
              </div>
              <span className="text-xs px-2.5 py-0.5 bg-rose-500/10 text-rose-400 font-bold rounded-full">{pendingIsolatedCustomers.length}</span>
            </div>

            {pendingIsolatedCustomers.length === 0 ? (
              <div className="text-center py-4 bg-slate-900/40 rounded-xl border border-dashed border-slate-700">
                <Wifi className="h-6 w-6 text-slate-600 mx-auto mb-1.5" />
                <p className="text-xs text-slate-400">Tidak ada pelanggan terisolir</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                {pendingIsolatedCustomers.map((cust) => {
                  const correspondingInvoice = invoices.find(
                    inv => inv.customerId === cust.id && inv.billingMonth === currentMonth
                  );

                  return (
                    <div key={cust.id} className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/40 flex justify-between items-center gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{cust.fullName}</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">ODP: <span className="font-mono">{cust.odpCode || '-'}</span> | Telp: {cust.phone}</p>
                      </div>
                      <button
                        onClick={() => onSendBill(cust, correspondingInvoice)}
                        className="p-1.5 bg-amber-500/10 hover:bg-amber-500/25 text-amber-500 hover:text-amber-400 rounded transition-colors"
                        title="Draft WA Tagihan"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
