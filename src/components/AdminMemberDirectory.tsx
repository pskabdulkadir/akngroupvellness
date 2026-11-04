import React, { useEffect, useMemo, useState } from 'react';
import { Archive, RefreshCw, RotateCcw, Search, Users, X } from 'lucide-react';
import type { MonolineMember } from '../types/monoline';
import { adminSetMemberArchived } from '../utils/authManager';
import { adminSetResellerArchived, getAllResellers } from '../utils/resellerManager';
import { mirrorMonolineStateBackToFrekans, syncFrekansWithMonolineEngine } from '../utils/monolineSyncBridge';

type DirectoryMember = Pick<
  MonolineMember,
  | 'user_id'
  | 'global_line_id'
  | 'ref_code'
  | 'full_name'
  | 'email'
  | 'phone'
  | 'city'
  | 'sponsor_id'
  | 'is_active'
  | 'is_locked'
  | 'archived_at'
  | 'archived_previous_is_active'
  | 'archived_previous_is_locked'
>;

type MemberForm = {
  full_name: string;
  email: string;
  phone: string;
  city: string;
  sponsor_id: string;
  is_active: boolean;
  is_locked: boolean;
};

export const AdminMemberDirectory: React.FC = () => {
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<DirectoryMember | null>(null);
  const [form, setForm] = useState<MemberForm | null>(null);

  const loadMembers = async () => {
    try {
      const response = await fetch('/api/v1/admin/member-directory');
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Üye listesi alınamadı.');
      setMembers(Array.isArray(data.members) ? data.members : []);
      setError('');
    } catch (err: any) {
      setError(err?.message || 'Üye listesi alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      await syncFrekansWithMonolineEngine();
      if (active) await loadMembers();
    })();
    const intervalId = window.setInterval(() => void loadMembers(), 3000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const memberById = useMemo(
    () => new Map(members.map((member) => [member.user_id, member] as const)),
    [members]
  );

  const visibleMembers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return members.filter((member) => {
      if (!showArchived && member.archived_at) return false;
      if (!normalizedSearch) return true;
      const sponsor = member.sponsor_id ? memberById.get(member.sponsor_id) : undefined;
      return [
        member.user_id,
        member.full_name,
        member.email,
        member.phone,
        member.ref_code,
        member.sponsor_id,
        sponsor?.full_name,
        sponsor?.ref_code,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
    });
  }, [members, memberById, search, showArchived]);

  const openEdit = (member: DirectoryMember) => {
    setEditing(member);
    setForm({
      full_name: member.full_name,
      email: member.email,
      phone: member.phone,
      city: member.city,
      sponsor_id: member.sponsor_id || '',
      is_active: member.is_active,
      is_locked: member.is_locked,
    });
  };

  const saveMember = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing || !form) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/admin/members/${encodeURIComponent(editing.user_id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Üye güncellenemedi.');
      if (data.state) await mirrorMonolineStateBackToFrekans(data.state);
      setEditing(null);
      setForm(null);
      await loadMembers();
    } catch (err: any) {
      setError(err?.message || 'Üye güncellenemedi.');
    } finally {
      setSaving(false);
    }
  };

  const setArchived = async (member: DirectoryMember, archived: boolean) => {
    const action = archived ? 'arşivlemek' : 'arşivden çıkarmak';
    if (!window.confirm(`${member.full_name} kaydını ${action} istiyor musunuz? Finansal geçmiş korunur.`)) return;
    setSaving(true);
    try {
      const success = await adminSetMemberArchived(member.user_id, archived);
      if (!success) throw new Error('Arşiv işlemi tamamlanamadı.');
      const resellers = await getAllResellers();
      const linkedReseller = resellers.find((reseller) =>
        reseller.uid === member.user_id ||
        Boolean(member.email && reseller.email && reseller.email.toLowerCase() === member.email.toLowerCase())
      );
      if (linkedReseller && !(await adminSetResellerArchived(linkedReseller.uid, archived))) {
        throw new Error('Monoline kaydı güncellendi ancak bayi kartı eşitlenemedi.');
      }
      await loadMembers();
    } catch (err: any) {
      setError(err?.message || 'Arşiv işlemi tamamlanamadı.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-950/70 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-emerald-400" />
          <div>
            <h3 className="font-bold text-slate-100">Üye &amp; Bayi Yönetim Merkezi</h3>
            <p className="text-xs text-slate-400">Sponsor, erişim ve arşiv işlemleri sunucuyla eşitlenir.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-300">
            <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />
            Arşivdekileri göster
          </label>
          <button type="button" onClick={() => void loadMembers()} disabled={loading || saving} className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Yenile
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ad, e-posta, telefon, UID, bayi kodu veya sponsor ara" className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-sm text-slate-100 outline-none focus:border-emerald-500" />
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-950/50 p-3 text-sm text-rose-200">{error}</div>}
      {loading ? <div className="p-8 text-center text-sm text-slate-400">Üye ve bayi kayıtları yükleniyor…</div> : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead className="bg-slate-950 text-slate-400">
              <tr><th className="p-3">Kayıt</th><th className="p-3">İletişim</th><th className="p-3">Sponsor</th><th className="p-3">Durum</th><th className="p-3">İşlemler</th></tr>
            </thead>
            <tbody>
              {visibleMembers.map((member) => {
                const sponsor = member.sponsor_id ? memberById.get(member.sponsor_id) : undefined;
                return (
                  <tr key={member.user_id} className="border-t border-slate-800 text-slate-200">
                    <td className="p-3"><div className="font-semibold">{member.full_name}</div><div className="mt-1 font-mono text-[10px] text-slate-500">#{member.global_line_id} · {member.user_id} · {member.ref_code}</div></td>
                    <td className="p-3"><div>{member.email || '—'}</div><div className="mt-1 text-slate-400">{member.phone || '—'}</div></td>
                    <td className="p-3">{sponsor ? <>{sponsor.full_name}<div className="mt-1 font-mono text-[10px] text-slate-500">{sponsor.ref_code}</div></> : 'Sistem kökü'}</td>
                    <td className="p-3"><span className={`rounded-full px-2 py-1 ${member.archived_at ? 'bg-slate-700 text-slate-300' : member.is_active ? 'bg-emerald-900/70 text-emerald-300' : 'bg-amber-900/70 text-amber-300'}`}>{member.archived_at ? 'Arşivde' : member.is_active ? 'Aktif' : 'Pasif'}</span>{member.is_locked && <span className="ml-1 rounded-full bg-rose-900/70 px-2 py-1 text-rose-300">Kilitli</span>}</td>
                    <td className="p-3"><div className="flex gap-2">
                      <button type="button" onClick={() => openEdit(member)} disabled={Boolean(member.archived_at) || saving} className="rounded-lg bg-indigo-900/60 px-2.5 py-1.5 font-semibold text-indigo-200 disabled:opacity-40">Düzenle</button>
                      {member.user_id !== 'USR-ADMIN' && <button type="button" onClick={() => void setArchived(member, !member.archived_at)} disabled={saving} className="flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1.5 font-semibold text-slate-200 disabled:opacity-40">{member.archived_at ? <RotateCcw className="h-3 w-3" /> : <Archive className="h-3 w-3" />}{member.archived_at ? 'Geri al' : 'Arşivle'}</button>}
                    </div></td>
                  </tr>
                );
              })}
              {!visibleMembers.length && <tr><td colSpan={5} className="p-8 text-center text-slate-500">Arama ölçütlerine uygun kayıt yok.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {editing && form && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4">
          <form onSubmit={saveMember} className="w-full max-w-xl space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-center justify-between"><h3 className="font-bold text-slate-100">Üye / bayi bilgilerini düzenle</h3><button type="button" onClick={() => { setEditing(null); setForm(null); }} aria-label="Kapat" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800"><X className="h-4 w-4" /></button></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs text-slate-400">Ad soyad<input required value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
              <label className="space-y-1 text-xs text-slate-400">E-posta<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
              <label className="space-y-1 text-xs text-slate-400">Telefon<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
              <label className="space-y-1 text-xs text-slate-400">Şehir<input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
              <label className="space-y-1 text-xs text-slate-400 sm:col-span-2">Sponsor<select value={form.sponsor_id} onChange={(event) => setForm({ ...form, sponsor_id: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white"><option value="">Sistem yöneticisi</option>{members.filter((candidate) => candidate.user_id !== editing.user_id && !candidate.archived_at).map((candidate) => <option key={candidate.user_id} value={candidate.user_id}>#{candidate.global_line_id} · {candidate.full_name} · {candidate.ref_code}</option>)}</select></label>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-slate-300"><label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />Aktif</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.is_locked} onChange={(event) => setForm({ ...form, is_locked: event.target.checked })} />Hesap kilitli</label></div>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => { setEditing(null); setForm(null); }} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300">İptal</button><button type="submit" disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Kaydediliyor…' : 'Kaydet'}</button></div>
          </form>
        </div>
      )}
    </section>
  );
};
