import React, { useState } from 'react';
import { 
  Plus, Edit, Trash2, Search, Filter, 
  MapPin, Phone, User, Package as PkgIcon, 
  Layers, Calendar, ClipboardList, Camera, 
  CheckCircle, FileText, Info, Loader2, Map
} from 'lucide-react';
import { Customer, CustomerStatus } from '../types';
import { DEFAULT_PACKAGES, calculateProrate, formatRupiah, formatIndonesianDate } from '../utils/billing';

interface CustomersTabProps {
  customers: Customer[];
  onAddCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
}

export default function CustomersTab({ 
  customers, 
  onAddCustomer, 
  onEditCustomer, 
  onDeleteCustomer 
}: CustomersTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | 'semua'>('semua');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Interactive ODP-map & ODP-port-inspector states
  const [selectedOdpNode, setSelectedOdpNode] = useState<string | null>(null);
  const [mapHoveredItem, setMapHoveredItem] = useState<{ 
    type: 'customer' | 'odp'; 
    name: string; 
    details: string; 
    x: number; 
    y: number; 
    status?: string;
  } | null>(null);
  const [odpViewMode, setOdpViewMode] = useState<'map' | 'ports'>('map');
  const [showOdpSection, setShowOdpSection] = useState(true);
  
  // Custom Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [packageId, setPackageId] = useState('p_10');
  const [status, setStatus] = useState<CustomerStatus>('aktif');
  const [odpCode, setOdpCode] = useState('');
  const [joinDate, setJoinDate] = useState(new Date().toISOString().split('T')[0]);
  const [ktpImage, setKtpImage] = useState<string>('');
  const [houseImage, setHouseImage] = useState<string>('');
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [pppoeUsername, setPppoeUsername] = useState('');
  const [pppoePassword, setPppoePassword] = useState('');

  // Geolocation trigger state
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoStatusMsg, setGeoStatusMsg] = useState('');

  // Selected customer details drawer
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Auto calculate prorate preview when changing package or joinDate
  const selectedPkg = DEFAULT_PACKAGES.find(p => p.id === packageId);
  const proratePreview = selectedPkg ? calculateProrate(selectedPkg.price, joinDate) : null;

  // Handle setting geolocation coordinates
  const triggerGeolocation = () => {
    setGeoLoading(true);
    setGeoStatusMsg('Menghubungi satelit GPS...');
    
    if (!navigator.geolocation) {
      setGeoStatusMsg('Browser tidak mendukung GPS');
      setGeoLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setGeoStatusMsg('Lokasi terdeteksi dengan sukses!');
        setGeoLoading(false);
      },
      (error) => {
        let msg = 'Gagal mendeteksi lokasi';
        if (error.code === 1) msg = 'Izin lokasi ditolak pelanggan';
        else if (error.code === 2) msg = 'Satelit tidak mendeteksi lokasi';
        setGeoStatusMsg(msg);
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Convert File uploads to Base64 to persist them nicely
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'ktp' | 'house') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (type === 'ktp') setKtpImage(base64String);
      if (type === 'house') setHouseImage(base64String);
    };
    reader.readAsDataURL(file);
  };

  const openAddModal = () => {
    setEditingCustomer(null);
    setFullName('');
    setPhone('');
    setAddress('');
    setPackageId('p_10');
    setStatus('aktif');
    setOdpCode('ODP-TVA-' + String(customers.length + 1).padStart(2, '0'));
    setJoinDate(new Date().toISOString().split('T')[0]);
    setKtpImage('');
    setHouseImage('');
    setLatitude(undefined);
    setLongitude(undefined);
    setPppoeUsername('');
    setPppoePassword('tivanet123'); // realistic default password
    setGeoStatusMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: Customer, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering details card open
    setEditingCustomer(c);
    setFullName(c.fullName);
    setPhone(c.phone);
    setAddress(c.address);
    setPackageId(c.packageId);
    setStatus(c.status);
    setOdpCode(c.odpCode);
    setJoinDate(c.joinDate);
    setKtpImage(c.ktpImage || '');
    setHouseImage(c.houseImage || '');
    setLatitude(c.latitude);
    setLongitude(c.longitude);
    setPppoeUsername(c.pppoeUsername || '');
    setPppoePassword(c.pppoePassword || '');
    setGeoStatusMsg(c.latitude ? 'Sudah memiliki data lokasi' : '');
    setIsModalOpen(true);
  };

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();

    const currentPkg = DEFAULT_PACKAGES.find(p => p.id === packageId);
    const calculatedProratedAmt = currentPkg ? calculateProrate(currentPkg.price, joinDate).amount : 0;

    const customerPayload = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      packageId,
      status,
      odpCode: odpCode.trim().toUpperCase(),
      joinDate,
      prorateAmountFirstMonth: calculatedProratedAmt,
      ktpImage: ktpImage || undefined,
      houseImage: houseImage || undefined,
      latitude,
      longitude,
      pppoeUsername: pppoeUsername.trim(),
      pppoePassword: pppoePassword.trim(),
    };

    if (editingCustomer) {
      onEditCustomer({
        ...editingCustomer,
        ...customerPayload,
      });
    } else {
      onAddCustomer(customerPayload);
    }

    setIsModalOpen(false);
    // If selected customer was open, update it
    if (editingCustomer && selectedCustomer?.id === editingCustomer.id) {
      setSelectedCustomer({ ...selectedCustomer, ...customerPayload });
    }
  };

  const triggerDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Apakah Anda yakin ingin menghapus pelanggan bernama ${name}?`)) {
      onDeleteCustomer(id);
      if (selectedCustomer?.id === id) {
        setSelectedCustomer(null);
      }
    }
  };

  // Dynamic ODP analysis and coordinate center calculation
  const odpStatistics = React.useMemo(() => {
    const stats: { 
      [key: string]: { 
        code: string; 
        total: number; 
        aktif: number; 
        isolir: number; 
        putus: number; 
        customers: Customer[];
        avgLat?: number;
        avgLng?: number;
      } 
    } = {};

    customers.forEach(c => {
      const odp = (c.odpCode || 'BELUM SET').trim().toUpperCase();
      if (!stats[odp]) {
        stats[odp] = { code: odp, total: 0, aktif: 0, isolir: 0, putus: 0, customers: [] };
      }
      stats[odp].total += 1;
      if (c.status === 'aktif') stats[odp].aktif += 1;
      else if (c.status === 'isolir') stats[odp].isolir += 1;
      else if (c.status === 'putus') stats[odp].putus += 1;
      stats[odp].customers.push(c);
    });

    // Compute center-gravity coordinates or pseudo coordinates based on string hash for spacing
    Object.keys(stats).forEach(odp => {
      const validCoords = stats[odp].customers.filter(c => c.latitude !== undefined && c.longitude !== undefined);
      if (validCoords.length > 0) {
        const sumLat = validCoords.reduce((sum, curr) => sum + (curr.latitude || 0), 0);
        const sumLng = validCoords.reduce((sum, curr) => sum + (curr.longitude || 0), 0);
        stats[odp].avgLat = sumLat / validCoords.length;
        stats[odp].avgLng = sumLng / validCoords.length;
      } else {
        // Pseudo coordinates spacer based on string hash so ODP hubs look naturally distributed
        let hash = 0;
        for (let i = 0; i < odp.length; i++) {
          hash = odp.charCodeAt(i) + ((hash << 5) - hash);
        }
        const angle = (Math.abs(hash) % 360) * (Math.PI / 180);
        const radius = 0.006 + (Math.abs(hash % 4) * 0.002);
        const baseLat = -7.816667;
        const baseLng = 112.011944;
        stats[odp].avgLat = baseLat + Math.sin(angle) * radius;
        stats[odp].avgLng = baseLng + Math.cos(angle) * radius;
      }
    });

    return Object.values(stats);
  }, [customers]);

  // SVG bounding coordinates calculations
  const boundingBox = React.useMemo(() => {
    const points: { lat: number; lng: number }[] = [];
    customers.forEach(c => {
      if (c.latitude !== undefined && c.longitude !== undefined) {
        points.push({ lat: c.latitude, lng: c.longitude });
      }
    });

    odpStatistics.forEach(o => {
      if (o.avgLat !== undefined && o.avgLng !== undefined) {
        points.push({ lat: o.avgLat, lng: o.avgLng });
      }
    });

    if (points.length === 0) {
      return {
        minLat: -7.825,
        maxLat: -7.805,
        minLng: 112.000,
        maxLng: 112.025,
        latSpan: 0.02,
        lngSpan: 0.025
      };
    }

    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    points.forEach(p => {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    });

    let latSpan = maxLat - minLat;
    let lngSpan = maxLng - minLng;
    if (latSpan === 0) latSpan = 0.002;
    if (lngSpan === 0) lngSpan = 0.002;

    return {
      minLat: minLat - latSpan * 0.18,
      maxLat: maxLat + latSpan * 0.18,
      minLng: minLng - lngSpan * 0.18,
      maxLng: maxLng + lngSpan * 0.18,
      latSpan: latSpan * 1.36,
      lngSpan: lngSpan * 1.36
    };
  }, [customers, odpStatistics]);

  // Translate lat/long coordinate into 2D canvas coordinates (Width 600, Height 260)
  const projectCoords = (lat: number, lng: number) => {
    const { minLat, maxLat, minLng, maxLng } = boundingBox;
    const x = ((lng - minLng) / (maxLng - minLng)) * 540 + 30;
    const y = (1 - (lat - minLat) / (maxLat - minLat)) * 200 + 30;
    return { x, y };
  };

  // Filter & Search customers
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.odpCode && c.odpCode.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'semua' || c.status === statusFilter;

    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && c.joinDate >= startDate;
    }
    if (endDate) {
      matchesDate = matchesDate && c.joinDate <= endDate;
    }

    // Interactive ODP Node selection filter
    const matchesOdpNode = !selectedOdpNode || (c.odpCode && c.odpCode.trim().toUpperCase() === selectedOdpNode.trim().toUpperCase());

    return matchesSearch && matchesStatus && matchesDate && matchesOdpNode;
  });

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800 p-5 rounded-2xl border border-slate-700/40">
        <div>
          <h2 className="text-xl font-bold text-white">Database Pelanggan Wi-Fi</h2>
          <p className="text-xs text-slate-400 mt-1">Management, Berlangganan, Lokasi ODP, & Dokumen KTP</p>
        </div>
        <button 
          id="btn-add-customer"
          onClick={openAddModal}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-505 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 shadow-md shadow-teal-700/10"
        >
          <Plus className="h-4 w-4" />
          Registrasi Pelanggan Baru
        </button>
      </div>

      {/* Filter and Search controls */}
      <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/30 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="relative md:col-span-5">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-450" />
            <input
              id="input-customer-search"
              type="text"
              placeholder="Cari nama, nomor HP, alamat, atau kode ODP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 text-white placeholder-slate-500 pl-10 pr-4 py-2 rounded-lg border border-slate-700 text-sm focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex items-center gap-2 md:col-span-3">
            <Filter className="h-4 w-4 text-slate-450 shrink-0" />
            <select
              id="select-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CustomerStatus | 'semua')}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm py-2 px-3 rounded-lg focus:outline-none focus:border-teal-500"
            >
              <option value="semua">Semua Status</option>
              <option value="aktif">Status: Aktif</option>
              <option value="isolir">Status: Terisolir</option>
              <option value="putus">Status: Putus (Nonaktif)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 md:col-span-2">
            <Layers className="h-4 w-4 text-teal-450 shrink-0" />
            <select
              id="select-odp-filter"
              value={selectedOdpNode || 'semua'}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedOdpNode(val === 'semua' ? null : val);
              }}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm py-2 px-3 rounded-lg focus:outline-none focus:border-teal-500"
            >
              <option value="semua">Semua ODP</option>
              {odpStatistics.map(odp => (
                <option key={odp.code} value={odp.code}>
                  {odp.code} ({odp.total} Pelanggan)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end px-2 md:col-span-2">
            <span className="text-xs text-slate-450 font-mono">Ditemukan: {filteredCustomers.length}</span>
          </div>
        </div>

        {/* Date registration Range filters */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 pt-3 border-t border-slate-700/40">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 shrink-0">
            <Calendar className="h-4 w-4 text-teal-400" />
            Filter Tanggal Registrasi:
          </span>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-2xs text-slate-400 uppercase font-bold tracking-wider">Mulai</span>
              <input
                id="input-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs text-white px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-teal-500"
              />
            </div>
            <span className="text-slate-500 text-xs">s/d</span>
            <div className="flex items-center gap-2">
              <span className="text-2xs text-slate-400 uppercase font-bold tracking-wider">Selesai</span>
              <input
                id="input-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs text-white px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-teal-500"
              />
            </div>
            {(startDate || endDate) && (
              <button
                id="btn-clear-date-filter"
                type="button"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-xs text-rose-400 hover:text-rose-300 hover:underline transition-colors font-semibold ml-auto md:ml-2"
              >
                Hapus Filter Tanggal
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid View (Double Column) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Customer List Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-3.5">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/40 rounded-2xl border border-dashed border-slate-705">
              <User className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-350">Tidak ada data pelanggan</h3>
              <p className="text-xs text-slate-550 mt-1">Coba sesuaikan filter atau tambahkan pendaftaran baru.</p>
            </div>
          ) : (
            filteredCustomers.map((cust) => {
              const customerPkg = DEFAULT_PACKAGES.find(p => p.id === cust.packageId);
              
              return (
                <div 
                  key={cust.id}
                  id={`customer-card-${cust.id}`}
                  onClick={() => setSelectedCustomer(cust)}
                  className={`bg-slate-800 p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-teal-500/50 hover:shadow-lg shadow-teal-950/20 ${selectedCustomer?.id === cust.id ? 'border-teal-500 bg-teal-500/5' : 'border-slate-700/50'}`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white truncate text-sm">{cust.fullName}</h3>
                      {cust.status === 'aktif' && (
                        <span className="text-[10px] px-2 py-0.5 bg-teal-550/10 text-teal-400 font-bold rounded-sm uppercase tracking-wide">Aktif</span>
                      )}
                      {cust.status === 'isolir' && (
                        <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-500 font-bold rounded-sm uppercase tracking-wide">Isolir</span>
                      )}
                      {cust.status === 'putus' && (
                        <span className="text-[10px] px-2 py-0.5 bg-slate-700/60 text-slate-400 font-bold rounded-sm uppercase tracking-wide">Putus</span>
                      )}
                    </div>
                    
                    <p className="text-xs text-slate-400 truncate flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span>{cust.phone}</span>
                      <span className="text-slate-600">|</span>
                      <span>{cust.address}</span>
                    </p>

                    <div className="flex flex-wrap items-center gap-3 mt-1.5 pt-1.5 border-t border-slate-750 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 font-medium text-slate-350">
                        <PkgIcon className="h-3 w-3 text-teal-505" />
                        {customerPkg?.name} ({customerPkg?.speed})
                      </span>
                      <span className="text-slate-700">•</span>
                      <span className="flex items-center gap-1">
                        <Layers className="h-3 w-3 text-purple-400" />
                        Kode ODP: <span className="font-mono font-medium text-slate-300">{cust.odpCode || '-'}</span>
                      </span>
                      <span className="text-slate-700">•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-sky-400" />
                        Daftar: {formatIndonesianDate(cust.joinDate)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      id={`btn-edit-cust-${cust.id}`}
                      onClick={(e) => openEditModal(cust, e)}
                      className="p-2 bg-slate-700/40 hover:bg-slate-750 text-slate-300 rounded-lg transition-colors border border-slate-700"
                      title="Edit Paket & Detail"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      id={`btn-del-cust-${cust.id}`}
                      onClick={(e) => triggerDelete(cust.id, cust.fullName, e)}
                      className="p-2 bg-rose-900/10 hover:bg-rose-950/20 text-rose-450 hover:text-rose-400 rounded-lg transition-colors border border-rose-900/30"
                      title="Hapus Pelanggan"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Customer Details Panel (1/3 width) */}
        <div>
          {selectedCustomer ? (
            <div className="bg-slate-800 rounded-2xl border border-teal-500/30 p-5 space-y-5 shadow-xl shadow-teal-950/10 sticky top-4">
              <div className="flex justify-between items-start pb-3 border-b border-slate-700">
                <div>
                  <h3 className="font-bold text-white text-base">Detail Pelanggan</h3>
                  <p className="text-2xs text-slate-450 uppercase font-mono mt-0.5">ID: {selectedCustomer.id}</p>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-700/50 hover:bg-slate-700 rounded transition-colors"
                >
                  Tutup
                </button>
              </div>

              {/* Status & Name Card */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-bold text-white">{selectedCustomer.fullName}</h4>
                    {selectedCustomer.status === 'aktif' && (
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 font-bold rounded-sm uppercase tracking-wide">Aktif</span>
                    )}
                    {selectedCustomer.status === 'isolir' && (
                      <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-500 font-bold rounded-sm uppercase tracking-wide">Isolir</span>
                    )}
                    {selectedCustomer.status === 'putus' && (
                      <span className="text-[10px] px-2 py-0.5 bg-slate-700/60 text-slate-400 font-bold rounded-sm uppercase tracking-wide">Putus</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-teal-400 font-bold" /> {selectedCustomer.phone}</p>
                  <p className="text-xs text-slate-450 mt-1">Alamat: {selectedCustomer.address}</p>
                </div>

                {/* Paket info */}
                <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-750 space-y-2">
                  <p className="text-xs font-semibold text-slate-300">Pilihan Paket Layanan</p>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Nama Paket:</span>
                    <span className="font-bold text-teal-400">{DEFAULT_PACKAGES.find(p => p.id === selectedCustomer.packageId)?.name || 'Custom'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Kuota / Kecepatan:</span>
                    <span className="font-mono font-bold text-white">{DEFAULT_PACKAGES.find(p => p.id === selectedCustomer.packageId)?.speed || 'Auto'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Harga Langganan:</span>
                    <span className="font-bold text-white">{formatRupiah(DEFAULT_PACKAGES.find(p => p.id === selectedCustomer.packageId)?.price || 0)}/Bulan</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-800">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Tanggal Registrasi:
                    </span>
                    <span className="text-slate-300">{formatIndonesianDate(selectedCustomer.joinDate)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 flex items-center gap-1 text-teal-300" title="Pembayaran prorata pertama berdasarkan sisa hari di bulan pendaftaran ditanggal 1">
                      <ClipboardList className="h-3 w-3" /> Prorata Tagihan Awal:
                    </span>
                    <span className="font-mono text-teal-300 font-semibold">{formatRupiah(selectedCustomer.prorateAmountFirstMonth || 0)}</span>
                  </div>
                </div>

                {/* ODP Code */}
                <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-750 flex justify-between items-center">
                  <span className="text-xs text-slate-350">Koneksi Optical Distribution Point:</span>
                  <span className="font-mono text-xs font-extrabold px-3 py-1 bg-teal-500/10 text-teal-300 rounded border border-teal-500/25 tracking-wide">{selectedCustomer.odpCode || 'BELUM SET'}</span>
                </div>

                {/* PPPoE Credentials */}
                <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-750 space-y-2">
                  <span className="text-xs font-semibold text-slate-300 block">Akun PPPoE Pelanggan</span>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">PPPoE Username:</span>
                    <span className="font-mono font-bold text-teal-400">{selectedCustomer.pppoeUsername || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">PPPoE Password:</span>
                    <span className="font-mono text-slate-300">{selectedCustomer.pppoePassword || '-'}</span>
                  </div>
                </div>

                {/* Location Share / Coordinates */}
                <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-750 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-350 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-rose-500" /> Koordinat Rumah:
                    </span>
                    {selectedCustomer.latitude && selectedCustomer.longitude ? (
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${selectedCustomer.latitude},${selectedCustomer.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-rose-500 font-semibold hover:underline flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded"
                      >
                        <Map className="h-3 w-3" /> Lihat Peta
                      </a>
                    ) : (
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">Belum Memiliki Koordinat</span>
                    )}
                  </div>
                  {selectedCustomer.latitude && selectedCustomer.longitude ? (
                    <p className="text-[10px] text-slate-400 font-mono text-right truncate">Lat: {selectedCustomer.latitude.toFixed(6)}, Long: {selectedCustomer.longitude.toFixed(6)}</p>
                  ) : (
                    <p className="text-[10px] text-slate-500">Edit data pelanggan untuk merekam lokasi penarikan kabel pelanggan menggunakan GPS smartphone/browser.</p>
                  )}
                </div>

                {/* KTP & House Photo Display */}
                <div className="grid grid-cols-2 gap-35">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-450 uppercase block">Foto KTP / Identitas</span>
                    {selectedCustomer.ktpImage ? (
                      <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-700 bg-slate-900 flex items-center justify-center">
                        <img 
                          src={selectedCustomer.ktpImage} 
                          alt="ID KTP" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover" 
                        />
                        {/* Expand Photo Link */}
                        <a 
                          href={selectedCustomer.ktpImage} 
                          download={`KTP_${selectedCustomer.fullName.replace(/\s+/g, '_')}`}
                          className="absolute bottom-1 right-1 p-1 bg-slate-950/80 rounded hover:bg-slate-900 text-white text-[9px] font-mono"
                        >
                          Unduh
                        </a>
                      </div>
                    ) : (
                      <div className="aspect-video rounded-lg border border-dashed border-slate-700 bg-slate-900/40 flex flex-col items-center justify-center p-3 text-center">
                        <Camera className="h-5 w-5 text-slate-650 mb-1" />
                        <span className="text-[9px] text-slate-550">Foto KTP belum diunggah</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-450 uppercase block">Foto Lokasi Rumah</span>
                    {selectedCustomer.houseImage ? (
                      <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-700 bg-slate-900 flex items-center justify-center">
                        <img 
                          src={selectedCustomer.houseImage} 
                          alt="Foto Rumah" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover" 
                        />
                        <a 
                          href={selectedCustomer.houseImage} 
                          download={`RUMAH_${selectedCustomer.fullName.replace(/\s+/g, '_')}`}
                          className="absolute bottom-1 right-1 p-1 bg-slate-950/80 rounded hover:bg-slate-950 text-white text-[9px] font-mono"
                        >
                          Unduh
                        </a>
                      </div>
                    ) : (
                      <div className="aspect-video rounded-lg border border-dashed border-slate-700 bg-slate-900/40 flex flex-col items-center justify-center p-3 text-center">
                        <Camera className="h-5 w-5 text-slate-650 mb-1" />
                        <span className="text-[9px] text-slate-550">Foto Rumah belum diunggah</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <div className="bg-teal-500/5 text-slate-350 p-3 rounded-lg border border-teal-500/10 text-[11px] flex gap-2">
                    <Info className="h-4 w-4 shrink-0 text-teal-400" />
                    <span>Tagihan rutin jatuh tempo setiap tanggal 5 per bulannya. Sistem prabayar RouterOS bypass internet didasarkan atas status lunas.</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800 rounded-2xl border border-slate-700/40 p-6 text-center text-slate-500 sticky top-4">
              <ClipboardList className="h-10 w-10 mx-auto text-slate-600 mb-3" />
              <p className="text-xs">Klik salah satu nama pelanggan untuk membuka detail KTP, foto rumah, lokasi GPS satelit, dan informasi ODP secara komparatif.</p>
            </div>
          )}
        </div>
      </div>

      {/* ADD & EDIT MODAL DRAWER */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-700 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-white">
                {editingCustomer ? 'Edit Data Pelanggan' : 'Pendaftaran Pasang Baru (ISP)'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Modal Scroll Content */}
            <form onSubmit={submitForm} className="p-5 space-y-5 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Full name input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">Nama Lengkap Pelanggan *</label>
                  <input
                    id="modal-fullName"
                    type="text"
                    required
                    placeholder="Nama Lengkap sesuai KTP"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1.5 w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* HP Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">Nomor HP / WhatsApp (Aktif) *</label>
                  <input
                    id="modal-phone"
                    type="tel"
                    required
                    placeholder="Contoh: 08123456789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1.5 w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Alamat Input (Full block) */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">Alamat Lengkap Rumah *</label>
                  <textarea
                    id="modal-address"
                    required
                    rows={2}
                    placeholder="Nama jalan, nomor rumah, RT/RW, kecamatan / rincian tambahan..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1.5 w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 resize-none"
                  />
                </div>

                {/* Paket Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">Paket Internet & Speed *</label>
                  <select
                    id="modal-package"
                    value={packageId}
                    onChange={(e) => setPackageId(e.target.value)}
                    className="mt-1.5 w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    {DEFAULT_PACKAGES.map(pkg => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} ({pkg.speed}) — {formatRupiah(pkg.price)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Kode ODP input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">Kode Kotak ODP *</label>
                  <input
                    id="modal-odpCode"
                    type="text"
                    required
                    placeholder="Contoh: ODP-TVA-01"
                    value={odpCode}
                    onChange={(e) => setOdpCode(e.target.value)}
                    className="mt-1.5 w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-2 text-sm text-white focus:outline-none uppercase"
                  />
                </div>

                {/* PPPoE Username */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">PPPoE Username *</label>
                  <input
                    id="modal-pppoeUsername"
                    type="text"
                    required
                    placeholder="Contoh: budi_santoso"
                    value={pppoeUsername}
                    onChange={(e) => setPppoeUsername(e.target.value.replace(/\s+/g, ''))}
                    className="mt-1.5 w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  />
                </div>

                {/* PPPoE Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">PPPoE Password *</label>
                  <input
                    id="modal-pppoePassword"
                    type="text"
                    required
                    placeholder="Contoh: tivanet123"
                    value={pppoePassword}
                    onChange={(e) => setPppoePassword(e.target.value)}
                    className="mt-1.5 w-full bg-slate-900 border border-slate-755 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  />
                </div>

                {/* Join Date selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">Tanggal Pemasangan Wifi *</label>
                  <input
                    id="modal-joinDate"
                    type="date"
                    required
                    value={joinDate}
                    onChange={(e) => setJoinDate(e.target.value)}
                    className="mt-1.5 w-full bg-slate-900 border border-slate-755 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Status Wifi */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">Status Awal Pelanggan *</label>
                  <select
                    id="modal-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CustomerStatus)}
                    className="mt-1.5 w-full bg-slate-900 border border-slate-755 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="aktif">Aktif (Koneksi Hidup)</option>
                    <option value="isolir">Isolir (Tunda Bayar)</option>
                    <option value="putus">Putus (Berhenti Berlangganan)</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Prorate preview Box */}
              {proratePreview && (
                <div className="bg-teal-550/10 border border-teal-500/20 p-4 rounded-xl space-y-1 text-xs">
                  <p className="font-bold text-teal-300 flex items-center gap-1">
                    <Info className="h-4 w-4" /> Detail Perhitungan Pembayaran Prorata (Tanggal 1)
                  </p>
                  <p className="text-slate-300 mt-1">
                    Pelanggan mendaftar tanggal <span className="font-semibold text-white font-mono">{joinDate.split('-')[2]}</span>. 
                    Maka sisa sirkulasi bulan pendaftaran adalah <span className="font-semibold text-white font-mono">{proratePreview.remainingDays} hari</span> dari total {proratePreview.totalDays} hari.
                  </p>
                  <div className="mt-2 text-[13px] flex justify-between items-center text-teal-400 font-bold font-mono">
                    <span>Tagihan Prorata Awal (Bulan ke-1):</span>
                    <span>{formatRupiah(proratePreview.amount)}</span>
                  </div>
                </div>
              )}

              {/* Coordinates block */}
              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-750">
                <span className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2">Penentuan Share Lokasi Pelanggan GPS</span>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <button
                    id="btn-trigger-georlocation"
                    type="button"
                    onClick={triggerGeolocation}
                    disabled={geoLoading}
                    className="px-4 py-2 bg-slate-850 border border-slate-700 text-slate-200 text-xs rounded hover:border-teal-500 transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    {geoLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5 text-rose-500" />}
                    Ambil Koordinat GPS Sekarang
                  </button>
                  {geoStatusMsg && (
                    <span className="text-2xs text-teal-400 font-semibold">{geoStatusMsg}</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-3xs text-slate-450 uppercase block">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="-7.81234"
                      value={latitude !== undefined ? latitude : ''}
                      onChange={(e) => setLatitude(e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="mt-1 w-full bg-slate-900 border border-slate-750 rounded p-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-3xs text-slate-450 uppercase block">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="112.01234"
                      value={longitude !== undefined ? longitude : ''}
                      onChange={(e) => setLongitude(e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="mt-1 w-full bg-slate-900 border border-slate-750 rounded p-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Photo Upload block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Upload KTP */}
                <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-750 space-y-2">
                  <span className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">Unggah Foto KTP</span>
                  <input
                    id="upload-ktp"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'ktp')}
                    className="w-full text-xs text-slate-400 file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-slate-700 file:text-white hover:file:bg-slate-650 cursor-pointer"
                  />
                  {ktpImage ? (
                    <div className="relative aspect-video rounded border border-slate-705 bg-slate-950/20 overflow-hidden mt-1.5">
                      <img src={ktpImage} alt="Preview KTP" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                      <button type="button" onClick={() => setKtpImage('')} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full text-3xs w-4 h-4 flex items-center justify-center">✕</button>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500">Berfungsi sebagai arsip verifikasi identitas resmi pelanggan.</p>
                  )}
                </div>

                {/* Upload House */}
                <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-750 space-y-2">
                  <span className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">Unggah Foto Rumah</span>
                  <input
                    id="upload-house"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'house')}
                    className="w-full text-xs text-slate-400 file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-slate-700 file:text-white hover:file:bg-slate-650 cursor-pointer"
                  />
                  {houseImage ? (
                    <div className="relative aspect-video rounded border border-slate-705 bg-slate-950/20 overflow-hidden mt-1.5">
                      <img src={houseImage} alt="Preview Rumah" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                      <button type="button" onClick={() => setHouseImage('')} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full text-3xs w-4 h-4 flex items-center justify-center">✕</button>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500">Membantu petugas lapangan mengidentifikasi lokasi visual rumah pelanggan.</p>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-700 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-650 transition-colors"
                >
                  Batal
                </button>
                <button
                  id="btn-save-customer"
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-505 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-teal-700/10"
                >
                  {editingCustomer ? 'Simpan Perubahan' : 'Proses Registrasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
