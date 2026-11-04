/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * AKN Global Group Ltd. Unified Application Suite
 * 1. Karşılama Ekranı (Hoş Geldiniz & Buton)
 * 2. AKN Group Wellness & Monoline MLM Platform
 * 3. VergiSync AI - Akıllı Muhasebe, e-Fatura & GİB Vergi Motoru
 */

import React, { useState, useEffect } from 'react';
import WellnessApp from './WellnessApp';
import SmartAccountingApp from './SmartAccountingApp';
import { LegalContractsModal, LegalContractTab } from './components/LegalContractsModal';
import { 
  ArrowRight, 
  Sparkles, 
  Activity, 
  Calculator, 
  Home, 
  Moon,
  ShieldAlert,
  Sun
} from 'lucide-react';

export type ActiveAppView = 'welcome' | 'wellness' | 'accounting';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveAppView>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const viewParam = urlParams.get('view');
      if (viewParam === 'accounting') return 'accounting';
      if (viewParam === 'wellness') return 'wellness';
      if (viewParam === 'welcome') return 'welcome';
      
      const saved = sessionStorage.getItem('akn_active_app_view');
      if (saved === 'accounting' || saved === 'wellness' || saved === 'welcome') {
        return saved as ActiveAppView;
      }
      return 'welcome';
    } catch {
      return 'welcome';
    }
  });

  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalContractTab, setLegalContractTab] = useState<LegalContractTab>('preInfo');

  const openLegalContract = (tab: LegalContractTab) => {
    setLegalContractTab(tab);
    setIsLegalModalOpen(true);
  };

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('akn_active_app_view', activeView);
    } catch {
      // ignore
    }
  }, [activeView]);

  useEffect(() => {
    const handleOpenAccounting = () => setActiveView('accounting');
    const handleOpenWellness = () => setActiveView('wellness');
    const handleOpenWelcome = () => setActiveView('welcome');

    window.addEventListener('open-smart-accounting', handleOpenAccounting);
    window.addEventListener('open-wellness-portal', handleOpenWellness);
    window.addEventListener('open-welcome-portal', handleOpenWelcome);

    return () => {
      window.removeEventListener('open-smart-accounting', handleOpenAccounting);
      window.removeEventListener('open-wellness-portal', handleOpenWellness);
      window.removeEventListener('open-welcome-portal', handleOpenWelcome);
    };
  }, []);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  // If in Welcome view, show centered Hoş Geldiniz and Button
  if (activeView === 'welcome') {
    return (
      <div
        className={`min-h-screen w-full flex flex-col justify-between transition-colors duration-300 ${
          isDarkMode
            ? 'bg-slate-950 text-slate-100'
            : 'bg-slate-50 text-slate-900'
        }`}
      >
        {/* Top utility bar */}
        <header className="w-full flex items-center justify-between px-6 py-5 border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-3">
            <span className="font-bold tracking-tight text-slate-900 dark:text-white text-base sm:text-lg">
              AKN Global Group Ltd.
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
              · Wellness Platformu
            </span>
          </div>

          <button
            onClick={toggleTheme}
            aria-label={isDarkMode ? 'Aydınlık moda geç' : 'Karanlık moda geç'}
            className={`p-2.5 rounded-full transition-all duration-200 cursor-pointer ${
              isDarkMode
                ? 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 shadow-xs border border-slate-200'
            }`}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </header>

        {/* Center Stage: Hoş Geldiniz & Buton */}
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-xl text-center flex flex-col items-center">
            
            {/* Hoş Geldiniz Başlığı */}
            <h1
              className={`text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-4 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}
              style={{ textWrap: 'balance' }}
            >
              Hoş Geldiniz
            </h1>

            {/* Subtitle */}
            <p
              className={`text-base sm:text-lg mb-8 max-w-md leading-relaxed ${
                isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              AKN Group Wellness sayfasına başlamak için aşağıdaki butona tıklayın.
            </p>

            {/* Ortadaki Tek Ana Buton */}
            <div className="flex items-center gap-4 w-full justify-center">
              <button
                onClick={() => setActiveView('wellness')}
                type="button"
                className={`group relative inline-flex items-center justify-center gap-3 px-10 py-5 text-base sm:text-lg font-bold rounded-xl transition-all duration-200 active:scale-98 cursor-pointer select-none whitespace-nowrap shadow-lg ${
                  isDarkMode
                    ? 'bg-white text-slate-950 hover:bg-slate-100 shadow-white/5'
                    : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20'
                }`}
              >
                <Activity className="w-5 h-5 text-emerald-500" />
                <span>AKN Wellness Uygulamasını Başlat</span>
                <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </div>

            {/* Wellness Bilgilendirme Kartı */}
            <div className="mt-10 max-w-md w-full">
              <div className={`p-4 rounded-xl border text-center ${
                isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
              }`}>
                <div className="flex items-center justify-center gap-2 font-semibold text-sm mb-1 text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                  <span>AKN Group Wellness Platformu</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                  Bio-Rezonans, Çakra & Letaif Analizi, Ses Motoru
                </p>
              </div>
            </div>

          </div>
        </main>

        <footer className="w-full border-t border-slate-200/60 dark:border-slate-800/60 px-6 py-8">
          <div className="mx-auto max-w-5xl space-y-5">
            <section aria-label="Yasal sözleşme bağlantıları">
              <nav aria-label="Yasal sözleşmeler" className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
                <button onClick={() => openLegalContract('preInfo')} className="text-blue-700 underline underline-offset-2 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">Ön Bilgilendirme Formu</button>
                <button onClick={() => openLegalContract('distanceSale')} className="text-blue-700 underline underline-offset-2 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">Mesafeli Satış Sözleşmesi</button>
                <button onClick={() => openLegalContract('cancellationRefund')} className="text-blue-700 underline underline-offset-2 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">İptal, İade ve Cayma Koşulları</button>
                <button onClick={() => openLegalContract('terms')} className="text-blue-700 underline underline-offset-2 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">Kullanıcı ve Lisans Sözleşmesi</button>
                <button onClick={() => openLegalContract('mlmTerms')} className="text-blue-700 underline underline-offset-2 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">MLM / Bayilik Şartları</button>
                <button onClick={() => openLegalContract('kvkk')} className="text-blue-700 underline underline-offset-2 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">KVKK ve Gizlilik</button>
              </nav>
            </section>

            <section
              aria-labelledby="welcome-health-notice"
              className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 ${
                isDarkMode
                  ? 'border-amber-400/20 bg-gradient-to-br from-amber-950/70 via-slate-900 to-slate-900 text-amber-50 shadow-lg shadow-black/10'
                  : 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 text-slate-800 shadow-lg shadow-amber-900/5'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  isDarkMode ? 'bg-amber-400/10 text-amber-300' : 'bg-amber-100 text-amber-700'
                }`}>
                  <ShieldAlert className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 id="welcome-health-notice" className="text-sm font-bold sm:text-base">
                    Önemli Bilgilendirme ve Yasal Uyarı
                  </h2>
                  <p className={`mt-2 text-xs leading-relaxed sm:text-sm ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    AKN Wellness bir sağlık hizmeti sunucusu, tıbbi cihaz veya tedavi yöntemi değildir; sunulan içerikler yalnızca genel bilgilendirme ve kişisel gelişim amaçlıdır.
                  </p>
                  <p className={`mt-2 text-xs leading-relaxed sm:text-sm ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    Bu platformdaki hiçbir ifade tıbbi tanı koyma, tedavi etme veya bir sağlık sorununu önleme amacı taşımaz.
                  </p>
                  <p className={`mt-3 border-l-2 pl-3 text-xs font-medium leading-relaxed sm:text-sm ${
                    isDarkMode ? 'border-amber-400/60 text-amber-100' : 'border-amber-500 text-amber-900'
                  }`}>
                    Herhangi bir sağlık sorununuz için lütfen uzman bir sağlık profesyoneline başvurunuz.
                  </p>
                </div>
              </div>
            </section>

            <p className="text-center text-xs text-slate-400 dark:text-slate-600">
              AKN Global Group Ltd. © {new Date().getFullYear()} · Tüm hakları saklıdır.
            </p>
          </div>
        </footer>
        <LegalContractsModal
          isOpen={isLegalModalOpen}
          onClose={() => setIsLegalModalOpen(false)}
          initialTab={legalContractTab}
        />
      </div>
    );
  }

  // Loaded Application View
  return (
    <div className="relative min-h-screen">
      {/* Return to Welcome Screen Header Bar */}
      <div className="sticky top-0 z-50 bg-slate-900 text-white px-4 py-2 flex items-center justify-between text-xs border-b border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView('welcome')}
            className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-md transition-colors font-medium text-white cursor-pointer"
            title="Karşılama Ekranına Geri Dön"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Karşılama Sayfasına Dön</span>
          </button>
          <span className="hidden sm:inline text-slate-400">·</span>
          <span className="hidden sm:inline text-slate-300 font-medium">
            {activeView === 'wellness' 
              ? 'AKN Group Wellness & Monoline MLM Platformu Aktif' 
              : 'VergiSync AI - Akıllı Muhasebe & GİB Vergi Motoru Aktif'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {activeView === 'wellness' ? (
            <button
              onClick={() => setActiveView('accounting')}
              className="flex items-center gap-1 px-2.5 py-1 text-slate-300 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5 text-blue-400" />
              <span>VergiSync AI</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveView('wellness')}
              className="flex items-center gap-1 px-2.5 py-1 text-slate-300 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Wellness Portalı</span>
            </button>
          )}
        </div>
      </div>

      {activeView === 'wellness' ? (
        <WellnessApp onOpenSmartAccounting={() => setActiveView('accounting')} />
      ) : (
        <SmartAccountingApp onReturnToWellness={() => setActiveView('wellness')} />
      )}
    </div>
  );
}
