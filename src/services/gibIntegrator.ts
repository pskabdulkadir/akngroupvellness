import { Invoice, CommissionPayout, LedgerEntry, CompanyProfile, COMPANY_PROFILE } from '../types/accounting';

export interface IntegratorConfig {
  id: 'Logo' | 'Uyumsoft' | 'Parasut' | 'NetGSM';
  name: string;
  endpoint: string;
  senderTag: string; // Gönderici Birim Etiketi: urn:mail:defaultgb@firma.com
  receiverTag: string; // Posta Kutusu Etiketi: urn:mail:defaultpk@firma.com
  username: string;
  isSandbox: boolean;
  status: 'CONNECTED' | 'DISCONNECTED';
}

export const INTEGRATORS: IntegratorConfig[] = [
  {
    id: 'Uyumsoft',
    name: 'Uyumsoft e-Fatura / e-Arşiv API',
    endpoint: 'https://efatura-test.uyumsoft.com.tr/services/integration',
    senderTag: 'urn:mail:defaultgb@aknglobal.com',
    receiverTag: 'urn:mail:defaultpk@aknglobal.com',
    username: 'aknglobal_cfo_user',
    isSandbox: true,
    status: 'CONNECTED',
  },
  {
    id: 'Logo',
    name: 'Logo Yazılım e-Logo Entegratör API',
    endpoint: 'https://elogo.logoyazilim.com.tr/PostBoxService',
    senderTag: 'urn:mail:defaultgb@aknglobal.com',
    receiverTag: 'urn:mail:defaultpk@aknglobal.com',
    username: 'elogo_client_akn',
    isSandbox: true,
    status: 'CONNECTED',
  },
  {
    id: 'Parasut',
    name: 'Paraşüt e-Fatura v4 REST API',
    endpoint: 'https://api.parasut.com/v4/e_invoices',
    senderTag: 'urn:mail:defaultgb@aknglobal.com',
    receiverTag: 'urn:mail:defaultpk@aknglobal.com',
    username: 'parasut_akn_token',
    isSandbox: true,
    status: 'CONNECTED',
  },
  {
    id: 'NetGSM',
    name: 'Trendyol / NetGSM e-Fatura Portal',
    endpoint: 'https://api.netgsm.com.tr/efatura/v1/send',
    senderTag: 'urn:mail:defaultgb@aknglobal.com',
    receiverTag: 'urn:mail:defaultpk@aknglobal.com',
    username: 'netgsm_akn_portal',
    isSandbox: true,
    status: 'CONNECTED',
  },
];

/**
 * UBL-TR 2.1 / GİB Standart e-Fatura XML Çıktısı Üreticisi
 */
