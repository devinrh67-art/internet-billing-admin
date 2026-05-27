import React, { useState, useEffect, useRef } from 'react';
import { 
  Network, Wifi, Cpu, Layers, Play, RefreshCw, 
  Terminal as TermIcon, ShieldCheck, AlertCircle, 
  Save, HelpCircle, Server, Code, CheckCircle2 
} from 'lucide-react';
import { Customer } from '../types';
import { formatRupiah } from '../utils/billing';

interface MikrotikTabProps {
  customers: Customer[];
}

interface TerminalLine {
  text: string;
  type: 'input' | 'output' | 'error' | 'success';
}

export default function MikrotikTab({ customers }: MikrotikTabProps) {
  // Config state
  const [host, setHost] = useState('192.168.88.1');
  const [port, setPort] = useState('8728');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('••••••••');
  
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    'Tiva Network RouterOS Interface initialized.',
    'Menunggu instruksi koneksi...'
  ]);

  // Terminal state
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalHistory, setTerminalHistory] = useState<TerminalLine[]>([
    { text: 'Mikrotik RouterOS v7.12.1 (c) 1999-2026', type: 'output' },
    { text: 'Welcome to Tiva Network Router Terminal Emulator!', type: 'success' },
    { text: 'Ketik "/help" untuk melihat daftar perintah yang tersedia.', type: 'output' },
  ]);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  // Sync state
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Auto-scroll terminal
  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalHistory]);

  // Test Connection
  const handleTestConnection = () => {
    setStatus('connecting');
    setConsoleLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Menghubungi host Mikrotik di ${host}:${port}...`]);
    
    setTimeout(() => {
      setStatus('connected');
      setConsoleLogs(prev => [
        ...prev, 
        `[${new Date().toLocaleTimeString()}] KONEKSI BERHASIL! Terhubung ke Mikrotik Cloud Core Router CCR1009-7G`,
        `[${new Date().toLocaleTimeString()}] API RouterOS v7 terdeteksi. Enkripsi SSL diaktifkan.`
      ]);
      
      setTerminalHistory(prev => [
        ...prev,
        { text: `[SYSTEM] Terhubung ke Router ${host}`, type: 'success' }
      ]);
    }, 1800);
  };

  // Sync Customers to Mikrotik
  const handleSyncToMikrotik = () => {
    if (status !== 'connected') {
      alert('Hubungkan ke Mikrotik terlebih dahulu!');
      return;
    }
    
    setIsSyncing(true);
    setSyncLogs([]);
    
    let currentStep = 0;
    const steps: string[] = [];
    
    steps.push('Memulai sinkronisasi database Tiva Network ke MikroTik...');
    
    customers.forEach(cust => {
      const activeState = cust.status === 'aktif' ? 'enabled' : 'disabled';
      const speedLimit = cust.packageId === 'p_5' ? '5M/5M' :
                         cust.packageId === 'p_10' ? '10M/10M' :
                         cust.packageId === 'p_15' ? '15M/15M' : '20M/20M';

      const userName = cust.pppoeUsername || cust.fullName.replace(/\s+/g, '').toLowerCase();
      const userPass = cust.pppoePassword || 'tivanet123';

      if (cust.status === 'aktif') {
        steps.push(`/ppp secret add name="${userName}" password="${userPass}" profile="${speedLimit}" comment="ODP:${cust.odpCode || '-'}" (Status: AKTIF - BYPASS ENABLED)`);
      } else if (cust.status === 'isolir') {
        steps.push(`/ppp secret disable [find name="${userName}"] (Status: ISOLIR - ROUTED TO BLOCK LAPORAN)`);
        steps.push(`/ip firewall address-list add list=isolir_tiva address="192.168.10.${cust.id}" comment="ISOLIR:${cust.fullName}"`);
      } else if (cust.status === 'putus') {
        steps.push(`/ppp secret remove [find name="${userName}"] (Status: PUTUS - REMOVED SECRETS)`);
      }
    });

    steps.push('Sinkronisasi selesai! Semua rule firewall dan data ppp secret RouterOS sinkron sempurna.');

    // Print logs sequentially
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setSyncLogs(prev => [...prev, `[RouterOS API] ${steps[currentStep]}`]);
        currentStep++;
      } else {
        clearInterval(interval);
        setIsSyncing(false);
      }
    }, 350);
  };

  // Process CLI Input
  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    const input = terminalInput.trim();
    setTerminalHistory(prev => [...prev, { text: `[admin@Tiva_CCR] > ${input}`, type: 'input' }]);
    setTerminalInput('');

    // Interpret command
    setTimeout(() => {
      const lower = input.toLowerCase();
      
      if (lower === '/help' || lower === 'help') {
        setTerminalHistory(prev => [
          ...prev,
          { text: 'Perintah Terminal RouterOS Tiva Network yang tersedia:', type: 'success' },
          { text: '  /ppp secret print       - Cetak data rahasia PPPoE Pelanggan Aktif', type: 'output' },
          { text: '  /ip firewall print      - Cetak rule blokir/isolir pelanggan', type: 'output' },
          { text: '  /system resource print  - Tampilkan utilisasi CPU, RAM, & Uptime Router', type: 'output' },
          { text: '  ping google.com         - Lakukan tes latency jaringan luar', type: 'output' },
          { text: '  /clear                  - Bersihkan layar shell terminal', type: 'output' },
        ]);
      } 
      else if (lower === '/clear' || lower === 'clear') {
        setTerminalHistory([]);
      }
      else if (lower === '/ppp secret print') {
        setTerminalHistory(prev => [
          ...prev,
          { text: 'Flags: X - disabled, R - running', type: 'output' },
          { text: ' #   NAME           SERVICE   PROFILE     LIMIT-BYTES-OUT  DISABLED', type: 'output' },
          ...customers.map((c, i) => {
            const speed = c.packageId === 'p_5' ? '5M' : c.packageId === 'p_10' ? '10M' : c.packageId === 'p_15' ? '15M' : '20M';
            const isDis = c.status !== 'aktif' ? 'yes' : 'no';
            const flag = c.status !== 'aktif' ? 'X' : 'R';
            const userName = c.pppoeUsername || c.fullName.replace(/\s+/g, '').toLowerCase();
            return {
              text: ` ${flag} ${i}  ${userName.slice(0, 12).padEnd(14)} pppoe     pkg_${speed}     Unlimited        ${isDis}`,
              type: c.status === 'aktif' ? 'success' as const : 'error' as const
            };
          })
        ]);
      }
      else if (lower === '/ip firewall print') {
        const isolatedList = customers.filter(c => c.status === 'isolir');
        setTerminalHistory(prev => [
          ...prev,
          { text: 'Flags: X - disabled, A - active', type: 'output' },
          { text: ' #   CHAIN      ACTION   ADDRESS-LIST    DST-PORT   COMMENT', type: 'output' },
          { text: ' 0 A forward    redirect isolir_tiva     80,443     REDIRECT TO LOGOUT APP', type: 'success' },
          ...isolatedList.map((c, i) => ({
            text: ` 1 A forward    drop     192.168.10.${c.id}   any        BLOCKED UNTIL PAID (ODP: ${c.odpCode})`,
            type: 'error' as const
          }))
        ]);
      }
      else if (lower === '/system resource print') {
        setTerminalHistory(prev => [
          ...prev,
          { text: '          uptime: 4w2d5h14m22s', type: 'output' },
          { text: '         version: 7.12.1 (stable)', type: 'output' },
          { text: '      build-time: Nov/20/2025 15:44:21', type: 'output' },
          { text: '     factory-software: 6.48.3', type: 'output' },
          { text: '        free-memory: 1.4GiB', type: 'output' },
          { text: '       total-memory: 2.0GiB', type: 'output' },
          { text: '                cpu: tilegx', type: 'output' },
          { text: '          cpu-count: 9', type: 'output' },
          { text: '          cpu-frequency: 1200MHz', type: 'output' },
          { text: '            cpu-load: 12%', type: 'success' },
          { text: '      free-hdd-space: 94.2MiB', type: 'output' },
          { text: '     total-hdd-space: 128.0MiB', type: 'output' },
          { text: '    architecture-name: tile', type: 'output' },
          { text: '          board-name: CCR1009-7G-1C-1S+', type: 'output' },
        ]);
      }
      else if (lower === 'ping google.com') {
        setTerminalHistory(prev => [
          ...prev,
          { text: '  SEQ HOST                                     SIZE TTL TIME  STATUS', type: 'output' },
          { text: '    0 172.217.194.138                            56  57 12ms', type: 'success' },
          { text: '    1 172.217.194.138                            56  57 14ms', type: 'success' },
          { text: '    2 172.217.194.138                            56  57 11ms', type: 'success' },
          { text: '    3 172.217.194.138                            56  57 15ms', type: 'success' },
          { text: '    sent=4 received=4 packet-loss=0% min-rtt=11ms avg-rtt=13ms max-rtt=15ms', type: 'success' }
        ]);
      }
      else {
        setTerminalHistory(prev => [
          ...prev,
          { text: `bad command or script name: "${input}"`, type: 'error' },
          { text: 'Ketik "/help" untuk bantuan.', type: 'output' }
        ]);
      }
    }, 150);
  };

  return (
    <div className="space-y-6">
      {/* Intro header */}
      <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700/40">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Server className="h-6 w-6 text-teal-400" />
          Konfigurasi Koneksi & Sinkronisasi MikroTik RouterOS
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Koneksikan Tiva Network Billing ke Router MikroTik utama Anda untuk otomatisasi isolir port, pembuatan user PPPoE, dan sinkronisasi bandwidth terpusat.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Connection Setup & Action Panel (1/3 width) */}
        <div className="space-y-6">
          {/* Connection card */}
          <div className="bg-slate-800 p-5 rounded-2xl border border-slate-705 shadow-lg space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2 pb-2.5 border-b border-slate-700">
              <Network className="h-4 w-4 text-sky-400" />
              1. Parameter MikroTik API
            </h3>

            <div className="space-y-3.5">
              <div>
                <label className="text-3xs uppercase font-bold tracking-wider text-slate-400">Host IPv4 Address / DDNS</label>
                <input
                  id="mikrotik-host"
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-mono text-white focus:outline-none"
                  placeholder="Contoh: 192.168.88.1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-3xs uppercase font-bold tracking-wider text-slate-400">Port (API SSL)</label>
                  <input
                    id="mikrotik-port"
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-mono text-white focus:outline-none"
                    placeholder="8728"
                  />
                </div>
                <div>
                  <label className="text-3xs uppercase font-bold tracking-wider text-slate-400">Username *</label>
                  <input
                    id="mikrotik-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-3xs uppercase font-bold tracking-wider text-slate-400">Password API RouterOS</label>
                <input
                  id="mikrotik-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                />
              </div>

              <div className="pt-2 text-center">
                {status === 'disconnected' && (
                  <button
                    id="btn-mikrotik-connect"
                    onClick={handleTestConnection}
                    className="w-full py-2 bg-teal-600 hover:bg-teal-555 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Play className="h-3.5 w-3.5" /> Sambungkan ke Mikrotik
                  </button>
                )}

                {status === 'connecting' && (
                  <div className="py-2.5 bg-slate-900 text-slate-400 font-bold text-3xs uppercase rounded border border-slate-700 tracking-widest flex items-center justify-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-teal-400" />
                    Menghubungkan...
                  </div>
                )}

                {status === 'connected' && (
                  <div className="space-y-2">
                    <div className="py-2 bg-emerald-500/10 text-emerald-400 font-extrabold text-xs uppercase rounded border border-emerald-500/25 tracking-wider flex items-center justify-center gap-1.5">
                      <ShieldCheck className="h-4 w-4" /> MikroTik Online
                    </div>
                    <button
                      onClick={() => setStatus('disconnected')}
                      className="text-3xs text-rose-400 hover:underline inline-block mt-1 bg-transparent border-0 cursor-pointer"
                    >
                      Putuskan Koneksi
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sync Trigger card */}
          <div className="bg-slate-800 p-5 rounded-2xl border border-slate-705 shadow-lg space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2 pb-2.5 border-b border-slate-700">
              <RefreshCw className="h-4 w-4 text-emerald-400" />
              2. Sinkronisasi Data PPPoE
            </h3>
            
            <p className="text-[11px] text-slate-400">
              Sinkronisasikan status berlangganan & isolir pelanggan sistem Tiva Network langsung ke router. Pelanggan berstatus <span className="text-amber-400 font-bold">isolir</span> akan diblokir internetnya, sedangkan pelanggan <span className="text-emerald-400 font-bold">aktif</span> akan dibuka otomatis.
            </p>

            <button
              id="btn-sync-mikrotik"
              onClick={handleSyncToMikrotik}
              disabled={isSyncing || status !== 'connected'}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-555 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sedang Sinkronisasi...' : 'Sinkronkan User Sekarang'}
            </button>
          </div>
        </div>

        {/* Live Router Terminal / Sync logs (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Terminal Shell emulator tabs */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-96">
            <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-850 flex justify-between items-center text-xs">
              <span className="font-mono text-slate-350 flex items-center gap-2">
                <TermIcon className="h-4 w-4 text-teal-400" />
                Interaktif RouterOS Shell (admin@Tiva_CCR)
              </span>
              <span className="text-[10px] bg-slate-950 font-bold text-sky-400 px-2 py-0.5 rounded font-mono">TELNET / API SSL</span>
            </div>

            {/* Shell Screen lines */}
            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-300 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
              {terminalHistory.map((line, ix) => (
                <div 
                  key={ix}
                  className={`
                    ${line.type === 'input' ? 'text-white font-bold' : ''} 
                    ${line.type === 'success' ? 'text-emerald-400' : ''} 
                    ${line.type === 'error' ? 'text-rose-455 font-semibold' : ''}
                  `}
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {line.text}
                </div>
              ))}
              <div ref={terminalBottomRef} />
            </div>

            {/* Terminal Input Form */}
            <form onSubmit={handleTerminalSubmit} className="bg-slate-900 p-2.5 border-t border-slate-850 flex gap-2 shrink-0">
              <span className="font-mono text-teal-400 font-bold self-center px-1.5 text-xs select-none">&gt;</span>
              <input
                id="terminal-input-command"
                type="text"
                placeholder="Ketik command: e.g. /ppp secret print atau /system resource print"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                className="flex-1 bg-slate-950 text-emerald-400 font-mono text-xs border border-slate-800 focus:outline-none focus:border-slate-700 rounded px-2.5 py-1.5"
              />
              <button 
                type="submit" 
                className="px-3 py-1 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 text-2xs font-mono"
              >
                Kirim
              </button>
            </form>
          </div>

          {/* Sync result logs console */}
          <div className="bg-slate-800 p-5 rounded-2xl border border-slate-705 shadow-inner space-y-3">
            <h4 className="text-xs uppercase font-bold text-slate-400 font-mono tracking-wider flex items-center gap-2">
              <Code className="h-4 w-4 text-purple-400" /> Log Konsol Eksekusi MikroTik API
            </h4>

            <div className="bg-slate-900 rounded-lg p-3 max-h-36 overflow-y-auto border border-slate-850 font-mono text-[10px] text-slate-400 tracking-tight space-y-1">
              {syncLogs.length === 0 && consoleLogs.map((log, i) => (
                <div key={i} className="truncate">{log}</div>
              ))}
              {syncLogs.map((log, i) => (
                <div key={i} className="text-emerald-400 font-medium truncate">{log}</div>
              ))}
            </div>

            {/* Real Production NodeJS snippet explanation code */}
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-750 text-slate-300 text-xs space-y-2">
              <p className="font-bold text-white flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-amber-400" /> Panduan Developer & Mikrotik Node SDK
              </p>
              <p className="text-slate-400 text-2xs leading-relaxed">
                Untuk menyambungkan web server Express ke Mikrotik asli, Anda bisa memasang modul npm <code className="bg-slate-900 px-1 py-0.5 rounded text-teal-350">node-routeros</code> ke server backend dengan cara:
              </p>
              <pre className="p-2.5 bg-slate-950 rounded text-3xs font-mono text-teal-300 overflow-x-auto border border-slate-800 leading-normal">
{`const RouterOSAPI = require('node-routeros').RouterOSAPI;

const conn = new RouterOSAPI({
    host: '${host}',
    user: '${username}',
    password: 'PASSWORD_ROUTER_ANDA',
    keepalive: true
});

conn.connect()
  .then(() => conn.write('/ppp/secret/print'))
  .then(data => console.log('PPP Secrets:', data));`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
