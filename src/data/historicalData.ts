export interface WeaponSpec {
  id: string;
  name: string;
  historicalModel: string;
  damage: number;
  ammo: number;
  maxAmmo: number;
  fireRateMs: number;
  zoomFov: number;
  price: number;
  owned: boolean;
  desc: string;
}

export interface HorseSpec {
  id: string;
  name: string;
  breed: string;
  capacity: number;
  speed: number;
  color: number;
  maneColor: number;
  price: number;
  owned: boolean;
  desc: string;
}

export interface IstanbulDistrict {
  id: string;
  name: string;
  side: 'Avrupa Yakası (Tarihi Yarımada)' | 'Avrupa Yakası (Beyoğlu & Boğaz)' | 'Anadolu Yakası' | 'Batı Lojistik Hattı';
  centerX: number;
  centerZ: number;
  radius: number;
  description: string;
  historicalNote: string;
  dangerLevel: 'Düşük' | 'Orta' | 'Yüksek' | 'Çok Yüksek';
  landmarks: string[];
}

export interface RaidDepot {
  id: string;
  name: string;
  districtId: string;
  districtName: string;
  type: 'Büyük Antrepo' | 'Lojistik Merkezi' | 'Ecza & Sıhhiye Ambarı' | 'Gümrük Silosu' | 'Tersane Deposu';
  x: number;
  z: number;
  width: number;
  depth: number;
  guardCount: number;
  lockDifficulty: number;
  lootCratesTotal: number;
  lootCratesRemaining: number;
  cashReward: number;
  suppliesYield: {
    kinin: number;
    bandage: number;
    surgical: number;
    tent: number;
    ammoCrate: number;
  };
  description: string;
}

export interface VolunteerCharacter {
  id: string;
  name: string;
  role: string;
  era: string;
  chapters: number[];
  x: number;
  z: number;
  coatColor: number;
  hatColor: number;
  bonusTitle: string;
  bonusDesc: string;
  dialogue: string[];
  historicalBio: string;
}

export interface EconomyCommodity {
  id: 'kinin' | 'bandage' | 'surgical' | 'tent' | 'ration' | 'ammoCrate';
  name: string;
  unit: string;
  basePrice: number;
  currentPrice: number;
  trend: 'up' | 'down' | 'stable';
  stock: number;
  frontlineDemand: number;
  desc: string;
}

export interface DefenseStructureSpec {
  id: string;
  name: string;
  type: 'sandbag_bastion' | 'barbed_wire' | 'field_aid_tent' | 'krupp_battery' | 'ammo_wagon';
  cost: number;
  maxCount: number;
  builtCount: number;
  hp: number;
  desc: string;
  effectText: string;
}

export interface ReconstructionProjectSpec {
  id: string;
  name: string;
  category: 'Barınma' | 'Beslenme' | 'Sağlık' | 'Psikososyal & Eğitim' | 'Altyapı';
  cost: number;
  level: number;
  maxLevel: number;
  welfareImpact: number;
  x: number;
  z: number;
  desc: string;
  volunteerLead: string;
}

export const INITIAL_WEAPONS: Record<string, WeaponSpec> = {
  pistol: {
    id: 'pistol',
    name: 'Karadağ Gasser Toplu Tabanca',
    historicalModel: 'Gasser M1870 (11.3mm)',
    damage: 1,
    ammo: 6,
    maxAmmo: 6,
    fireRateMs: 270,
    zoomFov: 50,
    price: 0,
    owned: true,
    desc: 'Osmanlı zabit ve Hilâl-i Ahmer muhafızlarının yakın mesafe müdafaa toplu tabancası.'
  },
  luger: {
    id: 'luger',
    name: 'Parabellum Luger P08 & Mauser C96',
    historicalModel: 'Subay Tabancası (9mm)',
    damage: 1.6,
    ammo: 10,
    maxAmmo: 10,
    fireRateMs: 175,
    zoomFov: 48,
    price: 85,
    owned: false,
    desc: 'Antrepo baskınlarında ve yakın siper muharebelerinde hızlı yarı otomatik subay tabancası.'
  },
  rifle: {
    id: 'rifle',
    name: 'Osmanlı Mavzer Piyade Tüfeği',
    historicalModel: 'Mauser M1890 / M1903 (7.65mm)',
    damage: 2.2,
    ammo: 10,
    maxAmmo: 10,
    fireRateMs: 380,
    zoomFov: 36,
    price: 120,
    owned: false,
    desc: 'Çanakkale ve Kurtuluş Savaşı Mehmetçiklerinin yüksek isabetli mavzer tüfeği.'
  },
  martini: {
    id: 'martini',
    name: 'Aynalı Martini-Henry Tüfeği',
    historicalModel: 'Peabody-Martini M1874 (.45 Kalibre)',
    damage: 3.2,
    ammo: 8,
    maxAmmo: 8,
    fireRateMs: 500,
    zoomFov: 34,
    price: 180,
    owned: false,
    desc: '93 Harbi Plevne tabyalarında Rus hatlarına karşı efsaneleşen ağır kalibre tüfek.'
  },
  repeater: {
    id: 'repeater',
    name: 'Plevne Winchester M1866 Süvari',
    historicalModel: 'Levye Mekanizmalı 16’lı Tüfek',
    damage: 2.2,
    ammo: 16,
    maxAmmo: 16,
    fireRateMs: 230,
    zoomFov: 38,
    price: 250,
    owned: false,
    desc: 'Gazi Osman Paşa’nın Plevne savunmasında üstün ateş gücü sağlayan seri manevra tüfeği.'
  },
  smg: {
    id: 'smg',
    name: 'Bergmann MP18 Siper Otomatiği',
    historicalModel: 'Tambur Şarjörlü Hafif Makineli',
    damage: 1.9,
    ammo: 28,
    maxAmmo: 28,
    fireRateMs: 115,
    zoomFov: 44,
    price: 320,
    owned: false,
    desc: 'İstanbul antrepo baskınları ve karakol içi yakın çatışmalar için yüksek hızlı otomatik silah.'
  },
  sniper: {
    id: 'sniper',
    name: 'Dürbünlü Keskin Nişancı Mavzeri',
    historicalModel: 'Goerz 4x Optik Dürbünlü Mauser',
    damage: 4.5,
    ammo: 6,
    maxAmmo: 6,
    fireRateMs: 580,
    zoomFov: 20,
    price: 380,
    owned: false,
    desc: 'Boğaz muhriplerindeki gözcüleri ve uzak düşman topçu bataryalarını tek atışta susturur.'
  },
  heavy: {
    id: 'heavy',
    name: 'Maxim / Schwarzlose Ağır Makineli',
    historicalModel: 'MG 08 Su Soğutmalı Cephe Makineli',
    damage: 3.2,
    ammo: 45,
    maxAmmo: 45,
    fireRateMs: 125,
    zoomFov: 42,
    price: 460,
    owned: false,
    desc: 'Düşman dalgalarını ve zırhlı araçları durduran yüksek kapasiteli ağır makineli tüfek.'
  }
};

