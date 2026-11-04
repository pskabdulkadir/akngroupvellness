import React, { useState } from 'react';
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
    </div>
  );
};
