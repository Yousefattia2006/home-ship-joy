import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

const driverTermsAr = `شروط وأحكام السائق — توصيل

باستخدامك لتطبيق توصيل بصفتك سائقاً، فإنك توافق على الشروط والأحكام التالية:

التسجيل والأهلية: يجب أن يكون السائق حاصلاً على رخصة قيادة سارية المفعول وأن تكون مركبته في حالة جيدة ومؤمنة. يتعهد السائق بتقديم وثائق حقيقية وصحيحة عند التسجيل.

الالتزام بالتوصيل: بمجرد قبول الطلب يلتزم السائق بإتمام التوصيل بشكل كامل وفي الوقت المناسب. التخلي عن الطلب بعد قبوله دون سبب مقبول قد يؤثر على تقييم السائق.

السلوك المهني: يلتزم السائق بالتعامل باحترام مع المتاجر والعملاء. أي سلوك مسيء أو غير لائق سيؤدي إلى تعليق الحساب أو إلغائه نهائياً.

المدفوعات: تُحسب أرباح السائق بناءً على عدد التوصيلات المكتملة والمسافة. يتم تحويل المستحقات وفق الجدول الزمني المحدد في التطبيق.

السلامة: يلتزم السائق بجميع قوانين المرور المحلية أثناء التوصيل. توصيل غير مسؤولة عن أي حوادث أو مخالفات تنتج عن سلوك السائق.

الخصوصية: لن تُشارك بيانات السائق الشخصية مع أطراف ثالثة إلا بموافقته أو بموجب القانون.

تعديل الشروط: تحتفظ توصيل بالحق في تعديل هذه الشروط مع إشعار مسبق لا يقل عن 7 أيام.`;

const driverTermsEn = `Driver Terms & Conditions — Tawseel

By using Tawseel as a driver, you agree to the following:

Registration & Eligibility: The driver must hold a valid driving license and operate a roadworthy, insured vehicle. The driver agrees to submit genuine and accurate documents during registration.

Delivery Commitment: Once an order is accepted, the driver must complete the delivery fully and on time. Abandoning an accepted order without valid reason may negatively affect the driver's rating.

Professional Conduct: The driver must treat stores and customers with respect. Abusive or inappropriate behavior will result in account suspension or permanent removal.

Payments: Driver earnings are calculated based on completed deliveries and distance. Payouts are transferred according to the schedule shown in the app.

Safety: The driver must comply with all local traffic laws during deliveries. Tawseel is not responsible for accidents or violations resulting from driver behavior.

Privacy: Driver personal data will not be shared with third parties without consent or legal obligation.

Changes to Terms: Tawseel reserves the right to modify these terms with at least 7 days prior notice.`;

export default function DriverTerms() {
  const { t, lang, dir } = useLanguage();
  const navigate = useNavigate();
  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-background safe-top">
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ms-2 rounded-full hover:bg-secondary">
          <BackIcon className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">{t.settings.termsAndConditions}</h1>
      </div>
      <div className="px-5 pb-8">
        <div className="bg-card rounded-xl p-5 border border-border">
          <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground font-[inherit]">
            {lang === 'ar' ? driverTermsAr : driverTermsEn}
          </pre>
        </div>
      </div>
    </div>
  );
}
