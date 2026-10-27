export interface ChapterConfig {
  id: number;
  orgEra: string;
  title: string;
  objective: string;
  briefingDesc: string;
  briefingFact: string;
  targetSaved: number;
  groundColor: number;
  fogColor: number;
  skyColor: number;
  enemyName: string;
  enemyColor: number;
  enemyHatColor: number;
  enemyCount: number;
  allyCount: number;
  hasArtillery: boolean;
  shellInterval: number;
  allyHelmet: boolean;
  hasAtaturk: boolean;
  hasSea: boolean;
  hasEnemyTank?: boolean;
  hasAllyTank?: boolean;
  isEarthquake?: boolean;
  newsMasthead: string;
  newsDate: string;
  newsHeadline: string;
  newsBody: string;
}

export const CHAPTERS_DATA: Record<number, ChapterConfig> = {
  6: {
    id: 6,
    orgEra: 'MECRUHÎN VE MARDÂ-YI ASKERİYYE CEMİYETİ (1868)',
    title: '1868 Kuruluş - Dersaadet & Sınır Sıhhiye Tatbikatı',
    objective: 'Dr. Marko Paşa ve Kırımlı Dr. Aziz Bey’in kurduğu ilk sıhhiye teşkilatıyla 3 yaralı neferi atla çadıra ulaştır.',
    briefingDesc: '11 Haziran 1868... Dr. Marko Paşa, Kırımlı Dr. Aziz İdris Bey ve Serdar-ı Ekrem Ömer Paşa öncülüğünde "Yaralı ve Hasta Askerlere Yardım Cemiyeti" kuruldu. Sınır hattındaki çatışmalarda yaralanan Osmanlı neferlerini ilk kez kurulan seyyar sıhhiye çadırına taşıyarak tedavi edin ve gönüllü hekimlerle konuşun.',
    briefingFact: 'Kızılay, 11 Haziran 1868 tarihinde "Mecruhîn ve Mardâ-yı Askeriyye İmdad ve Muavenet Cemiyeti" adıyla kurulmuş olup dünyanın en köklü insani yardım kuruluşlarından biridir.',
    targetSaved: 3,
    groundColor: 0x5c6648,
    fogColor: 0x8fa3ad,
    skyColor: 0x6b8291,
    enemyName: 'Sınır Eşkıyası / Asi',
    enemyColor: 0x3d352e,
    enemyHatColor: 0x1c1917,
    enemyCount: 5,
    allyCount: 4,
    hasArtillery: false,
    shellInterval: 999,
    allyHelmet: false,
    hasAtaturk: false,
    hasSea: false,
    newsMasthead: 'TAKVÎM-İ VEKÂYİ',
    newsDate: '11 Haziran 1868 (20 Safer 1285)',
    newsHeadline: 'MECRUHÎN VE MARDÂ-YI ASKERİYYE İMDAD CEMİYETİ TEŞKİL OLUNDU!',
    newsBody: 'Dersaadet’te Mekteb-i Tıbbiye-i Şahane nazırı Doktor Marko Paşa ve Kırımlı Doktor Aziz İdris Bey’in gayretleriyle harp meydanlarında yaralanan neferlerimize şefkat eli uzatacak cemiyetimiz resmen faaliyete geçti. İlk seyyar sıhhiye çadırlarımızda neferlerimiz başarıyla tedavi edildi.'
  },
  1: {
    id: 1,
    orgEra: 'OSMANLI HİLÂL-İ AHMER CEMİYETİ (1877)',
    title: '93 Harbi - Plevne ve Şıpka Stratejik Tabya Müdafaası (1877)',
    objective: '[F] Stratejik Savunma Paneliyle Plevne tabyalarını güçlendir, Rus topçularını sustur ve 4 yaralı Mehmetçiği kurtar.',
    briefingDesc: '1877-1878 Osmanlı-Rus Savaşı (93 Harbi) tüm şiddetiyle sürüyor! Gazi Osman Paşa’nın Plevne tabyalarını Kum Torbası Tahkimatı, Dikenli Tel, Krupp Sahra Topu ve İleri Hat Hilâl-i Ahmer Sargı Noktaları kurarak güçlendirin. Karşıdaki 3 Rus topçu bataryasını susturun ve kar fırtınasında yaralıları toynaklı sıhhiye atıyla kurtarın!',
    briefingFact: '11 Haziran 1868’de kurulan teşkilatımız, 1877’deki 93 Harbi’nde tarihte ilk kez beyaz zemin üzerine Kırmızı Hilâl (Hilâl-i Ahmer) sancağını kullanmıştır.',
    targetSaved: 4,
    groundColor: 0xdce4ea,
    fogColor: 0x98aab8,
    skyColor: 0x768796,
    enemyName: 'Rus Piyadesi',
    enemyColor: 0x283b28,
    enemyHatColor: 0x151515,
    enemyCount: 7,
    allyCount: 5,
    hasArtillery: true,
    shellInterval: 3.4,
    allyHelmet: false,
    hasAtaturk: false,
    hasSea: false,
    newsMasthead: 'TERCÜMÂN-I HAKÎKAT',
    newsDate: '14 Kânûn-ı Evvel 1293 (1877)',
    newsHeadline: 'PLEVNE TABYALARINDA OSMANLI HİLÂL-İ AHMER VE GAZİ OSMAN PAŞA DESTANI!',
    newsBody: 'Şıpka ve Plevne sırtlarında kurulan tahkimatlar ve Hilâl-i Ahmer seyyar sargı noktaları sayesinde Rus hücumları püskürtüldü. Kırımlı Dr. Aziz Bey ve gönüllü sıhhiyelerimiz, karlar altında donmak üzere olan gazilerimizi sahra hastanelerine yetiştirerek hayata döndürdüler.'
  },
  2: {
    id: 2,
    orgEra: 'OSMANLI HİLÂL-İ AHMER CEMİYETİ (1915)',
    title: '1915 - Çanakkale / Arıburnu & Gülcemal Gemisi (Atatürk İle)',
    objective: 'Uçaksavara [E] geçip İngiliz uçaklarını düşür, topçuları sustur ve Başhemşire Safiye Hüseyin ile 5 yaralıyı kurtar.',
    briefingDesc: '1915 Çanakkale Muharebeleri... Denizde Gülcemal Hastane Gemimiz beklerken İtilaf donanması ve uçaklar siperlerimizi bombalıyor. 19. Tümen Komutanı Mustafa Kemal Bey ile omuz omuza siperde çarpışın, Başhemşire Safiye Hüseyin Elbi’nin desteğiyle kabalaklı Mehmetçikleri yaşatın.',
    briefingFact: 'Çanakkale Savaşı’nda Hilâl-i Ahmer Cemiyeti; Ağadere ve Akbaş seyyar hastaneleri ile "Gülcemal" ve "Reşit Paşa" hastane gemilerinde Başhemşire Safiye Hüseyin Elbi gibi kahramanlarla 150.000’den fazla yaralıyı tedavi etmiştir.',
    targetSaved: 5,
    groundColor: 0x786146,
    fogColor: 0x4f4336,
    skyColor: 0x3b3228,
    enemyName: 'İtilaf Piyadesi',
    enemyColor: 0x8a734e,
    enemyHatColor: 0x5c4c32,
    enemyCount: 8,
    allyCount: 5,
    hasArtillery: true,
    shellInterval: 2.8,
    allyHelmet: false,
    hasAtaturk: true,
    hasSea: true,
    newsMasthead: 'TASVÎR-İ EFKÂR',
    newsDate: '18 Mayıs 1331 (1915)',
    newsHeadline: 'ÇANAKKALE GEÇİLMEZ! MUSTAFA KEMAL BEY VE HİLÂL-İ AHMER GÖNÜLLÜLERİ AYAKTA!',
    newsBody: 'Arıburnu siperlerinde Anafartalar Komutanı Mustafa Kemal Bey bizzat ateşi yönetirken, Başhemşire Safiye Hüseyin Hanım ve Gülcemal Hastane Gemimiz kurşun yağmuru altında yaralı neferleri tedavi ederek kurtardı.'
  },
  5: {
    id: 5,
    orgEra: 'MİLLÎ MÜCADELE & HİLÂL-İ AHMER DESTANI (1919-1922)',
    title: 'Kurtuluş Savaşı (4 Katmanlı Senaryo + 10 İlçeli Geniş İstanbul Antrepo Baskınları)',
    objective: '1. Katman: 10 ilçeli Büyük İstanbul Haritasında Antrepo ve Lojistik Merkezlerini soy, 6 Sandığı İnebolu Takasına ulaştır!',
    briefingDesc: 'Çok katmanlı Kurtuluş Savaşı ve Dinamik Ekonomi deneyimi! 1. Katmanda Eminönü, Sultanahmet, Fatih, Zeytinburnu, Karaköy/Tophane, Pera, Kasımpaşa, Beşiktaş, Üsküdar ve Haydarpaşa ilçelerindeki 10 Büyük Antrepo ve Lojistik Merkezini soyarak ilaç ve mühimmat kaçıracaksınız. 2. Katmanda Şerife Bacı ile İstiklal Yolu konvoyunu koruyacak, 3. Katmanda Sakarya/Polatlı’da stratejik sargı hattı kuracak, 4. Katmanda ise Başkomutan Atatürk ile Büyük Taarruz’da Yunan Karargâhını zaptedeceksiniz!',
    briefingFact: 'Kurtuluş Savaşı sırasında Hilâl-i Ahmer Cemiyeti ve Mim Mim Grubu gönüllüleri, işgal altındaki İstanbul’un Sirkeci, Tophane, Kasımpaşa, Selimiye ve Haydarpaşa antrepolarından binlerce sandık tıbbi malzemeyi Anadolu’ya ulaştırmıştır.',
    targetSaved: 22,
    groundColor: 0x3b424c,
    fogColor: 0x1e242b,
    skyColor: 0x12161f,
    enemyName: 'İşgal Nöbetçisi',
    enemyColor: 0x4b5320,
    enemyHatColor: 0x2f3618,
    enemyCount: 9,
    allyCount: 4,
    hasArtillery: false,
    shellInterval: 999,
    allyHelmet: false,
    hasAtaturk: true,
    hasSea: false,
    newsMasthead: 'HÂKİMİYET-İ MİLLİYE',
    newsDate: '9 Eylül 1922',
    newsHeadline: 'İSTANBUL ANTREPOLARINDAN İZMİR’E: HİLÂL-İ AHMER VE BAŞKOMUTAN ATATÜRK İLE MİLLÎ ZAFER!',
    newsBody: 'İstanbul’un 10 ilçesindeki büyük lojistik merkezlerinden ve antrepolarından kaçırılan Hilâl-i Ahmer sandıkları İstiklal Yolu’nda cepheye ulaştırıldı. Sakarya ve Dumlupınar’da kurulan sargı yerleri ordumuza can verirken Başkomutan Mustafa Kemal Paşa önderliğinde şanlı zafer kazanıldı.'
  },
  3: {
    id: 3,
    orgEra: 'TÜRKİYE HİLÂL-İ AHMER / KIZILAY CEMİYETİ (1925–1935)',
    title: 'Cumhuriyet Dönemi - Doğu Anadolu Harekâtı & Kızılay’ın Doğuşu',
    objective: 'Cumhurbaşkanı Gazi Mustafa Kemal Atatürk ve Zırhlı Tankımızla hattı koru, 6 yaralı gazimizi hastanede tedavi et.',
    briefingDesc: 'Genç Cumhuriyetimizin asayişini ve halk sağlığını korumak için Doğu Anadolu’da seferberlik yürütülüyor. Cumhurbaşkanı Gazi Mustafa Kemal Paşa denetimindeki çelik miğferli ordumuz ve zırhlı tankımızla hattı savunun, yaralanan gazilerimizi sahra hastanesinde tedavi edin.',
    briefingFact: '28 Nisan 1935 yılında kurumumuz bizzat Gazi Mustafa Kemal Atatürk tarafından "KIZILAY" adıyla onurlandırılmıştır.',
    targetSaved: 6,
    groundColor: 0x43523f,
    fogColor: 0x2c3829,
    skyColor: 0x1d261b,
    enemyName: 'Silahlı İsyancı',
    enemyColor: 0x4d3f35,
    enemyHatColor: 0xd4cdc0,
    enemyCount: 10,
    allyCount: 5,
    hasArtillery: false,
    shellInterval: 999,
    allyHelmet: true,
    hasAllyTank: true,
    hasAtaturk: true,
    hasSea: false,
    newsMasthead: 'CUMHURİYET',
    newsDate: '29 Nisan 1935',
    newsHeadline: 'ATATÜRK HİLÂL-İ AHMER’E "KIZILAY" ADINI VERDİ: DOĞUDAN BATIYA ŞEFKAT SANCAĞI!',
    newsBody: 'Türkiye Cumhuriyeti Cumhurbaşkanı Gazi Mustafa Kemal Paşa’nın takip ettiği harekâtta ordu asayişi sağlarken, hekimlerimiz yaralı askerlerimizi sahra hastanelerinde tedavi etti ve Ulu Önder kurumumuza "KIZILAY" adını armağan etti.'
  },
  4: {
    id: 4,
    orgEra: 'TÜRK KIZILAYI AFET KOORDİNASYON (2023)',
    title: '2023 Kahramanmaraş Depremi - Enkaz & Lojistik',
    objective: 'Enkazdan yaralı çıkar, Zabıtalarla birlikte Kar Maskeli Yağmacıları durdur ve model çadır sat!',
    briefingDesc: '6 Şubat 2023 gecesi... Dondurucu soğukta yıkılan binaların enkazından kazmayla depremzedeleri çıkarıp Kızılay Ambulansıyla Sahra Hastanesine yetiştirin. Çadır Lojistik Merkezinde bütçesi uygun kurum/alıcılara istedikleri çadır modelini tedarik edin ve Zabıtalarla kavga eden Kar Maskeli Yağmacıları etkisiz hale getirin!',
    briefingFact: 'Modern afet yönetiminde Türk Kızılayı; mobil ikram araçları, sahra hastaneleri, kan merkezi ve çadır üretim/lojistik birimleriyle afet bölgesinin en kritik yaşam damarıdır.',
    targetSaved: 7,
    groundColor: 0x1e2530,
    fogColor: 0x0d131c,
    skyColor: 0x05080f,
    enemyName: 'Kar Maskeli Yağmacı',
    enemyColor: 0x1f2937,
    enemyHatColor: 0x111111,
    enemyCount: 0,
    allyCount: 0,
    hasArtillery: false,
    shellInterval: 999,
    allyHelmet: true,
    isEarthquake: true,
    hasAtaturk: false,
    hasSea: false,
    newsMasthead: 'CUMHURİYET ARŞİVİ',
    newsDate: '10 Şubat 2023',
    newsHeadline: 'DEPREM BÖLGESİNDE ENKAZ KURTARMALARI VE KIZILAY LOJİSTİK SEFERBERLİĞİ!',
    newsBody: '2023 deprem gecesinde dondurucu soğuk altında varil ateşleri yanarken bir yandan enkaz altından çıkarılan yaralılar modern ambulanslarla sahra hastanesine yetiştirildi, fırsatçı yağmacılara geçit verilmedi ve Çadır Lojistik Merkezinden yüzlerce çadır bölgeye ulaştırıldı.'
  }
};

