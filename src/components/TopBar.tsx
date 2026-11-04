import React from 'react';
import avatarFinance from '../assets/images/avatar_finance_director_1792512086747.jpg';
import { Plus, Sparkles, HelpCircle, ShieldCheck, FileText, RotateCcw } from 'lucide-react';
import { COMPANY_PROFILE, LiveExchangeRates } from '../types/accounting';
import { LiveCurrencyTicker } from './common/LiveCurrencyTicker';

interface TopBarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onOpenSimulator: () => void;
  onStartTour?: () => void;
  onRunAutoPilot?: () => void;
  onExplainPage?: () => void;
  rates: LiveExchangeRates;
  onRefreshRates: () => Promise<void>;
  onOpenResetModal: () => void;
  onReturnToWellness?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  onTabChange,
  onOpenSimulator,
  onRunAutoPilot,
  onExplainPage,
  rates,
  onRefreshRates,
  onOpenResetModal,
  onReturnToWellness,
}) => {
  return (
    <header className="flex items-center justify-between gap-4 px-6 py-2.5 border-b border-slate-200 bg-white sticky top-0 z-30 shadow-2xs">
      {/* Zone 1: Corporate Identity & Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onTabChange('cfoReport');
          }}
          className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 flex items-center gap-2.5"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs tracking-wider">
            AKN
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-slate-950 text-sm leading-tight flex items-center gap-1.5">
              {COMPANY_PROFILE.legalName}
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-2.5 h-2.5" />
              Sanal Finans Direktörü (AI CFO)
            </span>
          </div>
        </a>

        {onReturnToWellness && (
          <button
            onClick={onReturnToWellness}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 hover:from-slate-800 hover:to-indigo-900 text-amber-300 hover:text-white border border-amber-400/50 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
            title="AKN Group Wellness & Monoline MLM Portalına Dön"
          >
            <span className="text-sm leading-none">←</span>
            <span>Wellness & Bayi Portalı</span>
          </button>
        )}

        <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Monoline Bağlantısı: Aktif</span>
        </span>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden xl:flex items-center gap-4 text-xs font-semibold text-slate-600">
        <button
          onClick={() => onTabChange('cfoReport')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 text-left flex items-center gap-1 ${
            currentTab === 'cfoReport' ? 'text-slate-950 font-bold border-b-2 border-slate-900 pb-0.5' : ''
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-emerald-600" />
          <span>CFO Raporu</span>
        </button>
        <button
          onClick={() => onTabChange('overview')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 text-left ${
            currentTab === 'overview' ? 'text-slate-950 font-bold border-b-2 border-slate-900 pb-0.5' : ''
          }`}
        >
          Genel Bakış
        </button>
        <button
          onClick={() => onTabChange('invoices')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 text-left ${
            currentTab === 'invoices' ? 'text-slate-950 font-bold border-b-2 border-slate-900 pb-0.5' : ''
          }`}
        >
          e-Faturalar
        </button>
        <button
          onClick={() => onTabChange('taxReturns')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 text-left ${
            currentTab === 'taxReturns' ? 'text-slate-950 font-bold border-b-2 border-slate-900 pb-0.5' : ''
          }`}
        >
          Beyannameler
        </button>
        <button
          onClick={() => onTabChange('commissions')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 text-left ${
            currentTab === 'commissions' ? 'text-slate-950 font-bold border-b-2 border-slate-900 pb-0.5' : ''
          }`}
        >
          Komisyon &amp; Stopaj
        </button>
        <button
          onClick={() => onTabChange('taxAccrual')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 text-left ${
            currentTab === 'taxAccrual' ? 'text-slate-950 font-bold border-b-2 border-slate-900 pb-0.5' : ''
          }`}
        >
          Vergi Dairesi
        </button>
        <button
          onClick={() => onTabChange('monolineReconciliation')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 text-left flex items-center gap-1 ${
            currentTab === 'monolineReconciliation' ? 'text-blue-600 font-bold border-b-2 border-blue-600 pb-0.5' : ''
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
          <span>Monoline Köprü</span>
        </button>
      </nav>

      {/* Zone 3: Live Currency Ticker, Reset System & Primary Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Live Internet Currency Exchange Rates Ticker */}
        <LiveCurrencyTicker rates={rates} onRefresh={onRefreshRates} />

        {/* Sistemi Sıfırla (Reset System Button) */}
        <button
          onClick={onOpenResetModal}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100/80 border border-red-200 rounded-lg transition-colors whitespace-nowrap"
          title="Tüm simülasyon ve sahte verileri temizle / sistemi 0'a sıfırla"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sistemi Sıfırla</span>
        </button>

        {/* Sayfa Eğitmeni: Bu Ekran Nedir? */}
        {onExplainPage && (
          <button
            onClick={onExplainPage}
            className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors whitespace-nowrap"
            title="Sesli asistan bu ekranın ne işe yaradığını anlatsın"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>Bu Ekran Nedir?</span>
          </button>
        )}

        {/* AKN Muhasebe Otopilotu */}
        {onRunAutoPilot && (
          <button
            onClick={onRunAutoPilot}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-all whitespace-nowrap shadow-xs"
            title="Bekleyen fatura, stopaj, TCMB kurları ve vergi tamponunu tek tıkla otomatik yönet"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
            <span>Otopilot</span>
          </button>
        )}

        <button
          onClick={onOpenSimulator}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Yeni Satış</span>
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <img
            src={avatarFinance}
            alt="Mali İşler Direktörü"
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-full object-cover border border-slate-200"
          />
          <div className="hidden 2xl:block text-left text-xs leading-tight">
            <p className="font-semibold text-slate-800">Ece Yılmaz</p>
            <p className="text-[10px] text-slate-600">Mali İşler Direktörü (CFO)</p>
          </div>
        </div>
      </div>
    </header>
  );
};