// YÜKSEK KAPASİTELİ ATLAR (4, 6, 8 ve 10 Yaralı / Sandık Kapasiteli)
export const INITIAL_HORSES: Record<string, HorseSpec> = {
  boz: {
    id: 'boz',
    name: 'Çevik Süvari Atı (Dorukoru)',
    breed: 'Anadolu Rahvan Süvari Atı · 4 Kişilik Yüksek Kapasite',
    capacity: 4,
    speed: 19.5,
    color: 0x6b3e26,
    maneColor: 0x1e130c,
    price: 0,
    owned: true,
    desc: 'Genişletilmiş sahra heybeleriyle tek seferde 4 yaralı Mehmetçiği veya sandığı taşıyabilen çevik sıhhiye atı.'
  },
  doru: {
    id: 'doru',
    name: 'Çift Sedye Askılı Sıhhiye Atı (Al Yağız)',
    breed: 'Uzunyayla Güçlü Sıhhiye Atı · 6 Kişilik Yüksek Kapasite',
    capacity: 6,
    speed: 22.0,
    color: 0x2b1d16,
    maneColor: 0x0f0a07,
    price: 160,
    owned: false,
    desc: 'İki yanındaki çoklu sedye askılarıyla tek seferde 6 yaralıyı birden Sahra Hastanesine yetiştirir!'
  },
  kir: {
    id: 'kir',
    name: 'Ağır Sahra İkmal Küheylanı (Demirkır)',
    breed: 'Kafkas / Karacabey Ağır Koşu Atı · 8 Kişilik Dev Kapasite',
    capacity: 8,
    speed: 25.0,
    color: 0xd6d3d1,
    maneColor: 0x334155,
    price: 310,
    owned: false,
    desc: 'Ağır sahra sedye platformu sayesinde tek seferde 8 yaralı neferi taşıyabilen yüksek kapasiteli küheylan!'
  },
  yagiz: {
    id: 'yagiz',
    name: 'Yağız Başkomutanlık Küheylanı',
    breed: 'Başkomutanlık Özel Süvari Atı · 10 Kişilik Maksimum Kapasite',
    capacity: 10,
    speed: 29.0,
    color: 0x18181b,
    maneColor: 0x09090b,
    price: 480,
    owned: false,
    desc: 'En yüksek hıza ve tek seferde 10 yaralı Mehmetçik taşıma kapasitesine sahip efsanevi yağız küheylan.'
  }
};