export const KIZILAY_ARCHIVES = [
  {
    year: '11 Haziran 1868',
    eraTitle: 'Kuruluş: Yaralı ve Hasta Askerlere Yardım Cemiyeti',
    officialName: 'Mecruhîn ve Mardâ-yı Askeriyye İmdad ve Muavenet Cemiyeti',
    location: 'İstanbul (Dersaadet)',
    chapterId: 6,
    summary: '1864 Cenevre Sözleşmesi’ni imzalayan Osmanlı Devleti’nde; Dr. Marko Paşa, Kırımlı Dr. Aziz İdris Bey, Dr. Abdullah Bey ve Serdar-ı Ekrem Ömer Paşa’nın girişimleriyle İstanbul’da kuruldu.',
    milestone: 'Savaş meydanlarında ayrım gözetmeksizin yaralı askerlerin tedavisi ve sıhhiye gönüllülerinin eğitimi başlatıldı.',
    figures: ['Dr. Marko Paşa (İlk Başkan)', 'Kırımlı Dr. Aziz İdris Bey', 'Dr. Abdullah Bey', 'Serdar-ı Ekrem Ömer Paşa']
  },
  {
    year: '14 Nisan 1877',
    eraTitle: 'Kırmızı Hilâl Sancağının Doğuşu ve 93 Harbi Tabya Savunması',
    officialName: 'Osmanlı Hilâl-i Ahmer Cemiyeti',
    location: 'Plevne, Şıpka ve Kars Cepheleri',
    chapterId: 1,
    summary: '1877-1878 Osmanlı-Rus Savaşı (93 Harbi) başlarken Osmanlı Devleti, sıhhiye birliklerinin beyaz zemin üzerine Kırmızı Hilâl (Hilâl-i Ahmer) sancağı taşıyacağını Cenevre’ye bildirdi ve bu sembol uluslararası alanda ilk kez kabul gördü.',
    milestone: 'Plevne tabyaları gerisinde seyyar sahra hastaneleri ile hastane trenleri kurularak 40.000’den fazla yaralı tedavi edildi.',
    figures: ['Gazi Osman Paşa', 'Kırımlı Dr. Aziz Bey', 'Hacı Arif Bey']
  },
  {
    year: '20 Mart 1912',
    eraTitle: 'Hilâl-i Ahmer Hanımlar Merkezi ve Balkan Harbi',
    officialName: 'Osmanlı Hilâl-i Ahmer Cemiyeti Hanımlar Merkezi',
    location: 'Edirne, Çatalca ve İstanbul (Fatih & Sultanahmet)',
    chapterId: 2,
    summary: 'Dr. Besim Ömer (Akalın) Paşa’nın öncülüğünde Türk kadınları ilk kez kurumsal olarak hemşirelik kurslarında eğitildi ve Balkan Savaşları’nda Edirne ile İstanbul hastanelerinde yaralı neferlere baktı.',
    milestone: 'Yüz binlerce Balkan muhacirine sıcak aşevleri, kolera aşıları ve barınma çadırları sağlandı.',
    figures: ['Dr. Besim Ömer Paşa', 'Safiye Hüseyin Elbi', 'Prenses Nimet Muhtar Hanım']
  },
  {
    year: '1915',
    eraTitle: 'Çanakkale Destanı ve Gülcemal Hastane Gemisi',
    officialName: 'Osmanlı Hilâl-i Ahmer Cemiyeti',
    location: 'Gelibolu Yarımadası · Arıburnu & Ağadere',
    chapterId: 2,
    summary: 'Gelibolu Yarımadası’nda Arıburnu, Anafartalar ve Seddülbahir cephelerinin hemen gerisinde Ağadere ve Akbaş seyyar hastaneleri kuruldu. Gülcemal ve Reşit Paşa vapurları yüzer hastane gemisine dönüştürüldü.',
    milestone: 'Çanakkale’de yalnızca 1915 yılı içinde 150.000’i aşkın yaralı Mehmetçik Hilâl-i Ahmer sargı yerlerinden geçerek tedavi edildi.',
    figures: ['Başhemşire Safiye Hüseyin Elbi', 'Yarbay Mustafa Kemal Bey', 'Dr. Ömer Lütfi Bey']
  },
  {
    year: '1919 – 1922',
    eraTitle: 'İstanbul Antrepo Baskınları, İstiklal Yolu, Sakarya ve Büyük Taarruz',
    officialName: 'Hilâl-i Ahmer Cemiyeti (Ankara & İstanbul Heyet-i Murahhasalığı)',
    location: 'İstanbul (10 İlçe) – İnebolu – Sakarya – Dumlupınar – İzmir',
    chapterId: 5,
    summary: 'İşgal altındaki İstanbul’un Sirkeci, Tophane, Pera, Kasımpaşa, Zeytinburnu, Selimiye ve Haydarpaşa antrepolarından kaçırılan binlerce sandık kinin, sargı bezi, aşı ve cerrahi malzeme İnebolu üzerinden İstiklal Yolu at ve kağnılarıyla Ankara’ya ve Batı Cephesi’ne ulaştırıldı.',
    milestone: 'Sakarya ve Büyük Taarruz meydan muharebelerinde cephe gerisi sahra hastaneleriyle Kurtuluş Savaşı’nın sıhhiye omurgası oluşturuldu.',
    figures: ['Gazi Mustafa Kemal Atatürk', 'Mim Mim Grubu Gönüllüleri', 'Şerife Bacı', 'Dr. Adnan Adıvar']
  },
  {
    year: '28 Nisan 1935',
    eraTitle: 'Cumhuriyet Dönemi ve Atatürk’ün "KIZILAY" Adını Vermesi',
    officialName: 'Türkiye Kızılay Cemiyeti',
    location: 'Ankara & Doğu Anadolu',
    chapterId: 3,
    summary: 'Cumhuriyetin ilanıyla "Türkiye Hilâl-i Ahmer Cemiyeti" adını alan kurum, 28 Nisan 1935 kurultayında Cumhurbaşkanı Gazi Mustafa Kemal Atatürk’ün bizzat verdiği "KIZILAY" adını gururla taşıdı.',
    milestone: '1939 Erzincan Depremi müdahalesi, 1957 Kan Transfüzyon Merkezlerinin açılışı ve modern çadır üretim tesisleri kuruldu.',
    figures: ['Gazi Mustafa Kemal Atatürk', 'Dr. Refik Saydam', 'Dr. Rana Tarhan']
  },
  {
    year: '6 Şubat 2023 – Günümüz',
    eraTitle: 'Kahramanmaraş Depremi Müdahalesi & Afet Sonrası Yeniden İnşa',
    officialName: 'Türk Kızılay',
    location: 'Kahramanmaraş, Hatay ve Tüm Türkiye',
    chapterId: 4,
    summary: 'Türkiye’nin ulusal kan ihtiyacını karşılayan Türk Kızılay; afet lojistik üsleri, konteyner kentler, mobil mutfak tırları, sahra hastaneleri ve psikososyal destek ekipleriyle afet sonrası yeniden inşa sürecini yürütmektedir.',
    milestone: 'Afet bölgelerinde Konteyner Kent kurulumu, sıcak yemek aşevleri, kan/plazma tedariki ve çocuk dostu alanlar inşa edilmiştir.',
    figures: ['Kızılay Afet Uzmanları', 'Genç Kızılay Gönüllüleri', 'Gönüllü Doktorlar ve Bağışçılar']
  }
];

