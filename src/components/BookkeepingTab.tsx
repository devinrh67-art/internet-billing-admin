import React, { useState } from 'react';
import { 
  Plus, Search, Filter, CheckCircle2, XCircle, 
  Send, Receipt, Calendar, CreditCard, 
  ArrowUpRight, ArrowDownRight, Printer, RefreshCw,
  Clock, DollarSign, Wallet, Pencil, Trash2
} from 'lucide-react';
import { Customer, Invoice, Transaction } from '../types';
import { DEFAULT_PACKAGES, formatRupiah, formatIndonesianDate, getIndonesianMonthYear } from '../utils/billing';

interface BookkeepingTabProps {
  customers: Customer[];
  invoices: Invoice[];
  transactions: Transaction[];
  onGenerateMonthlyInvoices: (month: string) => void;
  onPayInvoice: (invoiceId: string, paymentMethod: 'cash' | 'transfer') => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
  onSendBill: (customer: Customer, invoice?: Invoice) => void;
  onEditInvoice: (invoiceId: string, updatedFields: Partial<Invoice>) => void;
  onDeleteInvoice: (invoiceId: string) => void;
  onEditTransaction: (transactionId: string, updatedFields: Partial<Transaction>) => void;
  onDeleteTransaction: (transactionId: string) => void;
}