// 10 İLÇELİ BÜYÜK İSTANBUL HARİTASI (Çakışmasız, geniş cadde ve meydan yerleşimli koordinatlar)
export const ISTANBUL_DISTRICTS: IstanbulDistrict[] = [
  {
    id: 'eminonu_sirkeci',
    name: 'Eminönü & Sirkeci Garı',
    side: 'Avrupa Yakası (Tarihi Yarımada)',
    centerX: 16,
    centerZ: 36,
    radius: 38,
    description: 'Orient Express son durağı Sirkeci Garı, Gümrük Antrepoları, Nakliye Kamyonu garajı ve İnebolu’ya kalkan gizli Hilâl-i Ahmer takalarının iskelesi.',
    historicalNote: '1919-1922 arasında Sirkeci gümrük ambarlarından Mim Mim Grubu görevlilerince yüzlerce sandık sıhhiye malzemesi kamyonlarla iskeleye taşınmıştır.',
    dangerLevel: 'Orta',
    landmarks: ['Tarihi Sirkeci Garı', 'Eminönü Gizli Taka İskelesi', 'Sirkeci Gümrük Antreposu', 'Mim Mim Nakliye Kamyonu']
  },
  {
    id: 'sultanahmet_divanyolu',
    name: 'Sultanahmet & Divanyolu',
    side: 'Avrupa Yakası (Tarihi Yarımada)',
    centerX: -54,
    centerZ: 38,
    radius: 42,
    description: 'Sultanahmet Camii, Ayasofya-i Kebir ve Hilâl-i Ahmer Cemiyeti Umum Merkezi’nin bulunduğu geniş tarihi meydan.',
    historicalNote: 'Hilâl-i Ahmer Umum Merkezi İstanbul’un işgali sırasında Anadolu’ya hemşire, hekim ve ilaç sevkiyatını buradan koordine etmiştir.',
    dangerLevel: 'Orta',
    landmarks: ['Sultanahmet Camii', 'Ayasofya-i Kebir', 'Hilâl-i Ahmer Umum Merkezi']
  },
  {
    id: 'fatih_zeyrek',
    name: 'Fatih & Şehzadebaşı',
    side: 'Avrupa Yakası (Tarihi Yarımada)',
    centerX: -125,
    centerZ: 42,
    radius: 48,
    description: 'Hilâl-i Ahmer Hanımlar Merkezi’nin sargı bezi, çamaşır ve kinin ambarlarının yer aldığı iç mahalleler.',
    historicalNote: 'Dr. Besim Ömer Paşa öncülüğünde Hilâl-i Ahmer Hanımlar Merkezi gönüllü kadınları cephedeki Mehmetçik için binlerce sargı paketi hazırlamıştır.',
    dangerLevel: 'Düşük',
    landmarks: ['Hilâl-i Ahmer Hanımlar Atölyesi', 'Fatih Kinin & Ecza Deposu']
  },
  {
    id: 'zeytinburnu_bakirkoy',
    name: 'Zeytinburnu & Bakırköy Lojistik Hattı',
    side: 'Batı Lojistik Hattı',
    centerX: -185,
    centerZ: 108,
    radius: 55,
    description: 'İmalat-ı Harbiye fabrikaları, büyük sahra çadırı antrepoları ve demiryolu lojistik yükleme rampaları.',
    historicalNote: 'Zeytinburnu ve Bakırköy’deki askeri ve sıhhiye fabrikalarından kamyon ve vagonlarla gizlice malzeme çıkarılmıştır.',
    dangerLevel: 'Yüksek',
    landmarks: ['Zeytinburnu Büyük Lojistik Antreposu', 'Sahra Çadırı & Battaniye Silosu']
  },
  {
    id: 'karakoy_tophane',
    name: 'Karaköy & Tophane-i Âmire',
    side: 'Avrupa Yakası (Beyoğlu & Boğaz)',
    centerX: 16,
    centerZ: -55,
    radius: 44,
    description: 'Galata Köprüsü’nün kuzey ucu, Karaköy rıhtım antrepoları ve Tophane-i Âmire büyük mühimmat/ecza depoları.',
    historicalNote: 'Tophane ve Karaköy antrepoları İtilaf devletlerinin en sıkı koruduğu ancak Kuva-yi Milliye’nin sessiz baskınlarla soyduğu lojistik merkezlerdi.',
    dangerLevel: 'Çok Yüksek',
    landmarks: ['Tophane-i Âmire Büyük Antreposu', 'Karaköy Liman Lojistik Merkezi']
  },
  {
    id: 'galata_pera',
    name: 'Galata & Pera (Beyoğlu)',
    side: 'Avrupa Yakası (Beyoğlu & Boğaz)',
    centerX: -54,
    centerZ: -65,
    radius: 46,
    description: 'Galata Kulesi, Cadde-i Kebir elektrikli tramvay hattı ve İtilaf subaylarının koruduğu Pera Ecza & Cerrahi Antreposu.',
    historicalNote: 'Beyoğlu ve Galata’daki yabancı ecza kumpanyalarının depolarından Anadolu’daki sahra hastaneleri için kloroform ve cerrahi setler temin edilmiştir.',
    dangerLevel: 'Yüksek',
    landmarks: ['Galata Kulesi', 'Pera İtilaf Ecza Antreposu']
  },
  {
    id: 'kasimpasa_tersane',
    name: 'Kasımpaşa & Tersane-i Âmire (Haliç)',
    side: 'Avrupa Yakası (Beyoğlu & Boğaz)',
    centerX: -130,
    centerZ: -68,
    radius: 50,
    description: 'Haliç kıyısındaki Bahriye Nezareti tersane kızakları, deniz hastanesi ambarları ve büyük ilaç antrepoları.',
    historicalNote: 'Kasımpaşa Bahriye depolarından kaçırılan tıbbi sandıklar kamyon ve motorlarla Karadeniz takalarına aktarılmıştır.',
    dangerLevel: 'Yüksek',
    landmarks: ['Tersane-i Âmire Lojistik Üssü', 'Bahriye Merkez Ecza Antreposu']
  },
  {
    id: 'besiktas_akaretler',
    name: 'Beşiktaş & Akaretler (Boğaz Hattı)',
    side: 'Avrupa Yakası (Beyoğlu & Boğaz)',
    centerX: 14,
    centerZ: -145,
    radius: 50,
    description: 'Boğaz’ın Avrupa kıyısında Akaretler sıra evleri, Beşiktaş İskelesi ve Kuzey Boğaz Deniz Lojistik Antreposu.',
    historicalNote: 'Mustafa Kemal Paşa’nın 1919’da Samsun’a çıkmadan önce karargâh kurduğu Akaretler ve Beşiktaş hattı, Karadeniz sevkiyatının kilit noktasıydı.',
    dangerLevel: 'Yüksek',
    landmarks: ['Beşiktaş Vapur İskelesi', 'Boğaz Kuzey Antreposu']
  },
  {
    id: 'uskudar_selimiye',
    name: 'Üsküdar & Selimiye (Anadolu Yakası)',
    side: 'Anadolu Yakası',
    centerX: 162,
    centerZ: -45,
    radius: 60,
    description: 'Boğaz’ın karşı kıyısında Kız Kulesi açıkları, Üsküdar İskelesi, Özbekler Tekkesi ve devasa Selimiye Kışlası Lojistik Merkezi.',
    historicalNote: 'Üsküdar’daki Özbekler Tekkesi ve Selimiye Kışlası ambarları, İstanbul’dan Anadolu’ya geçen gönüllü hekimlerin ve ilaç kollarının ilk toplanma merkeziydi.',
    dangerLevel: 'Çok Yüksek',
    landmarks: ['Selimiye Kışlası Dev Lojistik Merkezi', 'Özbekler Tekkesi Gizli Üssü']
  },
  {
    id: 'kadikoy_haydarpasa',
    name: 'Kadıköy & Haydarpaşa Limanı (Anadolu Yakası)',
    side: 'Anadolu Yakası',
    centerX: 162,
    centerZ: 85,
    radius: 60,
    description: 'Anadolu Bağdat Demiryolu’nun başlangıcı tarihi Haydarpaşa Garı, dev liman siloları ve demiryolu antrepoları.',
    historicalNote: 'Haydarpaşa Garı antrepolarındaki binlerce sandık tıbbi malzeme ve mühimmat, demiryolu işçileri ve Hilâl-i Ahmer gönüllülerince Anadolu’ya sevk edilmiştir.',
    dangerLevel: 'Çok Yüksek',
    landmarks: ['Tarihi Haydarpaşa Garı', 'Haydarpaşa Liman Siloları & Antreposu']
  }
];