export function generateUblTrXml(invoice: Invoice, companyProfile?: CompanyProfile): string {
  const isGlobal = invoice.scenario === 'IHRACAT';
  const company = companyProfile || COMPANY_PROFILE;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>TR1.2</cbc:CustomizationID>
  <cbc:ProfileID>${invoice.scenario}</cbc:ProfileID>
  <cbc:ID>${invoice.invoiceNumber}</cbc:ID>
  <cbc:CopyIndicator>false</cbc:CopyIndicator>
  <cbc:UUID>${invoice.ettn}</cbc:UUID>
  <cbc:IssueDate>${invoice.issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${invoice.issueTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>${invoice.type}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${invoice.currency}</cbc:DocumentCurrencyCode>
  <cbc:PricingExchangeRate>
    <cbc:SourceCurrencyCode>${invoice.currency}</cbc:SourceCurrencyCode>
    <cbc:TargetCurrencyCode>TRY</cbc:TargetCurrencyCode>
    <cbc:CalculationRate>${invoice.exchangeRateTCMB}</cbc:CalculationRate>
  </cbc:PricingExchangeRate>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="VKN">${company.vkn}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${company.legalName}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${company.address}</cbc:StreetName>
        <cbc:CitySubdivisionName>${company.district || 'Beşiktaş'}</cbc:CitySubdivisionName>
        <cbc:CityName>${company.city || 'İstanbul'}</cbc:CityName>
        <cac:Country>
          <cbc:Name>Türkiye</cbc:Name>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cac:TaxScheme>
          <cbc:Name>${company.taxOffice}</cbc:Name>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${invoice.customer.isCorporate ? 'VKN' : 'TCKN'}">${invoice.customer.taxNumber}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${invoice.customer.name}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${invoice.customer.address}</cbc:StreetName>
        <cbc:CityName>${invoice.customer.city}</cbc:CityName>
        <cac:Country>
          <cbc:Name>${invoice.customer.country}</cbc:Name>
        </cac:Country>
      </cac:PostalAddress>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${invoice.currency}">${invoice.vatTotal.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${invoice.currency}">${invoice.subtotal.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${invoice.currency}">${invoice.vatTotal.toFixed(2)}</cbc:TaxAmount>
      <cbc:Percent>${isGlobal ? '0' : '20'}</cbc:Percent>
      <cac:TaxCategory>
        ${
          isGlobal
            ? `<cbc:TaxExemptionReasonCode>301</cbc:TaxExemptionReasonCode>
        <cbc:TaxExemptionReason>3065 Sayılı KDVK 11/1-a Hizmet İhracatı</cbc:TaxExemptionReason>`
            : ''
        }
        <cac:TaxScheme>
          <cbc:Name>KDV</cbc:Name>
          <cbc:TaxTypeCode>0015</cbc:TaxTypeCode>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${invoice.currency}">${invoice.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${invoice.currency}">${invoice.subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${invoice.currency}">${invoice.grandTotal.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${invoice.currency}">${invoice.grandTotal.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;
}

/**
 * Luca & Zirve Muhasebe Programı Uyumlu Yevmiye Defteri (General Ledger) XML formatı
 */
export function exportLedgerToXml(entries: LedgerEntry[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<YevmiyeDefteri xmlns="http://www.edefter.gov.tr" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Baslik>
    <MukellefVKN>${COMPANY_PROFILE.vkn}</MukellefVKN>
    <Unvan>${COMPANY_PROFILE.legalName}</Unvan>
    <Donem>2026-10</Donem>
    <Standart>GİB E-Defter Kılavuzu v1.5 / Luca &amp; Zirve Uyumlu</Standart>
  </Baslik>
  <YevmiyeMaddeleri>
${entries
  .map(
    (e) => `    <YevmiyeMaddesi>
      <MaddeNo>${e.entryNumber}</MaddeNo>
      <Tarih>${e.date}</Tarih>
      <HesapKodu>${e.accountCode}</HesapKodu>
      <HesapAdi>${e.accountName}</HesapAdi>
      <Borc>${e.debitTRY.toFixed(2)}</Borc>
      <Alacak>${e.creditTRY.toFixed(2)}</Alacak>
      <BelgeNo>${e.documentNumber}</BelgeNo>
      <Aciklama>${e.description}</Aciklama>
    </YevmiyeMaddesi>`
  )
  .join('\n')}
  </YevmiyeMaddeleri>
</YevmiyeDefteri>`;
}

/**
 * Excel / CSV İndirme İçeriği (Luca / Zirve / Mikro / Logo Yevmiye Aktarımı)
 */
export function exportLedgerToCsv(entries: LedgerEntry[]): string {
  const headers = [
    'Yevmiye Madde No',
    'Tarih',
    'Hesap Kodu',
    'Hesap Adı',
    'Borç (TRY)',
    'Alacak (TRY)',
    'Belge No',
    'Açıklama',
  ];
  const rows = entries.map((e) => [
    e.entryNumber,
    e.date,
    e.accountCode,
    `"${e.accountName}"`,
    e.debitTRY.toFixed(2),
    e.creditTRY.toFixed(2),
    e.documentNumber,
    `"${e.description}"`,
  ]);

  return [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
}
