import React, { useState } from 'react';
import { 
  BarChart, TrendingUp, DollarSign, Download, 
  FileSpreadsheet, FileText, Printer, ChevronDown, Calendar, ArrowUpRight
} from 'lucide-react';
import { Customer, Invoice, Transaction } from '../types';
import { formatRupiah, getIndonesianMonthYear } from '../utils/billing';

interface ReportsTabProps {
  customers: Customer[];
  invoices: Invoice[];
  transactions: Transaction[];
}

export default function ReportsTab({ customers, invoices, transactions }: ReportsTabProps) {
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonth, setSelectedMonth] = useState('05'); // default to current context May
  
  // Months config
  const months = [
    { code: '01', name: 'Januari' },
    { code: '02', name: 'Februari' },
    { code: '03', name: 'Maret' },
    { code: '04', name: 'April' },
    { code: '05', name: 'Mei' },
    { code: '06', name: 'Juni' },
    { code: '07', name: 'Juli' },
    { code: '08', name: 'Agustus' },
    { code: '09', name: 'September' },
    { code: '10', name: 'Oktober' },
    { code: '11', name: 'November' },
    { code: '12', name: 'Desember' },
  ];

  const targetPeriod = `${selectedYear}-${selectedMonth}`;

  // 1. Calculate Monthly stats (focused month)
  const monthlyInvoices = invoices.filter(inv => inv.billingMonth === targetPeriod);
  const monthlyReceived = monthlyInvoices
    .filter(inv => inv.status === 'lunas')
    .reduce((sum, inv) => sum + inv.amount, 0);
  
  const monthlyPending = monthlyInvoices
    .filter(inv => inv.status !== 'lunas')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const monthlyExpense = transactions
    .filter(tx => tx.date.startsWith(targetPeriod) && tx.type === 'pengeluaran')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const monthlyNetProfit = monthlyReceived - monthlyExpense;

  // 2. Calculate Yearly stats (focused year)
  const yearlyTransactions = transactions.filter(tx => tx.date.startsWith(selectedYear));
  const yearlyInvoices = invoices.filter(inv => inv.billingMonth.startsWith(selectedYear));
  
  const yearlyReceived = yearlyInvoices
    .filter(inv => inv.status === 'lunas')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const yearlyPending = yearlyInvoices
    .filter(inv => inv.status !== 'lunas')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const yearlyExpense = yearlyTransactions
    .filter(tx => tx.type === 'pengeluaran')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const yearlyNetProfit = yearlyReceived - yearlyExpense;

  // Yearly monthly data points helper for Graph
  const monthlyDataPoints = months.map(m => {
    const period = `${selectedYear}-${m.code}`;
    const periodInvoices = invoices.filter(inv => inv.billingMonth === period);
    const received = periodInvoices
      .filter(inv => inv.status === 'lunas')
      .reduce((sum, inv) => sum + inv.amount, 0);
    const pending = periodInvoices
      .filter(inv => inv.status !== 'lunas')
      .reduce((sum, inv) => sum + inv.amount, 0);
    const expense = transactions
      .filter(tx => tx.date.startsWith(period) && tx.type === 'pengeluaran')
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      monthCode: m.code,
      name: m.name,
      received,
      pending,
      expense,
      gross: received + pending,
      net: received - expense,
    };
  });

  const maxYearlyValue = Math.max(...monthlyDataPoints.map(d => Math.max(d.gross, d.expense)), 500000);

  // Print Report trigger
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:bg-white print:text-slate-900 print:p-8">
      {/* Selection Control Panel (Hidden in print) */}
      <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-white">Laporan Keuangan ISP</h2>
          <p className="text-xs text-slate-400 mt-1">Laporan rekap keuntungan bersih bulanan & sirkulasi omset tahunan</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Year select */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200">
            <span className="text-slate-450 uppercase font-bold font-mono tracking-wider">Tahun:</span>
            <select
              id="report-select-year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent border-0 focus:outline-none"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>

          {/* Month select */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200">
            <span className="text-slate-450 uppercase font-bold font-mono tracking-wider">Bulan:</span>
            <select
              id="report-select-month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent border-0 focus:outline-none"
            >
              {months.map(m => (
                <option key={m.code} value={m.code}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Cetak Report */}
          <button
            id="btn-print-financial-report"
            onClick={handlePrintReport}
            className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-650 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="h-4 w-4" /> Cetak PDF (Print)
          </button>
        </div>
      </div>

      {/* PRINT BANNER ONLY SHOWN DURING WINDOW PRINT */}
      <div className="hidden print:block text-center pb-6 border-b-2 border-slate-900 mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 uppercase">Tiva Network</h1>
        <p className="text-sm font-semibold text-slate-600">Sistem Laporan Laba Rugi ISP Wi-Fi Prabayar</p>
        <p className="text-xs text-slate-500 mt-1">Periode Cetak: {months.find(m=>m.code===selectedMonth)?.name} {selectedYear}</p>
      </div>

      {/* REKAP BULANAN */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white uppercase font-mono tracking-widest border-l-2 border-teal-500 pl-2.5 print:text-slate-900">
          I. Rekap Keuangan Bulanan: {months.find(m => m.code === selectedMonth)?.name} {selectedYear}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/80 p-5 rounded-xl border border-slate-700/35 print:border-slate-300 print:bg-white">
            <span className="text-3xs uppercase text-slate-450 tracking-wider font-bold block print:text-slate-500">A. Pendapatan Masuk (Omset Lunas)</span>
            <p className="text-xl font-black text-emerald-400 font-mono mt-1.5 print:text-emerald-700">{formatRupiah(monthlyReceived)}</p>
            <p className="text-[10px] text-slate-500 mt-1">Diterima dari langganan aktif.</p>
          </div>

          <div className="bg-slate-800/80 p-5 rounded-xl border border-slate-700/35 print:border-slate-300 print:bg-white w-full">
            <span className="text-3xs uppercase text-slate-450 tracking-wider font-bold block print:text-slate-500">B. Piutang Tertunda (Belum Bayar)</span>
            <p className="text-xl font-black text-amber-500 font-mono mt-1.5 print:text-amber-750">{formatRupiah(monthlyPending)}</p>
            <p className="text-[10px] text-slate-500 mt-1">Tagihan diterbitkan tapi belum lunas.</p>
          </div>

          <div className="bg-slate-800/80 p-5 rounded-xl border border-slate-700/35 print:border-slate-300 print:bg-white">
            <span className="text-3xs uppercase text-slate-450 tracking-wider font-bold block print:text-slate-500">C. Pengeluaran Operasional & Alat</span>
            <p className="text-xl font-black text-rose-400 font-mono mt-1.5 print:text-rose-700">{formatRupiah(monthlyExpense)}</p>
            <p className="text-[10px] text-slate-500 mt-1">Termasuk lease ISP line & patch cord.</p>
          </div>

          <div className="bg-slate-850 p-5 rounded-xl border border-teal-500/30 print:border-slate-400 print:bg-slate-50">
            <span className="text-3xs uppercase text-slate-350 tracking-wider font-bold block print:text-slate-650">D. Pendapatan Bersih (Net Profit)</span>
            <p className="text-xl font-black text-teal-300 font-mono mt-1.5 print:text-teal-850">{formatRupiah(monthlyNetProfit)}</p>
            <p className="text-[10px] text-slate-450 mt-1 print:text-slate-500">Laba Bersih = (A) - (C)</p>
          </div>
        </div>
      </div>

      {/* REKAP TAHUNAN */}
      <div className="space-y-4 pt-4 border-t border-slate-800 print:border-slate-300">
        <h3 className="text-base font-bold text-white uppercase font-mono tracking-widest border-l-2 border-teal-500 pl-2.5 print:text-slate-900">
          II. Rekap Keuangan Tahunan: Tahun {selectedYear}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-805 p-4 rounded-xl border border-slate-700/20 print:border-slate-300 text-center">
            <span className="text-3xs uppercase text-slate-450 tracking-wider font-semibold block">Total Akumulasi Masuk</span>
            <span className="text-lg font-bold text-white font-mono mt-1 block print:text-slate-900">{formatRupiah(yearlyReceived)}</span>
          </div>
          <div className="bg-slate-805 p-4 rounded-xl border border-slate-700/20 print:border-slate-300 text-center">
            <span className="text-3xs uppercase text-slate-450 tracking-wider font-semibold block">Total Piutang Tersisa</span>
            <span className="text-lg font-bold text-amber-550 font-mono mt-1 block print:text-amber-800">{formatRupiah(yearlyPending)}</span>
          </div>
          <div className="bg-slate-805 p-4 rounded-xl border border-slate-700/20 print:border-slate-300 text-center">
            <span className="text-3xs uppercase text-slate-450 tracking-wider font-semibold block">Beban Alat & Operasional</span>
            <span className="text-lg font-bold text-rose-450 font-mono mt-1 block print:text-rose-800">{formatRupiah(yearlyExpense)}</span>
          </div>
          <div className="bg-teal-950/20 p-4 rounded-xl border border-teal-500/20 print:border-slate-300 text-center bg-teal-50/10">
            <span className="text-3xs uppercase text-teal-400 tracking-wider font-bold block print:text-teal-900">Laba Bersih Setahun</span>
            <span className="text-lg font-bold text-teal-300 font-mono mt-1 block print:text-teal-850">{formatRupiah(yearlyNetProfit)}</span>
          </div>
        </div>
      </div>

      {/* GRAPH CHART SECTION (Visually premium bar representation) */}
      <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-705 shadow-md space-y-4 print:hidden">
        <div>
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300">Grafik Perbandingan Keuangan Berjalan</h4>
          <p className="text-[10px] text-slate-455">Komparasi Antara Omset Kotor (Lunas + pending) vs Beban/Sewa di tahun {selectedYear}</p>
        </div>

        {/* Custom SVG line-bar multi representation */}
        <div className="relative w-full h-80 pt-4 text-slate-400 text-[10px] select-none font-mono">
          {/* Grid lines */}
          {[1, 0.75, 0.5, 0.25, 0].map((ratio) => {
            const hVal = Math.round(maxYearlyValue * ratio);
            const bottomPercent = ratio * 72 + 10; // offset bounds
            return (
              <div key={ratio} className="absolute left-0 w-full" style={{ bottom: `${bottomPercent}%` }}>
                <div className="flex justify-between items-center border-t border-slate-700/25">
                  <span className="bg-slate-900 pr-2 -translate-y-2">{formatRupiah(hVal)}</span>
                </div>
              </div>
            );
          })}

          {/* Dynamic Render bar tracks */}
          <div className="absolute inset-x-14 bottom-12 top-4 flex justify-between items-end h-56 px-2">
            {monthlyDataPoints.map((data, idx) => {
              const grossHeight = (data.gross / maxYearlyValue) * 100;
              const expenseHeight = (data.expense / maxYearlyValue) * 100;
              const isMonthHasDat = data.gross > 0 || data.expense > 0;

              return (
                <div key={idx} className="flex flex-col items-center group relative w-full">
                  {/* Tooltip on over */}
                  <div className="absolute -top-14 bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 text-3xs w-36 space-y-0.5">
                    <p className="font-bold text-white text-uppercase">{data.name}</p>
                    <p className="text-teal-400">Received: {formatRupiah(data.received)}</p>
                    <p className="text-amber-400">Pending: {formatRupiah(data.pending)}</p>
                    <p className="text-rose-400">Expense: {formatRupiah(data.expense)}</p>
                  </div>

                  {/* Dual stack values */}
                  <div className="flex gap-1 items-end h-44 mt-3">
                    {/* Gross Bar */}
                    <div 
                      className="w-2.5 sm:w-4 bg-teal-500 rounded-t-sm hover:brightness-110 transition-all cursor-crosshair"
                      style={{ height: `${grossHeight}%`, minHeight: isMonthHasDat ? '3px' : '0' }}
                    />
                    {/* Expense Bar */}
                    <div 
                      className="w-2.5 sm:w-4 bg-rose-500 rounded-t-sm hover:brightness-110 transition-all cursor-crosshair"
                      style={{ height: `${expenseHeight}%`, minHeight: isMonthHasDat ? '3px' : '0' }}
                    />
                  </div>

                  {/* Month Label abbreviated */}
                  <span className="text-[9px] text-slate-400 font-sans mt-2.5">{data.name.slice(0, 3)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-4 text-[10px] font-semibold tracking-wider font-mono px-4 py-2.5 bg-slate-900/60 rounded-xl border border-slate-750">
          <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-2 bg-teal-500 rounded-sm"></span> PENERBITAN TAGIHAN (OMSET BRUTO)</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-2 bg-rose-500 rounded-sm"></span> PENGELUARAN / BEBAN</span>
        </div>
      </div>

      {/* DETAIL LEDGER SHOWCASE IN PRINT FILE */}
      <div className="hidden print:block pt-8">
        <h4 className="text-xs font-extrabold uppercase text-slate-900 border-b pb-1 mb-3">Detail Transaksi Operasional Bulanan</h4>
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b font-bold bg-slate-100 text-slate-700">
              <th className="p-2">Tanggal</th>
              <th className="p-2">Uraian Kategori</th>
              <th className="p-2">Jenis</th>
              <th className="p-2 text-right">Nilai Rupiah</th>
            </tr>
          </thead>
          <tbody className="divide-y text-slate-800">
            {transactions
              .filter(tx => tx.date.startsWith(targetPeriod))
              .map(tx => (
                <tr key={tx.id}>
                  <td className="p-2 font-mono">{tx.date}</td>
                  <td className="p-2">
                    <span className="font-bold">[{tx.category.toUpperCase()}]</span> {tx.description}
                  </td>
                  <td className="p-2 text-center uppercase font-mono">{tx.type}</td>
                  <td className="p-2 text-right font-mono font-semibold">{formatRupiah(tx.amount)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