// 10 BÜYÜK ANTREPO (Hiçbir tarihi bina veya cami/gar ile çakışmayan geniş meydan koordinatları)
export const INITIAL_ISTANBUL_DEPOTS: RaidDepot[] = [
  {
    id: 'depot_sirkeci_gumruk',
    name: 'Sirkeci Büyük Gümrük Antreposu',
    districtId: 'eminonu_sirkeci',
    districtName: 'Eminönü & Sirkeci Garı',
    type: 'Gümrük Silosu',
    x: 18,
    z: 24,
    width: 14,
    depth: 10,
    guardCount: 2,
    lockDifficulty: 1,
    lootCratesTotal: 3,
    lootCratesRemaining: 3,
    cashReward: 180,
    suppliesYield: { kinin: 15, bandage: 30, surgical: 4, tent: 2, ammoCrate: 5 },
    description: 'Orient Express vagonlarından indirilen Avrupa menşeli kinin, eter ve cerrahi sargı sandıklarının tutulduğu yüksek tavanlı antrepo.'
  },
  {
    id: 'depot_sultanahmet_ecza',
    name: 'Divanyolu Merkez Ecza Ambarı',
    districtId: 'sultanahmet_divanyolu',
    districtName: 'Sultanahmet & Divanyolu',
    type: 'Ecza & Sıhhiye Ambarı',
    x: -36,
    z: 24,
    width: 12,
    depth: 9,
    guardCount: 2,
    lockDifficulty: 1,
    lootCratesTotal: 2,
    lootCratesRemaining: 2,
    cashReward: 150,
    suppliesYield: { kinin: 20, bandage: 40, surgical: 3, tent: 1, ammoCrate: 2 },
    description: 'İtilaf sıhhiye müfettişlerinin mühürlediği eski Hilâl-i Ahmer ilaç ve serum sandıklarını barındırır.'
  },
  {
    id: 'depot_fatih_hanimlar',
    name: 'Fatih Şefkat & Sargı Lojistik Deposu',
    districtId: 'fatih_zeyrek',
    districtName: 'Fatih & Şehzadebaşı',
    type: 'Ecza & Sıhhiye Ambarı',
    x: -120,
    z: 34,
    width: 15,
    depth: 11,
    guardCount: 2,
    lockDifficulty: 1,
    lootCratesTotal: 3,
    lootCratesRemaining: 3,
    cashReward: 190,
    suppliesYield: { kinin: 18, bandage: 65, surgical: 5, tent: 4, ammoCrate: 3 },
    description: 'Hilâl-i Ahmer Hanımlar Merkezi’nin hazırladığı ancak işgal kuvvetlerince el konulan steril sargı ve hastane çamaşırı antreposu.'
  },
  {
    id: 'depot_zeytinburnu_lojistik',
    name: 'Zeytinburnu İmalat-ı Harbiye Lojistik Merkezi',
    districtId: 'zeytinburnu_bakirkoy',
    districtName: 'Zeytinburnu & Bakırköy',
    type: 'Lojistik Merkezi',
    x: -180,
    z: 96,
    width: 20,
    depth: 14,
    guardCount: 4,
    lockDifficulty: 2,
    lootCratesTotal: 4,
    lootCratesRemaining: 4,
    cashReward: 320,
    suppliesYield: { kinin: 12, bandage: 45, surgical: 8, tent: 12, ammoCrate: 18 },
    description: 'Demiryolu hattı üzerinde yer alan, sahra çadırları, ameliyat masaları ve cephane sandıklarıyla dolu dev lojistik merkez.'
  },
  {
    id: 'depot_tophane_antrepo',
    name: 'Tophane-i Âmire 1 Nolu Büyük Antrepo',
    districtId: 'karakoy_tophane',
    districtName: 'Karaköy & Tophane-i Âmire',
    type: 'Büyük Antrepo',
    x: 16,
    z: -52,
    width: 18,
    depth: 12,
    guardCount: 4,
    lockDifficulty: 2,
    lootCratesTotal: 4,
    lootCratesRemaining: 4,
    cashReward: 290,
    suppliesYield: { kinin: 25, bandage: 35, surgical: 10, tent: 6, ammoCrate: 15 },
    description: 'Karaköy rıhtım vinçlerinin hemen arkasında yer alan, İngiliz muhafızların nöbet tuttuğu iki katlı yüksek antrepo.'
  },
  {
    id: 'depot_pera_cerrahi',
    name: 'Pera Levanten Ecza & Cerrahi Antreposu',
    districtId: 'galata_pera',
    districtName: 'Galata & Pera (Beyoğlu)',
    type: 'Ecza & Sıhhiye Ambarı',
    x: -44,
    z: -52,
    width: 14,
    depth: 10,
    guardCount: 3,
    lockDifficulty: 2,
    lootCratesTotal: 3,
    lootCratesRemaining: 3,
    cashReward: 260,
    suppliesYield: { kinin: 35, bandage: 25, surgical: 14, tent: 2, ammoCrate: 4 },
    description: 'Cadde-i Kebir yakınlarında röntgen tüpleri, kloroform, morfin ve neşter setlerinin saklandığı yüksek değerli depo.'
  },
  {
    id: 'depot_kasimpasa_bahriye',
    name: 'Kasımpaşa Tersane-i Âmire Sıhhiye Antreposu',
    districtId: 'kasimpasa_tersane',
    districtName: 'Kasımpaşa & Tersane-i Âmire',
    type: 'Tersane Deposu',
    x: -125,
    z: -60,
    width: 18,
    depth: 13,
    guardCount: 3,
    lockDifficulty: 2,
    lootCratesTotal: 3,
    lootCratesRemaining: 3,
    cashReward: 275,
    suppliesYield: { kinin: 28, bandage: 50, surgical: 9, tent: 7, ammoCrate: 10 },
    description: 'Haliç kıyısında Bahriye Merkez Hastanesi’ne ait büyük ölçekli tıbbi malzeme ve sahra sedyesi antreposu.'
  },
  {
    id: 'depot_besiktas_bogaz',
    name: 'Beşiktaş Boğaz Kuzey Lojistik Antreposu',
    districtId: 'besiktas_akaretler',
    districtName: 'Beşiktaş & Akaretler',
    type: 'Lojistik Merkezi',
    x: 14,
    z: -142,
    width: 16,
    depth: 12,
    guardCount: 3,
    lockDifficulty: 2,
    lootCratesTotal: 3,
    lootCratesRemaining: 3,
    cashReward: 280,
    suppliesYield: { kinin: 22, bandage: 40, surgical: 8, tent: 8, ammoCrate: 12 },
    description: 'Boğaz kıyısında Karadeniz’e açılan motorlara ve nakliye kamyonuna doğrudan yükleme yapılabilen rıhtım antreposu.'
  },
  {
    id: 'depot_uskudar_selimiye',
    name: 'Selimiye Kışlası Anadolu Ana Lojistik Merkezi',
    districtId: 'uskudar_selimiye',
    districtName: 'Üsküdar & Selimiye',
    type: 'Lojistik Merkezi',
    x: 154,
    z: -42,
    width: 22,
    depth: 15,
    guardCount: 5,
    lockDifficulty: 3,
    lootCratesTotal: 5,
    lootCratesRemaining: 5,
    cashReward: 420,
    suppliesYield: { kinin: 40, bandage: 80, surgical: 16, tent: 15, ammoCrate: 22 },
    description: 'Anadolu yakasının en büyük askeri ve tıbbi lojistik üssü. Soyulduğunda Özbekler Tekkesi üzerinden Ankara’ya rekor ikmal sağlar!'
  },
  {
    id: 'depot_haydarpasa_silo',
    name: 'Haydarpaşa Garı Dev Liman Antreposu & Siloları',
    districtId: 'kadikoy_haydarpasa',
    districtName: 'Kadıköy & Haydarpaşa Limanı',
    type: 'Gümrük Silosu',
    x: 154,
    z: 82,
    width: 24,
    depth: 16,
    guardCount: 5,
    lockDifficulty: 3,
    lootCratesTotal: 5,
    lootCratesRemaining: 5,
    cashReward: 460,
    suppliesYield: { kinin: 45, bandage: 90, surgical: 18, tent: 18, ammoCrate: 25 },
    description: 'Haydarpaşa Limanı’nda demiryolu vagonları ve vinçlerle çevrili devasa gümrük antreposu. En yüksek ganimet ve tıbbi stok buradadır!'
  }
];

