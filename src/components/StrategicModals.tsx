import React from 'react';
import {
  DefenseStructureSpec,
  EconomyCommodity,
  ISTANBUL_DISTRICTS,
  RaidDepot,
  ReconstructionProjectSpec,
  VolunteerCharacter
} from '../data/historicalData';

interface IstanbulModalProps {
  isOpen: boolean;
  onClose: () => void;
  depots: RaidDepot[];
  unlockedDepotIds: string[];
  onTeleportTo: (x: number, z: number, label: string, bringTruck?: boolean) => void;
  onRemoteLockpickDepot: (depotId: string) => void;
  currencyName: string;
}

export const IstanbulDistrictModal: React.FC<IstanbulModalProps> = ({
  isOpen,
  onClose,
  depots,
  unlockedDepotIds,
  onTeleportTo,
  onRemoteLockpickDepot,
  currencyName
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(6, 9, 13, 0.94)' }}>
      <div className="w-full max-w-5xl rounded-xl border border-[#d4a843]/40 bg-[#12161c] p-6 text-[#f4f1ea] shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d4a843]/30 pb-4 mb-5">
          <div>
            <div className="text-xs font-semibold tracking-wider text-[#d4a843]">
              MİM MİM GRUBU & HİLÂL-İ AHMER GİZLİ NAKLİYE AĞI (10 İLÇE · 10 BÜYÜK ANTREPO)
            </div>
            <h2 className="font-display text-2xl font-bold text-white mt-1">
              Genişletilmiş İstanbul Lojistik Merkezleri, Gizli Soygun & Kamyon Yükleme
            </h2>
          </div>
          <button onClick={onClose} className="btn-action">
            Sahaya Dön [ESC]
          </button>
        </div>

        <p className="text-xs text-slate-300 mb-4 leading-relaxed">
          İstanbul haritasındaki <strong>10 Büyük Antrepo ve Lojistik Merkezine</strong> Nakliye Kamyonunuzla birlikte intikal edebilir, <strong>[C] tuşuyla eğilerek dikkat çekmeden</strong> nöbetçileri atlatıp kapı kilitlerini kırabilir ve çaldığınız sandıkları kapıdaki <strong>Mim Mim Nakliye Kamyonuna [E] ile yükleyebilirsiniz!</strong>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {depots.map((dep) => {
            const dist = ISTANBUL_DISTRICTS.find((d) => d.id === dep.districtId);
            const isUnlocked = unlockedDepotIds.includes(dep.id);
            const isFullyLooted = dep.lootCratesRemaining === 0;
            return (
              <div
                key={dep.id}
                className="rounded-lg border p-4 flex flex-col justify-between gap-3"
                style={{
                  background: isFullyLooted ? '#111f16' : '#181e26',
                  borderColor: isFullyLooted ? '#10b981' : isUnlocked ? '#38bdf8' : 'rgba(212,168,67,0.35)'
                }}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                    <span>{dep.districtName}</span>
                    <span>·</span>
                    <span className="text-[#d4a843] font-medium">{dep.type}</span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">{dep.name}</h3>
                  <p className="text-xs text-slate-300 mt-1">{dep.description}</p>
                  {dist && (
                    <div className="text-[11px] text-amber-200/80 mt-1.5 italic">
                      Tarihî Not: {dist.historicalNote}
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-mono-num text-slate-200">
                    <span>Kalan Sandık: {dep.lootCratesRemaining}/{dep.lootCratesTotal}</span>
                    <span>·</span>
                    <span>Ganimet Değeri: +{dep.cashReward} {currencyName}</span>
                    <span>·</span>
                    <span>
                      Durum:{' '}
                      <strong className={isFullyLooted ? 'text-emerald-400' : isUnlocked ? 'text-sky-400' : 'text-amber-400'}>
                        {isFullyLooted ? 'TAMAMEN SOYULDU' : isUnlocked ? 'KAPISI AÇIK (İÇERİ GİR)' : 'KİLİTLİ ANTREPO'}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                  <button
                    onClick={() => {
                      onTeleportTo(dep.x, dep.z + dep.depth / 2 + 4.5, `${dep.districtName} - ${dep.name}`, true);
                      onClose();
                    }}
                    className="btn-action flex-1"
                    style={{ background: '#0c4a6e' }}
                  >
                    <i className="fa-solid fa-truck-ramp-box" /> Kamyonla Antrepo Kapısına İntikal Et
                  </button>
                  {!isUnlocked && !isFullyLooted && (
                    <button
                      onClick={() => onRemoteLockpickDepot(dep.id)}
                      className="btn-action"
                      style={{ background: '#b45309' }}
                    >
                      <i className="fa-solid fa-key" /> Sessizce Kilidi Aç
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-white/10 bg-[#0d1117] p-4">
          <div className="text-xs font-bold text-[#d4a843] mb-2">
            HIZLI İLÇE & VAPUR İSKELESİ ULAŞIM AĞI (KAMYONLA BİRLİKTE SEVK)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {ISTANBUL_DISTRICTS.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  onTeleportTo(d.centerX, d.centerZ + 10, d.name, true);
                  onClose();
                }}
                className="px-3 py-2 rounded border border-white/15 bg-[#161c24] hover:border-[#d4a843] text-left transition-colors cursor-pointer"
              >
                <div className="text-xs font-bold text-white truncate">{d.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{d.side}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface EconomyModalProps {
  isOpen: boolean;
  onClose: () => void;
  commodities: EconomyCommodity[];
  points: number;
  currencyName: string;
  warMorale: number;
  onDispatchToFront: (id: EconomyCommodity['id']) => void;
  onBuyCommodity: (id: EconomyCommodity['id']) => void;
  onLaunchDonationCampaign: () => void;
}

export const DynamicEconomyModal: React.FC<EconomyModalProps> = ({
  isOpen,
  onClose,
  commodities,
  points,
  currencyName,
  warMorale,
  onDispatchToFront,
  onBuyCommodity,
  onLaunchDonationCampaign
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(6, 9, 13, 0.94)' }}>
      <div className="w-full max-w-4xl rounded-xl border border-[#d4a843]/40 bg-[#141816] p-6 text-[#f4f1ea] shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d4a843]/30 pb-4 mb-5">
          <div>
            <div className="text-xs font-semibold text-[#d4a843]">
              HİLÂL-İ AHMER & MİLLÎ MÜCADELE DİNAMİK EKONOMİ VE LOJİSTİK İKMAL SİSTEMİ
            </div>
            <h2 className="font-display text-2xl font-bold text-white mt-1">
              Cephe İkmal Borsası & Antrepo Ganimet Yönetimi
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm font-mono-num bg-[#1e2620] px-3 py-1.5 rounded border border-[#d4a843]/40 text-[#d4a843]">
              Hazine: <strong>{points}</strong> {currencyName} · Cephe Morali: <strong>%{warMorale}</strong>
            </div>
            <button onClick={onClose} className="btn-action">
              Kapat [N]
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-300 mb-4 leading-relaxed">
          İstanbul antrepolarından dikkat çekmeden çaldığınız veya bağışlarla topladığınız tıbbi ve stratejik malzemeleri cephedeki aciliyet durumuna göre <strong>Anadolu Sahra Hastanelerine sevk ederek</strong> yüksek bütçe ve cephe morali kazanabilir, ya da eksik stokları tedarik edebilirsiniz.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
          {commodities.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-white/15 bg-[#1b221e] p-4 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Cephe Aciliyeti: %{item.frontlineDemand}</span>
                  <span className="font-mono-num text-[#d4a843] font-bold">
                    Birim Değer: {item.currentPrice} {currencyName} ({item.trend === 'up' ? '▲ Artışta' : item.trend === 'down' ? '▼ Düşüşte' : '• Dengeli'})
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">{item.name}</h3>
                <p className="text-xs text-slate-300 mt-1">{item.desc}</p>
                <div className="mt-2 text-xs font-mono-num text-sky-300">
                  Envanterdeki Stok: <strong>{item.stock} {item.unit}</strong>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-white/10">
                <button
                  onClick={() => onDispatchToFront(item.id)}
                  disabled={item.stock <= 0}
                  className="btn-action flex-1 disabled:opacity-40"
                  style={{ background: '#15803d' }}
                >
                  <i className="fa-solid fa-truck-medical" /> Cepheye Sevk Et (+{item.currentPrice} {currencyName})
                </button>
                <button
                  onClick={() => onBuyCommodity(item.id)}
                  className="btn-action"
                  style={{ background: '#1e293b' }}
                >
                  Al ({Math.round(item.currentPrice * 0.85)} {currencyName})
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-[#d4a843]/40 bg-[#221a15] p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-[#d4a843]">
              Hilâl-i Ahmer Şefkat Rozeti & Halk Bağışı Seferberliği
            </div>
            <div className="text-xs text-slate-300 mt-0.5">
              Dersaadet ve Anadolu halkından yaralı Mehmetçikler için sargı bezi, kinin ve nakdî şefkat bağışı toplayın.
            </div>
          </div>
          <button onClick={onLaunchDonationCampaign} className="btn-action" style={{ background: '#c8102e' }}>
            <i className="fa-solid fa-hand-holding-heart" /> Bağış Kampanyası Düzenle
          </button>
        </div>
      </div>
    </div>
  );
};

interface PlevneDefenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  structures: DefenseStructureSpec[];
  points: number;
  currencyName: string;
  bastionRating: number;
  onBuildStructure: (id: string) => void;
}

export const PlevneDefenseModal: React.FC<PlevneDefenseModalProps> = ({
  isOpen,
  onClose,
  structures,
  points,
  currencyName,
  bastionRating,
  onBuildStructure
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(6, 9, 13, 0.94)' }}>
      <div className="w-full max-w-4xl rounded-xl border border-[#d4a843]/40 bg-[#14181c] p-6 text-[#f4f1ea] shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d4a843]/30 pb-4 mb-5">
          <div>
            <div className="text-xs font-semibold text-[#d4a843]">
              93 HARBİ (1877–1878) · GAZİ OSMAN PAŞA & HİLÂL-İ AHMER TABYA TAHKİMATI
            </div>
            <h2 className="font-display text-2xl font-bold text-white mt-1">
              Plevne ve Şıpka Stratejik Savunma Mekanizmaları
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm font-mono-num bg-[#1e252e] px-3 py-1.5 rounded border border-[#d4a843]/40 text-[#d4a843]">
              Bütçe: <strong>{points}</strong> {currencyName} · Tabya Gücü: <strong>%{bastionRating}</strong>
            </div>
            <button onClick={onClose} className="btn-action">
              Cepheye Dön [F]
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-300 mb-4 leading-relaxed">
          93 Harbi ve diğer cephe savunmalarında Rus/düşman hücumlarını kırmak ve yaralı Mehmetçikleri korumak için sahaya 3 boyutlu <strong>Kum Torbası Tabyaları, Dikenli Tel Engelleri, Krupp Sahra Topları ve İleri Hat Hilâl-i Ahmer Sargı Çadırları</strong> inşa edin!
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {structures.map((st) => {
            const maxed = st.builtCount >= st.maxCount;
            return (
              <div
                key={st.id}
                className="rounded-lg border border-white/15 bg-[#1b222a] p-4 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono-num">
                    <span>Kurulu: {st.builtCount} / {st.maxCount}</span>
                    <span className="text-[#d4a843] font-bold">Maliyet: {st.cost} {currencyName}</span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">{st.name}</h3>
                  <p className="text-xs text-slate-300 mt-1">{st.desc}</p>
                  <div className="mt-2 text-xs text-emerald-400 font-medium">
                    Stratejik Etki: {st.effectText}
                  </div>
                </div>

                <button
                  onClick={() => onBuildStructure(st.id)}
                  disabled={maxed}
                  className="btn-action w-full disabled:opacity-40"
                  style={{ background: maxed ? '#1f2937' : '#8b1313' }}
                >
                  {maxed ? 'MAKSİMUM TAHKİMAT KURULDU' : `SAHAYA İNŞA ET (${st.cost} ${currencyName})`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface ReconstructionModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ReconstructionProjectSpec[];
  points: number;
  welfareScore: number;
  onUpgradeProject: (id: string) => void;
}

export const ReconstructionModal: React.FC<ReconstructionModalProps> = ({
  isOpen,
  onClose,
  projects,
  points,
  welfareScore,
  onUpgradeProject
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(6, 9, 13, 0.94)' }}>
      <div className="w-full max-w-4xl rounded-xl border border-sky-500/40 bg-[#101822] p-6 text-[#f4f1ea] shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sky-500/30 pb-4 mb-5">
          <div>
            <div className="text-xs font-semibold text-sky-400">
              2023 KAHRAMANMARAŞ & HATAY · TÜRK KIZILAYI AFET SONRASI YENİDEN İNŞA MODU
            </div>
            <h2 className="font-display text-2xl font-bold text-white mt-1">
              Afet İyileştirme, Konteyner Kent & Kalıcı Yaşam Yönetimi
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm font-mono-num bg-[#172332] px-3 py-1.5 rounded border border-sky-400/40 text-sky-300">
              Fon: <strong>{points} TL</strong> · Afetzede Refah Endeksi: <strong>%{welfareScore}</strong>
            </div>
            <button onClick={onClose} className="btn-action">
              Sahaya Dön [B]
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-300 mb-4 leading-relaxed">
          Deprem sonrası yeniden inşa sürecinde afetzedelerimizin barınma, sıcak yemek, kan/sağlık ve psikososyal destek ihtiyaçlarını karşılamak için 3 boyutlu tesisleri kurun ve geliştirin. Kurulan her tesis sahada görünür olur ve kurtarma görevlerinize doğrudan katkı sağlar!
        </p>

        <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden mb-5 border border-slate-700">
          <div
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${Math.min(100, welfareScore)}%` }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((prj) => {
            const maxed = prj.level >= prj.maxLevel;
            return (
              <div
                key={prj.id}
                className="rounded-lg border border-white/15 bg-[#172230] p-4 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono-num">
                    <span>{prj.category} · Seviye {prj.level}/{prj.maxLevel}</span>
                    <span className="text-amber-400 font-bold">Maliyet: {prj.cost} TL</span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">{prj.name}</h3>
                  <p className="text-xs text-slate-300 mt-1">{prj.desc}</p>
                  <div className="mt-2 text-[11px] text-sky-300">
                    Koordinatör Gönüllü: <strong>{prj.volunteerLead}</strong> · Refah Katkısı: +%{prj.welfareImpact}
                  </div>
                </div>

                <button
                  onClick={() => onUpgradeProject(prj.id)}
                  disabled={maxed}
                  className="btn-action w-full disabled:opacity-40"
                  style={{ background: maxed ? '#065f46' : '#0284c7' }}
                >
                  {maxed
                    ? 'TAM KAPASİTE FAALİYETTE'
                    : prj.level === 0
                    ? `TESİSİ İNŞA ET (${prj.cost} TL)`
                    : `KAPASİTEYİ ARTIR - SEVİYE ${prj.level + 1} (${prj.cost} TL)`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface VolunteerModalProps {
  volunteer: VolunteerCharacter | null;
  onClose: () => void;
  onClaimVolunteerSupport: (vol: VolunteerCharacter) => void;
}

export const VolunteerDialogModal: React.FC<VolunteerModalProps> = ({
  volunteer,
  onClose,
  onClaimVolunteerSupport
}) => {
  if (!volunteer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(6, 9, 13, 0.92)' }}>
      <div className="w-full max-w-xl rounded-xl border border-[#d4a843] bg-[#161310] p-6 text-[#f4f1ea] shadow-2xl">
        <div className="text-xs font-bold text-[#d4a843] tracking-wider">
          HİLÂL-İ AHMER & TÜRK KIZILAYI GÖNÜLLÜ KAHRAMANI · {volunteer.era}
        </div>
        <h2 className="font-display text-2xl font-bold text-white mt-1">{volunteer.name}</h2>
        <div className="text-xs text-sky-300 font-medium mb-4">{volunteer.role}</div>

        <div className="space-y-2.5 bg-[#0f0d0b] border border-white/10 rounded-lg p-4 mb-4">
          {volunteer.dialogue.map((line, idx) => (
            <p key={idx} className="text-xs text-amber-100/90 italic leading-relaxed">
              “{line}”
            </p>
          ))}
        </div>

        <div className="bg-[#1f1a14] border border-[#d4a843]/30 rounded-lg p-3 mb-4">
          <div className="text-xs font-bold text-emerald-400">
            Aktif Saha Desteği: {volunteer.bonusTitle}
          </div>
          <div className="text-xs text-slate-300 mt-0.5">{volunteer.bonusDesc}</div>
          <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-white/10">
            <strong>Tarihî Biyografi:</strong> {volunteer.historicalBio}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onClaimVolunteerSupport(volunteer)}
            className="btn-action flex-1"
            style={{ background: '#15803d' }}
          >
            <i className="fa-solid fa-kit-medical" /> Gönüllü Sıhhiye İkmal Desteği Al
          </button>
          <button onClick={onClose} className="btn-action" style={{ background: '#334155' }}>
            Teşekkür Et & Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
