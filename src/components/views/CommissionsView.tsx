import React, { useEffect, useState } from 'react';
import { getAdminToken } from '../../utils/adminSession';
import { CommissionPayout, Distributor } from '../../types/accounting';
import {
  Users,
  FileText,
  Building2,
  UserCheck,
  CheckCircle,
  Eye,
  AlertCircle,
  FileCheck,
  Percent,
} from 'lucide-react';
import avatarDistributor from '../../assets/images/avatar_distributor_lead_1792512086444.jpg';

interface EligiblePayout {
  commission_id: string;
  beneficiary_user_id: string;
  beneficiary_name: string;
  iban: string;
  iban_holder: string;
  bank_name: string | null;
  invoice_id: string;
  currency: string;
  gross_amount: number;
  withholding_amount: number;
  stamp_tax_amount: number;
  net_amount: number;
  wallet_balance: number;
}

interface PayoutBatch {
  batch_id: string;
  status: string;
  currency: string;
  gross_total: number | string;
  withholding_total: number | string;
  stamp_tax_total: number | string;
  net_total: number | string;
  item_count: number;
  created_by: string;
}

interface CommissionsViewProps {
  distributors: Distributor[];
  commissions: CommissionPayout[];
  onOpenGiderPusulasi: (comm: CommissionPayout) => void;
}