export const VOLUNTEER_CHARACTERS: VolunteerCharacter[] = [
  {
    id: 'vol_marko_aziz',
    name: 'Kırımlı Dr. Aziz İdris Bey',
    role: 'Hilâl-i Ahmer Kurucu Öncüsü & Sıhhiye Başhekimi',
    era: '1868 Kuruluş & 1877 Plevne (93 Harbi)',
    chapters: [6, 1],
    x: -10,
    z: 60,
    coatColor: 0x1e293b,
    hatColor: 0x991b1b,
    bonusTitle: 'Hilâl-i Ahmer Şefkat Ruhu',
    bonusDesc: 'Sahra hastanesinde yapılan her ameliyattan +60 Akçe ilave cemiyet desteği ve +%25 hızlı iyileşme sağlar.',
    dialogue: [
      'Evladım, harp meydanında düşen her nefer bizim emanetimizdir. Beyaz zemin üzerine Kırmızı Hilâl sancağımız şefkatin timsalidir!',
      'Plevne tabyalarını kum torbaları ve seyyar sargı çadırlarıyla tahkim etmeyi unutma; Gazi Osman Paşa’nın neferleri bize güveniyor.',
      'Yüksek kapasiteli sıhhiye atlarımızla tek seferde 4 ila 10 yaralı Mehmetçiği Sahra Hastanesine ulaştırabilirsin!'
    ],
    historicalBio: '11 Haziran 1868’de Dr. Marko Paşa ile birlikte Mecruhîn ve Mardâ-yı Askeriyye İmdad Cemiyeti’ni kurmuş, Kızılay’ın temelini atmıştır.'
  },
  {
    id: 'vol_safiye_huseyin',
    name: 'Başhemşire Safiye Hüseyin (Elbi) Hanım',
    role: 'Hilâl-i Ahmer Gönüllü Başhemşiresi',
    era: '1915 Çanakkale & 1919-1922 Millî Mücadele',
    chapters: [2, 5, 3],
    x: 10,
    z: 60,
    coatColor: 0xf8fafc,
    hatColor: 0xffffff,
    bonusTitle: 'Gülcemal & Reşit Paşa Şefkat Eli',
    bonusDesc: 'Cerrahi müdahale sırasında kan basıncı yeşil hedef aralığını genişletir ve yaralı başına ekstra Kinin/Sargı kazandırır.',
    dialogue: [
      'Çanakkale’de Gülcemal ve Reşit Paşa hastane gemilerinde binlerce Mehmetçiğin yarasını sardık; şimdi sıra Anadolu’nun istiklalinde!',
      'İstanbul’daki antrepolardan malları dikkat çekmeden [C] eğilerek çal ve dışarıdaki Nakliye Kamyonuna yükle!',
      'Kıyıdan yürürken denize düşmemeye dikkat et; derin sularda boğulma tehlikesi vardır, köprüleri ve iskeleleri kullan!'
    ],
    historicalBio: 'İlk Türk hemşirelerinden olup Balkan Harbi ve Çanakkale Savaşı’nda yüzer hastane gemilerinde gönüllü başhemşire olarak destan yazmıştır.'
  },
  {
    id: 'vol_mim_mim_ilyas',
    name: 'Mim Mim Grubu Gönüllüsü Kaptan İlyas',
    role: 'Hilâl-i Ahmer & Karakol Cemiyeti Antrepo ve Kamyon Sorumlusu',
    era: '1919-1920 İşgal İstanbul’u & İstiklal Yolu',
    chapters: [5],
    x: -12,
    z: 48,
    coatColor: 0x3b2f2f,
    hatColor: 0x1c1917,
    bonusTitle: 'Sessiz Soygun Maymuncuğu & Nakliye Kamyonu',
    bonusDesc: 'Antrepoları dikkat çekmeden (şüphe seviyesini %25 düşürerek) soymanızı ve Nakliye Kamyonunu istediğiniz antrepoya çağırmanızı sağlar.',
    dialogue: [
      'Dikkat et! İşgal nöbetçilerine yakalanmadan [C] tuşuyla eğilerek antrepoların kapısına yaklaş ve kilidi sessizce kır.',
      'İçeriden çaldığın tıbbi ve askeri sandıkları kapının önündeki Hilâl-i Ahmer Nakliye Kamyonuna [E] ile yükle!',
      'Kamyonu bizzat sürebilir veya [J] Antrepo Haritasından kamyonla birlikte dilediğin ilçedeki deponun önüne intikal edebilirsin!'
    ],
    historicalBio: 'Milli Mücadele’de İstanbul’daki işgal depolarından Anadolu’ya gizli kamyonlar ve takalarla Hilâl-i Ahmer ilaç sandıklarını kaçıran vatansever gönüllüleri temsil eder.'
  },
  {
    id: 'vol_serife_baci',
    name: 'Gönüllü Kahraman Şerife Bacı & Halime Çavuş',
    role: 'İstiklal Yolu Hilâl-i Ahmer & Menzil Gönüllüsü',
    era: '1921-1922 İstiklal Yolu & Büyük Taarruz',
    chapters: [5],
    x: 12,
    z: 48,
    coatColor: 0x7c2d12,
    hatColor: 0xd97706,
    bonusTitle: 'İstiklal Yolu Kar Kalkanı',
    bonusDesc: 'Tipi ve soğukta oyuncu sağlığını korur, at ve kamyon konvoy hızını +%20 artırır.',
    dialogue: [
      'İnebolu’dan Kastamonu ve Ilgaz dağlarına uzanan bu yolda sandıklarımız donmasın diye kendi yorganımızı cephanenin ve ilaçların üstüne örttük!',
      'Ankara’ya ulaştırdığımız her kinin ve sargı sandığı, Sakarya ve Dumlupınar’da bir Mehmetçiğin hayatını kurtaracak.'
    ],
    historicalBio: '1921 kışında İnebolu’dan Ankara’ya cephane ve sıhhiye malzemesi taşırken hayatını feda eden Anadolu kadın gönüllülerinin ölümsüz simgesidir.'
  },
  {
    id: 'vol_zeynep_emre_2023',
    name: 'Kızılay Gönüllüsü Dr. Zeynep & Lojistik Uzmanı Emre',
    role: '2023 Afet Müdahale & Yeniden İnşa Koordinatörleri',
    era: '2023 Kahramanmaraş & Hatay Afet Sahası',
    chapters: [4],
    x: -10,
    z: 56,
    coatColor: 0xd91414,
    hatColor: 0xffffff,
    bonusTitle: 'Afet İyileştirme & Konteyner Kent Seferberliği',
    bonusDesc: 'Yeniden İnşa projelerinde %15 maliyet indirimi ve her kurulan tesis için Afetzede Refah Endeksi artışı sağlar.',
    dialogue: [
      'Enkaz altındaki canlarımızı kurtarmanın yanı sıra, depremzedelerimiz için kalıcı Konteyner Kent, Mobil Aşevi, Kan Merkezi ve Psikososyal Destek çadırlarını inşa etmeliyiz!',
      'Üst bardaki [B] Yeniden İnşa & Felaket Yönetimi butonuna tıklayarak afet bölgesini adım adım ayağa kaldırabilirsin.'
    ],
    historicalBio: '2023 Kahramanmaraş depremlerinde ilk saatlerden itibaren sahada sıcak yemek, kan, barınma ve psikososyal destek sunan binlerce Genç Kızılay ve Kızılay gönüllüsünü temsil eder.'
  }
];

