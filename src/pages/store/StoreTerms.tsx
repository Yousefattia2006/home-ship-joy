import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

const storeTermsAr = `شروط وأحكام المتجر — توصيل

باستخدامك لتطبيق توصيل بصفتك متجراً، فإنك توافق على الشروط والأحكام التالية:

التسجيل والمسؤولية: يتعهد المتجر بتقديم معلومات صحيحة ودقيقة عند التسجيل وتحديثها عند أي تغيير. المتجر مسؤول مسؤولية كاملة عن دقة تفاصيل الطلبات المقدمة عبر التطبيق.

الطلبات والتوصيل: يلتزم المتجر بتجهيز الطلبات في الوقت المحدد. في حال التأخر في التجهيز يتحمل المتجر المسؤولية عن أي تأخير في التوصيل ينتج عن ذلك.

الرسوم والمدفوعات: يوافق المتجر على رسوم الخدمة المتفق عليها مع توصيل. يتم تسوية المدفوعات وفقاً للجدول الزمني المحدد في اتفاقية الخدمة.

إلغاء الطلبات: لا يجوز للمتجر إلغاء طلب بعد قبوله من قبل السائق إلا في حالات استثنائية موثقة.

السلوك المهني: يلتزم المتجر بالتعامل باحترام مع سائقي توصيل. أي سلوك مسيء قد يؤدي إلى تعليق الحساب.

الخصوصية: توصيل تحمي بيانات المتجر ولا تشاركها مع أطراف ثالثة إلا بموافقة صريحة أو بموجب القانون.

تعديل الشروط: تحتفظ توصيل بالحق في تعديل هذه الشروط مع إشعار مسبق لا يقل عن 7 أيام.`;

const storeTermsEn = `Store Terms & Conditions — Tawseel

By using Tawseel as a store, you agree to the following:

Registration: The store commits to providing accurate information during registration and updating it when changes occur. The store is fully responsible for the accuracy of order details submitted through the app.

Orders & Delivery: The store must prepare orders on time. Any delay in preparation that causes a delivery delay is the store's responsibility.

Fees & Payments: The store agrees to the service fees agreed upon with Tawseel. Payments are settled according to the schedule defined in the service agreement.

Order Cancellation: A store may not cancel an order after it has been accepted by a driver except in documented exceptional cases.

Professional Conduct: The store must treat Tawseel drivers with respect. Abusive behavior may result in account suspension.

Privacy: Tawseel protects store data and does not share it with third parties without explicit consent or legal requirement.

Changes to Terms: Tawseel reserves the right to modify these terms with at least 7 days prior notice.`;

export default function StoreTerms() {
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
            {lang === 'ar' ? storeTermsAr : storeTermsEn}
          </pre>
        </div>
      </div>
    </div>
  );
}
