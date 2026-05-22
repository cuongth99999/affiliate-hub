import { useState } from 'react';

type Answer = {
  income: 'under7' | '7to15' | '15to30' | 'over30';
  purpose: 'shopping' | 'travel' | 'cashback' | 'building-credit';
  age: 'under25' | '25to35' | 'over35';
  hasProof: 'yes' | 'no';
};

type Recommendation = {
  slug: string;
  name: string;
  reason: string;
};

function recommend(a: Partial<Answer>): Recommendation[] {
  // Simple rule-based recommendation. Replace with real product data later.
  if (a.hasProof === 'no' && a.income !== 'over30') {
    return [
      {
        slug: 'cake-credit',
        name: 'Cake by VPBank — Cake Credit',
        reason: 'Mở online không cần chứng minh thu nhập, hạn mức khởi điểm thấp nhưng dễ tăng.',
      },
      {
        slug: 'tpbank-evo',
        name: 'TPBank EVO',
        reason: 'Quy trình xét duyệt eKYC nhanh, không cần bản cứng chứng minh thu nhập.',
      },
    ];
  }
  if (a.purpose === 'cashback') {
    return [
      {
        slug: 'vpbank-stepup',
        name: 'VPBank StepUp',
        reason: 'Cashback 6% cho danh mục chi tiêu lớn (ăn uống, online).',
      },
      {
        slug: 'tpbank-evo',
        name: 'TPBank EVO',
        reason: 'Cashback 15% giao dịch online tới hạn mức/tháng.',
      },
    ];
  }
  if (a.purpose === 'travel') {
    return [
      {
        slug: 'sacombank-visa-platinum',
        name: 'Sacombank Visa Platinum',
        reason: 'Tích dặm bay, lounge sân bay, bảo hiểm du lịch đi kèm.',
      },
    ];
  }
  // Default
  return [
    {
      slug: 'vpbank-lady',
      name: 'VPBank Lady Mastercard',
      reason: 'Phí thường niên miễn năm đầu, cashback 6% mua sắm, duyệt nhanh.',
    },
    {
      slug: 'tpbank-evo',
      name: 'TPBank EVO',
      reason: 'Cashback online cao, mở qua app.',
    },
  ];
}

const QUESTIONS = [
  {
    key: 'income' as const,
    label: 'Thu nhập/tháng của bạn?',
    options: [
      { value: 'under7', label: 'Dưới 7 triệu' },
      { value: '7to15', label: '7 - 15 triệu' },
      { value: '15to30', label: '15 - 30 triệu' },
      { value: 'over30', label: 'Trên 30 triệu' },
    ],
  },
  {
    key: 'purpose' as const,
    label: 'Mục đích sử dụng chính?',
    options: [
      { value: 'shopping', label: 'Mua sắm hàng ngày' },
      { value: 'cashback', label: 'Tối ưu cashback' },
      { value: 'travel', label: 'Du lịch, tích dặm bay' },
      { value: 'building-credit', label: 'Xây dựng lịch sử tín dụng' },
    ],
  },
  {
    key: 'age' as const,
    label: 'Độ tuổi của bạn?',
    options: [
      { value: 'under25', label: 'Dưới 25' },
      { value: '25to35', label: '25 - 35' },
      { value: 'over35', label: 'Trên 35' },
    ],
  },
  {
    key: 'hasProof' as const,
    label: 'Bạn có thể cung cấp giấy tờ chứng minh thu nhập (bảng lương, sao kê)?',
    options: [
      { value: 'yes', label: 'Có' },
      { value: 'no', label: 'Không' },
    ],
  },
] as const;

export default function CreditCardQuiz() {
  const [answers, setAnswers] = useState<Partial<Answer>>({});
  const [step, setStep] = useState(0);

  const isComplete = step >= QUESTIONS.length;
  const current = QUESTIONS[step];

  const handleSelect = (key: keyof Answer, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setStep(step + 1);
  };

  const handleReset = () => {
    setAnswers({});
    setStep(0);
  };

  if (isComplete) {
    const recs = recommend(answers);
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-2xl font-bold text-gray-900">Đề xuất cho bạn</h2>
        <p className="mt-1 text-sm text-gray-600">
          Dựa trên câu trả lời của bạn, đây là các thẻ phù hợp nhất:
        </p>

        <div className="mt-6 space-y-4">
          {recs.map((r) => (
            <div key={r.slug} className="rounded-lg border border-brand-200 bg-brand-50 p-5">
              <h3 className="text-lg font-bold text-brand-900">{r.name}</h3>
              <p className="mt-1 text-sm text-brand-800">{r.reason}</p>
              <a
                href={`/go/${r.slug}/`}
                rel="nofollow sponsored noopener"
                target="_blank"
                className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Mở thẻ ngay →
              </a>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="mt-6 text-sm text-gray-600 underline hover:text-brand-600"
        >
          Làm lại quiz
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
        <span>Câu {step + 1} / {QUESTIONS.length}</span>
        <div className="flex gap-1">
          {QUESTIONS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-8 rounded-full ${i <= step ? 'bg-brand-500' : 'bg-gray-200'}`}
            />
          ))}
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-900">{current.label}</h2>

      <div className="mt-5 grid gap-3">
        {current.options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleSelect(current.key, opt.value)}
            className="rounded-lg border border-gray-200 bg-white px-5 py-3 text-left text-base font-medium text-gray-900 transition-colors hover:border-brand-400 hover:bg-brand-50"
          >
            {opt.label}
          </button>
        ))}
      </div>

      {step > 0 && (
        <button
          type="button"
          onClick={() => setStep(step - 1)}
          className="mt-4 text-sm text-gray-500 hover:text-gray-700"
        >
          ← Quay lại
        </button>
      )}
    </div>
  );
}