export const INITIAL_ECONOMY_COMMODITIES: EconomyCommodity[] = [
  {
    id: 'kinin',
    name: 'Kinin & Sıtma Serumu Sandığı',
    unit: 'Sandık',
    basePrice: 95,
    currentPrice: 110,
    trend: 'up',
    stock: 4,
    frontlineDemand: 92,
    desc: 'Cephedeki sıtma ve salgın hastalıklara karşı Hilâl-i Ahmer sahra hastanelerinin en acil ihtiyacı.'
  },
  {
    id: 'bandage',
    name: 'Steril Sargı Bezi & Tentürdiyot Balyası',
    unit: 'Balya',
    basePrice: 60,
    currentPrice: 68,
    trend: 'up',
    stock: 8,
    frontlineDemand: 88,
    desc: 'Hilâl-i Ahmer Hanımlar Merkezi atölyelerinde dokunan ilk yardım ve harp cerrahisi sargı paketleri.'
  },
  {
    id: 'surgical',
    name: 'Sahra Cerrahi Alet & Kloroform Kasası',
    unit: 'Kasa',
    basePrice: 165,
    currentPrice: 185,
    trend: 'up',
    stock: 2,
    frontlineDemand: 95,
    desc: 'Ağır şarapnel yaralanmalarında ameliyat çadırları için hayati önem taşıyan cerrahi takım.'
  },
  {
    id: 'tent',
    name: 'Hilâl-i Ahmer 20 Yataklı Sahra Çadırı',
    unit: 'Takım',
    basePrice: 140,
    currentPrice: 150,
    trend: 'stable',
    stock: 3,
    frontlineDemand: 80,
    desc: 'Plevne, Çanakkale, Sakarya ve Kahramanmaraş’ta yaralı ve afetzedeleri soğuktan koruyan şefkat çadırı.'
  },
  {
    id: 'ration',
    name: 'Kızılay Sıcak Aşevi & Kuru Tayın Erzakı',
    unit: 'Çuval',
    basePrice: 45,
    currentPrice: 52,
    trend: 'up',
    stock: 10,
    frontlineDemand: 76,
    desc: 'Muhacirler, yaralı neferler ve depremzedeler için un, bakliyat ve konserve kumanya.'
  },
  {
    id: 'ammoCrate',
    name: 'İmalat-ı Harbiye Mavzer & Sahra İkmal Sandığı',
    unit: 'Sandık',
    basePrice: 130,
    currentPrice: 155,
    trend: 'up',
    stock: 3,
    frontlineDemand: 90,
    desc: 'İstanbul antrepolarından dikkat çekmeden çalınıp kamyon ve takalarla Batı Cephesi’ne ulaştırılan stratejik mühimmat.'
  }
];