export const KIZILAY_MAP_LOCATIONS = [
  {
    id: 'istanbul_1868',
    title: 'Dersaadet (İstanbul) — 10 İlçe, Antrepolar ve Kuruluş Merkezi',
    year: '1868 & 1919-1922',
    eraName: 'Mecruhîn-i Askeriyye & Millî Mücadele Lojistik Ağı',
    xPercent: 26,
    yPercent: 24,
    chapterId: 5,
    stats: '10 İlçe (Eminönü, Fatih, Zeytinburnu, Tophane, Pera, Kasımpaşa, Beşiktaş, Üsküdar, Haydarpaşa) · 10 Büyük Antrepo',
    description: '1868 yılında ilk sıhhiye cemiyetinin kurulduğu merkezdir. Kurtuluş Savaşı’nda ise Avrupa ve Anadolu yakasındaki 10 büyük antrepo ve lojistik merkezinden Anadolu’ya gizlice tıbbi malzeme ve cephane kaçırılmıştır.',
    highlights: ['Tophane & Sirkeci Büyük Antrepoları', 'Üsküdar Selimiye & Haydarpaşa Siloları', 'Kasımpaşa & Zeytinburnu Lojistik Üsleri']
  },
  {
    id: 'plevne_1877',
    title: 'Plevne ve Şıpka Geçidi (93 Harbi Stratejik Tabya Savunması)',
    year: '1877 – 1878',
    eraName: 'Osmanlı Hilâl-i Ahmer Cemiyeti',
    xPercent: 14,
    yPercent: 14,
    chapterId: 1,
    stats: 'İlk Kırmızı Hilâl Sancağı · Plevne Tabya Tahkimatları · 40.000+ Yaralı Tedavisi',
    description: '93 Harbi’nde Gazi Osman Paşa’nın Plevne tabyaları savunması sırasında dünyada ilk kez beyaz zemin üzerine Kırmızı Hilâl (Hilâl-i Ahmer) sancağının dalgalandığı cephedir.',
    highlights: ['İlk Hilâl-i Ahmer Sancağı (1877)', 'Stratejik Tabya & Krupp Topçu Savunması', 'Kırımlı Dr. Aziz Bey Sahra Çadırları']
  },
  {
    id: 'canakkale_1915',
    title: 'Çanakkale — Arıburnu, Ağadere ve Gülcemal Gemisi',
    year: '1915',
    eraName: 'Osmanlı Hilâl-i Ahmer Cemiyeti',
    xPercent: 18,
    yPercent: 34,
    chapterId: 2,
    stats: '150.000+ Yaralı Tahliyesi · Gülcemal & Reşit Paşa Hastane Gemileri',
    description: 'Gelibolu Yarımadası’nda ateş hattının hemen gerisinde kurulan Ağadere ve Akbaş sahra hastaneleri ile yüzer hastane gemilerimiz on binlerce Mehmetçiği hayata döndürmüştür.',
    highlights: ['Gülcemal Hastane Gemisi', 'Başhemşire Safiye Hüseyin Elbi', 'Ağadere Ağır Yaralı Sargı Yeri']
  },
  {
    id: 'inebolu_ankara_1921',
    title: 'İnebolu – Kastamonu – Sakarya – Ankara (İstiklal Yolu)',
    year: '1919 – 1922',
    eraName: 'Hilâl-i Ahmer Heyet-i Murahhasalığı',
    xPercent: 45,
    yPercent: 22,
    chapterId: 5,
    stats: '344 Km Karlı Dağ Geçidi · Şerife Bacı Konvoyu · Polatlı Sahra Hastaneleri',
    description: 'İstanbul antrepolarından takalarla İnebolu’ya çıkarılan Hilâl-i Ahmer sağlık sandıklarının Küre ve Ilgaz dağlarını aşarak Ankara ve Sakarya cephesine taşındığı hayat damarıdır.',
    highlights: ['İnebolu İskelesi', 'Şerife Bacı & Halime Çavuş Konvoyu', 'Sakarya / Polatlı Menzil Hastaneleri']
  },
  {
    id: 'dumlupinar_izmir_1922',
    title: 'Kocatepe, Dumlupınar ve İzmir Hattı',
    year: '26 Ağustos – 9 Eylül 1922',
    eraName: 'Millî Mücadele & Büyük Taarruz',
    xPercent: 24,
    yPercent: 52,
    chapterId: 5,
    stats: 'Başkomutanlık Meydan Muharebesi · 22 Seyyar Sahra Hastanesi',
    description: 'Büyük Taarruz’da Başkomutan Gazi Mustafa Kemal Paşa önderliğinde ilerleyen ordumuzun hemen ardında Hilâl-i Ahmer sıhhiye bölükleri görev yapmış ve İzmir’e kadar yaralıları tedavi etmiştir.',
    highlights: ['Dumlupınar Sıhhiye Çadırları', 'Yunan Karargâhının Zaptı', 'İzmir Hükûmet Konağı Zaferi']
  },
  {
    id: 'dogu_anadolu_1925',
    title: 'Doğu Anadolu & Erzincan / Diyarbakır',
    year: '1925 – 1939',
    eraName: 'Türkiye Kızılay Cemiyeti',
    xPercent: 76,
    yPercent: 48,
    chapterId: 3,
    stats: '28 Nisan 1935: Atatürk "KIZILAY" Adını Verdi',
    description: 'Genç Cumhuriyet döneminde hem doğu illerindeki asayiş ve sağlık seferberliğinde hem de 1939 Erzincan Depremi’nde Kızılay şefkat sancağını dalgalandırmıştır.',
    highlights: ['Cumhuriyet Sıhhiye Birlikleri', 'Atatürk’ün Kızılay İsimlendirmesi (1935)', 'Erzincan Afet Müdahalesi']
  },
  {
    id: 'kahramanmaras_2023',
    title: 'Kahramanmaraş & Hatay — Kurtarma ve Yeniden İnşa Üssü',
    year: '6 Şubat 2023 – Günümüz',
    eraName: 'Türk Kızılay Modern Afet & Yeniden İnşa Koordinasyon',
    xPercent: 60,
    yPercent: 68,
    chapterId: 4,
    stats: 'Konteyner Kentler · Mobil Aşevleri · Bölge Kan Merkezleri · Psikososyal Destek',
    description: 'Asrın felaketinde Türk Kızılay; arama-kurtarma desteğinin ardından konteyner kentler, sıcak yemek aşevleri, ulusal kan stokları ve çocuk dostu psikososyal destek merkezleriyle bölgenin yeniden inşasına öncülük etmiştir.',
    highlights: ['Kızılay Konteyner Kentleri', 'Mobil Aşevi & Fırın Üsleri', 'Psikososyal & Çocuk Dostu Alanlar']
  }
];