export default function BookkeepingTab({
  customers,
  invoices,
  transactions,
  onGenerateMonthlyInvoices,
  onPayInvoice,
  onAddTransaction,
  onSendBill,
  onEditInvoice,
  onDeleteInvoice,
  onEditTransaction,
  onDeleteTransaction
}: BookkeepingTabProps) {
  const currentMonth = '2026-05';
  const [activeTab, setActiveTab] = useState<'invoices' | 'transactions'>('invoices');
  
  // Search and filter states
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'semua' | 'lunas' | 'belum_bayar'>('semua');
  const [invoiceMonthFilter, setInvoiceMonthFilter] = useState('2026-05');
  
  const [txSearch, setTxSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<'semua' | 'pemasukan' | 'pengeluaran'>('semua');

  // New Transaction form modals
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<'pemasukan' | 'pengeluaran'>('pengeluaran');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState<'operasional' | 'alat' | 'lainnya'>('operasional');
  const [txDescription, setTxDescription] = useState('');
  const [txPaymentMethod, setTxPaymentMethod] = useState<'cash' | 'transfer'>('transfer');

  // Pay Invoice modal trigger
  const [selectedPayInvoice, setSelectedPayInvoice] = useState<Invoice | null>(null);
  const [payMethod, setPayMethod] = useState<'cash' | 'transfer'>('transfer');

  // Edit Invoice modal states
  const [selectedEditInvoice, setSelectedEditInvoice] = useState<Invoice | null>(null);
  const [editInvoiceAmount, setEditInvoiceAmount] = useState('');
  const [editInvoiceBillingMonth, setEditInvoiceBillingMonth] = useState('');
  const [editInvoiceDueDate, setEditInvoiceDueDate] = useState('');
  const [editInvoiceStatus, setEditInvoiceStatus] = useState<'lunas' | 'belum_bayar' | 'terlambat'>('belum_bayar');
  const [editInvoicePaymentDate, setEditInvoicePaymentDate] = useState('');

  // Edit Transaction modal states
  const [selectedEditTransaction, setSelectedEditTransaction] = useState<Transaction | null>(null);
  const [editTxDescription, setEditTxDescription] = useState('');
  const [editTxAmount, setEditTxAmount] = useState('');
  const [editTxCategory, setEditTxCategory] = useState('operasional');
  const [editTxPaymentMethod, setEditTxPaymentMethod] = useState<'cash' | 'transfer'>('transfer');
  const [editTxType, setEditTxType] = useState<'pemasukan' | 'pengeluaran'>('pengeluaran');
  const [editTxDate, setEditTxDate] = useState('');

  // Handle pay submission
  const handlePayInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayInvoice) return;
    onPayInvoice(selectedPayInvoice.id, payMethod);
    setSelectedPayInvoice(null);
  };

  const handleCreateTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount || parseFloat(txAmount) <= 0) return;
    
    onAddTransaction({
      customerId: '',
      customerName: '',
      type: txType,
      amount: parseFloat(txAmount),
      category: txCategory,
      description: txDescription.trim(),
      paymentMethod: txPaymentMethod,
    });

    setIsTxModalOpen(false);
    // Reset Form
    setTxAmount('');
    setTxDescription('');
  };

  // Edit handlers
  const handleOpenEditInvoice = (inv: Invoice) => {
    setSelectedEditInvoice(inv);
    setEditInvoiceAmount(inv.amount.toString());
    setEditInvoiceBillingMonth(inv.billingMonth);
    setEditInvoiceDueDate(inv.dueDate);
    setEditInvoiceStatus(inv.status);
    setEditInvoicePaymentDate(inv.paymentDate || new Date().toISOString().split('T')[0]);
  };

  const handleEditInvoiceFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditInvoice) return;
    onEditInvoice(selectedEditInvoice.id, {
      amount: parseFloat(editInvoiceAmount),
      billingMonth: editInvoiceBillingMonth,
      dueDate: editInvoiceDueDate,
      status: editInvoiceStatus,
      paymentDate: editInvoiceStatus === 'lunas' ? editInvoicePaymentDate : undefined,
    });
    setSelectedEditInvoice(null);
  };

  const handleOpenEditTransaction = (tx: Transaction) => {
    setSelectedEditTransaction(tx);
    setEditTxDescription(tx.description);
    setEditTxAmount(tx.amount.toString());
    setEditTxCategory(tx.category);
    setEditTxPaymentMethod(tx.paymentMethod);
    setEditTxType(tx.type);
    setEditTxDate(tx.date);
  };

  const handleEditTransactionFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditTransaction) return;
    onEditTransaction(selectedEditTransaction.id, {
      description: editTxDescription,
      amount: parseFloat(editTxAmount),
      category: editTxCategory as any,
      paymentMethod: editTxPaymentMethod,
      type: editTxType,
      date: editTxDate,
    });
    setSelectedEditTransaction(null);
  };

  // Filter lists
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.customerName.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      inv.packageName.toLowerCase().includes(invoiceSearch.toLowerCase());
    
    const matchesStatus = 
      invoiceStatusFilter === 'semua' || 
      (invoiceStatusFilter === 'lunas' && inv.status === 'lunas') ||
      (invoiceStatusFilter === 'belum_bayar' && inv.status !== 'lunas');

    const matchesMonth = inv.billingMonth === invoiceMonthFilter;

    return matchesSearch && matchesStatus && matchesMonth;
  });

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = 
      tx.customerName.toLowerCase().includes(txSearch.toLowerCase()) ||
      tx.description.toLowerCase().includes(txSearch.toLowerCase());
    const matchesType = txTypeFilter === 'semua' || tx.type === txTypeFilter;
    return matchesSearch && matchesType;
  });

  // Unique lists of billing months in invoices to filter by
  const billingMonthsList = Array.from(new Set(invoices.map(inv => inv.billingMonth))).sort().reverse();

  return (
    <div className="space-y-6">
      {/* Overview stats block */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700/40 font-sans flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <ArrowUpRight className="h-6 w-6" />
          </div>
          <div>
            <p className="text-3xs text-slate-400 uppercase tracking-wider font-semibold">Total Pemasukan Operasional</p>
            <h4 className="text-lg font-bold text-white mt-0.5">
              {formatRupiah(transactions.filter(t => t.type === 'pemasukan').reduce((a, b) => a + b.amount, 0))}
            </h4>
          </div>
        </div>

        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700/40 font-sans flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 text-rose-450 rounded-lg">
            <ArrowDownRight className="h-6 w-6" />
          </div>
          <div>
            <p className="text-3xs text-slate-400 uppercase tracking-wider font-semibold">Total Pengeluaran Alat/Operasional</p>
            <h4 className="text-lg font-bold text-white mt-0.5">
              {formatRupiah(transactions.filter(t => t.type === 'pengeluaran').reduce((a, b) => a + b.amount, 0))}
            </h4>
          </div>
        </div>

        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700/40 font-sans flex items-center gap-4">
          <div className="p-3 bg-teal-500/10 text-teal-300 rounded-lg">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <p className="text-3xs text-slate-400 uppercase tracking-wider font-semibold">Kas Berjalan Bersih</p>
            <h4 className="text-lg font-bold text-teal-300 mt-0.5">
              {formatRupiah(
                transactions.filter(t => t.type === 'pemasukan').reduce((a, b) => a + b.amount, 0) -
                transactions.filter(t => t.type === 'pengeluaran').reduce((a, b) => a + b.amount, 0)
              )}
            </h4>
          </div>
        </div>
      </div>

      {/* Navigation and Actions */}
      <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Toggle switches */}
        <div className="flex bg-slate-900 p-1.5 rounded-lg border border-slate-700 w-full md:w-auto">
          <button
            id="tab-toggle-invoices"
            onClick={() => setActiveTab('invoices')}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === 'invoices' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Tagihan Pelanggan (Invoices)
          </button>
          <button
            id="tab-toggle-transactions"
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === 'transactions' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Buku Pelaporan Pengeluaran/Kas
          </button>
        </div>

        {/* Action button right side */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {activeTab === 'invoices' ? (
            <button
              id="btn-generate-invoices"
              onClick={() => {
                if (window.confirm(`Hasilkan lembar tagihan pembayaran prorata dan reguler untuk seluruh pelanggan ISP pada tanggal 1 bulan ${getIndonesianMonthYear(currentMonth)}?`)) {
                  onGenerateMonthlyInvoices(currentMonth);
                }
              }}
              className="w-full md:w-auto px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-medium text-xs rounded-lg transition-all flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Siklus Tagihan Baru (Tgl 1)
            </button>
          ) : (
            <button
              id="btn-add-expense"
              onClick={() => setIsTxModalOpen(true)}
              className="w-full md:w-auto px-4 py-2 bg-teal-600 hover:bg-teal-555 text-white font-medium text-xs rounded-lg transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Catat Pengeluaran Baru
            </button>
          )}
        </div>
      </div>

      {/* RENDER INVOICES SECTION */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Inner filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-800/60 p-4 rounded-xl border border-slate-705">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-450" />
              <input
                id="input-invoice-search"
                type="text"
                placeholder="Cari nama pelanggan..."
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-550 focus:outline-none"
              />
            </div>

            <div>
              <select
                id="select-invoice-status"
                value={invoiceStatusFilter}
                onChange={(e) => setInvoiceStatusFilter(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none"
              >
                <option value="semua">Semua Status Bayar</option>
                <option value="lunas">Lunas (Paid)</option>
                <option value="belum_bayar">Belum Lunas (Unpaid)</option>
              </select>
            </div>

            <div>
              <select
                id="select-invoice-month"
                value={invoiceMonthFilter}
                onChange={(e) => setInvoiceMonthFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none"
              >
                {billingMonthsList.map(month => (
                  <option key={month} value={month}>
                    Bulan: {getIndonesianMonthYear(month)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* List display */}
          <div className="bg-slate-800 rounded-xl border border-slate-700/40 overflow-hidden">
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-10 w-10 text-slate-650 mx-auto mb-2" />
                <p className="text-xs text-slate-450">Tidak ada data tagihan yang sesuai kriteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-700 text-2xs">
                    <tr>
                      <th className="p-4">Invoice ID</th>
                      <th className="p-4">Pelanggan Wifi</th>
                      <th className="p-4">Paket / Layanan</th>
                      <th className="p-4">Periode</th>
                      <th className="p-4 text-right">Nilai Tagihan</th>
                      <th className="p-4">Tanggal Tempo</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/40">
                    {filteredInvoices.map((inv) => {
                      const client = customers.find(c => c.id === inv.customerId);

                      return (
                        <tr key={inv.id} className="hover:bg-slate-750/30 transition-colors">
                          <td className="p-4 font-mono font-bold text-slate-350">{inv.id}</td>
                          <td className="p-4 font-semibold text-white">
                            <div>{inv.customerName}</div>
                            <div className="text-[10px] text-slate-450 font-normal">{inv.customerPhone}</div>
                          </td>
                          <td className="p-4 text-slate-300">
                            <div>{inv.packageName}</div>
                            <div className="text-[10px] text-slate-450">{formatRupiah(inv.packagePrice)} / bln</div>
                          </td>
                          <td className="p-4 font-mono text-slate-400">{getIndonesianMonthYear(inv.billingMonth)}</td>
                          <td className="p-4 text-right font-bold text-teal-400 font-mono">{formatRupiah(inv.amount)}</td>
                          <td className="p-4 font-mono text-slate-450">{formatIndonesianDate(inv.dueDate)}</td>
                          <td className="p-4 text-center">
                            {inv.status === 'lunas' ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 font-extrabold px-2.5 py-0.5 rounded text-[10px] uppercase font-sans">
                                Lunas ({formatIndonesianDate(inv.paymentDate || '')})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-455 font-extrabold px-2.5 py-0.5 rounded text-[10px] uppercase font-sans">
                                Belum Bayar
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right space-x-1.5 shrink-0 whitespace-nowrap">
                            {inv.status !== 'lunas' && (
                              <button
                                onClick={() => setSelectedPayInvoice(inv)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-555 text-white font-bold rounded-md text-[10px] uppercase transition-colors"
                              >
                                Lunasi
                              </button>
                            )}
                            <button
                              id={`send-invoice-wa-${inv.id}`}
                              onClick={() => {
                                if (client) onSendBill(client, inv);
                              }}
                              className="px-2.5 py-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 hover:text-white rounded-md text-[10px] transition-colors border border-teal-500/20"
                            >
                              Kirim WA
                            </button>
                            <button
                              id={`edit-invoice-${inv.id}`}
                              onClick={() => handleOpenEditInvoice(inv)}
                              className="p-1 text-slate-400 hover:text-teal-400 inline-flex items-center transition-all rounded align-middle"
                              title="Edit Tagihan"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              id={`delete-invoice-${inv.id}`}
                              onClick={() => {
                                if (window.confirm('Apakah Anda yakin ingin menghapus tagihan ini?')) {
                                  onDeleteInvoice(inv.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-450 inline-flex items-center transition-all rounded align-middle"
                              title="Hapus Tagihan"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RENDER TRANSACTIONS CASH LEDGER */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-800/60 p-4 rounded-xl border border-slate-705">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-450" />
              <input
                id="input-tx-search"
                type="text"
                placeholder="Cari deskripsi transaksi..."
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-550 focus:outline-none"
              />
            </div>

            <div>
              <select
                id="select-tx-type"
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none"
              >
                <option value="semua">Semua Jenis Kas</option>
                <option value="pemasukan">Kategori: Pemasukan Wifi</option>
                <option value="pengeluaran">Kategori: Pengeluaran / Beban</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl border border-slate-700/40 overflow-hidden">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-10 w-10 text-slate-650 mx-auto mb-2" />
                <p className="text-xs text-slate-450">Tidak ada pengeluaran atau pemasukan tercatat.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-700 text-2xs">
                    <tr>
                      <th className="p-4">Tanggal</th>
                      <th className="p-4">Kategori / Deskripsi</th>
                      <th className="p-4">Metode</th>
                      <th className="p-4 text-center">Jenis</th>
                      <th className="p-4 text-right">Jumlah Uang</th>
                      <th className="p-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/40">
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-750/30 transition-colors">
                        <td className="p-4 font-mono text-slate-400 whitespace-nowrap">{formatIndonesianDate(tx.date)}</td>
                        <td className="p-4">
                          <span className="px-1.5 py-0.5 bg-slate-900 text-teal-300 rounded text-3xs font-mono font-medium uppercase tracking-wide mr-2 inline-block">
                            {tx.category}
                          </span>
                          <span className="font-semibold text-white">{tx.description}</span>
                          {tx.customerName && (
                            <span className="block text-[10px] text-slate-450 mt-0.5">Dari Pelanggan: {tx.customerName}</span>
                          )}
                        </td>
                        <td className="p-4 uppercase font-mono text-slate-400 text-3xs tracking-wider">{tx.paymentMethod}</td>
                        <td className="p-4 text-center">
                          {tx.type === 'pemasukan' ? (
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 font-extrabold rounded-sm uppercase text-3xs tracking-wider">Pemasukan</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-rose-500/10 text-rose-450 font-extrabold rounded-sm uppercase text-3xs tracking-wider">Pengeluaran</span>
                          )}
                        </td>
                        <td className={`p-4 text-right font-bold font-mono text-sm ${tx.type === 'pemasukan' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {tx.type === 'pemasukan' ? '+' : '-'} {formatRupiah(tx.amount)}
                        </td>
                        <td className="p-4 text-right space-x-1.5 shrink-0 whitespace-nowrap align-middle">
                          <button
                            id={`edit-tx-${tx.id}`}
                            onClick={() => handleOpenEditTransaction(tx)}
                            className="p-1 text-slate-400 hover:text-teal-400 inline-flex items-center transition-all rounded align-middle"
                            title="Edit Transaksi"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            id={`delete-tx-${tx.id}`}
                            onClick={() => {
                              if (window.confirm('Apakah Anda yakin ingin menghapus catatan transaksi ini?')) {
                                onDeleteTransaction(tx.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-450 inline-flex items-center transition-all rounded align-middle"
                            title="Hapus Transaksi"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LUNASI INVOICE MODAL POPUP */}
      {selectedPayInvoice && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-850 rounded-2xl border border-slate-700 max-w-md w-full overflow-hidden p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Konfirmasi Pembayaran Lunas</h3>
            
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2 mt-4">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Nama Pelanggan:</span>
                <span className="font-bold text-white">{selectedPayInvoice.customerName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Periode Tagihan:</span>
                <span className="font-semibold text-slate-350">{getIndonesianMonthYear(selectedPayInvoice.billingMonth)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Rincian Paket:</span>
                <span className="text-slate-300">{selectedPayInvoice.packageName}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-teal-400 pt-2 border-t border-slate-800 font-mono">
                <span>Nilai Pembayaran:</span>
                <span>{formatRupiah(selectedPayInvoice.amount)}</span>
              </div>
            </div>

            <form onSubmit={handlePayInvoiceSubmit} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">Pilih Metode Pembayaran</label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setPayMethod('transfer')}
                    className={`p-3 rounded-lg border text-sm font-semibold transition-all flex flex-col items-center gap-1 ${payMethod === 'transfer' ? 'border-teal-550 bg-teal-500/10 text-teal-300' : 'border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-850'}`}
                  >
                    <CreditCard className="h-5 w-5" />
                    BCA / Transfer (E-Bank)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod('cash')}
                    className={`p-3 rounded-lg border text-sm font-semibold transition-all flex flex-col items-center gap-1 ${payMethod === 'cash' ? 'border-teal-550 bg-teal-500/10 text-teal-300' : 'border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-850'}`}
                  >
                    <DollarSign className="h-5 w-5" />
                    Tunai (Ke Operator)
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPayInvoice(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  id="confirm-pay-submit"
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-555 text-white rounded text-xs font-semibold shadow"
                >
                  Proses & Tandai Lunas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD EXPENSE OPERATIONAL TX MODAL */}
      {isTxModalOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-850 rounded-2xl border border-slate-700 max-w-md w-full overflow-hidden p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700 mb-4">
              <h3 className="text-base font-bold text-white">Catat Pembukuan Pengeluaran</h3>
              <button onClick={() => setIsTxModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateTxSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-350 uppercase">Alur Arus Kas</label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setTxType('pengeluaran')}
                    className={`p-2 rounded text-xs font-semibold border ${txType === 'pengeluaran' ? 'border-rose-700 bg-rose-500/10 text-rose-400' : 'border-slate-700 bg-slate-900 text-slate-400'}`}
                  >
                    Pengeluaran (Beban/Alat)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxType('pemasukan')}
                    className={`p-2 rounded text-xs font-semibold border ${txType === 'pemasukan' ? 'border-emerald-700 bg-emerald-505/10 text-emerald-400' : 'border-slate-700 bg-slate-900 text-slate-400'}`}
                  >
                    Pemasukan Non-Tagihan
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-350 uppercase">Kategori Pembukuan</label>
                <select
                  id="tx-category"
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value as any)}
                  className="mt-1.5 w-full bg-slate-900 border border-slate-750 text-white rounded p-2 text-xs focus:outline-none"
                >
                  <option value="operasional">Beban Operasional Wi-Fi</option>
                  <option value="alat">Investasi Kode ODP / Kabel / FO / Mikrotik</option>
                  <option value="lainnya">Lain-lain</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-355 uppercase">Sirkulasi Uang (Jumlah Rupiah) *</label>
                <input
                  id="tx-amount"
                  type="number"
                  required
                  placeholder="Contoh: 150000"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className="mt-1.5 w-full bg-slate-900 border border-slate-750 text-white rounded p-2 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-355 uppercase">Metode Pembayaran</label>
                <select
                  id="tx-method"
                  value={txPaymentMethod}
                  onChange={(e) => setTxPaymentMethod(e.target.value as any)}
                  className="mt-1.5 w-full bg-slate-900 border border-slate-750 text-white rounded p-2 text-xs focus:outline-none"
                >
                  <option value="transfer">E-Wallet / Bank Transfer</option>
                  <option value="cash">Uang Tunai (Kas Fisik)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-355 uppercase">Deskripsi Catatan Transaksi *</label>
                <textarea
                  id="tx-description"
                  required
                  rows={2}
                  placeholder="Contoh: Pembelian Patch Cord fiber optic 1 box atau token listrik base transceiver station..."
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  className="mt-1.5 w-full bg-slate-900 border border-slate-750 text-white rounded p-2 text-xs focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsTxModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded text-xs font-semibold hover:bg-slate-700"
                >
                  Batalkan
                </button>
                <button
                  id="submit-tx-btn"
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-555 text-white rounded text-xs font-semibold"
                >
                  Simpan Catatan Kas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT INVOICE MODAL POPUP */}
      {selectedEditInvoice && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-850 rounded-2xl border border-slate-700 max-w-md w-full overflow-hidden p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700 mb-4">
              <h3 className="text-base font-bold text-white">Edit Rincian Tagihan</h3>
              <button onClick={() => setSelectedEditInvoice(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleEditInvoiceFormSubmit} className="space-y-4">
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs text-slate-300">
                <div><span className="text-slate-400">Invoice:</span> <span className="font-mono font-bold">{selectedEditInvoice.id}</span></div>
                <div><span className="text-slate-400">Pelanggan:</span> <span className="font-semibold text-white">{selectedEditInvoice.customerName}</span></div>
                <div><span className="text-slate-400">Paket:</span> {selectedEditInvoice.packageName}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-350 uppercase">Status Pembayaran</label>
                <select
                  id="edit-inv-status"
                  value={editInvoiceStatus}
                  onChange={(e) => setEditInvoiceStatus(e.target.value as any)}
                  className="mt-1.5 w-full bg-slate-900 border border-slate-750 text-white rounded p-2 text-xs focus:outline-none"
                >
                  <option value="belum_bayar">Belum Bayar</option>
                  <option value="lunas">Lunas</option>
                  <option value="terlambat">Terlambat</option>
                </select>
              </div>

              {editInvoiceStatus === 'lunas' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-355 uppercase">Tanggal Pelunasan</label>
                  <input
                    id="edit-inv-paydate"
                    type="date"
                    required
                    value={editInvoicePaymentDate}
                    onChange={(e) => setEditInvoicePaymentDate(e.target.value)}
                    className="mt-1.5 w-full bg-slate-900 border border-slate-750 text-white rounded p-2 text-xs focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-355 uppercase">Nilai Tagihan (Rupiah)</label>
                <input
                  id="edit-inv-amount"
                  type="number"
                  required
                  value={editInvoiceAmount}
                  onChange={(e) => setEditInvoiceAmount(e.target.value)}
                  className="mt-1.5 w-full bg-slate-900 border border-slate-750 text-white rounded p-2 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-355 uppercase">Periode (YYYY-MM)</label>
                  <input
                    id="edit-inv-period"
                    type="text"
                    required
                    placeholder="2026-05"
                    value={editInvoiceBillingMonth}
                    onChange={(e) => setEditInvoiceBillingMonth(e.target.value)}
                    className="mt-1.5 w-full bg-slate-900 border border-slate-750 text-white rounded p-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-355 uppercase">Jatuh Tempo</label>
                  <input
                    id="edit-inv-due"
                    type="date"
                    required
                    value={editInvoiceDueDate}
                    onChange={(e) => setEditInvoiceDueDate(e.target.value)}
                    className="mt-1.5 w-full bg-slate-900 border border-slate-750 text-white rounded p-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setSelectedEditInvoice(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded text-xs font-semibold hover:bg-slate-700"
                >
                  Batalkan
                </button>
                <button
                  id="submit-edit-inv-btn"
                  type="submit"
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-555 text-white rounded text-xs font-semibold shadow"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TRANSACTION MODAL POPUP */}
      {selectedEditTransaction && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-850 rounded-2xl border border-slate-700 max-w-md w-full overflow-hidden p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700 mb-4">
              <h3 className="text-base font-bold text-white">Edit Transaksi Kas</h3>
              <button onClick={() => setSelectedEditTransaction(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleEditTransactionFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-350 uppercase">Alur Arus Kas</label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setEditTxType('pengeluaran')}
                    className={`p-2 rounded text-xs font-semibold border ${editTxType === 'pengeluaran' ? 'border-rose-700 bg-rose-500/10 text-rose-455' : 'border-slate-700 bg-slate-900 text-slate-400'}`}
                  >
                    Pengeluaran
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTxType('pemasukan')}
                    className={`p-2 rounded text-xs font-semibold border ${editTxType === 'pemasukan' ? 'border-emerald-700 bg-emerald-505/10 text-emerald-400' : 'border-slate-700 bg-slate-900 text-slate-400'}`}
                  >
                    Pemasukan
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-355 uppercase">Kategori Pembukuan</label>
                <select
                  id="edit-tx-category-select"
                  value={editTxCategory}
                  onChange={(e) => setEditTxCategory(e.target.value)}
                  className="mt-1.5 w-full bg-slate-900 border border-slate-750 text-white rounded p-2 text-xs focus:outline-none"
                >
                  <option value="tagihan">Pelunasan Tagihan Wifi</option>
                  <option value="prorate">Biaya Registrasi / Prorata</option>
                  <option value="operasional">Beban Operasional Wi-Fi</option>
                  <option value="alat">Investasi Alat & ODP</option>
                  <option value="lainnya">Lain-lain</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-355 uppercase">Jumlah Uang (Rupiah)</label>
                  <input
                    id="edit-tx-amount-input"
                    type="number"
                    required
                    value={editTxAmount}
                    onChange={(e) => setEditTxAmount(e.target.value)}
                    className="mt-1.5 w-full bg-slate-900 border border-slate-750 text-white rounded p-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-355 uppercase">Tanggal Transaksi</label>
                  <input
                    id="edit-tx-date-input"
                    type="date"
                    required
                    value={editTxDate}
                    onChange={(e) => setEditTxDate(e.target.value)}
                    className="mt-1.5 w-full bg-slate-900 border border-slate-750 text-white rounded p-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-355 uppercase">Metode Pembayaran</label>
                <select
                  id="edit-tx-method-select"
                  value={editTxPaymentMethod}
                  onChange={(e) => setEditTxPaymentMethod(e.target.value as any)}
                  className="mt-1.5 w-full bg-slate-900 border border-slate-750 text-white rounded p-2 text-xs focus:outline-none"
                >
                  <option value="transfer">E-Wallet / Bank Transfer</option>
                  <option value="cash">Uang Tunai (Kas Fisik)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-355 uppercase">Deskripsi Catatan Transaksi *</label>
                <textarea
                  id="edit-tx-desc-input"
                  required
                  rows={2}
                  value={editTxDescription}
                  onChange={(e) => setEditTxDescription(e.target.value)}
                  className="mt-1.5 w-full bg-slate-900 border border-slate-750 text-white rounded p-2 text-xs focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setSelectedEditTransaction(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded text-xs font-semibold hover:bg-slate-700"
                >
                  Batalkan
                </button>
                <button
                  id="submit-edit-tx-btn"
                  type="submit"
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-555 text-white rounded text-xs font-semibold shadow"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
