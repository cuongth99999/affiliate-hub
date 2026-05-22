import { useMemo, useState } from 'react';

function formatVnd(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n));
}

export default function SavingsCalculator() {
  const [principal, setPrincipal] = useState(100_000_000);
  const [annualRate, setAnnualRate] = useState(5.5);
  const [months, setMonths] = useState(12);
  const [compound, setCompound] = useState<'monthly' | 'yearly'>('yearly');

  const result = useMemo(() => {
    const r = annualRate / 100;
    const t = months / 12;
    const n = compound === 'monthly' ? 12 : 1;
    const total = principal * Math.pow(1 + r / n, n * t);
    return { total, interest: total - principal };
  }, [principal, annualRate, months, compound]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-2xl font-bold text-gray-900">Tính lãi tiết kiệm</h2>
      <p className="mt-1 text-sm text-gray-600">
        Nhập số tiền gửi, lãi suất và kỳ hạn để xem tổng tiền nhận.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Số tiền gửi (VND)</span>
          <input
            type="number"
            min={1_000_000}
            step={1_000_000}
            value={principal}
            onChange={(e) => setPrincipal(Number(e.target.value) || 0)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
          <span className="mt-1 block text-xs text-gray-500">{formatVnd(principal)} ₫</span>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Lãi suất / năm (%)</span>
          <input
            type="number"
            min={0}
            max={20}
            step={0.1}
            value={annualRate}
            onChange={(e) => setAnnualRate(Number(e.target.value) || 0)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
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
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Kỳ ghép lãi</span>
          <select
            value={compound}
            onChange={(e) => setCompound(e.target.value as 'monthly' | 'yearly')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="yearly">Cuối kỳ</option>
            <option value="monthly">Hàng tháng (lãi nhập gốc)</option>
          </select>
        </label>
      </div>

      <div className="mt-6 grid gap-3 rounded-lg bg-emerald-50 p-5 sm:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-emerald-700">Tiền lãi nhận</div>
          <div className="mt-1 text-xl font-bold text-emerald-900">{formatVnd(result.interest)} ₫</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-emerald-700">Tổng nhận khi đáo hạn</div>
          <div className="mt-1 text-xl font-bold text-emerald-900">{formatVnd(result.total)} ₫</div>
        </div>
      </div>
    </div>
  );
}
