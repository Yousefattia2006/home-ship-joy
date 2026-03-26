import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Upload, Camera, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const TOTAL_STEPS = 6;

interface FormData {
  full_name: string;
  phone: string;
  second_phone: string;
  date_of_birth: string;
  national_id_number: string;
  governorate: string;
  national_id_expiry: string;
  national_id_front: File | null;
  national_id_back: File | null;
  driving_license_expiry: string;
  driving_license_front: File | null;
  driving_license_back: File | null;
  vehicle_license_front: File | null;
  vehicle_license_back: File | null;
  vehicle_license_expiry: string;
  plate_number: string;
  criminal_record: File | null;
  selfie: File | null;
}

const initialForm: FormData = {
  full_name: '', phone: '', second_phone: '', date_of_birth: '',
  national_id_number: '', governorate: '', national_id_expiry: '',
  national_id_front: null, national_id_back: null,
  driving_license_expiry: '', driving_license_front: null, driving_license_back: null,
  vehicle_license_front: null, vehicle_license_back: null,
  vehicle_license_expiry: '', plate_number: '',
  criminal_record: null, selfie: null,
};

export default function DriverOnboarding() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(initialForm);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  

  const set = (key: keyof FormData, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  const handleFile = (key: keyof FormData, file: File | null) => {
    set(key, file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviews(prev => ({ ...prev, [key]: url }));
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    const { error } = await supabase.storage.from('driver-documents').upload(path, file, { upsert: true });
    if (error) { console.error('Upload error:', error); return null; }
    const { data } = supabase.storage.from('driver-documents').getPublicUrl(path);
    return data.publicUrl;
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1: return !!(form.full_name && form.phone && form.second_phone && form.date_of_birth && form.national_id_number && form.governorate && form.national_id_expiry);
      case 2: return !!(form.national_id_front && form.national_id_back);
      case 3: return !!(form.driving_license_expiry && form.driving_license_front && form.driving_license_back);
      case 4: return !!(form.vehicle_license_front && form.vehicle_license_back && form.vehicle_license_expiry && form.plate_number);
      case 5: return !!form.criminal_record;
      case 6: return !!form.selfie;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const uid = user.id;
      const uploads: Record<string, string | null> = {};
      const fileMap: [keyof FormData, string][] = [
        ['national_id_front', `${uid}/national_id_front`],
        ['national_id_back', `${uid}/national_id_back`],
        ['driving_license_front', `${uid}/driving_license_front`],
        ['driving_license_back', `${uid}/driving_license_back`],
        ['vehicle_license_front', `${uid}/vehicle_license_front`],
        ['vehicle_license_back', `${uid}/vehicle_license_back`],
        ['criminal_record', `${uid}/criminal_record`],
        ['selfie', `${uid}/selfie`],
      ];

      for (const [key, path] of fileMap) {
        const file = form[key] as File | null;
        if (file) {
          uploads[key] = await uploadFile(file, path);
        }
      }

      const { error } = await supabase.from('driver_profiles').update({
        full_name: form.full_name,
        phone: form.phone,
        second_phone: form.second_phone,
        date_of_birth: form.date_of_birth,
        national_id_number: form.national_id_number,
        governorate: form.governorate,
        national_id_expiry: form.national_id_expiry,
        national_id_url: uploads.national_id_front,
        national_id_back_url: uploads.national_id_back,
        driving_license_expiry: form.driving_license_expiry,
        driving_license_front_url: uploads.driving_license_front,
        driving_license_back_url: uploads.driving_license_back,
        vehicle_license_front_url: uploads.vehicle_license_front,
        vehicle_license_back_url: uploads.vehicle_license_back,
        vehicle_license_expiry: form.vehicle_license_expiry,
        plate_number: form.plate_number,
        criminal_record_url: uploads.criminal_record,
        selfie_url: uploads.selfie,
        onboarding_completed: true,
        approval_status: 'pending',
      }).eq('user_id', uid);

      if (error) throw error;
      toast.success(t.driverOnboarding?.submitted || 'Application submitted!');
      navigate('/driver/status', { replace: true });
    } catch (err: any) {
      toast.error(err.message || t.common.error);
    } finally {
      setSubmitting(false);
    }
  };

  const FileUploadBox = ({ label, fileKey, accept = 'image/*', captureOnly = false }: { label: string; fileKey: keyof FormData; accept?: string; captureOnly?: boolean }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <label className={cn(
        'flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
        previews[fileKey] ? 'border-accent bg-accent/5' : 'border-border hover:border-muted-foreground'
      )}>
        {previews[fileKey] ? (
          <img src={previews[fileKey]} alt="" className="h-full w-full object-contain rounded-xl p-1" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            {captureOnly ? <Camera className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
            <span className="text-xs">{captureOnly ? (t.driverOnboarding?.takeSelfie || 'Take Photo') : (t.driverOnboarding?.tapToUpload || 'Tap to upload')}</span>
          </div>
        )}
        <input
          type="file"
          accept={accept}
          capture={captureOnly ? 'user' : undefined}
          className="hidden"
          onChange={(e) => handleFile(fileKey, e.target.files?.[0] || null)}
        />
      </label>
      {form[fileKey] && (
        <div className="flex items-center gap-1 text-xs text-accent">
          <Check className="w-3 h-3" />
          <span>{(form[fileKey] as File).name}</span>
        </div>
      )}
    </div>
  );

  const stepTitles = [
    t.driverOnboarding?.step1Title || 'Personal Information',
    t.driverOnboarding?.step2Title || 'National ID',
    t.driverOnboarding?.step3Title || 'Driving License',
    t.driverOnboarding?.step4Title || 'Vehicle License',
    t.driverOnboarding?.step5Title || 'Criminal Record',
    t.driverOnboarding?.step6Title || 'Live Selfie',
  ];

  return (
    <div className="min-h-screen bg-background safe-top flex flex-col">
      <div className="px-5 pt-6 pb-3 flex items-center gap-3">
        {step > 1 && (
          <button onClick={() => setStep(step - 1)} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{t.driverOnboarding?.stepOf || 'Step'} {step} {t.common.of} {TOTAL_STEPS}</p>
          <h1 className="text-lg font-bold">{stepTitles[step - 1]}</h1>
        </div>
      </div>

      <div className="px-5 mb-4">
        <Progress value={(step / TOTAL_STEPS) * 100} className="h-2" />
      </div>

      <div className="flex-1 px-5 pb-24 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {step === 1 && (
              <>
                <Input placeholder={t.driverOnboarding?.fullNameId || 'Full name (as on National ID)'} value={form.full_name} onChange={e => set('full_name', e.target.value)} className="h-12" required />
                <Input placeholder={t.driverOnboarding?.primaryPhone || 'Primary phone number'} value={form.phone} onChange={e => set('phone', e.target.value)} type="tel" className="h-12" required />
                <Input placeholder={t.driverOnboarding?.secondPhone || 'Second phone number'} value={form.second_phone} onChange={e => set('second_phone', e.target.value)} type="tel" className="h-12" required />
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">{t.driverOnboarding?.dateOfBirth || 'Date of birth'}</label>
                  <Input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} className="h-12" required />
                </div>
                <Input placeholder={t.driverOnboarding?.nationalIdNumber || 'National ID number'} value={form.national_id_number} onChange={e => set('national_id_number', e.target.value)} className="h-12" required />
                <Input placeholder={t.driverOnboarding?.governorate || 'Governorate (as on ID)'} value={form.governorate} onChange={e => set('governorate', e.target.value)} className="h-12" required />
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">{t.driverOnboarding?.nationalIdExpiry || 'National ID expiry date'}</label>
                  <Input type="date" value={form.national_id_expiry} onChange={e => set('national_id_expiry', e.target.value)} className="h-12" required />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <FileUploadBox label={t.driverOnboarding?.idFront || 'National ID (Front)'} fileKey="national_id_front" />
                <FileUploadBox label={t.driverOnboarding?.idBack || 'National ID (Back)'} fileKey="national_id_back" />
              </>
            )}

            {step === 3 && (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">{t.driverOnboarding?.licenseExpiry || 'Driving license expiry date'}</label>
                  <Input type="date" value={form.driving_license_expiry} onChange={e => set('driving_license_expiry', e.target.value)} className="h-12" required />
                </div>
                <FileUploadBox label={t.driverOnboarding?.licenseFront || 'Driving License (Front)'} fileKey="driving_license_front" />
                <FileUploadBox label={t.driverOnboarding?.licenseBack || 'Driving License (Back)'} fileKey="driving_license_back" />
              </>
            )}

            {step === 4 && (
              <>
                <FileUploadBox label={t.driverOnboarding?.vehicleLicenseFront || 'Vehicle License (Front)'} fileKey="vehicle_license_front" />
                <FileUploadBox label={t.driverOnboarding?.vehicleLicenseBack || 'Vehicle License (Back)'} fileKey="vehicle_license_back" />
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">{t.driverOnboarding?.vehicleLicenseExpiry || 'Vehicle license expiry date'}</label>
                  <Input type="date" value={form.vehicle_license_expiry} onChange={e => set('vehicle_license_expiry', e.target.value)} className="h-12" required />
                </div>
                <Input placeholder={t.driverOnboarding?.plateNumber || 'Motorcycle plate number'} value={form.plate_number} onChange={e => set('plate_number', e.target.value)} className="h-12" required />
              </>
            )}

            {step === 5 && (
              <>
                <p className="text-sm text-muted-foreground">{t.driverOnboarding?.criminalRecordDesc || 'Upload a photo or scanned copy of your criminal record document.'}</p>
                <FileUploadBox label={t.driverOnboarding?.criminalRecord || 'Criminal Record'} fileKey="criminal_record" accept="image/*,.pdf" />
              </>
            )}

            {step === 6 && (
              <>
                <p className="text-sm text-muted-foreground">{t.driverOnboarding?.selfieDesc || 'Center your face and take a live selfie. Gallery upload is not allowed.'}</p>
                <FileUploadBox label={t.driverOnboarding?.selfieCapture || 'Live Selfie'} fileKey="selfie" captureOnly />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-background border-t border-border safe-bottom">
        {!canProceed() && (
          <p className="text-xs text-destructive text-center mb-2">
            {t.driverOnboarding?.fillAllFields || 'Please fill all required fields to continue'}
          </p>
        )}
        {step < TOTAL_STEPS ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="w-full h-14 text-base font-bold rounded-xl gap-2"
          >
            {t.driverOnboarding?.next || 'Next'}
            <ArrowRight className="w-5 h-5" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!canProceed() || submitting}
            className="w-full h-14 text-base font-bold rounded-xl gap-2"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {submitting ? (t.common.loading) : (t.driverOnboarding?.submitApplication || 'Submit Application')}
          </Button>
        )}
      </div>
    </div>
  );
}
