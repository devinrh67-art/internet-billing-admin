import React, { useState, useEffect, useRef } from 'react';
import { 
  Network, Users, Receipt, BarChart3, Server, 
  ShieldCheck, LogOut, LayoutDashboard, Copy, 
  Send, Calendar, Printer, CheckCircle, Wifi, SignalHigh, CheckSquare, ClipboardList,
  Sun, Moon
} from 'lucide-react';

import { AppUser, Customer, Transaction, Invoice } from './types';
import { DEFAULT_PACKAGES, formatRupiah, formatIndonesianDate, getIndonesianMonthYear } from './utils/billing';
import { DEFAULT_USERS, DEFAULT_CUSTOMERS, DEFAULT_INVOICES, DEFAULT_TRANSACTIONS } from './utils/mockData';

// Component imports
import LoginScreen from './components/LoginScreen';
import DashboardTab from './components/DashboardTab';
import CustomersTab from './components/CustomersTab';
import BookkeepingTab from './components/BookkeepingTab';
import ReportsTab from './components/ReportsTab';
import MikrotikTab from './components/MikrotikTab';
import AccountsTab from './components/AccountsTab';

export default function App() {
  // 1. Data States initialized from localStorage if available (with fallback)
  const [users, setUsers] = useState<AppUser[]>(() => {
    const saved = localStorage.getItem('tiva_users');
    return saved ? JSON.parse(saved) : DEFAULT_USERS;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('tiva_customers');
    return saved ? JSON.parse(saved) : DEFAULT_CUSTOMERS;
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('tiva_invoices');
    return saved ? JSON.parse(saved) : DEFAULT_INVOICES;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('tiva_transactions');
    return saved ? JSON.parse(saved) : DEFAULT_TRANSACTIONS;
  });

  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem('tiva_session');
    return saved ? JSON.parse(saved) : null;
  });

  // Syncing states
  const dbVersionRef = useRef(0);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'connecting' | 'offline'>('connecting');

  // Active Tab
  const [activeTab, setActiveTab] = useState<number>(0);

  // Theme support (light/dark mode)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('tiva_theme') as 'dark' | 'light') || 'dark';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('tiva_theme', nextTheme);
  };

  // Billing Modal WhatsApp trigger
  const [billingModalData, setBillingModalData] = useState<{
    customer: Customer;
    invoice?: Invoice;
  } | null>(null);

  const [hasCopiedText, setHasCopiedText] = useState(false);

  // Helper helper to update remote DB
  const syncWithServer = async (
    newUsers: AppUser[],
    newCustomers: Customer[],
    newInvoices: Invoice[],
    newTransactions: Transaction[]
  ) => {
    try {
      const res = await fetch('/api/db/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users: newUsers,
          customers: newCustomers,
          invoices: newInvoices,
          transactions: newTransactions
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          dbVersionRef.current = data.version;
          setSyncStatus('synced');
        }
      }
    } catch (err) {
      console.error("Failed to sync change to server:", err);
      setSyncStatus('offline');
    }
  };

  // Full-stack database initial bootstrap and periodic polling
  useEffect(() => {
    let active = true;

    const bootstrapAndLoad = async () => {
      try {
        setSyncStatus('connecting');
        const res = await fetch('/api/db');
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        
        if (!active) return;

        if (data.initialized) {
          setUsers(data.users || []);
          setCustomers(data.customers || []);
          setInvoices(data.invoices || []);
          setTransactions(data.transactions || []);
          dbVersionRef.current = data.version || 1;
          setSyncStatus('synced');
        } else {
          // Initialize server with our initial states
          const initRes = await fetch('/api/db/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              users,
              customers,
              invoices,
              transactions
            })
          });
          if (initRes.ok) {
            const initData = await initRes.json();
            if (active && initData.success) {
              dbVersionRef.current = initData.db.version || 1;
              setSyncStatus('synced');
            }
          }
        }
      } catch (err) {
        console.error("Error communicating with central database:", err);
        if (active) setSyncStatus('offline');
      }
    };

    bootstrapAndLoad();

    // Poll server every 4 seconds for concurrent operator sessions changes
    const poller = setInterval(async () => {
      try {
        const res = await fetch('/api/db');
        if (!res.ok) throw new Error("Offline status");
        const data = await res.json();
        
        if (!active) return;
        setSyncStatus('synced');

        if (data.initialized && data.version > dbVersionRef.current) {
          setUsers(data.users || []);
          setCustomers(data.customers || []);
          setInvoices(data.invoices || []);
          setTransactions(data.transactions || []);
          dbVersionRef.current = data.version;
        }
      } catch (err) {
        console.error("Server polling error:", err);
        if (active) setSyncStatus('offline');
      }
    }, 4000);

    return () => {
      active = false;
      clearInterval(poller);
    };
  }, []);

  // Save states backup strictly to local storage on change for offline tolerance
  useEffect(() => {
    localStorage.setItem('tiva_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('tiva_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('tiva_invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('tiva_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('tiva_session', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('tiva_session');
    }
  }, [currentUser]);

  // Automatic customer isolation logic based on unpaid overdue invoices > 5 days limit
  useEffect(() => {
    if (customers.length === 0 || invoices.length === 0) return;

    const todayStr = new Date().toISOString().split('T')[0];
    let hasChanges = false;

    const updatedCustomers = customers.map(cust => {
      // Only check currently active customers
      if (cust.status !== 'aktif') return cust;

      // Find if there is an unpaid invoice for this customer that has overdue by > 5 days
      const hasOverdueInvoice = invoices.some(inv => {
        if (inv.customerId === cust.id && inv.status === 'belum_bayar') {
          const [tY, tM, tD] = todayStr.split('-').map(Number);
          const [dY, dM, dD] = inv.dueDate.split('-').map(Number);
          const todayDate = new Date(tY, tM - 1, tD);
          const dueDate = new Date(dY, dM - 1, dD);
          const diffTime = todayDate.getTime() - dueDate.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          return diffDays > 5;
        }
        return false;
      });

      if (hasOverdueInvoice) {
        hasChanges = true;
        return {
          ...cust,
          status: 'isolir' as const
        };
      }
      return cust;
    });

    if (hasChanges) {
      console.log('Automated systems: Quarantining (Status: "isolir") customers with overdue bills over 5 days.');
      setCustomers(updatedCustomers);
      syncWithServer(users, updatedCustomers, invoices, transactions);
    }
  }, [customers, invoices, users, transactions]);

  // Auth helper
  const handleLoginSuccess = (user: AppUser) => {
    setCurrentUser(user);
    setActiveTab(0); // Go to dashboard
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  // Customer handlers
  const handleAddCustomer = (newCust: Omit<Customer, 'id' | 'createdAt'>) => {
    const newId = `c_${Date.now()}`;
    const fullCust: Customer = {
      ...newCust,
      id: newId,
      createdAt: new Date().toISOString(),
    };
    
    const updatedCustomers = [...customers, fullCust];
    setCustomers(updatedCustomers);

    let updatedInvoices = invoices;
    let updatedTransactions = transactions;

    // Add first prorate transaction if customer joins & pays now (simulate cash invoice automatically for transparency!)
    if (newCust.prorateAmountFirstMonth > 0 && newCust.status === 'aktif') {
      const selectedPkg = DEFAULT_PACKAGES.find(p => p.id === newCust.packageId);
      const pkgName = selectedPkg ? selectedPkg.name : 'Paket Wifi';
      
      // Auto register first month prorata invoice as lunas to speed up setup
      const currentMonthStr = '2026-05';
      const invId = `inv_pro_${Date.now()}`;
      
      const firstInvoice: Invoice = {
        id: invId,
        customerId: newId,
        customerName: newCust.fullName,
        customerPhone: newCust.phone,
        packageId: newCust.packageId,
        packageName: pkgName,
        packagePrice: selectedPkg?.price || 0,
        billingMonth: currentMonthStr,
        amount: newCust.prorateAmountFirstMonth,
        dueDate: new Date().toISOString().split('T')[0],
        status: 'lunas',
        paymentDate: new Date().toISOString().split('T')[0],
      };

      const firstTx: Transaction = {
        id: `tx_pro_${Date.now()}`,
        customerId: newId,
        customerName: newCust.fullName,
        type: 'pemasukan',
        amount: newCust.prorateAmountFirstMonth,
        category: 'prorate',
        description: `Tagihan Prorata Awal (Join ${formatIndonesianDate(newCust.joinDate)}) - ${newCust.fullName}`,
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
      };

      updatedInvoices = [...invoices, firstInvoice];
      updatedTransactions = [...transactions, firstTx];

      setInvoices(updatedInvoices);
      setTransactions(updatedTransactions);
    }

    syncWithServer(users, updatedCustomers, updatedInvoices, updatedTransactions);
  };

  const handleEditCustomer = (updatedCust: Customer) => {
    const next = customers.map(c => c.id === updatedCust.id ? updatedCust : c);
    setCustomers(next);
    syncWithServer(users, next, invoices, transactions);
  };

  const handleDeleteCustomer = (id: string) => {
    const nextC = customers.filter(c => c.id !== id);
    const nextI = invoices.filter(inv => inv.customerId !== id);
    const nextT = transactions.filter(tx => tx.customerId !== id);

    setCustomers(nextC);
    setInvoices(nextI);
    setTransactions(nextT);

    syncWithServer(users, nextC, nextI, nextT);
  };

  // Bill & Bookkeeping generation handler on tanggal 1
  const handleGenerateMonthlyInvoices = (month: string) => {
    // Collect non-disconnected customers who don't already have an invoice for this month
    const validCustomers = customers.filter(c => c.status !== 'putus');
    const existingInvoices = invoices.filter(inv => inv.billingMonth === month);
    const existingCustIds = new Set(existingInvoices.map(inv => inv.customerId));

    const newInvoices: Invoice[] = [];

    validCustomers.forEach(cust => {
      if (existingCustIds.has(cust.id)) return;

      const customerPkg = DEFAULT_PACKAGES.find(p => p.id === cust.packageId);
      if (!customerPkg) return;

      // Determine due date (typically 5th of the billing month)
      const [year, monthPart] = month.split('-');
      const dueDate = `${year}-${monthPart}-05`;

      newInvoices.push({
        id: `inv_gen_${Date.now()}_${cust.id.slice(2)}`,
        customerId: cust.id,
        customerName: cust.fullName,
        customerPhone: cust.phone,
        packageId: cust.packageId,
        packageName: customerPkg.name,
        packagePrice: customerPkg.price,
        billingMonth: month,
        amount: customerPkg.price, // standard full package monthly fee on tgl 1
        dueDate,
        status: 'belum_bayar',
      });
    });

    if (newInvoices.length === 0) {
      alert(`Tagihan untuk periode ${getIndonesianMonthYear(month)} sudah pernah digenerasi sebelumnya.`);
      return;
    }

    const nextInvoices = [...invoices, ...newInvoices];
    setInvoices(nextInvoices);
    syncWithServer(users, customers, nextInvoices, transactions);
    alert(`Berhasil membuat ${newInvoices.length} lembar tagihan bulanan baru tertanggal 1 untuk periode ${getIndonesianMonthYear(month)}.`);
  };

  // Pay invoice handler
  const handlePayInvoice = (invoiceId: string, paymentMethod: 'cash' | 'transfer') => {
    const matchedInvoice = invoices.find(inv => inv.id === invoiceId);
    if (!matchedInvoice) return;

    const todayStr = new Date().toISOString().split('T')[0];

    // Mark invoice as paid
    const nextInvoices = invoices.map(inv => {
      if (inv.id === invoiceId) {
        return {
          ...inv,
          status: 'lunas',
          paymentDate: todayStr,
        } as Invoice;
      }
      return inv;
    });

    // Put transaction in cash book
    const newTx: Transaction = {
      id: `tx_pay_${Date.now()}`,
      customerId: matchedInvoice.customerId,
      customerName: matchedInvoice.customerName,
      type: 'pemasukan',
      amount: matchedInvoice.amount,
      category: 'tagihan',
      description: `Pelunasan Wifi - ${matchedInvoice.customerName} (Periode: ${getIndonesianMonthYear(matchedInvoice.billingMonth)})`,
      date: todayStr,
      paymentMethod,
    };
    const nextTransactions = [...transactions, newTx];

    // If customer was previously "isolir" (due to unpaid), immediately reactivate to "aktif"!
    const nextCustomers = customers.map(cust => {
      if (cust.id === matchedInvoice.customerId && cust.status === 'isolir') {
        return {
          ...cust,
          status: 'aktif',
        } as Customer;
      }
      return cust;
    });

    setInvoices(nextInvoices);
    setTransactions(nextTransactions);
    setCustomers(nextCustomers);

    syncWithServer(users, nextCustomers, nextInvoices, nextTransactions);
  };

  // Create custom expense transaction
  const handleAddTransaction = (newTx: Omit<Transaction, 'id' | 'date'>) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const fullTx: Transaction = {
      ...newTx,
      id: `tx_custom_${Date.now()}`,
      date: todayStr,
    };
    const nextTransactions = [...transactions, fullTx];
    setTransactions(nextTransactions);
    syncWithServer(users, customers, invoices, nextTransactions);
  };

  const handleEditInvoice = (invoiceId: string, updatedFields: Partial<Invoice>) => {
    const nextInvoices = invoices.map(inv => {
      if (inv.id === invoiceId) {
        return { ...inv, ...updatedFields } as Invoice;
      }
      return inv;
    });
    setInvoices(nextInvoices);
    syncWithServer(users, customers, nextInvoices, transactions);
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    const nextInvoices = invoices.filter(inv => inv.id !== invoiceId);
    setInvoices(nextInvoices);
    syncWithServer(users, customers, nextInvoices, transactions);
  };

  const handleEditTransaction = (transactionId: string, updatedFields: Partial<Transaction>) => {
    const nextTransactions = transactions.map(tx => {
      if (tx.id === transactionId) {
        return { ...tx, ...updatedFields } as Transaction;
      }
      return tx;
    });
    setTransactions(nextTransactions);
    syncWithServer(users, customers, invoices, nextTransactions);
  };

  const handleDeleteTransaction = (transactionId: string) => {
    const nextTransactions = transactions.filter(tx => tx.id !== transactionId);
    setTransactions(nextTransactions);
    syncWithServer(users, customers, invoices, nextTransactions);
  };

  // Account Management handlers
  const handleAddUser = (username: string, fullName: string, role: 'admin' | 'operator') => {
    const newUser: AppUser = {
      id: `u_${Date.now()}`,
      username,
      fullName,
      role,
      createdAt: new Date().toISOString(),
    };
    const nextUsers = [...users, newUser];
    setUsers(nextUsers);
    syncWithServer(nextUsers, customers, invoices, transactions);
  };

  const handleDeleteUser = (id: string) => {
    const nextUsers = users.filter(u => u.id !== id);
    setUsers(nextUsers);
    syncWithServer(nextUsers, customers, invoices, transactions);
  };

  // Send Tagihan WhatsApp generator helper
  const triggerSendBill = (customer: Customer, invoice?: Invoice) => {
    setBillingModalData({ customer, invoice });
    setHasCopiedText(false);
  };

  // Formats Indonesian number for WhatsApp click trigger
  const formatPhoneForWhatsApp = (num: string): string => {
    let clean = num.replace(/\D/g, ''); // digit numbers only
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    } else if (clean.startsWith('8')) {
      clean = '62' + clean;
    }
    return clean;
  };

  // Draft Message Compiler
  const getDraftMessage = (customer: Customer, invoice?: Invoice): string => {
    const pkg = DEFAULT_PACKAGES.find(p => p.id === customer.packageId);
    const amountVal = invoice ? invoice.amount : (pkg ? pkg.price : 125000);
    const periodStr = invoice ? getIndonesianMonthYear(invoice.billingMonth) : 'Bulan Berjalan';
    const dueStr = invoice ? formatIndonesianDate(invoice.dueDate) : 'Tanggal 5 Bulan Ini';

    return `Halo Kak *${customer.fullName}*,\n\nBerikut rincian tagihan internet bulanan *Tiva Network* Anda:\n\n*Pelanggan:* ${customer.fullName}\n*No HP:* ${customer.phone}\n*Paket Layanan:* ${pkg?.name || 'Paket Wifi'} (${pkg?.speed || '5 Mbps'})\n*Kode ODP:* ${customer.odpCode || '-'}\n*Periode:* ${periodStr}\n*Jumlah Tagihan:* *${formatRupiah(amountVal)}*\n*Jatuh Tempo:* ${dueStr}\n*Status:* *BELUM BAYAR*\n\nPembayaran dapat dilakukan secara tunai ke operator kami, atau transfer bank ke rekening berikut:\n\n🏦 *BCA:* 047-1122-334\n👤 *Atas Nama:* TIVA NETWORK ADI\n\n_Mohon mengirimkan bukti transfer setelah pembayaran dilakukan ya Kak. Terima kasih atas kepercayaan Anda bersama layanan internet Tiva Network!_ 😊📶`;
  };

  // Unpack rendering view based on active tab state
  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <DashboardTab 
            customers={customers} 
            invoices={invoices} 
            transactions={transactions} 
            onNavigateToTab={(idx) => setActiveTab(idx)}
            onSendBill={triggerSendBill}
          />
        );
      case 1:
        return (
          <CustomersTab 
            customers={customers} 
            onAddCustomer={handleAddCustomer} 
            onEditCustomer={handleEditCustomer} 
            onDeleteCustomer={handleDeleteCustomer} 
          />
        );
      case 2:
        return (
          <BookkeepingTab 
            customers={customers} 
            invoices={invoices} 
            transactions={transactions} 
            onGenerateMonthlyInvoices={handleGenerateMonthlyInvoices}
            onPayInvoice={handlePayInvoice}
            onAddTransaction={handleAddTransaction}
            onSendBill={triggerSendBill}
            onEditInvoice={handleEditInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
          />
        );
      case 3:
        return (
          <ReportsTab 
            customers={customers} 
            invoices={invoices} 
            transactions={transactions} 
          />
        );
      case 4:
        return (
          <MikrotikTab 
            customers={customers} 
          />
        );
      case 5:
        return (
          <AccountsTab 
            users={users} 
            currentUser={currentUser!} 
            onAddUser={handleAddUser} 
            onDeleteUser={handleDeleteUser} 
          />
        );
      default:
        return null;
    }
  };

  // Fallback to beautiful login page if not authenticated
  if (!currentUser) {
    return (
      <div className={`theme-${theme}`}>
        <LoginScreen users={users} onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // Compiler WA text
  const waDraftText = billingModalData ? getDraftMessage(billingModalData.customer, billingModalData.invoice) : '';
  const waUrl = billingModalData 
    ? `https://wa.me/${formatPhoneForWhatsApp(billingModalData.customer.phone)}?text=${encodeURIComponent(waDraftText)}`
    : '#';

  const copyDraftToClipboard = () => {
    navigator.clipboard.writeText(waDraftText);
    setHasCopiedText(true);
    setTimeout(() => setHasCopiedText(false), 2000);
  };

  return (
    <div className={`theme-${theme} min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none antialiased`}>
      
      {/* 1. TOP PREMIUM BRAND BAR (Hidden in print layouts) */}
      <header className="bg-slate-950 border-b border-slate-800/80 px-4 py-4 sm:px-6 sticky top-0 z-40 print:hidden shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-teal-600/10 text-teal-400 p-2 rounded-xl border border-teal-500/20">
              <Network className="h-5.5 w-5.5 animate-pulse" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-white tracking-tight flex items-center gap-1.5">
                Tiva Network
              </h1>
              <p className="text-[10px] text-slate-500 font-mono tracking-wider">INDONESIA WI-FI BROADBAND ISP</p>
            </div>
          </div>

          {/* Connected state & Operator drop profile info */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 text-2xs px-2.5 py-1 rounded-full font-semibold border transition-all ${
              syncStatus === 'synced' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' :
              syncStatus === 'connecting' ? 'bg-amber-500/15 text-amber-400 border-amber-500/25 animate-pulse' :
              'bg-rose-500/15 text-rose-400 border-rose-500/25'
            }`}>
              <span className={`relative flex h-1.5 w-1.5`}>
                {syncStatus === 'connecting' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                  syncStatus === 'synced' ? 'bg-emerald-400' :
                  syncStatus === 'connecting' ? 'bg-amber-400' :
                  'bg-rose-400'
                }`}></span>
              </span>
              <span>{
                syncStatus === 'synced' ? 'Terhubung' :
                syncStatus === 'connecting' ? 'Mengkoneksikan...' :
                'Offline'
              }</span>
            </div>

            <div className="hidden md:flex items-center gap-1.5 text-2xs px-3 py-1 bg-teal-500/5 text-teal-400 border border-teal-500/10 rounded-full font-semibold">
              <SignalHigh className="h-3.5 w-3.5" />
              <span>MikroTik Sync Online</span>
            </div>

            <div className="flex items-center gap-3 border-l border-slate-800 pl-4 py-0.5">
              <button
                id="btn-toggle-theme"
                onClick={toggleTheme}
                className="p-2 bg-slate-850 hover:bg-slate-800 text-slate-350 hover:text-teal-400 rounded-lg transition-all border border-slate-800 flex items-center justify-center cursor-pointer outline-none focus:ring-1 focus:ring-teal-500/50"
                title={theme === 'dark' ? "Ganti ke Mode Terang (Light Mode)" : "Ganti ke Mode Gelap (Dark Mode)"}
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-amber-400 animate-spin-slow" />
                ) : (
                  <Moon className="h-4 w-4 text-indigo-400" />
                )}
              </button>

              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold text-white capitalize">{currentUser.fullName}</p>
                <p className="text-[10px] text-teal-300 uppercase font-mono tracking-wider font-bold">Role: {currentUser.role}</p>
              </div>
              <button
                id="btn-app-logout"
                onClick={handleLogout}
                className="p-2 bg-slate-850 hover:bg-rose-955/20 hover:text-rose-400 text-slate-400 rounded-lg transition-colors border border-slate-800"
                title="Keluar / Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. MAIN CORE LAYOUT FRAME */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row p-4 md:p-6 gap-6 min-h-0">
        
        {/* Navigation Sidebar Drawer (Hidden in print layout) */}
        <aside className="w-full md:w-64 shrink-0 space-y-2.5 print:hidden">
          <div className="bg-slate-950 p-2 rounded-2xl border border-slate-800/60 shadow-xl space-y-1">
            <p className="text-[9px] uppercase font-bold tracking-widest text-slate-450 px-3 py-2">Navigasi Utama</p>
            
            <button
              id="sidebar-tab-0"
              onClick={() => setActiveTab(0)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === 0 ? 'bg-teal-600 shadow shadow-teal-500/20 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              Dashboard Monitor
            </button>

            <button
              id="sidebar-tab-1"
              onClick={() => setActiveTab(1)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === 1 ? 'bg-teal-600 shadow shadow-teal-500/20 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
              <Users className="h-4 w-4 shrink-0" />
              Database Pelanggan
            </button>

            <button
              id="sidebar-tab-2"
              onClick={() => setActiveTab(2)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === 2 ? 'bg-teal-600 shadow shadow-teal-500/20 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
              <Receipt className="h-4 w-4 shrink-0" />
              Buku Kas & Tagihan
            </button>

            <button
              id="sidebar-tab-3"
              onClick={() => setActiveTab(3)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === 3 ? 'bg-teal-600 shadow shadow-teal-500/20 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
              <BarChart3 className="h-4 w-4 shrink-0" />
              Laporan Laba Rugi
            </button>
          </div>

          {/* Infrastructure sidebar configuration widgets */}
          <div className="bg-slate-950 p-2 rounded-2xl border border-slate-800/60 shadow-xl space-y-1">
            <p className="text-[9px] uppercase font-bold tracking-widest text-slate-450 px-3 py-2">Router & Akses</p>

            <button
              id="sidebar-tab-4"
              onClick={() => setActiveTab(4)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === 4 ? 'bg-teal-600 shadow shadow-teal-500/20 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
              <Server className="h-4 w-4 shrink-0" />
              MikroTik RouterOS
            </button>

            <button
              id="sidebar-tab-5"
              onClick={() => setActiveTab(5)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === 5 ? 'bg-teal-600 shadow shadow-teal-500/20 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
              <CheckSquare className="h-4 w-4 shrink-0" />
              Petugas Operator
            </button>
          </div>

          {/* Quick info static card */}
          <div className="bg-slate-850/60 border border-slate-800/80 p-4 rounded-2xl text-[11px] text-slate-450 space-y-2">
            <p className="font-semibold text-slate-350 flex items-center gap-1">📍 KANTOR TIVA NETWORK:</p>
            <p className="leading-normal font-sans">Masjid Jamial Jihadul Akbar, Jalan H Abdul Gani No. 7, RT.1/RW.3, Kalibaru, Cilodong, Kota Depok</p>
            <p className="text-3xs uppercase font-mono text-teal-400">Jam Layanan: 08:00 - 20:00 WIB</p>
          </div>
        </aside>

        {/* 3. CORE DISPLAY BODY COMPONENT */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          {renderTabContent()}
        </main>
      </div>

      {/* 4. BILL SENDER & RECEIPT MODAL FRAME */}
      {billingModalData && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto print:hidden">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-700 flex justify-between items-center text-sm shrink-0">
              <h3 className="font-bold text-white flex items-center gap-1.5">
                <Send className="h-4 w-4 text-teal-400 animate-pulse" />
                Draf Tagihan WhatsApp & Resi Pembayaran
              </h3>
              <button 
                onClick={() => setBillingModalData(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Modal content body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* WhatsApp message copy panel */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Draf Pesan WhatsApp (Format WA.me)</span>
                  <button
                    id="btn-copy-wa-draft"
                    onClick={copyDraftToClipboard}
                    className="px-2.5 py-1 bg-slate-700 hover:bg-slate-650 text-slate-200 text-3xs font-semibold rounded flex items-center gap-1 transition-all"
                  >
                    <Copy className="h-3 w-3" />
                    {hasCopiedText ? 'Disalin!' : 'Copy Draft'}
                  </button>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-750 text-slate-350 text-xs rounded-xl font-mono leading-relaxed whitespace-pre-wrap select-text max-h-48 overflow-y-auto">
                  {waDraftText}
                </div>
              </div>

              {/* PDF style invoice preview receipt sheet */}
              <div 
                id="printable-billing-invoice-sheet"
                className="bg-white text-slate-900 p-5 rounded-2xl border border-slate-300 font-sans space-y-4 select-text"
              >
                {/* PDF Header logo */}
                <div className="flex justify-between items-start border-b pb-3 border-slate-200">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 uppercase">Tiva Network</h4>
                    <span className="text-[9px] uppercase tracking-wider text-slate-450 font-bold">Kwitansi Layanan Internet Wifi</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono font-bold text-slate-700">INVOICE: #{billingModalData.invoice ? billingModalData.invoice.id : `PRO_${billingModalData.customer.id.toUpperCase()}`}</p>
                    <p className="text-3xs text-slate-500">Diterbitkan: 01-May-2026</p>
                  </div>
                </div>

                {/* Billing specs details */}
                <div className="grid grid-cols-2 gap-3 text-xs leading-normal">
                  <div className="space-y-1">
                    <span className="text-3xs font-bold text-slate-450 uppercase block">Ditujukan Kepada:</span>
                    <span className="font-extrabold text-slate-800 block text-xs">{billingModalData.customer.fullName}</span>
                    <span className="text-slate-550 block text-[10px]">{billingModalData.customer.phone}</span>
                    <span className="text-slate-550 block text-[10px]">{billingModalData.customer.address}</span>
                  </div>

                  <div className="space-y-1 text-right">
                    <span className="text-3xs font-bold text-slate-450 uppercase block">Spesifikasi ISP:</span>
                    <span className="font-bold text-teal-700 block text-xs">
                      {DEFAULT_PACKAGES.find(p => p.id === billingModalData.customer.packageId)?.name || 'Paket Wifi'}
                    </span>
                    <span className="text-slate-550 block text-[10px]">Speed: {DEFAULT_PACKAGES.find(p => p.id === billingModalData.customer.packageId)?.speed || '5 Mbps'}</span>
                    <span className="text-slate-550 block text-[10px]">Kode ODP: <span className="font-mono font-bold text-slate-700">{billingModalData.customer.odpCode || '-'}</span></span>
                  </div>
                </div>

                {/* Subtotal box breakdown */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                  <div className="flex justify-between text-slate-705 font-medium">
                    <span>Biaya Bulanan Paket wifi Internet (Reguler)</span>
                    <span>{formatRupiah(DEFAULT_PACKAGES.find(p => p.id === billingModalData.customer.packageId)?.price || 0)}</span>
                  </div>
                  
                  {billingModalData.invoice && billingModalData.invoice.amount !== billingModalData.invoice.packagePrice ? (
                    <div className="flex justify-between text-teal-700 font-semibold mt-1">
                      <span>Perhitungan Prorata Tanggal 1 Masuk</span>
                      <span>{formatRupiah(billingModalData.invoice.amount)}</span>
                    </div>
                  ) : null}

                  <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-2 border-t mt-2">
                    <span className="uppercase text-[10px] font-bold tracking-wider text-slate-600">Total Tagihan Jatuh Tempo:</span>
                    <span className="font-mono">{formatRupiah(billingModalData.invoice ? billingModalData.invoice.amount : (DEFAULT_PACKAGES.find(p => p.id === billingModalData.customer.packageId)?.price || 0))}</span>
                  </div>
                </div>

                <div className="border-t pt-2 mt-2 flex justify-between items-center text-3xs text-slate-500">
                  <p>Metode Bayar: Tunai / Transfer Bank BCA</p>
                  <p className="font-bold uppercase text-slate-450 font-mono">Lunas Apabila Pembayaran Sudah Diverifikasi Kasir</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-900 border-t border-slate-755 flex flex-col sm:flex-row justify-end gap-2 shrink-0">
              <button
                onClick={() => setBillingModalData(null)}
                className="px-4 py-2 bg-slate-750 text-slate-300 text-xs font-semibold rounded hover:bg-slate-700 transition"
              >
                Tutup Resi
              </button>
              
              <button
                id="btn-print-billing"
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-slate-800 border border-slate-70 text-slate-200 text-xs font-semibold rounded hover:bg-slate-700 flex items-center justify-center gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" />
                Cetak Lembar Tagihan
              </button>

              <a
                id="btn-trigger-wa-external"
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-555 text-white text-xs font-extrabold rounded shadow transition flex items-center justify-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Kirim via WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