export const INITIAL_DEFENSE_STRUCTURES: DefenseStructureSpec[] = [
  {
    id: 'sandbag_bastion',
    name: 'Plevne Kum Torbası Tabya Tahkimatı',
    type: 'sandbag_bastion',
    cost: 90,
    maxCount: 6,
    builtCount: 1,
    hp: 300,
    desc: 'Rus piyade ve şarapnel ateşini kesen güçlendirilmiş Gazi Osman Paşa siper hattı.',
    effectText: 'Siper savunmasını +%25 güçlendirir ve gelen mermi hasarını azaltır.'
  },
  {
    id: 'barbed_wire',
    name: 'Dikenli Tel & Kazıklı Hendek Engeli',
    type: 'barbed_wire',
    cost: 110,
    maxCount: 5,
    builtCount: 0,
    hp: 220,
    desc: 'Tabya önüne döşenen tel ve kazık engelleri düşman piyade hücumlarını yavaşlatır.',
    effectText: 'Düşman ilerleyişini ve ateş hızını %30 yavaşlatır.'
  },
  {
    id: 'field_aid_tent',
    name: 'İleri Hat Hilâl-i Ahmer Sargı Noktası',
    type: 'field_aid_tent',
    cost: 150,
    maxCount: 3,
    builtCount: 1,
    hp: 250,
    desc: 'Siperlerin hemen gerisinde gönüllü sıhhiye erlerinin ilk müdahaleyi yaptığı sargı çadırı.',
    effectText: 'Her 12 saniyede oyuncu ve dost Mehmetçiklere +15 Can yenilemesi sağlar.'
  },
  {
    id: 'krupp_battery',
    name: 'Osmanlı Krupp Sahra Topçu Bataryası',
    type: 'krupp_battery',
    cost: 220,
    maxCount: 3,
    builtCount: 0,
    hp: 400,
    desc: 'Tabyalarımıza yerleştirilen Krupp sahra topları karşıdaki düşman birliklerini otomatik ateş altına alır.',
    effectText: 'Her 8 saniyede düşman mevzilerine otomatik topçu ateşi açar.'
  },
  {
    id: 'ammo_wagon',
    name: 'Sıhhiye & Cephane İkmal Arabası',
    type: 'ammo_wagon',
    cost: 130,
    maxCount: 3,
    builtCount: 0,
    hp: 240,
    desc: 'Siper hattına kesintisiz sargı bezi, kinin ve mavzer fişeği yetiştiren ikmal arabası.',
    effectText: 'Şarjör kapasitesini ve dost askerlerin isabet oranını artırır.'
  }
];

