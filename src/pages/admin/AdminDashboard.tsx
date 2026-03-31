import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { LanguageToggle } from '@/components/LanguageToggle';
import { NotificationBell } from '@/components/NotificationBell';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Users, Package, TrendingUp, Clock, LogOut, CheckCircle, XCircle, Ban, Wallet, Star, FileText, DollarSign, Eye, ChevronDown, ChevronUp, BarChart3, AlertTriangle, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AdminDashboard() {
  const { t } = useLanguage();
  const { user, role, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'overview' | 'applications' | 'drivers' | 'deliveries' | 'stores' | 'analytics' | 'reports' | 'cancellations'>('overview');
  const [drivers, setDrivers] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [payoutMethods, setPayoutMethods] = useState<Record<string, any>>({});
  const [reports, setReports] = useState<any[]>([]);
  const [cancellations, setCancellations] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, revenue: 0, onlineDrivers: 0, todayOrders: 0, cancelledToday: 0 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustDesc, setAdjustDesc] = useState('');
  const [adminNote, setAdminNote] = useState('');

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && (!user || role !== 'admin')) {
      navigate('/admin/login', { replace: true });
    }
  }, [authLoading, user, role, navigate]);

  useEffect(() => {
    if (authLoading || role !== 'admin') return;
    fetchDrivers();
    fetchDeliveries();
    fetchStores();
    fetchPayoutMethods();
    fetchReports();
    fetchCancellations();
  }, [authLoading, role]);

  const fetchDrivers = async () => {
    const { data } = await supabase.from('driver_profiles').select('*').order('created_at', { ascending: false });
    if (data) {
      setDrivers(data);
      setStats(prev => ({
        ...prev,
        active: data.filter(d => d.is_online).length,
        onlineDrivers: data.filter(d => d.is_online).length,
        pending: data.filter(d => d.approval_status === 'pending' && d.onboarding_completed).length,
      }));
    }
  };

  const fetchDeliveries = async () => {
    const { data } = await supabase.from('deliveries').select('*').order('created_at', { ascending: false }).limit(500);
    if (data) {
      setDeliveries(data);
      const totalRevenue = data.reduce((sum, d) => sum + (d.commission_amount || 0), 0);
      const today = new Date().toDateString();
      const todayOrders = data.filter(d => new Date(d.created_at).toDateString() === today).length;
      const cancelledToday = data.filter(d => d.status === 'cancelled' && new Date(d.created_at).toDateString() === today).length;
      setStats(prev => ({ ...prev, total: data.length, revenue: totalRevenue, todayOrders, cancelledToday }));
    }
  };

  const fetchStores = async () => {
    const { data } = await supabase.from('store_profiles').select('*').order('created_at', { ascending: false });
    if (data) setStores(data);
  };

  const fetchPayoutMethods = async () => {
    const { data } = await supabase.from('driver_payout_methods').select('*');
    if (data) {
      const map: Record<string, any> = {};
      data.forEach(p => { map[p.driver_user_id] = p; });
      setPayoutMethods(map);
    }
  };

  const fetchReports = async () => {
    const { data } = await supabase.from('reports').select('*').order('created_at', { ascending: false }).limit(100);
    if (data) setReports(data);
  };

  const fetchCancellations = async () => {
    const { data } = await supabase.from('cancellations').select('*').order('created_at', { ascending: false }).limit(100);
    if (data) setCancellations(data);
  };

  const updateDriverStatus = async (userId: string, status: 'approved' | 'rejected' | 'suspended') => {
    const { error } = await supabase.from('driver_profiles')
      .update({ approval_status: status })
      .eq('user_id', userId);
    if (error) toast.error(t.common.error);
    else { toast.success(t.common.success); fetchDrivers(); }
  };

  const saveAdminNote = async (userId: string) => {
    if (!adminNote.trim()) return;
    const { error } = await supabase.from('driver_profiles')
      .update({ admin_notes: adminNote })
      .eq('user_id', userId);
    if (error) toast.error(t.common.error);
    else { toast.success(t.common.success); setAdminNote(''); fetchDrivers(); }
  };

  const adjustDriverBalance = async (driverId: string, driverUserId: string) => {
    const amount = parseFloat(adjustAmount);
    if (isNaN(amount) || amount === 0) return;
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;
    await supabase.from('driver_profiles').update({ balance: driver.balance + amount }).eq('id', driverId);
    await supabase.from('driver_balance_transactions').insert({
      driver_user_id: driverUserId,
      type: 'adjustment',
      amount,
      description: adjustDesc || t.admin.adminAdjustment,
    });
    setAdjustAmount('');
    setAdjustDesc('');
    setExpandedDriver(null);
    toast.success(t.common.success);
    fetchDrivers();
  };

  const approvalColors: Record<string, string> = {
    pending: 'bg-warning/20 text-warning',
    approved: 'bg-accent/20 text-accent',
    rejected: 'bg-destructive/20 text-destructive',
    suspended: 'bg-muted text-muted-foreground',
  };

  const filteredDeliveries = statusFilter === 'all' ? deliveries : deliveries.filter(d => d.status === statusFilter);
  const pendingApplications = drivers.filter(d => d.onboarding_completed && d.approval_status === 'pending');
  const allApplications = drivers.filter(d => d.onboarding_completed);

  // Analytics data
  const getWeeklyData = () => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toDateString();
    });
    return days.map(day => {
      const dayDeliveries = deliveries.filter(d => new Date(d.created_at).toDateString() === day);
      return {
        day: new Date(day).toLocaleDateString(undefined, { weekday: 'short' }),
        orders: dayDeliveries.length,
        completed: dayDeliveries.filter(d => d.status === 'delivered').length,
        cancelled: dayDeliveries.filter(d => d.status === 'cancelled').length,
      };
    });
  };

  const getStatusBreakdown = () => {
    const statusCounts: Record<string, number> = {};
    deliveries.forEach(d => { statusCounts[d.status] = (statusCounts[d.status] || 0) + 1; });
    return Object.entries(statusCounts).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));
  };

  const COLORS = ['hsl(var(--accent))', 'hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--warning))', 'hsl(var(--muted-foreground))', '#8884d8', '#82ca9d', '#ffc658'];

  const DocLink = ({ url, label }: { url: string | null; label: string }) => {
    if (!url) return <span className="text-[10px] text-muted-foreground">❌ {label}</span>;
    return (
      <a href={url} target="_blank" rel="noreferrer" className="text-[10px] text-accent underline flex items-center gap-0.5">
        <FileText className="w-3 h-3" /> {label}
      </a>
    );
  };

  const tabs = [
    { key: 'overview', label: t.admin.dashboard },
    { key: 'applications', label: `${t.admin.driverApplications} (${pendingApplications.length})` },
    { key: 'drivers', label: t.admin.drivers },
    { key: 'deliveries', label: t.admin.deliveries },
    { key: 'stores', label: t.admin.stores },
    { key: 'analytics', label: 'Analytics' },
    { key: 'reports', label: 'Reports' },
    { key: 'cancellations', label: 'Cancellations' },
  ] as const;

  if (authLoading || role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-top">
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.admin.dashboard}</h1>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <LanguageToggle />
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 grid grid-cols-4 gap-2 mb-6">
        {[
          { icon: Package, label: t.admin.totalDeliveries, value: stats.todayOrders },
          { icon: Users, label: t.admin.activeDrivers, value: stats.onlineDrivers },
          { icon: Clock, label: t.admin.pendingApproval, value: stats.pending },
          { icon: DollarSign, label: t.admin.totalRevenue, value: `${stats.revenue}` },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-card rounded-xl p-2.5 border border-border text-center">
            <Icon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{value}</p>
            <p className="text-[9px] text-muted-foreground leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="px-5 mb-4 flex gap-2 overflow-x-auto">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
              tab === key ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-5 pb-8 space-y-3">

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-xl p-4 border border-border text-center">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">{t.admin.totalDeliveries}</p>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border text-center">
                <p className="text-2xl font-bold">{stats.cancelledToday}</p>
                <p className="text-xs text-muted-foreground">{t.delivery.cancelled}</p>
              </div>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border">
              <p className="text-sm font-semibold mb-3">Weekly Orders</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={getWeeklyData()}>
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="orders" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* APPLICATIONS TAB */}
        {tab === 'applications' && allApplications.map((d) => (
          <div key={d.id} className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-sm">{d.full_name || t.admin.unnamed}</p>
                  <p className="text-xs text-muted-foreground">{d.phone} · {d.plate_number}</p>
                </div>
                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', approvalColors[d.approval_status])}>
                  {d.approval_status}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {t.admin.submitted}: {new Date(d.created_at).toLocaleDateString()}
              </p>
              <div className="flex gap-2 mt-3">
                {d.approval_status !== 'approved' && (
                  <Button size="sm" onClick={() => updateDriverStatus(d.user_id, 'approved')} className="flex-1 gap-1 h-9 rounded-lg text-xs">
                    <CheckCircle className="w-3.5 h-3.5" /> {t.admin.approve}
                  </Button>
                )}
                {d.approval_status !== 'rejected' && (
                  <Button size="sm" variant="outline" onClick={() => updateDriverStatus(d.user_id, 'rejected')} className="flex-1 gap-1 h-9 rounded-lg text-xs">
                    <XCircle className="w-3.5 h-3.5" /> {t.admin.reject}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setExpandedApp(expandedApp === d.id ? null : d.id)} className="gap-1 h-9 rounded-lg text-xs">
                  <Eye className="w-3.5 h-3.5" />
                  {expandedApp === d.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>
              </div>
            </div>

            {expandedApp === d.id && (
              <div className="border-t border-border p-4 space-y-4 bg-muted/30">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">{t.auth.fullName}:</span> <span className="font-medium">{d.full_name}</span></div>
                  <div><span className="text-muted-foreground">{t.auth.phone}:</span> <span className="font-medium">{d.phone}</span></div>
                  <div><span className="text-muted-foreground">{t.admin.secondPhone}:</span> <span className="font-medium">{d.second_phone || '-'}</span></div>
                  <div><span className="text-muted-foreground">{t.admin.dateOfBirth}:</span> <span className="font-medium">{d.date_of_birth || '-'}</span></div>
                  <div><span className="text-muted-foreground">{t.admin.nationalIdNumber}:</span> <span className="font-medium">{d.national_id_number || '-'}</span></div>
                  <div><span className="text-muted-foreground">{t.admin.governorate}:</span> <span className="font-medium">{d.governorate || '-'}</span></div>
                  <div><span className="text-muted-foreground">{t.admin.nationalIdExpiry}:</span> <span className="font-medium">{d.national_id_expiry || '-'}</span></div>
                  <div><span className="text-muted-foreground">{t.admin.licenseExpiry}:</span> <span className="font-medium">{d.driving_license_expiry || '-'}</span></div>
                  <div><span className="text-muted-foreground">{t.admin.vehicleLicenseExpiry}:</span> <span className="font-medium">{d.vehicle_license_expiry || '-'}</span></div>
                  <div><span className="text-muted-foreground">{t.driver.plateNumber}:</span> <span className="font-medium">{d.plate_number || '-'}</span></div>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-2">{t.admin.viewDocs}</p>
                  <div className="flex gap-2 flex-wrap">
                    <DocLink url={d.national_id_url} label={t.driver.nationalId} />
                    <DocLink url={d.national_id_back_url} label={t.driver.nationalIdBack} />
                    <DocLink url={d.driving_license_front_url} label={`${t.driver.driverLicense} (F)`} />
                    <DocLink url={d.driving_license_back_url} label={`${t.driver.driverLicense} (B)`} />
                    <DocLink url={d.vehicle_license_front_url} label={t.admin.vehicleLicenseFront} />
                    <DocLink url={d.vehicle_license_back_url} label={t.admin.vehicleLicenseBack} />
                    <DocLink url={d.criminal_record_url} label={t.admin.criminalRecord} />
                    <DocLink url={d.selfie_url} label={t.driver.selfie} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1">{t.admin.payoutMethod}</p>
                  {payoutMethods[d.user_id] ? (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium capitalize">{payoutMethods[d.user_id].method}</span>
                      {payoutMethods[d.user_id].method === 'instapay' && ` — ${payoutMethods[d.user_id].instapay_number}`}
                      {payoutMethods[d.user_id].method === 'ewallet' && ` — ${payoutMethods[d.user_id].ewallet_number}`}
                      {payoutMethods[d.user_id].method === 'bank' && ` — ${payoutMethods[d.user_id].bank_name} / ${payoutMethods[d.user_id].bank_account_number}`}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t.admin.noPayoutMethod}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold">{t.admin.adminNotes}</p>
                  {d.admin_notes && <p className="text-xs text-muted-foreground bg-background p-2 rounded">{d.admin_notes}</p>}
                  <Textarea
                    placeholder={t.admin.addNote}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="text-sm min-h-[60px]"
                  />
                  <Button size="sm" onClick={() => saveAdminNote(d.user_id)} className="h-8 rounded-lg text-xs">
                    {t.admin.addNote}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}

        {tab === 'applications' && allApplications.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">{t.admin.noApplications}</p>
        )}

        {/* DRIVERS TAB */}
        {tab === 'drivers' && drivers.map((d) => (
          <div key={d.id} className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-sm">{d.full_name || t.admin.unnamed}</p>
                <p className="text-xs text-muted-foreground">{d.phone} · {d.plate_number}</p>
              </div>
              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', approvalColors[d.approval_status])}>
                {d.approval_status}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 my-3 text-center">
              <div>
                <p className="text-xs font-bold">{d.total_deliveries || 0}</p>
                <p className="text-[9px] text-muted-foreground">{t.admin.totalDeliveries}</p>
              </div>
              <div>
                <p className="text-xs font-bold">{d.trial_deliveries_completed || 0}/10</p>
                <p className="text-[9px] text-muted-foreground">{t.admin.trialDeliveries}</p>
              </div>
              <div>
                <p className="text-xs font-bold">{d.balance || 0}</p>
                <p className="text-[9px] text-muted-foreground">{t.admin.driverBalance}</p>
              </div>
              <div>
                <p className="text-xs font-bold">★ {d.rating?.toFixed(1) || '5.0'}</p>
                <p className="text-[9px] text-muted-foreground">{t.admin.driverRating}</p>
              </div>
            </div>

            <div className="flex gap-2">
              {d.approval_status !== 'approved' && (
                <Button size="sm" onClick={() => updateDriverStatus(d.user_id, 'approved')} className="flex-1 gap-1 h-9 rounded-lg text-xs">
                  <CheckCircle className="w-3.5 h-3.5" /> {t.admin.approve}
                </Button>
              )}
              {d.approval_status !== 'rejected' && (
                <Button size="sm" variant="outline" onClick={() => updateDriverStatus(d.user_id, 'rejected')} className="flex-1 gap-1 h-9 rounded-lg text-xs">
                  <XCircle className="w-3.5 h-3.5" /> {t.admin.reject}
                </Button>
              )}
              {d.approval_status === 'approved' && (
                <Button size="sm" variant="outline" onClick={() => updateDriverStatus(d.user_id, 'suspended')} className="flex-1 gap-1 h-9 rounded-lg text-xs text-destructive">
                  <Ban className="w-3.5 h-3.5" /> {t.admin.suspend}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setExpandedDriver(expandedDriver === d.id ? null : d.id)} className="gap-1 h-9 rounded-lg text-xs">
                <Wallet className="w-3.5 h-3.5" />
              </Button>
            </div>

            {expandedDriver === d.id && (
              <div className="mt-3 pt-3 border-t border-border space-y-2">
                <p className="text-xs font-semibold">{t.admin.adjustBalance}</p>
                <Input type="number" placeholder={t.admin.adjustAmount} value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} className="h-9 text-sm" />
                <Input placeholder={t.admin.adjustDescription} value={adjustDesc} onChange={(e) => setAdjustDesc(e.target.value)} className="h-9 text-sm" />
                <Button size="sm" onClick={() => adjustDriverBalance(d.id, d.user_id)} className="w-full h-9 rounded-lg text-xs">
                  {t.common.confirm}
                </Button>
              </div>
            )}
          </div>
        ))}

        {/* DELIVERIES TAB */}
        {tab === 'deliveries' && (
          <>
            <div className="flex gap-1.5 overflow-x-auto pb-2">
              {['all', 'finding_driver', 'driver_accepted', 'arriving_pickup', 'picked_up', 'en_route', 'delivered', 'cancelled'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors',
                    statusFilter === s ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground'
                  )}
                >
                  {s === 'all' ? t.admin.allStatuses : s.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
            {filteredDeliveries.map((d) => (
              <div key={d.id} className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-start justify-between mb-2">
                  <StatusBadge status={d.status} />
                  <span className="text-[10px] text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm font-medium truncate">{d.dropoff_address}</p>
                <p className="text-xs text-muted-foreground truncate">{d.pickup_address}</p>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                  <span>{d.vehicle_type}</span>
                  {d.cash_amount > 0 && <span className="text-warning font-semibold">💰 {d.cash_amount} {t.common.egp}</span>}
                  {d.commission_amount > 0 && <span className="text-accent">{t.admin.commission}: {d.commission_amount} {t.common.egp}</span>}
                  {d.delivery_photo_url && (
                    <a href={d.delivery_photo_url} target="_blank" rel="noreferrer" className="text-accent underline">📷 Proof</a>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {/* STORES TAB */}
        {tab === 'stores' && stores.map((s) => (
          <div key={s.id} className="bg-card rounded-xl p-4 border border-border">
            <p className="font-semibold text-sm">{s.store_name}</p>
            <p className="text-xs text-muted-foreground">{s.address || t.admin.noAddress} · {s.phone || t.admin.noPhone}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{t.admin.joined}: {new Date(s.created_at).toLocaleDateString()}</p>
          </div>
        ))}

        {/* ANALYTICS TAB */}
        {tab === 'analytics' && (
          <div className="space-y-4">
            <div className="bg-card rounded-xl p-4 border border-border">
              <p className="text-sm font-semibold mb-3">Weekly Orders</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={getWeeklyData()}>
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="completed" fill="hsl(var(--accent))" name="Completed" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cancelled" fill="hsl(var(--destructive))" name="Cancelled" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-xl p-4 border border-border">
              <p className="text-sm font-semibold mb-3">Status Breakdown</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={getStatusBreakdown()} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                    {getStatusBreakdown().map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-xl p-4 border border-border text-center">
                <p className="text-xl font-bold">{deliveries.filter(d => d.status === 'delivered').length}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border text-center">
                <p className="text-xl font-bold">{deliveries.filter(d => d.status === 'cancelled').length}</p>
                <p className="text-xs text-muted-foreground">Cancelled</p>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border text-center">
                <p className="text-xl font-bold">{stats.revenue} {t.common.egp}</p>
                <p className="text-xs text-muted-foreground">{t.admin.totalRevenue}</p>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border text-center">
                <p className="text-xl font-bold">{drivers.filter(d => d.approval_status === 'approved').length}</p>
                <p className="text-xs text-muted-foreground">Approved Drivers</p>
              </div>
            </div>

            {/* Top Drivers */}
            <div className="bg-card rounded-xl p-4 border border-border">
              <p className="text-sm font-semibold mb-3">Top Drivers</p>
              {drivers
                .filter(d => d.approval_status === 'approved')
                .sort((a, b) => (b.total_deliveries || 0) - (a.total_deliveries || 0))
                .slice(0, 5)
                .map((d, i) => (
                  <div key={d.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{d.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">{d.total_deliveries || 0} deliveries · ★ {d.rating?.toFixed(1)}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* REPORTS TAB */}
        {tab === 'reports' && (
          <div className="space-y-3">
            {reports.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No reports yet</p>
            ) : reports.map(r => (
              <div key={r.id} className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-start justify-between mb-2">
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full',
                    r.status === 'open' ? 'bg-warning/20 text-warning' : 'bg-accent/20 text-accent'
                  )}>
                    {r.status}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm font-medium">{r.reason}</p>
                {r.details && <p className="text-xs text-muted-foreground mt-1">{r.details}</p>}
                <p className="text-[10px] text-muted-foreground mt-1">By: {r.reporter_role}</p>
              </div>
            ))}
          </div>
        )}

        {/* CANCELLATIONS TAB */}
        {tab === 'cancellations' && (
          <div className="space-y-3">
            {cancellations.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No cancellations yet</p>
            ) : cancellations.map(c => (
              <div key={c.id} className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-bold text-destructive">
                    {c.cancelled_by_role} cancelled
                  </span>
                  <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm">{c.reason}</p>
                {c.penalty_amount > 0 && (
                  <p className="text-xs text-warning font-semibold mt-1">
                    Penalty: {c.penalty_amount} {t.common.egp} → {c.penalty_to}
                  </p>
                )}
                {c.driver_wait_minutes > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Driver waited: {Math.round(c.driver_wait_minutes)} min
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
