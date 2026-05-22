import { useMemo, useState } from 'react';

function formatVnd(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n));
}

export default function LoanCalculator() {
  const [principal, setPrincipal] = useState(50_000_000);
  const [annualRate, setAnnualRate] = useState(18);
  const [months, setMonths] = useState(12);

  const result = useMemo(() => {
    const r = annualRate / 100 / 12;
    const monthly = months === 0 || r === 0
      ? principal / Math.max(months, 1)
      : (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
    const total = monthly * months;
    const totalInterest = total - principal;
    return { monthly, total, totalInterest };
  }, [principal, annualRate, months]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-2xl font-bold text-gray-900">Tính lãi vay tiêu dùng</h2>
      <p className="mt-1 text-sm text-gray-600">
        Nhập khoản vay, lãi suất năm và kỳ hạn để xem tiền trả hàng tháng.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Khoản vay (VND)</span>
          <input
            type="number"
            min={1_000_000}
            step={1_000_000}
            value={principal}
            onChange={(e) => setPrincipal(Number(e.target.value) || 0)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-500 focus:ring-brand-500"
          />
          <span className="mt-1 block text-xs text-gray-500">{formatVnd(principal)} ₫</span>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Lãi suất / năm (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={annualRate}
            onChange={(e) => setAnnualRate(Number(e.target.value) || 0)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-500 focus:ring-brand-500"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Kỳ hạn (tháng)</span>
          <input
            type="number"
            min={1}
            max={120}
            step={1}
            value={months}
            onChange={(e) => setMonths(Number(e.target.value) || 1)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-500 focus:ring-brand-500"
          />
        </label>
      </div>

      <div className="mt-6 grid gap-3 rounded-lg bg-brand-50 p-5 sm:grid-cols-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-brand-700">Trả hàng tháng</div>
          <div className="mt-1 text-xl font-bold text-brand-900">{formatVnd(result.monthly)} ₫</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-brand-700">Tổng lãi</div>
          <div className="mt-1 text-xl font-bold text-brand-900">{formatVnd(result.totalInterest)} ₫</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-brand-700">Tổng phải trả</div>
          <div className="mt-1 text-xl font-bold text-brand-900">{formatVnd(result.total)} ₫</div>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        * Công thức trả góp đều (annuity). Lãi suất thực có thể có phí xét duyệt, phí bảo hiểm khoản
        vay — đọc kỹ hợp đồng trước khi ký.
      </p>
    </div>
  );
}
