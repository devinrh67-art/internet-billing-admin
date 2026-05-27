export const DEFAULT_PACKAGES = [
  { id: 'p_5', name: 'Paket Tiva 5 Mbps', speed: '5 Mbps', price: 125000 },
  { id: 'p_10', name: 'Paket Tiva 10 Mbps', speed: '10 Mbps', price: 160000 },
  { id: 'p_15', name: 'Paket Tiva 15 Mbps', speed: '15 Mbps', price: 190000 },
  { id: 'p_20', name: 'Paket Tiva 20 Mbps', speed: '20 Mbps', price: 220000 },
];

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Calculates prorated price for joining mid-month.
 * Billing cycle is absolute on the 1st of every month.
 * If joining on Day X of Month with N days:
 * Remaining Days = N - X + 1
 * Amount = (Remaining Days / N) * Price
 */
export function calculateProrate(price: number, joinDateStr: string) {
  const date = new Date(joinDateStr);
  if (isNaN(date.getTime())) {
    return { amount: price, remainingDays: 30, totalDays: 30, dailyRate: Math.round(price / 30) };
  }

  const day = date.getDate();
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed

  // Total days in the current month
  const totalDays = getDaysInMonth(year, month);
  
  // Remaining days in the month (including registration day)
  const remainingDays = totalDays - day + 1;
  
  const dailyRate = price / totalDays;
  const rawAmount = remainingDays * dailyRate;
  
  // Round to nearest hundred or thousand for neat pricing
  const amount = Math.round(rawAmount);

  return {
    amount,
    remainingDays,
    totalDays,
    dailyRate: Math.round(dailyRate),
  };
}

export function formatIndonesianDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function getIndonesianMonthYear(monthYearStr: string): string {
  // input: "2026-05"
  const [year, month] = monthYearStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  if (isNaN(date.getTime())) return monthYearStr;
  
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
  });
}