export const CommissionsView: React.FC<CommissionsViewProps> = ({
  distributors,
  commissions,
  onOpenGiderPusulasi,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'INDIVIDUAL' | 'COMPANY'>('ALL');
  const [eligiblePayouts, setEligiblePayouts] = useState<EligiblePayout[]>([]);
  const [payoutBatches, setPayoutBatches] = useState<PayoutBatch[]>([]);
  const [selectedPayoutIds, setSelectedPayoutIds] = useState<string[]>([]);
  const [payoutFilter, setPayoutFilter] = useState('');
  const [payoutMessage, setPayoutMessage] = useState('');
  const [payoutBusy, setPayoutBusy] = useState(false);

  const loadPayoutData = async () => {
    const headers = { Authorization: `Bearer ${getAdminToken() ?? ''}` };
    const [eligibleResponse, batchesResponse] = await Promise.all([
      fetch('/api/v1/integrations/accounting/payout-eligible', { headers }),
      fetch('/api/v1/integrations/accounting/payout-batches', { headers }),
    ]);
    if (!eligibleResponse.ok || !batchesResponse.ok) throw new Error('Ödeme verileri yüklenemedi.');
    const [eligibleData, batchData] = await Promise.all([eligibleResponse.json(), batchesResponse.json()]);
    setEligiblePayouts(eligibleData.payouts || []);
    setPayoutBatches(batchData.batches || []);
  };

  useEffect(() => {
    loadPayoutData().catch((error) => setPayoutMessage(error.message));
  }, []);

  const filteredPayouts = eligiblePayouts.filter((payout) =>
    `${payout.beneficiary_name} ${payout.iban} ${payout.beneficiary_user_id}`
      .toLocaleLowerCase('tr-TR')
      .includes(payoutFilter.toLocaleLowerCase('tr-TR'))
  );

  const downloadBankFile = (rows: EligiblePayout[], filename: string) => {
    const safeCell = (value: unknown) => {
      const text = String(value ?? '');
      const safe = /^[\s=+@-]/.test(text) ? `'${text}` : text;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const csv = [
      ['Bayi Adı', 'IBAN Hesap Sahibi', 'IBAN', 'Banka', 'Para Birimi', 'Brüt Tutar', 'Stopaj', 'Diğer Kesinti', 'Net Ödeme', 'Komisyon ID', 'Gider Pusulası No'],
      ...rows.map((row) => [row.beneficiary_name, row.iban_holder, row.iban, row.bank_name || '', row.currency,
        row.gross_amount.toFixed(2), row.withholding_amount.toFixed(2), row.stamp_tax_amount.toFixed(2),
        row.net_amount.toFixed(2), row.commission_id, row.invoice_id]),
    ].map((line) => line.map(safeCell).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const createPayoutBatch = async () => {
    if (!selectedPayoutIds.length) return;
    setPayoutBusy(true);
    setPayoutMessage('');
    try {
      const response = await fetch('/api/v1/integrations/accounting/payout-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAdminToken() ?? ''}` },
        body: JSON.stringify({ commission_ids: selectedPayoutIds, idempotency_key: crypto.randomUUID() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ödeme taslağı oluşturulamadı.');
      setSelectedPayoutIds([]);
      setPayoutMessage(`Toplu ödeme taslağı oluşturuldu: ${data.batch.batch_id}. Banka dosyasını aşağıdaki geçmişten indirebilirsiniz.`);
      await loadPayoutData();
    } catch (error) {
      setPayoutMessage(error instanceof Error ? error.message : 'İşlem başarısız.');
    } finally {
      setPayoutBusy(false);
    }
  };

  const cancelPayoutBatch = async (batchId: string) => {
    if (!window.confirm('Bu taslak banka listesi iptal edilsin mi? İptal sonrası komisyon yeniden seçilebilir.')) return;
    setPayoutBusy(true);
    setPayoutMessage('');
    try {
      const response = await fetch(`/api/v1/integrations/accounting/payout-batches/${encodeURIComponent(batchId)}/cancel`, {
        method: 'POST', headers: { Authorization: `Bearer ${getAdminToken() ?? ''}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ödeme taslağı iptal edilemedi.');
      setPayoutMessage('Ödeme taslağı iptal edildi; komisyonlar yeniden seçilebilir.');
      await loadPayoutData();
    } catch (error) {
      setPayoutMessage(error instanceof Error ? error.message : 'İşlem başarısız.');
    } finally {
      setPayoutBusy(false);
    }
  };

  const completePayoutBatch = async (batchId: string) => {
    const bankReference = window.prompt('Bankanın işlem/dekont referansını girin:');
    if (!bankReference) return;
    if (!window.confirm('Bankaya transferin başarıyla yapıldığını ve bu referansla doğruladığınızı onaylıyor musunuz?')) return;
    setPayoutBusy(true);
    setPayoutMessage('');
    try {
      const response = await fetch(`/api/v1/integrations/accounting/payout-batches/${encodeURIComponent(batchId)}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAdminToken() ?? ''}` },
        body: JSON.stringify({ bank_reference: bankReference, bank_transfer_completed: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ödeme tamamlanamadı.');
      setPayoutMessage(data.duplicate
        ? 'Bu toplu ödeme daha önce tamamlanmış.'
        : `Ödeme tamamlandı: ${data.paid_count} komisyon, banka referansı ${data.bank_reference}.`);
      await loadPayoutData();
    } catch (error) {
      setPayoutMessage(error instanceof Error ? error.message : 'İşlem başarısız.');
    } finally {
      setPayoutBusy(false);
    }
  };

  const downloadBatchFile = async (batchId: string) => {
    try {
      const response = await fetch(`/api/v1/integrations/accounting/payout-batches/${encodeURIComponent(batchId)}`, {
        headers: { Authorization: `Bearer ${getAdminToken() ?? ''}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Banka dosyası hazırlanamadı.');
      downloadBankFile(data.items, `${batchId}-banka-odeme.csv`);
    } catch (error) {
      setPayoutMessage(error instanceof Error ? error.message : 'Banka dosyası indirilemedi.');
    }
  };

  const filteredCommissions = commissions.filter((comm) => {
    if (filterType === 'INDIVIDUAL') return !comm.isCompany;
    if (filterType === 'COMPANY') return comm.isCompany;
    return true;
  });

  const totalWithholdingPaid = commissions
    .filter((c) => !c.isCompany)
    .reduce((acc, c) => acc + c.withholdingAmountTRY, 0);

  const totalNetPaid = commissions
    .filter((c) => !c.isCompany)
    .reduce((acc, c) => acc + c.netPayableTRY, 0);

  return (
    <div className="space-y-6">
      {/* Header and Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Monoline MLM Komisyon &amp; Gider Pusulası / Stopaj Modülü
          </h2>
          <p className="text-xs text-slate-500">
            Bireysel bayilere otomatik %20 stopaj kesintili Gider Pusulası tanzimi, şirket bayilerine fatura akışı
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg text-xs font-medium self-start sm:self-auto">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              filterType === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tüm Hakedişler ({commissions.length})
          </button>
          <button
            onClick={() => setFilterType('INDIVIDUAL')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              filterType === 'INDIVIDUAL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Gider Pusulaları (Bireysel / Stopajlı)
          </button>
          <button
            onClick={() => setFilterType('COMPANY')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              filterType === 'COMPANY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Fatura Karşılığı (Şirket)
          </button>
        </div>
      </div>

      {/* Top 3 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">Toplam Kesilen Stopaj (360.01)</span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {totalWithholdingPaid.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
          </div>
          <span className="text-[10px] text-amber-700 font-medium">GVK 94/10-b (%20 Gelir Vergisi)</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">Bayilere Ödenen Net Nakit</span>
          <div className="text-2xl font-bold font-mono text-emerald-700">
            {totalNetPaid.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
          </div>
          <span className="text-[10px] text-slate-400">Banka EFT / FAST ile tediye edildi</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Aktif Bayi Ağı</span>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {distributors.length} Bayi
            </div>
            <span className="text-[10px] text-slate-400">1 Kurumsal · 3 Bireysel</span>
          </div>
          <img
            src={avatarDistributor}
            alt="Bayi Ağı Yöneticisi"
            referrerPolicy="no-referrer"
            className="w-12 h-12 rounded-full object-cover border border-slate-200"
          />
        </div>
      </div>

      {/* Komisyon Hakedişleri ve Gider Pusulaları Tablosu */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Monoline Komisyon Dağıtım &amp; Yasal Belge Kayıtları
            </h3>
            <p className="text-xs text-slate-500">
              Her satışta otomatik tetiklenen komisyon hesaplaması ve kesinti dökümü
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-3 px-4">Belge No</th>
                <th className="py-3 px-4">Hak Sahibi Bayi</th>
                <th className="py-3 px-4">Vergi Durumu</th>
                <th className="py-3 px-4">Monoline Tier</th>
                <th className="py-3 px-4 text-right">Referans Satış</th>
                <th className="py-3 px-4 text-right">Brüt Hakediş</th>
                <th className="py-3 px-4 text-right">Stopaj Kesintisi (%20)</th>
                <th className="py-3 px-4 text-right">Net Ödenecek</th>
                <th className="py-3 px-4 text-center">Durum</th>
                <th className="py-3 px-4 text-right">Yasal Belge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredCommissions.map((comm) => (
                <tr key={comm.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {comm.documentNumber}
                    <span className="block text-[10px] text-slate-400 font-sans font-normal">
                      Fatura: {comm.invoiceNumber}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-sans">
                    <p className="font-semibold text-slate-900">{comm.distributorName}</p>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {comm.isCompany ? 'Vergi Mükellefi Şirket' : 'Bireysel Şahıs (Muaf)'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-sans">
                    {comm.isCompany ? (
                      <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        Şirket (Fatura Keser)
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Gider Pusulası (Stopajlı)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    Tier {comm.tierLevel} (%{(comm.commissionRate * 100).toFixed(0)})
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600">
                    {comm.baseAmountTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-900">
                    {comm.grossCommissionTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </td>
                  <td className="py-3 px-4 text-right font-semibold">
                    {comm.isCompany ? (
                      <span className="text-slate-400">0.00 ₺</span>
                    ) : (
                      <span className="text-red-700">
                        -{comm.withholdingAmountTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-700">
                    {comm.netPayableTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </td>
                  <td className="py-3 px-4 text-center font-sans">
                    {comm.isPaid ? (
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                        Ödendi &amp; İşlendi
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                        Fatura Bekleniyor
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-sans">
                    {!comm.isCompany ? (
                      <button
                        onClick={() => onOpenGiderPusulasi(comm)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-md transition-colors shadow-2xs"
                      >
                        Pusulayı Aç
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          alert(`Alfa Bilişim şirket faturası GİB sistemi üzerinden onaylandı (VKN: 0540892341).`)
                        }
                        className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md transition-colors"
                      >
                        Fatura Yükle
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Toplu Bayi Komisyon ve Banka Ödemeleri</h3>
            <p className="text-xs text-slate-500">Yayımlanmış gider pusulası, serbest hakediş ve yeterli cüzdan bakiyesi olan TRY ödemeleri.</p>
          </div>
          <input
            value={payoutFilter}
            onChange={(event) => setPayoutFilter(event.target.value)}
            placeholder="Bayi, IBAN veya kullanıcı ara"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs md:w-64"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            disabled={!selectedPayoutIds.length || payoutBusy}
            onClick={createPayoutBatch}
            className="rounded-md bg-blue-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
          >Seçilenlerden Ödeme Taslağı Oluştur ({selectedPayoutIds.length})</button>
          <span className="text-[11px] text-slate-500">Taslağı oluşturan dosyayı indirir; banka transferinden sonra farklı yönetici ödemeyi onaylayıp kapatır.</span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[1050px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3"><input type="checkbox" aria-label="Filtrelenmiş tüm ödemeleri seç" checked={filteredPayouts.length > 0 && filteredPayouts.every((row) => selectedPayoutIds.includes(row.commission_id))} onChange={(event) => setSelectedPayoutIds(event.target.checked ? [...new Set([...selectedPayoutIds, ...filteredPayouts.map((row) => row.commission_id)])] : selectedPayoutIds.filter((id) => !filteredPayouts.some((row) => row.commission_id === id)))} /></th>
                <th className="p-3">Bayi / IBAN</th><th className="p-3">Banka</th><th className="p-3">Belge</th>
                <th className="p-3 text-right">Brüt</th><th className="p-3 text-right">Stopaj</th><th className="p-3 text-right">Diğer kesinti</th>
                <th className="p-3 text-right">Net ödenecek</th><th className="p-3 text-right">Cüzdan bakiyesi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayouts.map((row) => (
                <tr key={row.commission_id}>
                  <td className="p-3"><input type="checkbox" checked={selectedPayoutIds.includes(row.commission_id)} onChange={(event) => setSelectedPayoutIds((ids) => event.target.checked ? [...ids, row.commission_id] : ids.filter((id) => id !== row.commission_id))} /></td>
                  <td className="p-3"><strong>{row.beneficiary_name}</strong><span className="block font-mono text-[10px] text-slate-500">{row.iban_holder} · {row.iban}</span></td>
                  <td className="p-3">{row.bank_name || '—'}</td><td className="p-3 font-mono">{row.invoice_id}</td>
                  <td className="p-3 text-right">{row.gross_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                  <td className="p-3 text-right">{row.withholding_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                  <td className="p-3 text-right">{row.stamp_tax_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                  <td className="p-3 text-right font-semibold text-emerald-700">{row.net_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                  <td className="p-3 text-right">{row.wallet_balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                </tr>
              ))}
              {!filteredPayouts.length && <tr><td className="p-5 text-center text-slate-500" colSpan={9}>Şu anda banka ödemesine uygun komisyon bulunmuyor.</td></tr>}
            </tbody>
          </table>
        </div>
        {payoutMessage && <p role="status" className="text-xs text-slate-700">{payoutMessage}</p>}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-800">Toplu ödeme geçmişi</h4>
          {payoutBatches.length === 0 && <p className="text-xs text-slate-500">Henüz toplu ödeme taslağı oluşturulmadı.</p>}
          {payoutBatches.map((batch) => (
            <div key={batch.batch_id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-xs">
              <div><strong className="font-mono">{batch.batch_id}</strong><span className="ml-2 rounded bg-slate-100 px-2 py-1">{batch.status}</span><p className="mt-1 text-slate-500">{batch.item_count} bayi · Net {Number(batch.net_total).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ · Oluşturan: {batch.created_by}</p></div>
              <div className="flex flex-wrap gap-2">
                {['DRAFT', 'APPROVED', 'SETTLED'].includes(batch.status) && <button disabled={payoutBusy} onClick={() => downloadBatchFile(batch.batch_id)} className="rounded border border-slate-300 px-3 py-2 font-semibold">Banka İçin Toplu Ödeme Listesi İndir</button>}
                {['DRAFT', 'APPROVED'].includes(batch.status) && <button disabled={payoutBusy} onClick={() => completePayoutBatch(batch.batch_id)} className="rounded bg-emerald-700 px-3 py-2 font-semibold text-white">Seçilenleri onayla ve ödemeyi tamamla</button>}
                {batch.status === 'DRAFT' && <button disabled={payoutBusy} onClick={() => cancelPayoutBatch(batch.batch_id)} className="rounded border border-red-300 px-3 py-2 font-semibold text-red-700">Taslağı iptal et</button>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