export const INITIAL_RECONSTRUCTION_PROJECTS: ReconstructionProjectSpec[] = [
  {
    id: 'rec_container_city',
    name: 'Kızılay Konteyner Kent & Aile Yaşam Mahallesi',
    category: 'Barınma',
    cost: 200,
    level: 0,
    maxLevel: 3,
    welfareImpact: 22,
    x: -44,
    z: 42,
    desc: 'Isı yalıtımlı, banyolu ve mutfaklı yaşam konteynerlerinden oluşan güvenli depremzede mahallesi.',
    volunteerLead: 'Lojistik Uzmanı Emre & Gönüllü Mühendisler'
  },
  {
    id: 'rec_soup_kitchen',
    name: 'Kızılay Mobil Aşevi, Fırın & İkram Üssü',
    category: 'Beslenme',
    cost: 160,
    level: 1,
    maxLevel: 3,
    welfareImpact: 18,
    x: 34,
    z: 44,
    desc: 'Günde 3 öğün sıcak yemek, çorba ve taze ekmek üreten dev sahra mutfağı ve mobil fırın tırı.',
    volunteerLead: 'Kızılay Aşçıbaşı Hüseyin Usta & Genç Kızılay'
  },
  {
    id: 'rec_blood_center',
    name: 'Bölge Kan ve Plazma Transfüzyon Merkezi',
    category: 'Sağlık',
    cost: 240,
    level: 0,
    maxLevel: 3,
    welfareImpact: 24,
    x: 28,
    z: 64,
    desc: 'Sahra hastanesindeki ameliyatlar için kesintisiz kan, trombosit ve plazma sağlayan modern ünite.',
    volunteerLead: 'Gönüllü Dr. Zeynep & Hematoloji Ekibi'
  },
  {
    id: 'rec_psychosocial',
    name: 'Psikososyal Destek & Çocuk Dostu Eğitim Merkezi',
    category: 'Psikososyal & Eğitim',
    cost: 150,
    level: 0,
    maxLevel: 3,
    welfareImpact: 18,
    x: -36,
    z: 66,
    desc: 'Depremden etkilenen çocuklarımız ve aileler için travma desteği, oyun alanı ve kütüphane çadırı.',
    volunteerLead: 'Uzman Psikolog Elif & Gönüllü Öğretmenler'
  },
  {
    id: 'rec_infrastructure',
    name: 'Temiz Su Arıtma, Güneş Enerjisi & Haberleşme Kulesi',
    category: 'Altyapı',
    cost: 190,
    level: 0,
    maxLevel: 3,
    welfareImpact: 18,
    x: 0,
    z: 40,
    desc: 'Afet bölgesine kesintisiz temiz içme suyu, aydınlatma enerjisi ve acil telsiz/uydu iletişimi sağlar.',
    volunteerLead: 'Kızılay Afet Haberleşme & Teknik Ekibi'
  }
];
