import { wordAudioUrl } from '@/lib/quran';

// ───────── lib/quranSurahs.js ─────────
// Complete metadata for all 114 surahs of the Quran
// Format: [number, arabicName, englishName, ayahCount, revelationType, juz]
const SURAHS_RAW = [
  [1,'الفاتحة','Al-Fatihah',7,'Meccan',1],
  [2,'البقرة','Al-Baqarah',286,'Medinan',1],
  [3,'آل عمران','Aal-E-Imran',200,'Medinan',3],
  [4,'النساء','An-Nisa',176,'Medinan',4],
  [5,'المائدة','Al-Maidah',120,'Medinan',6],
  [6,'الأنعام','Al-Anam',165,'Meccan',7],
  [7,'الأعراف','Al-Araf',206,'Meccan',8],
  [8,'الأنفال','Al-Anfal',75,'Medinan',9],
  [9,'التوبة','At-Tawbah',129,'Medinan',10],
  [10,'يونس','Yunus',109,'Meccan',11],
  [11,'هود','Hud',123,'Meccan',11],
  [12,'يوسف','Yusuf',111,'Meccan',12],
  [13,'الرعد','Ar-Rad',43,'Medinan',13],
  [14,'إبراهيم','Ibrahim',52,'Meccan',13],
  [15,'الحجر','Al-Hijr',99,'Meccan',14],
  [16,'النحل','An-Nahl',128,'Meccan',14],
  [17,'الإسراء','Al-Isra',111,'Meccan',15],
  [18,'الكهف','Al-Kahf',110,'Meccan',15],
  [19,'مريم','Maryam',98,'Meccan',16],
  [20,'طه','Ta-Ha',135,'Meccan',16],
  [21,'الأنبياء','Al-Anbiya',112,'Meccan',17],
  [22,'الحج','Al-Hajj',78,'Medinan',17],
  [23,'المؤمنون','Al-Muminun',118,'Meccan',18],
  [24,'النور','An-Nur',64,'Medinan',18],
  [25,'الفرقان','Al-Furqan',77,'Meccan',18],
  [26,'الشعراء','Ash-Shuara',227,'Meccan',19],
  [27,'النمل','An-Naml',93,'Meccan',19],
  [28,'القصص','Al-Qasas',88,'Meccan',20],
  [29,'العنكبوت','Al-Ankabut',69,'Meccan',20],
  [30,'الروم','Ar-Rum',60,'Meccan',21],
  [31,'لقمان','Luqman',34,'Meccan',21],
  [32,'السجدة','As-Sajdah',30,'Meccan',21],
  [33,'الأحزاب','Al-Ahzab',73,'Medinan',21],
  [34,'سبأ','Saba',54,'Meccan',22],
  [35,'فاطر','Fatir',45,'Meccan',22],
  [36,'يس','Ya-Sin',83,'Meccan',22],
  [37,'الصافات','As-Saffat',182,'Meccan',23],
  [38,'ص','Sad',88,'Meccan',23],
  [39,'الزمر','Az-Zumar',75,'Meccan',23],
  [40,'غافر','Ghafir',85,'Meccan',24],
  [41,'فصلت','Fussilat',54,'Meccan',24],
  [42,'الشورى','Ash-Shura',53,'Meccan',25],
  [43,'الزخرف','Az-Zukhruf',89,'Meccan',25],
  [44,'الدخان','Ad-Dukhan',59,'Meccan',25],
  [45,'الجاثية','Al-Jathiyah',37,'Meccan',25],
  [46,'الأحقاف','Al-Ahqaf',35,'Meccan',26],
  [47,'محمد','Muhammad',38,'Medinan',26],
  [48,'الفتح','Al-Fath',29,'Medinan',26],
  [49,'الحجرات','Al-Hujurat',18,'Medinan',26],
  [50,'ق','Qaf',45,'Meccan',26],
  [51,'الذاريات','Adh-Dhariyat',60,'Meccan',26],
  [52,'الطور','At-Tur',49,'Meccan',27],
  [53,'النجم','An-Najm',62,'Meccan',27],
  [54,'القمر','Al-Qamar',55,'Meccan',27],
  [55,'الرحمن','Ar-Rahman',78,'Medinan',27],
  [56,'الواقعة','Al-Waqiah',96,'Meccan',27],
  [57,'الحديد','Al-Hadid',29,'Medinan',27],
  [58,'المجادلة','Al-Mujadila',22,'Medinan',28],
  [59,'الحشر','Al-Hashr',24,'Medinan',28],
  [60,'الممتحنة','Al-Mumtahanah',13,'Medinan',28],
  [61,'الصف','As-Saff',14,'Medinan',28],
  [62,'الجمعة','Al-Jumuah',11,'Medinan',28],
  [63,'المنافقون','Al-Munafiqun',11,'Medinan',28],
  [64,'التغابن','At-Taghabun',18,'Medinan',28],
  [65,'الطلاق','At-Talaq',12,'Medinan',28],
  [66,'التحريم','At-Tahrim',12,'Medinan',28],
  [67,'الملك','Al-Mulk',30,'Meccan',29],
  [68,'القلم','Al-Qalam',52,'Meccan',29],
  [69,'الحاقة','Al-Haqqah',52,'Meccan',29],
  [70,'المعارج','Al-Maarij',44,'Meccan',29],
  [71,'نوح','Nuh',28,'Meccan',29],
  [72,'الجن','Al-Jinn',28,'Meccan',29],
  [73,'المزمل','Al-Muzzammil',20,'Meccan',29],
  [74,'المدثر','Al-Muddaththir',56,'Meccan',29],
  [75,'القيامة','Al-Qiyamah',40,'Meccan',29],
  [76,'الإنسان','Al-Insan',31,'Medinan',29],
  [77,'المرسلات','Al-Mursalat',50,'Meccan',29],
  [78,'النبأ','An-Naba',40,'Meccan',30],
  [79,'النازعات','An-Naziat',46,'Meccan',30],
  [80,'عبس','Abasa',42,'Meccan',30],
  [81,'التكوير','At-Takwir',29,'Meccan',30],
  [82,'الانفطار','Al-Infitar',19,'Meccan',30],
  [83,'المطففين','Al-Mutaffifin',36,'Meccan',30],
  [84,'الانشقاق','Al-Inshiqaq',25,'Meccan',30],
  [85,'البروج','Al-Buruj',22,'Meccan',30],
  [86,'الطارق','At-Tariq',17,'Meccan',30],
  [87,'الأعلى','Al-Ala',19,'Meccan',30],
  [88,'الغاشية','Al-Ghashiyah',26,'Meccan',30],
  [89,'الفجر','Al-Fajr',30,'Meccan',30],
  [90,'البلد','Al-Balad',20,'Meccan',30],
  [91,'الشمس','Ash-Shams',15,'Meccan',30],
  [92,'الليل','Al-Layl',21,'Meccan',30],
  [93,'الضحى','Ad-Duha',11,'Meccan',30],
  [94,'الشرح','Ash-Sharh',8,'Meccan',30],
  [95,'التين','At-Tin',8,'Meccan',30],
  [96,'العلق','Al-Alaq',19,'Meccan',30],
  [97,'القدر','Al-Qadr',5,'Meccan',30],
  [98,'البينة','Al-Bayyinah',8,'Medinan',30],
  [99,'الزلزلة','Az-Zalzalah',8,'Medinan',30],
  [100,'العاديات','Al-Adiyat',11,'Meccan',30],
  [101,'القارعة','Al-Qariah',11,'Meccan',30],
  [102,'التكاثر','At-Takathur',8,'Meccan',30],
  [103,'العصر','Al-Asr',3,'Meccan',30],
  [104,'الهمزة','Al-Humazah',9,'Meccan',30],
  [105,'الفيل','Al-Fil',5,'Meccan',30],
  [106,'قريش','Quraysh',4,'Meccan',30],
  [107,'الماعون','Al-Maun',7,'Meccan',30],
  [108,'الكوثر','Al-Kawthar',3,'Meccan',30],
  [109,'الكافرون','Al-Kafirun',6,'Meccan',30],
  [110,'النصر','An-Nasr',3,'Medinan',30],
  [111,'المسد','Al-Masad',5,'Meccan',30],
  [112,'الإخلاص','Al-Ikhlas',4,'Meccan',30],
  [113,'الفلق','Al-Falaq',5,'Meccan',30],
  [114,'الناس','An-Nas',6,'Meccan',30],
];

export const SURAHS = SURAHS_RAW.map(([n, ar, en, ayahs, rev, juz]) => ({
  number: n, name: ar, englishName: en, ayahCount: ayahs, revelationType: rev, juz
}));

export const TOTAL_SURAHS = SURAHS.length;
export const TOTAL_AYAHS = SURAHS.reduce((s, sr) => s + sr.ayahCount, 0);
export const TOTAL_WORDS = 77439;

export function getSurahMeta(n) {
  return SURAHS.find(s => s.number === n);
}

// ───────── lib/surahFatihahData.js ─────────
// Complete static data for Surah Al-Fatihah (سورة الفاتحة) — Surah 1, 7 verses.
// Provides Urdu word-by-word meanings, Urdu tafsir, shan-e-nuzool, and detailed
// word analysis (part of speech, root, Quran occurrence count, derivatives) offline.



export const FATIHAH_VERSES = [
  {
    ayah: 1,
    arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    transliteration: 'Bismillaahir-Rahmaanir-Raheem',
    translationUrdu: 'اللہ کے نام سے جو بڑا مہربان نہایت رحم والا ہے',
    translationEnglish: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.',
    words: [
      {
        arabic: 'بِسْمِ', transliteration: 'Bismi', urdu: 'اللہ کے نام سے', english: 'In the name of',
        category: 'ism', partOfSpeech: 'اسم + حرف جر (بـ + اسم)', root: 'س م و',
        quranCount: 4, derivatives: 'اسم، أسماء، تسمیة، مسمّیٰ',
      },
      {
        arabic: 'اللَّهِ', transliteration: 'Allahi', urdu: 'اللہ', english: 'Allah',
        category: 'ism', partOfSpeech: 'علم (خاص نام)', root: 'ا ل ه',
        quranCount: 2699, derivatives: 'اللہ، اللہم، الٰہ، معبود، الٰہیہ',
      },
      {
        arabic: 'الرَّحْمَٰنِ', transliteration: 'Ar-Rahmani', urdu: 'بڑا مہربان', english: 'the Most Merciful',
        category: 'ism', partOfSpeech: 'اسم تعظیم (صفت)', root: 'ر ح م',
        quranCount: 57, derivatives: 'رحمٰن، رحیم، رحمت، رحماء، مرحمت',
      },
      {
        arabic: 'الرَّحِيمِ', transliteration: 'Ar-Raheemi', urdu: 'نہایت رحم والا', english: 'the Especially Merciful',
        category: 'ism', partOfSpeech: 'صفت مشبہ (فعیل)', root: 'ر ح م',
        quranCount: 95, derivatives: 'رحیم، رحمٰن، رحمت، رحماء، مرحوم',
      },
    ],
  },
  {
    ayah: 2,
    arabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
    transliteration: 'Al-hamdu lillaahi Rabbil-Aalameen',
    translationUrdu: 'تمام تعریفیں اللہ ہی کے لیے ہیں جو تمام جہانوں کا پروردگار ہے',
    translationEnglish: '[All] praise is [due] to Allah, Lord of the worlds —',
    words: [
      {
        arabic: 'الْحَمْدُ', transliteration: 'Al-hamdu', urdu: 'تمام تعریفیں', english: 'All praise',
        category: 'ism', partOfSpeech: 'اسم (مصدر)', root: 'ح م د',
        quranCount: 38, derivatives: 'حمد، حامد، محمود، احمد، حمید، حمداً',
      },
      {
        arabic: 'لِلَّهِ', transliteration: 'lillaahi', urdu: 'اللہ ہی کے لیے', english: 'is for Allah',
        category: 'harf', partOfSpeech: 'حرف جر + علم', root: 'ا ل ه',
        quranCount: 2699, derivatives: 'اللہ، اللہم، الٰہ',
      },
      {
        arabic: 'رَبِّ', transliteration: 'Rabbi', urdu: 'پروردگار', english: 'Lord',
        category: 'ism', partOfSpeech: 'اسم (مضاف)', root: 'ر ب ب',
        quranCount: 146, derivatives: 'رب، ربوبیت، ربیب، مرّب، ربانی',
      },
      {
        arabic: 'الْعَالَمِينَ', transliteration: 'al-Aalameena', urdu: 'تمام جہانوں کا', english: 'of the worlds',
        category: 'ism', partOfSpeech: 'اسم جمع (مضاف الیہ)', root: 'ع ل م',
        quranCount: 73, derivatives: 'عالمین، عالم، علوم، معلوم، تعلیم، علام',
      },
    ],
  },
  {
    ayah: 3,
    arabic: 'الرَّحْمَٰنِ الرَّحِيمِ',
    transliteration: 'Ar-Rahmaanir-Raheem',
    translationUrdu: 'بڑا مہربان نہایت رحم والا',
    translationEnglish: 'The Entirely Merciful, the Especially Merciful,',
    words: [
      {
        arabic: 'الرَّحْمَٰنِ', transliteration: 'Ar-Rahmaani', urdu: 'بڑا مہربان', english: 'the Most Merciful',
        category: 'ism', partOfSpeech: 'اسم تعظیم (صفت)', root: 'ر ح م',
        quranCount: 57, derivatives: 'رحمٰن، رحیم، رحمت، رحماء، مرحمت',
      },
      {
        arabic: 'الرَّحِيمِ', transliteration: 'Ar-Raheemi', urdu: 'نہایت رحم والا', english: 'the Especially Merciful',
        category: 'ism', partOfSpeech: 'صفت مشبہ (فعیل)', root: 'ر ح م',
        quranCount: 95, derivatives: 'رحیم، رحمٰن، رحمت، رحماء، مرحوم',
      },
    ],
  },
  {
    ayah: 4,
    arabic: 'مَالِكِ يَوْمِ الدِّينِ',
    transliteration: 'Maaliki Yaumid-Deen',
    translationUrdu: 'روزِ جزا کا مالک ہے',
    translationEnglish: 'Sovereign of the Day of Recompense.',
    words: [
      {
        arabic: 'مَالِكِ', transliteration: 'Maaliki', urdu: 'مالک', english: 'Master',
        category: 'ism', partOfSpeech: 'اسم (صفت/مضاف)', root: 'م ل ك',
        quranCount: 5, derivatives: 'مالک، ملک، مملکت، مَلَك، ملائک، مَلیك',
      },
      {
        arabic: 'يَوْمِ', transliteration: 'Yaumi', urdu: 'دن کا', english: 'of the Day',
        category: 'ism', partOfSpeech: 'اسم (ظرف زمان)', root: 'ي و م',
        quranCount: 413, derivatives: 'یوم، ایام، یومی، الیوم',
      },
      {
        arabic: 'الدِّينِ', transliteration: 'ad-Deeni', urdu: 'جزا', english: 'of Recompense',
        category: 'ism', partOfSpeech: 'اسم (مضاف الیہ)', root: 'د ي ن',
        quranCount: 79, derivatives: 'دین، دَیّان، مدین، متدین، دَیْن',
      },
    ],
  },
  {
    ayah: 5,
    arabic: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
    transliteration: 'Iyyaaka na-budu wa iyyaaka nasta-een',
    translationUrdu: 'ہم صرف تیری عبادت کرتے ہیں اور صرف تجھ سے مدد مانگتے ہیں',
    translationEnglish: 'It is You we worship and You we ask for help.',
    words: [
      {
        arabic: 'إِيَّاكَ', transliteration: 'Iyyaaka', urdu: 'صرف تیری', english: 'You alone',
        category: 'ism', partOfSpeech: 'ضمیر منفصل (مفعول)', root: '— (ضمیر)',
        quranCount: 28, derivatives: 'ایاک، ایاہ، ایاہم، ایاکم، ایان',
      },
      {
        arabic: 'نَعْبُدُ', transliteration: 'na-budu', urdu: 'عبادت کرتے ہیں', english: 'we worship',
        category: 'fail', partOfSpeech: 'فعل مضارع', root: 'ع ب د',
        quranCount: 5, derivatives: 'عبد، عبادت، عابد، معبود، عبد، عبید',
      },
      {
        arabic: 'وَإِيَّاكَ', transliteration: 'wa iyyaaka', urdu: 'اور صرف تجھ سے', english: 'and You alone',
        category: 'ism', partOfSpeech: 'حرف عطف + ضمیر منفصل', root: '— (ضمیر)',
        quranCount: 28, derivatives: 'ایاک، ایاہ، ایاہم، ایاکم، ایان',
      },
      {
        arabic: 'نَسْتَعِينُ', transliteration: 'nasta-eenu', urdu: 'مدد مانگتے ہیں', english: 'we ask for help',
        category: 'fail', partOfSpeech: 'فعل مضارع (استفعال)', root: 'ع و ن',
        quranCount: 5, derivatives: 'عون، معین، استعان، تعاون، اعانہ',
      },
    ],
  },
  {
    ayah: 6,
    arabic: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ',
    transliteration: 'Ihdinas-Siraatal-Mustaqeem',
    translationUrdu: 'ہمیں سیدھے راستے کی ہدایت دے',
    translationEnglish: 'Guide us to the straight path —',
    words: [
      {
        arabic: 'اهْدِنَا', transliteration: 'Ihdinaa', urdu: 'ہمیں ہدایت دے', english: 'Guide us',
        category: 'fail', partOfSpeech: 'فعل امر + ضمیر مفعول', root: 'ه د ي',
        quranCount: 46, derivatives: 'ہدی، ہدایت، ہاد، مہتدی، مستہدی',
      },
      {
        arabic: 'الصِّرَاطَ', transliteration: 'as-Siraata', urdu: 'راستے', english: 'to the path',
        category: 'ism', partOfSpeech: 'اسم (مفعول)', root: 'ص ر ط',
        quranCount: 45, derivatives: 'صراط، سُرُط، صراطاً',
      },
      {
        arabic: 'الْمُسْتَقِيمَ', transliteration: 'al-Mustaqeema', urdu: 'سیدھے', english: 'the straight',
        category: 'ism', partOfSpeech: 'صفت (اسم فاعل)', root: 'ق و م',
        quranCount: 5, derivatives: 'قام، قائم، قیام، مستقیم، تقویم',
      },
    ],
  },
  {
    ayah: 7,
    arabic: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ',
    transliteration: 'Siraatal-lazeena an-amta alaihim ghairil-maghzoobi alaihim wa lad-daaalleen',
    translationUrdu: 'ان لوگوں کے راستے پر جن پر تو نے انعام کیا ہے، نہ ان کے راستے پر جن پر غضب کیا گیا اور نہ گمراہوں کے راستے پر',
    translationEnglish: 'The path of those upon whom You have bestowed favor, not of those who have evoked [Your] anger or of those who are astray.',
    words: [
      {
        arabic: 'صِرَاطَ', transliteration: 'Siraata', urdu: 'راستے', english: 'The path',
        category: 'ism', partOfSpeech: 'اسم (مضاف)', root: 'ص ر ط',
        quranCount: 45, derivatives: 'صراط، سُرُط، صراطاً',
      },
      {
        arabic: 'الَّذِينَ', transliteration: 'allazeena', urdu: 'ان لوگوں کے', english: 'of those',
        category: 'ism', partOfSpeech: 'اسم موصول (جمع مذکر)', root: '— (موصول)',
        quranCount: 531, derivatives: 'الذین، الذی، التی، اللتان، اللذان',
      },
      {
        arabic: 'أَنْعَمْتَ', transliteration: 'an-amta', urdu: 'تو نے انعام کیا', english: 'You have bestowed favor',
        category: 'fail', partOfSpeech: 'فعل ماضی + تاء فاعل', root: 'ن ع م',
        quranCount: 11, derivatives: 'نعمت، نعیم، منعم، منعمین، انعام، ناعم',
      },
      {
        arabic: 'عَلَيْهِمْ', transliteration: 'alaihim', urdu: 'ان پر', english: 'upon them',
        category: 'harf', partOfSpeech: 'حرف جر + ضمیر متصل', root: 'ع ل ی',
        quranCount: 120, derivatives: 'علی، علینا، علیک، علیہم، علیہ',
      },
      {
        arabic: 'غَيْرِ', transliteration: 'ghairi', urdu: 'نہ ان کے', english: 'not',
        category: 'ism', partOfSpeech: 'اسم (صفت/استثناء)', root: 'غ ي ر',
        quranCount: 28, derivatives: 'غیر، تغییر، مغیر، استغار',
      },
      {
        arabic: 'الْمَغْضُوبِ', transliteration: 'al-maghzoobi', urdu: 'جن پر غضب کیا گیا', english: 'who have earned anger',
        category: 'ism', partOfSpeech: 'اسم مفعول (passive participle)', root: 'غ ض ب',
        quranCount: 1, derivatives: 'غضب، غاضب، مغضوب، غضبان',
      },
      {
        arabic: 'عَلَيْهِمْ', transliteration: 'alaihim', urdu: 'ان پر', english: 'upon them',
        category: 'harf', partOfSpeech: 'حرف جر + ضمیر متصل', root: 'ع ل ی',
        quranCount: 120, derivatives: 'علی، علینا، علیک، علیہم، علیہ',
      },
      {
        arabic: 'وَلَا', transliteration: 'wa la', urdu: 'اور نہ', english: 'and not',
        category: 'harf', partOfSpeech: 'حرف عطف + حرف نفی', root: '— (حرف)',
        quranCount: 12, derivatives: 'لا، ولا، لات، لنا',
      },
      {
        arabic: 'الضَّالِّينَ', transliteration: 'ad-daaalleena', urdu: 'گمراہوں کے', english: 'those who are astray',
        category: 'ism', partOfSpeech: 'اسم فاعل (جمع)', root: 'ض ل ل',
        quranCount: 2, derivatives: 'ضال، ضلال، ضلالت، مضل، ضلالین',
      },
    ],
  },
];

export const FATIHAH_TAFSIR = [
  {
    ayah: 1,
    text: 'بسم اللہ — یعنی میں ہر کام کا آغاز اللہ کے نام سے کرتا ہوں۔ اللہ — ذاتِ مالک کا خاص نام ہے جو کسی اور کے لیے استعمال نہیں ہوتا۔ الرحمٰن — اس کی رحمت سب پر وسیع ہے، مومن و کافر سب کو دنیا میں رزق دیتا ہے۔ الرحیم — خاص طور پر مومنوں کے لیے رحم کرنے والا، جو آخرت میں ان پر اپنی خاص رحمت کا ظاہر کرے گا۔',
    source: 'تفسیر مختصر (اردو)',
  },
  {
    ayah: 2,
    text: 'الحمد للہ — ہر قسم کی تعریف جو کسی کے لیے جائز ہو وہ صرف اللہ کے لیے ہے۔ رب العالمین — تمام جہانوں کا پروردگار، یعنی وہی خالق، مالک، مربی اور تدبیر کرنے والا ہے۔ آسمان، زمین، انسان، فرشتے، جن، حیوان — سب کا پروردگار صرف وہی ہے۔',
    source: 'تفسیر مختصر (اردو)',
  },
  {
    ayah: 3,
    text: 'الرحمٰن الرحیم — یہ دو نام دہرائے گئے تاکہ رحمتِ الٰہی سے امید قائم رہے۔ الرحمٰن کا معنیٰ ہے جس کی رحمت کا دائرہ بہت وسیع ہے، اور الرحیم کا معنیٰ ہے جو اپنے بندوں پر بہت رحم کرنے والا ہے۔',
    source: 'تفسیر مختصر (اردو)',
  },
  {
    ayah: 4,
    text: 'مالک یوم الدین — یعنی روزِ قیامت کا مالک۔ اس دن کو مالک کہنے کا مطلب ہے کہ اس دن سب کچہ حکم صرف اللہ کا ہوگا، کوئی اور اختیار نہیں رکھے گا۔ دین کا معنیٰ یہاں جزا و سزا ہے۔ اس دن ہر شخص کو اپنے اعمال کا بدلہ ملے گا۔',
    source: 'تفسیر مختصر (اردو)',
  },
  {
    ayah: 5,
    text: 'ایاک نعبد — ہم صرف تیری عبادت کرتے ہیں۔ یعنی ہم کسی دوسرے کو اللہ کا شریک نہیں مانتے۔ ایاک نستعین — اور صرف تجھ سے مدد مانگتے ہیں۔ یعنی ہم ہر کام میں تیرا سہارا لیتے ہیں اور کسی دوسرے سے مدد نہیں مانگتے۔ عبادت میں اور مدد میں، دونوں میں، صرف تیری توحید قائم ہے۔',
    source: 'تفسیر مختصر (اردو)',
  },
  {
    ayah: 6,
    text: 'اہدنا الصراط المستقیم — ہمیں سیدھے راستے کی ہدایت دے۔ سیدھا راستہ وہ ہے جو اللہ کی کتاب اور رسول کی سنت پر قائم ہے، جس میں نہ زیادتی ہے نہ کمی، نہ انحراف ہے نہ گمراہی۔ یہ دعا ہے کہ اللہ ہمیں اس راستے پر ثابت قدم رکھے۔',
    source: 'تفسیر مختصر (اردو)',
  },
  {
    ayah: 7,
    text: 'صراط الذین انعمت علیہم — ان لوگوں کے راستے پر جن پر تو نے انعام کیا، یعنی انبیاء، صدیقین، شہداء اور صالحین۔ غیر المغضوب علیہم — نہ ان کے راستے پر جن پر غضب کیا گیا، یعنی یہود جنہیں علم کے باوجود عمل نہیں دیا۔ ولا الضالین — اور نہ گمراہوں کے راستے پر، یعنی نصاریٰ جنہوں نے بغیر علم کی عبادت کی۔',
    source: 'تفسیر مختصر (اردو)',
  },
];

export const FATIHAH_SHAN_NUZOOL = 'سورة الفاتحہ مکی سورہ ہے — اس کی نزول مکہ مکرمہ میں ہوئی، نبوت کے ابتدائی دور میں۔ یہ قرآن کی پہلی سورہ ہے اور نماز کا بنیادی حصہ ہے۔ صحیح حدیث میں ہے کہ اللہ کے رسول ﷺ نے فرمایا: "نماز میں الفاتحہ کے بغیر نماز قبول نہیں ہوتی۔" یہ سورہ دعا اور تعریف دونوں پر مشتمل ہے — پہلے اللہ کی تعریف، پھر ہدایت کی دعا۔';

// Get complete static analysis for a verse of Al-Fatihah
export function getFatihahAnalysis(ayah) {
  const verse = FATIHAH_VERSES.find(v => v.ayah === ayah);
  const tafsir = FATIHAH_TAFSIR.find(t => t.ayah === ayah);
  if (!verse) return null;

  return {
    tafsirUrdu: tafsir?.text || null,
    tafsirSource: tafsir?.source || null,
    shanNuzool: FATIHAH_SHAN_NUZOOL,
    translationUrdu: verse.translationUrdu,
    translationEnglish: verse.translationEnglish,
    wordMeta: verse.words.map(w => ({
      partOfSpeech: w.partOfSpeech || '—',
      category: w.category || 'word',
      urduTranslation: w.urdu,
      root: w.root || '—',
      quranCount: w.quranCount || 0,
      derivatives: w.derivatives || '—',
    })),
    tafsirSources: tafsir ? [{ language: 'ur', author: tafsir.source, text: tafsir.text }] : [],
  };
}

// Get static words for a verse of Al-Fatihah (for word-by-word display)
export function getFatihahWords(ayah) {
  const verse = FATIHAH_VERSES.find(v => v.ayah === ayah);
  if (!verse) return null;
  return verse.words.map((w, i) => ({
    arabic: w.arabic,
    audioUrl: wordAudioUrl(`ar.alafasy/1/${ayah}/${i + 1}.mp3`),
    transliteration: w.transliteration,
  }));
}

export const isFatihah = (surah) => Number(surah) === 1;

// ───────── lib/tajweedData.js ─────────
// Maps Arabic letters to their Makharij (articulation points).
// Used by the TajweedTracker to categorize word-level errors by makharij.

export const makharijGroups = [
  { id: 'jawf', name: 'الجوف', nameEn: 'Al-Jawf (Empty Space)', letters: ['ا', 'و', 'ي', 'ى', 'ء'], description: 'خالی جوفِ دہن — مدّی حروف (ا، و، ی)', tajweedCategoryId: 'madd' },
  { id: 'halq_aqsa', name: 'أقصى الحلق', nameEn: 'Deepest Throat', letters: ['ه', 'هـ', 'ة', 'ء'], description: 'گلے کا سب سے دور حصہ — ہ، ء', tajweedCategoryId: 'makharij' },
  { id: 'halq_wast', name: 'وسط الحلق', nameEn: 'Middle Throat', letters: ['ع', 'ح'], description: 'گلے کا درمیانی حصہ — ع، ح', tajweedCategoryId: 'makharij' },
  { id: 'halq_adna', name: 'أدنى الحلق', nameEn: 'Nearest Throat', letters: ['غ', 'خ'], description: 'گلے کا قریبی حصہ — غ، خ', tajweedCategoryId: 'makharij' },
  { id: 'lisan_aqsa', name: 'أقصى اللسان', nameEn: 'Back of Tongue', letters: ['ق', 'ك'], description: 'زبان کا سب سے دور حصہ — ق، ک', tajweedCategoryId: 'makharij' },
  { id: 'lisan_wast', name: 'وسط اللسان', nameEn: 'Middle of Tongue', letters: ['ج', 'ش', 'ي', 'ى'], description: 'زبان کا درمیانی حصہ — ج، ش، ی', tajweedCategoryId: 'makharij' },
  { id: 'lisan_hafa', name: 'حافة اللسان', nameEn: 'Sides of Tongue', letters: ['ض', 'ل', 'ن'], description: 'زبان کے کنارے — ض، ل، ن', tajweedCategoryId: 'makharij' },
  { id: 'lisan_tarf', name: 'طرف اللسان', nameEn: 'Tip of Tongue', letters: ['ر', 'ط', 'د', 'ت', 'ص', 'س', 'ز', 'ظ', 'ذ', 'ث'], description: 'زبان کا سرا — ر، ط، د، ت، ص، س، ز، ظ، ذ، ث', tajweedCategoryId: 'makharij' },
  { id: 'shafatan', name: 'الشفتان', nameEn: 'The Lips', letters: ['ف', 'ب', 'م', 'و'], description: 'ہونٹ — ف، ب، م، و', tajweedCategoryId: 'makharij' },
  { id: 'khayshoom', name: 'الخيشوم', nameEn: 'The Nasal Cavity', letters: ['ن', 'م'], description: 'نکسہ — غنّہ (نون اور میم ساکنہ)', tajweedCategoryId: 'noon_sakinah' },
];

export function getMakhrajForLetter(letter) {
  const clean = letter.replace(/[\u064B-\u0652\u0670\u0640]/g, '').trim();
  if (!clean) return null;
  const base = clean[0];
  for (const g of makharijGroups) { if (g.letters.includes(base)) return g; }
  return null;
}

export function getMakharijForWord(word) {
  if (!word) return [];
  const clean = word.replace(/[\u064B-\u0652\u0670\u0640]/g, '');
  const found = new Map();
  for (const ch of clean) { const g = getMakhrajForLetter(ch); if (g && !found.has(g.id)) found.set(g.id, g); }
  return Array.from(found.values());
}

export function analyzeMakharijErrors(progressData) {
  const stats = {};
  for (const [key, entry] of Object.entries(progressData)) {
    const word = entry.word;
    if (!word) continue;
    const groups = getMakharijForWord(word);
    for (const g of groups) {
      if (!stats[g.id]) { stats[g.id] = { makhraj: g, totalAttempts: 0, wrongCount: 0, correctCount: 0, words: new Set() }; }
      stats[g.id].totalAttempts += entry.attempts || 0;
      stats[g.id].wrongCount += entry.wrongCount || 0;
      stats[g.id].correctCount += entry.correctCount || 0;
      if (entry.wrongCount > 0) stats[g.id].words.add(word);
    }
  }
  const result = Object.values(stats).map(s => ({ ...s, words: Array.from(s.words), accuracy: s.totalAttempts > 0 ? Math.round((s.correctCount / s.totalAttempts) * 100) : 0 }));
  result.sort((a, b) => b.wrongCount - a.wrongCount || a.accuracy - b.accuracy);
  return result;
}

export function recommendFirstLesson(progressData) {
  const analysis = analyzeMakharijErrors(progressData);
  if (analysis.length === 0 || analysis[0].wrongCount === 0) return null;
  return analysis[0];
}

// Complete Tajweed rules data — structured for the Tajweed learning module.
// All content is in Urdu with Arabic examples.

export const tajweedCategories = [
  {
    id: 'makharij',
    title: 'مخارج الحروف',
    titleEn: 'Makharij — Points of Articulation',
    intro: 'حروف کے نکلنے کی جگہوں کو مخرج کہتے ہیں۔ قرآن پاک کی صحیح تلاوت کے لیے ہر حرف کے مخرج کا صحیح علم ضروری ہے۔ مخارجِ حروف پانچ بنیادی جگہوں پر تقسیم ہیں:',
    rules: [
      {
        name: 'الجوف (خالی جوفِ دہن)',
        description: 'یہ دہن اور حلق کا وہ حصہ ہے جو خالی ہے۔ اس سے تین حروف نکلتے ہیں: مدّی حروف — ا، و، ی (الف، واؤ، یاء مدّیہ)۔ یہ حروف اپنے مخرج سے پورے دہن میں پھیل کر ادائیگی ہوتے ہیں۔',
        example: 'قَالَ، يُوحِي، يَوْمَ',
        note: 'یہ حروف مدّ کے حروف کہلاتے ہیں۔ ان کی ادائیگی میں آواز کو کش دینا (مد) ضروری ہے۔',
      },
      {
        name: 'الحلق (گلا)',
        description: 'گلا تین حصوں میں تقسیم ہے اور اس سے چھ حروف نکلتے ہیں:\n\n۱۔ اقصی الحلق (گلے کا سب سے دور حصہ): ء، ہ\n۲۔ وسط الحلق (گلے کا درمیانی حصہ): ع، ح\n۳۔ ادنی الحلق (گلے کا قریبی حصہ): غ، خ',
        example: 'اَعُوذُ، اَلْحَمْدُ، غَيْرِ',
        note: 'یہ حروف حلق کے گہرے سے نکلتے ہیں۔ انہیں "حروف حلقّیہ" بھی کہتے ہیں۔',
      },
      {
        name: 'اللسان (زبان)',
        description: 'زبان سب سے زیادہ حروف کا مخرج ہے۔ اس سے 18 حروف نکلتے ہیں۔ زبان کو چار حصوں میں تقسیم کیا گیا ہے:\n\n۱۔ اقصی اللسان (زبان کا سب سے دور حصہ): ق\n۲۔ وسط اللسان (زبان کا درمیانی حصہ): ج، ش، ی\n۳۔ حافة اللسان (زبان کے کنارے): ض (بائیں کنارے)، ل (پورے کنارے)، ن (نون کا مخرج)، ر (زبان کا سرا)\n۴۔ طرف اللسان (زبان کا سرا): ط، د، ت، ص، س، ز، ظ، ذ، ث، ر',
        example: 'قُلْ، جَاءَ، ضُلِّلُوا، اللَّهُ',
        note: 'زبان کے مختلف حصوں سے مختلف حروف نکلتے ہیں۔ ہر حرف کی پہچان اس کے مخرج کی صحیح ادائیگی میں ہے۔',
      },
      {
        name: 'الشفتان (ہونٹ)',
        description: 'ہونٹوں سے چار حروف نکلتے ہیں:\n\n۱۔ ب — دونوں ہونٹ مل کر نرمی سے\n۲۔ م — دونوں ہونٹ مل کر کھلنے سے\n۳۔ و — دونوں ہونٹ گول ہو کر\n۴۔ ف — اوپر کے دانت نیچے کے ہونٹ پر',
        example: 'بِسْمِ، مَالِكِ، وَلَا، فِي',
        note: 'ہونٹوں کی حرکت کا خاص خیال رکھیں۔ ب اور م میں ہونٹ ملتے ہیں، و میں گول ہوتے ہیں، ف میں ہونٹ دانت سے لگتا ہے۔',
      },
      {
        name: 'الخیشوم (ناک)',
        description: 'ناک کے مخرج سے غنّہ کی آواز نکلتی ہے۔ یہ آواز نون ساکن، میم ساکن اور تنوین کے ساتھ اداء ہوتی ہے۔ غنّہ کا مطلب ناک سے آواز کو لے جانا ہے۔',
        example: 'مِنْ، عَمَّ، جَنَّاتٍ',
        note: 'غنّہ کی ادائیگی میں ناک سے آواز نکلنی چاہیے۔ یہ تقریباً دو حرکت کا مد ہے۔',
      },
    ],
  },
  {
    id: 'sifat',
    title: 'صفات الحروف',
    titleEn: 'Sifat — Characteristics of Letters',
    intro: 'حروف کی صفات سے مراد وہ خصوصیات ہیں جو ہر حرف کی ادائیگی میں پائی جاتی ہیں۔ صفات دو قسم کی ہیں: صفات متضاد (جن کے ضد ہیں) اور صفات لا ضد لها (جن کی ضد نہیں)۔',
    rules: [
      {
        name: 'الشدة اور الرخاوة (شدت اور نرمی)',
        description: 'حروف کو شدت اور نرمی کے اعتبار سے تین قسم میں تقسیم کیا گیا ہے:\n\n۱۔ شدید (مضبوط): اِن حروف میں آواز کا بہاؤ روکا جاتا ہے۔ حروف: أ ج د ط ق ك ب ت — جمع: "أجد قط كبت"\n۲۔ رخو (نرم): اِن حروف میں آواز بہتی ہے۔ حروف: ل م ن ع ر — جمع: "لمنعر"\n۳۔ بین (درمیانی): نہ مکمل شدید نہ مکمل رخو۔ حروف: ص ض غ خ ف ش س ز ظ ذ ث و ي — باقی ماندہ حروف',
        example: 'قُلْ (شدید)، اللَّهُ (رخو)، صَدَقَ (بین)',
        note: 'شدید حروف پر آواز روکنی ہے، رخو حروف میں آواز کو بہنے دیں، بین حروف میں اعتدال رکھیں۔',
      },
      {
        name: 'الإطباق اور الانفتاح (بند ہونا اور کھلا ہونا)',
        description: '۱۔ إطباق: زبان کے وسط کو اوپر اٹھا کر تالو کی طرف کرنا۔ حروف: ص ض ط ظ\n۲۔ انفتاح: زبان کا وسط تالو سے دور رہنا۔ باقی تمام حروف',
        example: 'صَادَّ، طَلْحَةً، ظَلَلَ',
        note: 'إطباق والے حروف میں زبان کے وسط کو تالو کی طرف اٹھانا ضروری ہے۔ یہ چار حروف خاص ہیں۔',
      },
      {
        name: 'الاستعلاء اور الاستفال (اوپر اٹھنا اور نیچے رہنا)',
        description: '۱۔ استعلاء: حرف کی ادائیگی میں آواز تالو کی طرف اٹھتی ہے۔ حروف: خ ص ض ط ظ ق غ — جمع: "خص ضطظ قغ" (7 حروف)\n۲۔ استفال: آواز نیچے کی طرف رہتی ہے۔ باقی تمام حروف',
        example: 'خَلَقَ، قُرْآن، طَيِّبَات',
        note: 'استعلاء والے حروف کو "حروف استعلاء" کہتے ہیں۔ ان کی ادائیگی میں آواز کو اوپر اٹھانا ہے۔',
      },
      {
        name: 'الإذلاق اور الإصمات (پھرتی اور بندش)',
        description: '۱۔ إذلاق: زبان کے سرے یا ہونٹوں سے پھرتی سے نکلنے والے حروف۔ حروف: ف ر م ن ل ب — جمع: "فر من لب" (6 حروف)\n۲۔ إصمات: باقی تمام حروف۔ ان میں پھرتی کم ہے۔',
        example: 'فَرَّ، مِنْ، لَبِثَ',
        note: 'إذلاق والے حروف پھرتی سے نکلتے ہیں، جبکہ إصمات والے حروف میں آواز کا بہاؤ نسبتاً بند ہوتا ہے۔',
      },
      {
        name: 'الصفير (سیٹی نما آواز)',
        description: 'تین حروف میں سیٹی نما آواز ہوتی ہے: س، ص، ز۔ یہ آواز خاص طور پر ان حروف کی پہچان ہے۔ ص میں زیادہ، س میں درمیانی، ز میں کم۔',
        example: 'سَمِعَ، صَدَقَ، زَكَاة',
        note: 'صفیر والے حروف میں سیٹی نما آواز کا خاص خیال رکھیں۔',
      },
      {
        name: 'القلقلة (باؤنڈ نما آواز)',
        description: 'پانچ حروف ساکن ہونے پر باؤنڈ نما آواز نکالتے ہیں: ق ط ب ج د — جمع: "قطب جد"۔ یہ آواز حرف کو ساکن پڑھتے وقت ایک ہلکی سی bounce کی طرح ہوتی ہے۔',
        example: 'خَلَقْ، عَلَيْهِمْ، عَبْدُ، فَجْرٍ',
        note: 'قلقلہ کی آواز ساکن حرف پر ہوتی ہے۔ دو درجے ہیں: قلقلة کبری (شددہ پر) اور قلقلة صغری (ساکن پر)۔',
      },
      {
        name: 'الغنة (ناک کی آواز)',
        description: 'نون ساکن، میم ساکن اور تنوین میں ناک سے نکلنے والی آواز۔ یہ تقریباً دو حرکت کی مد ہے۔',
        example: 'مِنْ، جَنَّةٍ، عَمَّ',
        note: 'غنّہ کی ادائیگی میں ناک سے آواز نکلنی چاہیے۔ یہ ایک مستقل صفت ہے۔',
      },
      {
        name: 'باقی صفات (Lin, Inhiraf, Takrir, Tafakhshi)',
        description: '۱۔ اللين: و اور ی ساکن ہو کر مدّ کے بغیر نکلیں۔\n۲۔ الانحراف: ل میں زبان کا کنارہ اٹھنا۔\n۳۔ التكرير: ر میں زبان کا ہلنا — ر کو ایک بار پڑھیں، دہرائیں نہیں۔\n۴۔ التفشی: ش میں زبان کا پھیلنا۔\n۵۔ الاستطالة: ض میں زبان کا پھیلنا۔',
        example: 'بَيْت، رَبِّ، شَكَرَ، ضَلَّ',
        note: 'یہ صفات مخصوص حروف کی درست ادائیگی میں معاون ہیں۔',
      },
    ],
  },
  {
    id: 'noon-sakinah',
    title: 'احکام النون الساکنة والتنوین',
    titleEn: 'Rules of Noon Sakinah & Tanween',
    intro: 'نون ساکنہ (نْ) اور تنوین (ـً ـٍ ـٌ) کے چار احکام ہیں۔ یہ احکام اس پر منحصر ہیں کہ نون ساکنہ یا تنوین کے بعد کون سا حرف آتا ہے۔',
    rules: [
      {
        name: '۱۔ إظهار (Izhar — ظاہر کرنا)',
        description: 'اگر نون ساکنہ یا تنوین کے بعد حروفِ حلقی (ء ه ع ح غ خ) میں سے کوئی حرف آ جائے، تو نون کو ظاہر پڑھیں — یعنی نون کی آواز کو واضح اور مکمل اداء کریں۔',
        example: 'مِنْ هَادٍ، أَنْعَمْتَ، يَنْحِتُونَ، غَفُورٌ حَلِيمٌ',
        note: '6 حروف: ء ه ع ح غ خ — یہ گلے کے حروف ہیں۔ نون کو ناک سے بغیر واضح پڑھیں۔',
      },
      {
        name: '۲۔ إدغام (Idgham — مدغم کرنا)',
        description: 'اگر نون ساکنہ یا تنوین کے بعد 6 حروف (ی ر م ل و ن) میں سے کوئی آ جائے، تو نون کو اگلے حرف میں مدغم کر دیں۔ یہ دو قسم کا ہے:\n\n• إدغام بغیر غنّہ: ر اور ل پر — نون مکمل غائب\n• إدغام مع غنّہ: ی و م ن ل پر — ناک سے آواز',
        example: 'مِنْ رَّبِّ (بغیر غنّہ)، مِنْ وَّالٍ (مع غنّہ)، فَوْقَهُمْ مَوْجُودٌ',
        note: '6 حروف: ی ر م ل و ن — جمع: "یرملون"۔ لفظِ جلالہ "اللہ" سے قبل نون ساکنہ کا إدغام نہیں ہوتا۔',
      },
      {
        name: '۳۔ إقلاب (Iqlab — بدلنا)',
        description: 'اگر نون ساکنہ یا تنوین کے بعد "ب" آ جائے، تو نون کو میم میں بدل کر غنّہ کے ساتھ پڑھیں۔ یعنی نون کی جگہ میم کی آواز ناک سے آئے۔',
        example: 'مِنْ بَعْدِ، أَنْبِئْهُمْ، عَلِيمٌ بِمَا',
        note: 'صرف ایک حرف: ب۔ نون کو میم میں تبدیل کر کے غنّہ کے ساتھ اداء کریں۔',
      },
      {
        name: '۴۔ إخفاء (Ikhfa — چھپانا)',
        description: 'اگر نون ساکنہ یا تنوین کے بعد 15 حروف میں سے کوئی آ جائے، تو نون کو ناک سے ہلکی آواز میں پڑھیں — نہ مکمل ظاہر، نہ مکمل مدغم۔ یہ درمیانی کیفیت ہے۔',
        example: 'مِنْ تَحْتِ، أَنْتُمْ، مِنْ صَيْفٍ، كِتَابٍ فِيهِ',
        note: '15 حروف: ت ث ج د ذ ر ز س ش ص ض ط ظ ف ق ك — جمع: "یَطْبَعُ ثُمَّ جَدَّ ذُو رِزْقٍ سَلَ شَطْ صَضَّ طَظَّ فَقَكَ"۔',
      },
    ],
  },
  {
    id: 'meem-sakinah',
    title: 'احکام المیم الساکنة',
    titleEn: 'Rules of Meem Sakinah',
    intro: 'میم ساکنہ (مْ) کے تین احکام ہیں۔ یہ احکام اس پر منحصر ہیں کہ میم ساکنہ کے بعد کون سا حرف آتا ہے۔',
    rules: [
      {
        name: '۱۔ إظهار شفوي (Izhar Shafawi)',
        description: 'اگر میم ساکنہ کے بعد "ب" اور "م" کے علاوہ کوئی اور حرف آ جائے، تو میم کو ظاہر پڑھیں — یعنی میم کی آواز کو واضح اداء کریں۔',
        example: 'أَلَمْ تَرَ، كَمْ تَرَكُوا، هُمْ فِيهَا',
        note: 'باقی تمام حروف (ب اور م کے سوا)۔ میم کو واضح پڑھیں۔',
      },
      {
        name: '۲۔ إدغام شفوي (Idgham Shafawi)',
        description: 'اگر میم ساکنہ کے بعد "م" آ جائے، تو دونوں میم کو مدغم کر کے غنّہ کے ساتھ پڑھیں۔ اسے "إدغام متماثلین صغیر" بھی کہتے ہیں۔',
        example: 'لَكُمْ مَا، وَلَكُمْ مِنْهَا، عَلَيْهِمْ مُّحْصَنَات',
        note: 'صرف ایک حرف: م۔ دونوں میم مل کر ایک میم بن جاتی ہیں، غنّہ کے ساتھ۔',
      },
      {
        name: '۳۔ إخفاء شفوي (Ikhfa Shafawi)',
        description: 'اگر میم ساکنہ کے بعد "ب" آ جائے، تو میم کو چھپا کر غنّہ کے ساتھ پڑھیں — ناک سے ہلکی آواز، ہونٹوں کو ہلکا سا بند رکھیں۔',
        example: 'وَهُمْ بِهِ، تَرْمِيهِمْ بِحِجَارَة، رَبُّهُمْ بِهِمْ',
        note: 'صرف ایک حرف: ب۔ میم کی آواز ناک سے، ہونٹوں میں ہلکا کھلن رکھیں۔',
      },
    ],
  },
  {
    id: 'madd',
    title: 'احکام المد',
    titleEn: 'Rules of Madd (Elongation)',
    intro: 'مدّ کا لفظی معنی کش دینا ہے۔ تجوید کی اصطلاح میں آواز کو کش دے کر پڑھنا مدّ کہلاتا ہے۔ مدّ کی دو بنیادی اقسام ہیں: مدّ طبعی اور مدّ فرعی۔',
    rules: [
      {
        name: 'مدّ طبيعي (Natural Madd)',
        description: 'جب مدّ کے حروف (ا، و، ی) اپنے قبل والے حرف کی حرکت کے مطابق آئیں اور ان کے بعد کوئی وجہ نہ ہو۔ اس کی مقدار 2 حرکت ہے۔',
        example: 'قَالَ، يُوحِي، يَقُولُ',
        note: '2 حرکت — یہ مدّ کی بنیادی اکائی ہے۔ ہر مدّ کا حساب اس کے مقابلے میں ہوتا ہے۔',
      },
      {
        name: 'مدّ متصل واجب (Madd Muttasil)',
        description: 'جب مدّ کے حرف کے بعد ایک ہی کلمے میں ہمزہ آ جائے۔ اس کی مقدار 4 یا 5 حرکت ہے۔ یہ واجب ہے۔',
        example: 'جَاءَ، سُوءَ، شَاءَ، أُولَائِكَ',
        note: '4-5 حرکت۔ ہمزہ اور مدّ کا حرف ایک ہی کلمے میں ہوں۔',
      },
      {
        name: 'مدّ منفصل جائز (Madd Munfasil)',
        description: 'جب مدّ کے حرف کے بعد ہمزہ دوسرے کلمے میں آ جائے۔ اس کی مقدار 4 یا 5 حرکت ہے۔ یہ جائز (مختار) ہے۔',
        example: 'إِنَّا أَعْطَيْنَاكَ، يَا أَيُّهَا، تُوبُوا إِلَى اللَّهِ',
        note: '4-5 حرکت۔ ہمزہ اور مدّ کا حرف الگ الگ کلموں میں ہوں۔',
      },
      {
        name: 'مدّ عارض (Madd \'Arid)',
        description: 'جب کسی کلمے کے آخر میں مدّ کا حرف ہو اور اس کے بعد وقف (رک جانے) کی وجہ سے مدّ ہو۔ اس کی مقدار 2، 4، یا 6 حرکت ہو سکتی ہے۔',
        example: 'الْعَالَمِينَ (وقف پر)، مَالِكَ (وقف پر)، رَحِيمٍ (وقف پر)',
        note: '2/4/6 حرکت — وقف کی صورت میں۔ اگر وقف نہ کریں تو مدّ نہیں ہے۔',
      },
      {
        name: 'مدّ لازم (Madd Lazim)',
        description: 'جب مدّ کے حرف کے بعد ساکن حرف (تشدید یا غیر تشدید) ایک ہی کلمے میں آ جائے۔ اس کی مقدار 6 حرکت (لازم) ہے۔ یہ سب سے طویل مدّ ہے۔',
        example: 'الْحَاقَّةُ، وَلَا الضَّالِّينَ، طس (طاسین)',
        note: '6 حرکت — یہ مدّ ہمیشہ 6 حرکت کا ہوتا ہے، کم یا زیادہ نہیں۔',
      },
      {
        name: 'مدّ بدل (Madd Badal)',
        description: 'جب ہمزہ پر ہو اور اس کے بعد مدّ کا حرف آ جائے (بدل کی صورت میں)۔ اس کی مقدار 2 حرکت ہے۔ یہ مدّ طبعی کے حکم میں ہے۔',
        example: 'إِيمَانًا (اِيمَانًا)، أُوتُوا (اُوتُوا)',
        note: '2 حرکت۔ ہمزہ کی جگہ مدّ کا حرف آ گیا ہو۔',
      },
    ],
  },
  {
    id: 'qalqalah',
    title: 'القلقلة',
    titleEn: 'Qalqalah — The Echo Sound',
    intro: 'قلقلہ کا لفظی معنی ہلانا یا باؤنڈ کرنا ہے۔ تجوید میں ساکن حرف پر ایک مخصوص باؤنڈ نما آواز کو قلقلہ کہتے ہیں۔',
    rules: [
      {
        name: 'حروف قلقلہ',
        description: 'قلقلہ کے پانچ حروف ہیں: ق ط ب ج د — جمع: "قطب جد"۔ یہ حروف ساکن ہونے پر قلقلہ کریں گے۔',
        example: 'خَلَقْ، طَارِقْ، عَبْدُ، فَجْرْ، قُلْ',
        note: '5 حروف: ق ط ب ج د۔ ان کے علاوہ کسی حرف میں قلقلہ نہیں۔',
      },
      {
        name: 'درجات قلقلہ',
        description: 'قلقلہ کے دو درجے ہیں:\n\n۱۔ قلقلة کبری (بڑی): جب قلقلہ والا حرف شدّہ (مشدد) پر ہو۔ سب سے زیادہ قلقلہ۔ مثلاً: الحقّ، تبّ\n۲۔ قلقلة صغری (چھوٹی): جب قلقلہ والا حرف ساکن ہو (بغیر شدّہ)۔ عام قلقلہ۔ مثلاً: خلقْ، عبدْ',
        example: 'كبری: الحَقَّ، تَبَّ، أَزْوَاجًا | صغری: خَلَقْ، عَبْدُ، قُلْ',
        note: 'شدّہ پر قلقلہ زیادہ، ساکن پر کم۔ وسطِ کلمہ میں متوسط، آخرِ کلمہ میں نمایاں۔',
      },
    ],
  },
  {
    id: 'idgham-general',
    title: 'الإدغام (عام احکام)',
    titleEn: 'General Idgham Rules',
    intro: 'إدغام کا لفظی معنی مدغم کرنا ہے۔ تجوید میں دو متصل حروف میں پہلے کو دوسرے میں مدغم کرنا إدغام کہلاتا ہے۔ إدغام کی تین اقسام ہیں۔',
    rules: [
      {
        name: 'إدغام متماثلین (Same Letters)',
        description: 'جب دو ایک جیسے حروف متصل آ جائیں۔ پہلا ساکن، دوسرا متحرک۔ پہلا کو دوسرے میں مدغم کر دیں۔',
        example: 'وَقَّتُوا (وقتوا)، اضْرِبْ بَعْضًا، يَلْهَثْ ذَلِكَ',
        note: 'دونوں حروف یکساں ہوں۔ پہلے کو دوسرے میں گھلا دیں۔',
      },
      {
        name: 'إدغام متجانس (Same Makhraj, Different Letters)',
        description: 'جب دو حروف کا مخرج ایک ہو لیکن حروف مختلف ہوں۔ پہلا ساکن، دوسرا متحرک۔ پہلے کو دوسرے میں مدغم کر دیں۔',
        example: 'إِذْ ذَهَبَ، قُلْ رَبِّ، بَلْ لَا',
        note: 'مخرج ایک، حروف مختلف۔ مثلاً: د اور ت، ذ اور ث، ل اور ر۔',
      },
      {
        name: 'إدغام متقارب (Close Makhraj)',
        description: 'جب دو حروف کا مخرج قریب قریب ہو اور صفات میں فرق ہو۔ پہلا ساکن، دوسرا متحرک۔ پہلے کو دوسرے میں مدغم کر دیں۔',
        example: 'يَلْهَثْ ذَلِكَ (ل اور ث)، نَخْلُقْكُمْ',
        note: 'مخرج قریب، صفات مختلف۔ یہ کم ہوتا ہے۔',
      },
    ],
  },
  {
    id: 'waqf',
    title: 'الوقف والابتداء',
    titleEn: 'Rules of Stopping and Starting',
    intro: 'وقف کا لفظی معنی رکنا ہے۔ تلاوت کے دوران سانس لینے یا مطلب سمجھنے کے لیے رکنا وقف کہلاتا ہے۔ وقف کے درست ہونے پر مطلب بدل سکتا ہے، اس لیے وقف کے احکام جاننا ضروری ہے۔',
    rules: [
      {
        name: 'وقف تام (Complete Stop)',
        description: 'جب کسی جملے پر رکیں اور اگلے جملے سے کوئی تعلق نہ ہو۔ یہ بہترین وقف ہے۔ یہاں رکنا جائز ہے اور اسی جملے کا مطلب مکمل ہوتا ہے۔',
        example: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ — رَحْمَنِ رَحِيمِ',
        note: 'جملہ مکمل ہو، اگلے سے تعلق نہ ہو۔ یہاں رکنا بہترین۔',
      },
      {
        name: 'وقف حسن (Good Stop)',
        description: 'جب کسی جملے پر رکیں جو مطلب میں مکمل ہو لیکن اگلے جملے سے تعلق رکھتا ہو۔ یہاں رکنا جائز ہے لیکن بہتر ہے کہ رک کر اسی سے شروع کریں۔',
        example: 'مَالِكِ يَوْمِ الدِّينِ — إِيَّاكَ نَعْبُدُ',
        note: 'جملہ مکمل، اگلے سے تعلق۔ رک کر شروع کر سکتے ہیں۔',
      },
      {
        name: 'وقف قبیح (Bad Stop)',
        description: 'جب ایسے مقام پر رکیں جہاں مطلب مکمل نہ ہو یا مطلب بدل جائے۔ یہاں رکنا ناجائز ہے۔ اگر سانس کی ضرورت ہو تو تھوڑا آگے بڑھ کر رکیں۔',
        example: 'إِنَّ اللَّهَ لَا يَهْدِي (یہاں رکنا قبیح) — الْقَوْمَ الْفَاسِقِينَ',
        note: 'مطلب ادھورا یا بدل جائے۔ یہاں رکنا ممنوع۔',
      },
      {
        name: 'علامات الوقف (Stop Signs)',
        description: 'مصحف میں وقف کی علامات:\n\n• م (وقف لازم) — یہاں رکنا ضروری\n• قلی (وقف اولیٰ) — بہتر رکنا\n• لا (وقف نہ کریں) — یہاں رکنا ممنوع\n• ج (وقف جائز) — رک سکتے ہیں\n• صلی (وقف مفضل) — بہتر نہ رکنا\n• قف (وقف مرخص) — رک سکتے ہیں',
        example: 'الرَّحْمَٰنِ الرَّحِيمِ ۝ مَالِكِ يَوْمِ الدِّينِ',
        note: 'علامات کی پابندی کرنا ضروری ہے۔ غلط وقف مطلب بدل سکتا ہے۔',
      },
    ],
  },
];

// ───────── lib/arabicLearning.js ─────────
// Arabic learning utilities: basic words, color coding, and vocabulary categories.
// Merged from arabicBasics.js, arabicColors.js, and cognates.js for consolidation.

// === Basic Arabic words for pronunciation practice ===
export const arabicBasics = {
  letters: {
    title: 'حروفِ عربی', titleEn: 'Arabic Letters',
    words: ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي'],
  },
  shortWords: {
    title: 'مختصر الفاظ', titleEn: 'Short Words',
    words: ['مَاء', 'نُور', 'رَبّ', 'كِتَاب', 'بَيْت', 'يَوْم', 'لَيْل', 'قَلْب', 'سَمَاء', 'أَرْض', 'عِلْم', 'كَلِمَة', 'رَحْمَة', 'حَيَاة', 'مَوْت'],
  },
  commonQuranic: {
    title: 'قرآنی الفاظ', titleEn: 'Quranic Words',
    words: ['اللَّهُ', 'الرَّحْمَٰنِ', 'الرَّحِيمِ', 'مَالِكِ', 'نَعْبُدُ', 'نَسْتَعِينُ', 'اهْدِنَا', 'صِرَاطَ', 'الْمُسْتَقِيمَ', 'ضَالِّينَ', 'الْعَالَمِينَ'],
  },
  tajweedSounds: {
    title: 'تجویدی آوازیں', titleEn: 'Tajweed Sounds',
    words: ['قَلْقَلَة', 'مَدّ', 'إِدْغَام', 'إِظْهَار', 'إِخْفَاء', 'تَفْخِيم', 'تَرْقِيق', 'مَخْرَج', 'صِفَة'],
  },
};

export const allCategories = Object.keys(arabicBasics);

// === Arabic word color coding ===
export const CATEGORY_COLORS = {
  ism: { text: '#34D399', bg: '#126E51', border: '#0e5a44', label: 'اسم', labelEn: 'Noun' },
  harf: { text: '#FBBF24', bg: '#a67c52', border: '#8B5A2B', label: 'حرف', labelEn: 'Particle' },
  fail: { text: '#F59E0B', bg: '#8B5A2B', border: '#5e3d1c', label: 'فعل', labelEn: 'Verb' },
};

const HARF_SET = new Set([
  'من','في','الى','على','عن','مع','ب','ك','ل','و','ف','ثم','او','حتى',
  'اذا','ان','لا','لم','لن','قد','بل','اجل','كل','بعض','كذلك','كما','حيث',
  'عند','لدى','هؤلاء','ذلك','هذا','هذه','تلك','ما','هو','هي','هم','هن',
  'انت','انا','نحن','الذي','التي','الذين','اللاتي','الذی','التی','الذین',
  'كان','كانت','يكون','كانوا','ليكون','فكان','وكان','الكنت',
  'ان','انہ','وان','فان','لان','كان','کان','ہو','ہی','ہم',
]);

function stripDiacritics(text) {
  return (text || '')
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[ًٌٍَُِّْٰ]/g, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .trim();
}

export function detectCategory(arabic) {
  if (!arabic) return 'ism';
  const clean = stripDiacritics(arabic);
  if (!clean) return 'ism';
  if (HARF_SET.has(clean)) return 'harf';
  if (clean.startsWith('ال')) return 'ism';
  if (/^ف[a-z]/.test(clean)) return 'fail';
  return 'ism';
}

export function getWordColor(category) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.ism;
}

export function getWordTextColor(category) {
  return (CATEGORY_COLORS[category] || CATEGORY_COLORS.ism).text;
}

// === Cognates and Quranic vocabulary categories ===
export const COGNATES = [
  { ar: 'كِتَابٌ', ur: 'کتاب', en: 'Book' }, { ar: 'حَرَامٌ', ur: 'حرام', en: 'Forbidden' },
  { ar: 'حَلَالٌ', ur: 'حلال', en: 'Permissible' }, { ar: 'صِرَاطٌ', ur: 'صراط', en: 'Path' },
  { ar: 'ذِكْرٌ', ur: 'ذکر', en: 'Remembrance' }, { ar: 'بُهْتَانٌ', ur: 'بہتان', en: 'Slander' },
  { ar: 'بَلَاغٌ', ur: 'بلاغ', en: 'Message' }, { ar: 'عَدُوٌّ', ur: 'عدو', en: 'Enemy' },
  { ar: 'فَوْجٌ', ur: 'فوج', en: 'Army' }, { ar: 'غُلَامٌ', ur: 'غلام', en: 'Servant' },
  { ar: 'بَيَانٌ', ur: 'بیان', en: 'Explanation' }, { ar: 'سِحْرٌ', ur: 'سحر', en: 'Magic' },
  { ar: 'لِسَانٌ', ur: 'لسان', en: 'Tongue' }, { ar: 'إِفْكٌ', ur: 'افک', en: 'Lie' },
  { ar: 'هُدًى', ur: 'ہدایت', en: 'Guidance' }, { ar: 'نَذِيرٌ', ur: 'نذیر', en: 'Warner' },
  { ar: 'يَوْمٌ', ur: 'یوم', en: 'Day' }, { ar: 'شَيْءٌ', ur: 'شے', en: 'Thing' },
  { ar: 'مِلْحٌ', ur: 'ملح', en: 'Salt' }, { ar: 'آيَةٌ', ur: 'آیت', en: 'Sign / Verse' },
  { ar: 'جَنَّةٌ', ur: 'جنت', en: 'Paradise' }, { ar: 'تَذْكِرَةٌ', ur: 'تذکرہ', en: 'Reminder' },
  { ar: 'سُورَةٌ', ur: 'سورت', en: 'Chapter' }, { ar: 'جَهَنَّمُ', ur: 'جہنم', en: 'Hell' },
  { ar: 'أُمَّةٌ', ur: 'امت', en: 'Nation' }, { ar: 'نِعْمَةٌ', ur: 'نعمت', en: 'Blessing' },
  { ar: 'آيَاتٌ', ur: 'آیات', en: 'Signs / Verses' }, { ar: 'الْعَالَمِينَ', ur: 'عالمین', en: 'Worlds' },
  { ar: 'الْكَلَامُ', ur: 'کلام', en: 'Speech' }, { ar: 'النَّاسِ', ur: 'ناس', en: 'People / Mankind' },
  { ar: 'عِلْمٌ', ur: 'علم', en: 'Knowledge' }, { ar: 'نُورٌ', ur: 'نور', en: 'Light' },
  { ar: 'سَلَامٌ', ur: 'سلام', en: 'Peace' }, { ar: 'حَقٌّ', ur: 'حق', en: 'Truth' },
  { ar: 'عَدْلٌ', ur: 'عدل', en: 'Justice' }, { ar: 'إِيمَانٌ', ur: 'ایمان', en: 'Faith' },
  { ar: 'صَبْرٌ', ur: 'صبر', en: 'Patience' }, { ar: 'شُكْرٌ', ur: 'شکر', en: 'Gratitude' },
  { ar: 'حِكْمَةٌ', ur: 'حکمت', en: 'Wisdom' }, { ar: 'رَحْمَةٌ', ur: 'رحمت', en: 'Mercy' },
  { ar: 'فِكْرٌ', ur: 'فکر', en: 'Thought' }, { ar: 'رَسُولٌ', ur: 'رسول', en: 'Messenger' },
  { ar: 'نَبِيٌّ', ur: 'نبی', en: 'Prophet' }, { ar: 'كَلِمَةٌ', ur: 'کلمہ', en: 'Word' },
  { ar: 'قُرْآنٌ', ur: 'قرآن', en: 'Quran' }, { ar: 'إِسْلَامٌ', ur: 'اسلام', en: 'Islam' },
  { ar: 'إِنْسَانٌ', ur: 'انسان', en: 'Human' }, { ar: 'جَزَاءٌ', ur: 'جزا', en: 'Reward' },
  { ar: 'صَلَاةٌ', ur: 'صلاۃ', en: 'Prayer' }, { ar: 'زَكَاةٌ', ur: 'زکوٰۃ', en: 'Charity' },
  { ar: 'صَوْمٌ', ur: 'صوم', en: 'Fasting' }, { ar: 'حَجٌّ', ur: 'حج', en: 'Pilgrimage' },
  { ar: 'تَوْبَةٌ', ur: 'توبہ', en: 'Repentance' }, { ar: 'غَفُورٌ', ur: 'غفور', en: 'Forgiving' },
  { ar: 'رَحِيمٌ', ur: 'رحیم', en: 'Merciful' }, { ar: 'كَرِيمٌ', ur: 'کریم', en: 'Generous' },
  { ar: 'عَظِيمٌ', ur: 'عظیم', en: 'Great' }, { ar: 'حَكِيمٌ', ur: 'حکیم', en: 'Wise' },
  { ar: 'قَدِيرٌ', ur: 'قدیر', en: 'Powerful' }, { ar: 'سَمِيعٌ', ur: 'سمیع', en: 'Hearing' },
  { ar: 'بَصِيرٌ', ur: 'بصیر', en: 'Seeing' }, { ar: 'عَلِيمٌ', ur: 'علیم', en: 'Knowing' },
  { ar: 'كَافِرٌ', ur: 'کافر', en: 'Disbeliever' }, { ar: 'حَيَاةٌ', ur: 'حیات', en: 'Life' },
  { ar: 'حِسَابٌ', ur: 'حساب', en: 'Reckoning' }, { ar: 'مِيزَانٌ', ur: 'میزان', en: 'Scale / Balance' },
  { ar: 'وَلِيٌّ', ur: 'ولی', en: 'Guardian / Ally' }, { ar: 'صَدِيقٌ', ur: 'صدِیق', en: 'Friend' },
  { ar: 'جَارٌ', ur: 'جار', en: 'Neighbor' }, { ar: 'غَنِيٌّ', ur: 'غنی', en: 'Rich' },
  { ar: 'فَقِيرٌ', ur: 'فقِیر', en: 'Poor' }, { ar: 'مَالِكٌ', ur: 'مالِک', en: 'Owner / King' },
];

export const FREQUENT_WORDS = [
  { ar: 'اللَّهُ', ur: 'اللہ', en: 'Allah', count: '~2699' }, { ar: 'رَبٌّ', ur: 'رب', en: 'Lord', count: '~980' },
  { ar: 'النَّاسِ', ur: 'ناس', en: 'People', count: '~240' }, { ar: 'يَوْمٌ', ur: 'یوم', en: 'Day', count: '~230' },
  { ar: 'السَّمَاءُ', ur: 'آسمان', en: 'Sky / Heaven', count: '~320' }, { ar: 'الْأَرْضُ', ur: 'زمین', en: 'Earth', count: '~450' },
  { ar: 'آيَاتٌ', ur: 'آیات', en: 'Signs', count: '~190' }, { ar: 'كِتَابٌ', ur: 'کتاب', en: 'Book', count: '~230' },
  { ar: 'إِيمَانٌ', ur: 'ایمان', en: 'Faith', count: '~45' }, { ar: 'كُفْرٌ', ur: 'کفر', en: 'Disbelief', count: '~525' },
  { ar: 'نُورٌ', ur: 'نور', en: 'Light', count: '~49' }, { ar: 'حَقٌّ', ur: 'حق', en: 'Truth', count: '~287' },
  { ar: 'بَاطِلٌ', ur: 'باطل', en: 'Falsehood', count: '~240' }, { ar: 'رَحْمَةٌ', ur: 'رحمت', en: 'Mercy', count: '~340' },
  { ar: 'عِلْمٌ', ur: 'علم', en: 'Knowledge', count: '~750' }, { ar: 'نَبِيٌّ', ur: 'نبی', en: 'Prophet', count: '~75' },
  { ar: 'رَسُولٌ', ur: 'رسول', en: 'Messenger', count: '~330' }, { ar: 'صَلَاةٌ', ur: 'صلاۃ', en: 'Prayer', count: '~83' },
  { ar: 'زَكَاةٌ', ur: 'زکوٰۃ', en: 'Charity', count: '~59' }, { ar: 'جَنَّةٌ', ur: 'جنت', en: 'Paradise', count: '~147' },
  { ar: 'جَهَنَّمُ', ur: 'جہنم', en: 'Hell', count: '~77' }, { ar: 'ذَنْبٌ', ur: 'گناہ', en: 'Sin', count: '~140' },
  { ar: 'تَوْبَةٌ', ur: 'توبہ', en: 'Repentance', count: '~87' }, { ar: 'شَيْطَانٌ', ur: 'شیطان', en: 'Satan', count: '~88' },
  { ar: 'مَلَائِكَةٌ', ur: 'فرشتے', en: 'Angels', count: '~88' }, { ar: 'قُرْآنٌ', ur: 'قرآن', en: 'Quran', count: '~70' },
  { ar: 'إِسْلَامٌ', ur: 'اسلام', en: 'Islam', count: '~8' }, { ar: 'حَلَالٌ', ur: 'حلال', en: 'Permissible', count: '~7' },
  { ar: 'حَرَامٌ', ur: 'حرام', en: 'Forbidden', count: '~7' }, { ar: 'صَدَقَةٌ', ur: 'صدقہ', en: 'Charity', count: '~28' },
];

export const RARE_WORDS = [
  { ar: 'بُهْتَانٌ', ur: 'بہتان', en: 'Slander', count: '1' }, { ar: 'عَذْبٌ', ur: 'عذب', en: 'Sweet', count: '1' },
  { ar: 'نَاقَةٌ', ur: 'اونٹنی', en: 'She-camel', count: '2' }, { ar: 'عَادٌ', ur: 'عاد', en: 'Aad (nation)', count: '1' },
  { ar: 'عُقْبَى', ur: 'عاقبت', en: 'End result', count: '2' }, { ar: 'إِفْكٌ', ur: 'افک', en: 'Lie', count: '4' },
  { ar: 'غُلَامٌ', ur: 'غلام', en: 'Servant boy', count: '3' }, { ar: 'سِحْرٌ', ur: 'سحر', en: 'Magic', count: '4' },
  { ar: 'بَلَاغٌ', ur: 'بلاغ', en: 'Message / Reach', count: '2' }, { ar: 'فَوْجٌ', ur: 'فوج', en: 'Army group', count: '4' },
  { ar: 'عَدُوٌّ', ur: 'عدو', en: 'Enemy', count: '4' }, { ar: 'تَذْكِرَةٌ', ur: 'تذکرہ', en: 'Reminder', count: '3' },
  { ar: 'مِلْحٌ', ur: 'ملح', en: 'Salt', count: '1' }, { ar: 'سُورَةٌ', ur: 'سورت', en: 'Chapter', count: '1' },
  { ar: 'عَشَرَةٌ', ur: 'عشرہ', en: 'Ten', count: '2' },
];

export const COMPOUND_WORDS = [
  { parts: ['عَبْدٌ', 'اللَّهِ'], compound: 'عَبْدُ اللَّهِ', ur: 'عبداللہ', en: 'Servant of Allah' },
  { parts: ['رَسُولٌ', 'اللَّهِ'], compound: 'رَسُولُ اللَّهِ', ur: 'رسول اللہ', en: 'Messenger of Allah' },
  { parts: ['دَارٌ', 'السَّلَامِ'], compound: 'دَارُ السَّلَامِ', ur: 'دار السلام', en: 'Abode of Peace' },
  { parts: ['أَهْلٌ', 'كِتَابٍ'], compound: 'أَهْلُ الْكِتَابِ', ur: 'اہل کتاب', en: 'People of the Book' },
  { parts: ['أَهْلٌ', 'إِيمَانٍ'], compound: 'أَهْلُ الْإِيمَانِ', ur: 'اہل ایمان', en: 'People of Faith' },
  { parts: ['بَيْتٌ', 'اللَّهِ'], compound: 'بَيْتُ اللَّهِ', ur: 'بیت اللہ', en: 'House of Allah' },
  { parts: ['نَارٌ', 'جَهَنَّمَ'], compound: 'نَارُ جَهَنَّمَ', ur: 'نار جہنم', en: 'Fire of Hell' },
  { parts: ['يَوْمٌ', 'دِينٍ'], compound: 'يَوْمُ الدِّينِ', ur: 'یوم دین', en: 'Day of Judgment' },
  { parts: ['يَوْمٌ', 'قِيَامَةٍ'], compound: 'يَوْمُ الْقِيَامَةِ', ur: 'یوم قیامت', en: 'Day of Resurrection' },
  { parts: ['صَرَاطٌ', 'مُسْتَقِيمٍ'], compound: 'صِرَاطَ الْمُسْتَقِيمِ', ur: 'صراط مستقیم', en: 'Straight Path' },
  { parts: ['رَبُّ', 'عَالَمِينَ'], compound: 'رَبُّ الْعَالَمِينَ', ur: 'رب عالمین', en: 'Lord of the Worlds' },
  { parts: ['مَلِكٌ', 'نَاسِ'], compound: 'مَلِكُ النَّاسِ', ur: 'بادشاہ ناس', en: 'King of Mankind' },
  { parts: ['إِلَهٌ', 'نَاسِ'], compound: 'إِلَهُ النَّاسِ', ur: 'معبود ناس', en: 'God of Mankind' },
  { parts: ['حَمْدٌ', 'لِلَّهِ'], compound: 'الْحَمْدُ لِلَّهِ', ur: 'الحمدللہ', en: 'All praise is for Allah' },
  { parts: ['سُبْحَانٌ', 'اللَّهِ'], compound: 'سُبْحَانَ اللَّهِ', ur: 'سبحان اللہ', en: 'Glory to Allah' },
  { parts: ['مَاشَاءَ', 'اللَّهُ'], compound: 'مَا شَاءَ اللَّهُ', ur: 'ما شاء اللہ', en: 'What Allah wills' },
  { parts: ['لَا', 'إِلَهَ', 'إِلَّا', 'اللَّهُ'], compound: 'لَا إِلَهَ إِلَّا اللَّهُ', ur: 'لا الہ الا اللہ', en: 'There is no god but Allah' },
  { parts: ['بِسْمِ', 'اللَّهِ'], compound: 'بِسْمِ اللَّهِ', ur: 'بسم اللہ', en: 'In the name of Allah' },
  { parts: ['الْحَمْدُ', 'لِرَبِّ', 'الْعَالَمِينَ'], compound: 'الْحَمْدُ لِرَبِّ الْعَالَمِينَ', ur: 'الحمد لرب عالمین', en: 'Praise to the Lord of the Worlds' },
];

export const ANTONYMS = [
  { ar: 'حَقٌّ', ur: 'حق', en: 'Truth', antAr: 'بَاطِلٌ', antUr: 'باطل', antEn: 'Falsehood' },
  { ar: 'حَلَالٌ', ur: 'حلال', en: 'Permissible', antAr: 'حَرَامٌ', antUr: 'حرام', antEn: 'Forbidden' },
  { ar: 'إِيمَانٌ', ur: 'ایمان', en: 'Faith', antAr: 'كُفْرٌ', antUr: 'کفر', antEn: 'Disbelief' },
  { ar: 'نُورٌ', ur: 'نور', en: 'Light', antAr: 'ظُلْمَةٌ', antUr: 'ظلمت', antEn: 'Darkness' },
  { ar: 'جَنَّةٌ', ur: 'جنت', en: 'Paradise', antAr: 'جَهَنَّمُ', antUr: 'جہنم', antEn: 'Hell' },
  { ar: 'حَيَاةٌ', ur: 'حیات', en: 'Life', antAr: 'مَوْتٌ', antUr: 'موت', antEn: 'Death' },
  { ar: 'غَنِيٌّ', ur: 'غنی', en: 'Rich', antAr: 'فَقِيرٌ', antUr: 'فقیر', antEn: 'Poor' },
  { ar: 'عَدْلٌ', ur: 'عدل', en: 'Justice', antAr: 'ظُلْمٌ', antUr: 'ظلم', antEn: 'Oppression' },
  { ar: 'شُكْرٌ', ur: 'شکر', en: 'Gratitude', antAr: 'كُفْرَانٌ', antUr: 'کفران', antEn: 'Ingratitude' },
  { ar: 'صَبْرٌ', ur: 'صبر', en: 'Patience', antAr: 'جَزَعٌ', antUr: 'جزع', antEn: 'Impatience' },
  { ar: 'عِلْمٌ', ur: 'علم', en: 'Knowledge', antAr: 'جَهْلٌ', antUr: 'جاہل', antEn: 'Ignorance' },
  { ar: 'سَلَامٌ', ur: 'سلام', en: 'Peace', antAr: 'حَرْبٌ', antUr: 'جنگ', antEn: 'War' },
  { ar: 'خَيْرٌ', ur: 'خیر', en: 'Good', antAr: 'شَرٌّ', antUr: 'شر', antEn: 'Evil' },
  { ar: 'دُنْيَا', ur: 'دنیا', en: 'World', antAr: 'آخِرَةٌ', antUr: 'آخرت', antEn: 'Hereafter' },
  { ar: 'مُؤْمِنٌ', ur: 'مومن', en: 'Believer', antAr: 'كَافِرٌ', antUr: 'کافر', antEn: 'Disbeliever' },
  { ar: 'طَاعَةٌ', ur: 'اطاعت', en: 'Obedience', antAr: 'مَعْصِيَةٌ', antUr: 'معصیت', antEn: 'Disobedience' },
  { ar: 'رَحْمَةٌ', ur: 'رحمت', en: 'Mercy', antAr: 'غَضَبٌ', antUr: 'غضب', antEn: 'Wrath' },
];

export const SYNONYMS = [
  { words: [{ ar: 'جَنَّةٌ', ur: 'جنت' }, { ar: 'فِرْدَوْسٌ', ur: 'فردوس' }, { ar: 'دَارُ السَّلَامِ', ur: 'دار السلام' }], en: 'Paradise' },
  { words: [{ ar: 'جَهَنَّمُ', ur: 'جہنم' }, { ar: 'النَّارُ', ur: 'نار' }, { ar: 'سَقَرُ', ur: 'سقر' }, { ar: 'جَحِيمٌ', ur: 'جحیم' }], en: 'Hell' },
  { words: [{ ar: 'اللَّهُ', ur: 'اللہ' }, { ar: 'الرَّبُّ', ur: 'رب' }, { ar: 'الْخَالِقُ', ur: 'خالق' }, { ar: 'الْمَلِكُ', ur: 'مالک' }], en: 'Allah / Lord / Creator' },
  { words: [{ ar: 'رَسُولٌ', ur: 'رسول' }, { ar: 'نَبِيٌّ', ur: 'نبی' }, { ar: 'رَسِيلٌ', ur: 'رسیل' }], en: 'Messenger / Prophet' },
  { words: [{ ar: 'كِتَابٌ', ur: 'کتاب' }, { ar: 'قُرْآنٌ', ur: 'قرآن' }, { ar: 'ذِكْرٌ', ur: 'ذکر' }, { ar: 'صُحُفٌ', ur: 'صحف' }], en: 'Book / Scripture' },
  { words: [{ ar: 'ذَنْبٌ', ur: 'گناہ' }, { ar: 'خَطِيئَةٌ', ur: 'خطا' }, { ar: 'إِثْمٌ', ur: 'اثم' }], en: 'Sin' },
  { words: [{ ar: 'صَدَقَةٌ', ur: 'صدقہ' }, { ar: 'زَكَاةٌ', ur: 'زکوٰۃ' }, { ar: 'إِحْسَانٌ', ur: 'احسان' }], en: 'Charity' },
  { words: [{ ar: 'خَوْفٌ', ur: 'خوف' }, { ar: 'خَشْيَةٌ', ur: 'خشیت' }, { ar: 'تَقْوَى', ur: 'تقویٰ' }], en: 'Fear / Awe of Allah' },
];

export const VOCAB_CATEGORIES = [
  { id: 'cognates', title: 'مشترک الفاظ', titleEn: 'Cognates (Same in Arabic & Urdu)', data: COGNATES, type: 'cognate' },
  { id: 'frequent', title: 'بار بار آنے والے الفاظ', titleEn: 'Frequent Quranic Words', data: FREQUENT_WORDS, type: 'frequency' },
  { id: 'rare', title: 'کم آنے والے الفاظ', titleEn: 'Rare Quranic Words', data: RARE_WORDS, type: 'frequency' },
  { id: 'compound', title: 'مرکب الفاظ', titleEn: 'Compound Words', data: COMPOUND_WORDS, type: 'compound' },
  { id: 'antonyms', title: 'متضاد الفاظ', titleEn: 'Antonyms (Opposites)', data: ANTONYMS, type: 'antonym' },
  { id: 'synonyms', title: 'مترادف الفاظ', titleEn: 'Synonyms (Similar Meaning)', data: SYNONYMS, type: 'synonym' },
];

// === Quranic vocabulary lessons — demonstrative pronouns and Quranic sentences ===
export const VOCAB_LESSONS = [
  {
    id: 'haza', particle: 'هَذَا', particleUr: 'یہ (قریبی مذکر)',
    rule: 'قریبی مذکر چیزوں کی طرف اشارہ کے لیے "هَذَا" استعمال ہوتا ہے۔ اب ان قرآنی جملوں کا ترجمہ خود کریں۔',
    examples: [
      { word: 'كِتَابٌ', sentence: 'هَذَا كِتَابٌ', translation: 'یہ کتاب ہے۔' },
      { word: 'حَرَامٌ', sentence: 'هَذَا حَرَامٌ', translation: 'یہ حرام ہے۔' },
      { word: 'صِرَاطٌ', sentence: 'هَذَا صِرَاطٌ', translation: 'یہ صراط (راستہ) ہے۔' },
      { word: 'ذِكْرٌ', sentence: 'وَهَذَا ذِكْرٌ', translation: 'اور یہ ذکر ہے۔' },
      { word: 'بُهْتَانٌ', sentence: 'هَذَا بُهْتَانٌ', translation: 'یہ بہتان (جھوٹ) ہے۔' },
      { word: 'بَلَاغٌ', sentence: 'هَذَا بَلَاغٌ', translation: 'یہ بلاغ (پیغام) ہے۔' },
      { word: 'عَدُوٌّ', sentence: 'هَذَا عَدُوٌّ', translation: 'یہ عدو (دشمن) ہے۔' },
      { word: 'فَوْجٌ', sentence: 'هَذَا فَوْجٌ', translation: 'یہ فوج (لشکر) ہے۔' },
      { word: 'غُلَامٌ', sentence: 'هَذَا غُلَامٌ', translation: 'یہ غلام (بچہ) ہے۔' },
      { word: 'عَذْبٌ', sentence: 'هَذَا عَذْبٌ', translation: 'یہ عذب (میٹھا) ہے۔' },
      { word: 'بَيَانٌ', sentence: 'هَذَا بَيَانٌ', translation: 'یہ بیان ہے۔' },
      { word: 'حَلَالٌ', sentence: 'هَذَا حَلَالٌ', translation: 'یہ حلال ہے۔' },
      { word: 'سِحْرٌ', sentence: 'هَذَا سِحْرٌ', translation: 'یہ سحر ہے۔' },
      { word: 'لِسَانٌ', sentence: 'وَهَذَا لِسَانٌ', translation: 'اور یہ لسان (زبان) ہے۔' },
      { word: 'إِفْكٌ', sentence: 'هَذَا إِفْكٌ', translation: 'یہ افک (جھوٹ) ہے۔' },
      { word: 'هُدًى', sentence: 'هَذَا هُدًى', translation: 'یہ ہدایت ہے۔' },
      { word: 'نَذِيرٌ', sentence: 'هَذَا نَذِيرٌ', translation: 'یہ نذیر (ڈرانے والا) ہے۔' },
      { word: 'يَوْمٌ', sentence: 'هَذَا يَوْمٌ', translation: 'یہ یوم (دن) ہے۔' },
      { word: 'شَيْءٌ', sentence: 'هَذَا شَيْءٌ', translation: 'یہ شے (چیز) ہے۔' },
      { word: 'مِلْحٌ', sentence: 'هَذَا مِلْحٌ', translation: 'یہ ملح (نمکین) ہے۔' },
    ],
  },
  {
    id: 'hazihi', particle: 'هَذِهِ', particleUr: 'یہ (قریبی مؤنث)',
    rule: 'قریبی مؤنث چیزوں کی طرف اشارہ کے لیے "هَذِهِ" استعمال ہوتا ہے۔ عام طور پر ة (ۃ) پر ختم ہونے والے الفاظ مؤنث ہوتے ہیں۔',
    examples: [
      { word: 'آيَةٌ', sentence: 'هَذِهِ آيَةٌ', translation: 'یہ آیت ہے۔' },
      { word: 'جَنَّةٌ', sentence: 'هَذِهِ جَنَّةٌ', translation: 'یہ جنت ہے۔' },
      { word: 'تَذْكِرَةٌ', sentence: 'هَذِهِ تَذْكِرَةٌ', translation: 'یہ تذکرہ (یاد دہانی) ہے۔' },
      { word: 'سُورَةٌ', sentence: 'هَذِهِ سُورَةٌ', translation: 'یہ سورت ہے۔' },
      { word: 'جَهَنَّمُ', sentence: 'هَذِهِ جَهَنَّمُ', translation: 'یہ جہنم ہے۔' },
      { word: 'نَاقَةٌ', sentence: 'هَذِهِ نَاقَةٌ', translation: 'یہ اونٹنی ہے۔' },
    ],
  },
  {
    id: 'tilka', particle: 'تِلْكَ', particleUr: 'وہ (دور مؤنث)',
    rule: 'دور مؤنث چیزوں کی طرف اشارہ کے لیے "تِلْكَ" استعمال ہوتا ہے۔',
    examples: [
      { word: 'أُمَّةٌ', sentence: 'تِلْكَ أُمَّةٌ', translation: 'وہ امت ہے۔' },
      { word: 'عَادٌ', sentence: 'تِلْكَ عَادٌ', translation: 'وہ عاد (قوم) ہے۔' },
      { word: 'عُقْبَى', sentence: 'تِلْكَ عُقْبَى', translation: 'وہ عاقبت (انجام) ہے۔' },
      { word: 'نِعْمَةٌ', sentence: 'تِلْكَ نِعْمَةٌ', translation: 'وہ نعمت ہے۔' },
      { word: 'عَشَرَةٌ', sentence: 'تِلْكَ عَشَرَةٌ', translation: 'وہ دس ہے۔' },
      { word: 'آيَاتٌ', sentence: 'تِلْكَ آيَاتٌ', translation: 'وہ آیات (نشانیاں) ہیں۔' },
    ],
  },
  {
    id: 'dhalika', particle: 'ذَلِكَ', particleUr: 'وہ (دور مذکر)',
    rule: 'دور مذکر چیزوں کی طرف اشارہ کے لیے "ذَلِكَ" استعمال ہوتا ہے۔',
    examples: [
      { word: 'كِتَابٌ', sentence: 'ذَلِكَ الْكِتَابُ', translation: 'وہ کتاب ہے۔' },
      { word: 'يَوْمٌ', sentence: 'ذَلِكَ الْيَوْمُ', translation: 'وہ دن ہے۔' },
      { word: 'حَقٌّ', sentence: 'ذَلِكَ الْحَقُّ', translation: 'وہ حق ہے۔' },
      { word: 'فَوْزٌ', sentence: 'ذَلِكَ الْفَوْزُ', translation: 'وہ کامیابی ہے۔' },
    ],
  },
  {
    id: 'hadha-list', particle: 'هَؤُلَاءِ', particleUr: 'یہ (جمع قریب)',
    rule: 'قریبی جمع (مذکر و مؤنث) کی طرف اشارہ کے لیے "هَؤُلَاءِ" استعمال ہوتا ہے۔',
    examples: [
      { word: 'كُتُبٌ', sentence: 'هَؤُلَاءِ كُتُبٌ', translation: 'یہ کتابیں ہیں۔' },
      { word: 'نَاسٌ', sentence: 'هَؤُلَاءِ نَاسٌ', translation: 'یہ لوگ ہیں۔' },
      { word: 'آيَاتٌ', sentence: 'هَؤُلَاءِ آيَاتٌ', translation: 'یہ آیات ہیں۔' },
      { word: 'رُسُلٌ', sentence: 'هَؤُلَاءِ رُسُلٌ', translation: 'یہ رسول ہیں۔' },
    ],
  },
  {
    id: 'ulaika', particle: 'أُولَئِكَ', particleUr: 'وہ (جمع بعید)',
    rule: 'دور جمع (مذکر و مؤنث) کی طرف اشارہ کے لیے "أُولَئِكَ" استعمال ہوتا ہے۔',
    examples: [
      { word: 'مُؤْمِنُونَ', sentence: 'أُولَئِكَ الْمُؤْمِنُونَ', translation: 'وہ مومن ہیں۔' },
      { word: 'كَافِرُونَ', sentence: 'أُولَئِكَ الْكَافِرُونَ', translation: 'وہ کافر ہیں۔' },
      { word: 'ظَالِمُونَ', sentence: 'أُولَئِكَ الظَّالِمُونَ', translation: 'وہ ظالم ہیں۔' },
      { word: 'فَاسِقُونَ', sentence: 'أُولَئِكَ الْفَاسِقُونَ', translation: 'وہ فاسق ہیں۔' },
    ],
  },
];

// ───────── lib/mergedQaida.js ─────────
// قاعدہ — Merged unified Qaida lessons
// A single sequential curriculum combining the best of both traditional methods.
// Duplicates removed; Quranic words enriched with Urdu meanings.

export const mergedQaida = [
  {
    id: 1,
    title: 'حروفِ مفردة',
    titleEn: 'Single Letters',
    instruction: 'ہر حرف کو اس کے مخرج سے پہچان کر پڑھیں۔',
    rows: [
      ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ'],
      ['د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص'],
      ['ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق'],
      ['ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي'],
    ],
  },
  {
    id: 2,
    title: 'حروفِ مرکبة',
    titleEn: 'Compound Letters',
    instruction: 'دو حروف کو مل کر پڑھیں — حرف اور الف کا امتزاج۔',
    rows: [
      ['با', 'تا', 'ثا', 'جا', 'حا', 'خا', 'دا'],
      ['ذا', 'را', 'زا', 'سا', 'شا', 'صا', 'ضا'],
      ['طا', 'ظا', 'عا', 'غا', 'فا', 'قا', 'كا'],
      ['لا', 'ما', 'نا', 'ها', 'وا', 'يا', 'ـَـ'],
    ],
  },
  {
    id: 3,
    title: 'فتحہ',
    titleEn: 'Fatha (ـَ)',
    instruction: 'فتحہ (ـَ) پر حرف کو اوپر کھینچ کر "ا" کی آواز سے پڑھیں۔',
    rows: [
      ['بَ', 'تَ', 'ثَ', 'جَ', 'حَ', 'خَ', 'دَ'],
      ['ذَ', 'رَ', 'زَ', 'سَ', 'شَ', 'صَ', 'ضَ'],
      ['طَ', 'ظَ', 'عَ', 'غَ', 'فَ', 'قَ', 'كَ'],
      ['لَ', 'مَ', 'نَ', 'هَ', 'وَ', 'يَ', 'ـَـ'],
    ],
  },
  {
    id: 4,
    title: 'کسرہ',
    titleEn: 'Kasra (ـِ)',
    instruction: 'کسرہ (ـِ) پر حرف کو نیچے کھینچ کر "اِ" کی آواز سے پڑھیں۔',
    rows: [
      ['بِ', 'تِ', 'ثِ', 'جِ', 'حِ', 'خِ', 'دِ'],
      ['ذِ', 'رِ', 'زِ', 'سِ', 'شِ', 'صِ', 'ضِ'],
      ['طِ', 'ظِ', 'عِ', 'غِ', 'فِ', 'قِ', 'كِ'],
      ['لِ', 'مِ', 'نِ', 'هِ', 'وِ', 'يِ', 'ـِـ'],
    ],
  },
  {
    id: 5,
    title: 'ضمہ',
    titleEn: 'Damma (ـُ)',
    instruction: 'ضمہ (ـُ) پر ہونٹ گول کر کے "اُ" کی آواز سے پڑھیں۔',
    rows: [
      ['بُ', 'تُ', 'ثُ', 'جُ', 'حُ', 'خُ', 'دُ'],
      ['ذُ', 'رُ', 'زُ', 'سُ', 'شُ', 'صُ', 'ضُ'],
      ['طُ', 'ظُ', 'عُ', 'غُ', 'فُ', 'قُ', 'كُ'],
      ['لُ', 'مُ', 'نُ', 'هُ', 'وُ', 'يُ', 'ـُـ'],
    ],
  },
  {
    id: 6,
    title: 'تنوین',
    titleEn: 'Tanwin (ـً ـٍ ـٌ)',
    instruction: 'تنوین پر ناک سے "ن" کی آواز — فتحہ، کسرہ، ضمہ کے ساتھ۔',
    rows: [
      ['بً', 'تً', 'ثً', 'جً', 'حً', 'خً', 'دً'],
      ['بٍ', 'تٍ', 'ثٍ', 'جٍ', 'حٍ', 'خٍ', 'دٍ'],
      ['بٌ', 'تٌ', 'ثٌ', 'جٌ', 'حٌ', 'خٌ', 'دٌ'],
      ['كِتَابً', 'قَلَمٍ', 'بَابٌ', 'سَيْفً', 'نُورٍ', 'كَلْبٌ', 'جِدٌّ'],
    ],
  },
  {
    id: 7,
    title: 'سکون',
    titleEn: 'Sukun (ـْ)',
    instruction: 'سکون (ـْ) پر حرف کو بغیر حرکت پڑھیں — آواز روک کر۔',
    rows: [
      ['بْ', 'تْ', 'ثْ', 'جْ', 'حْ', 'خْ', 'دْ'],
      ['ذْ', 'رْ', 'زْ', 'سْ', 'شْ', 'صْ', 'ضْ'],
      ['طْ', 'ظْ', 'عْ', 'غْ', 'فْ', 'قْ', 'كْ'],
      ['خَلْق', 'عَلْم', 'كِتْب', 'سَجْد', 'حَلْق', 'قَلْب', 'نَصْر'],
    ],
  },
  {
    id: 8,
    title: 'شدّہ',
    titleEn: 'Shaddah (ـّ)',
    instruction: 'شدّہ (ـّ) پر حرف کو زور سے دہرا کر پڑھیں۔',
    rows: [
      ['بّ', 'تّ', 'ثّ', 'جّ', 'حّ', 'خّ', 'دّ'],
      ['ذّ', 'رّ', 'زّ', 'سّ', 'شّ', 'صّ', 'ضّ'],
      ['طّ', 'ظّ', 'عّ', 'غّ', 'فّ', 'قّ', 'كّ'],
      ['إِنَّ', 'أَنَّ', 'إِذَّ', 'أَمَّا', 'ثُمَّ', 'بَلَّ', 'كَلَّ'],
    ],
  },
  {
    id: 9,
    title: 'مشتمل حرکات',
    titleEn: 'Combined Movements',
    instruction: 'حرکات اور سکون کو مل کر پڑھیں۔',
    rows: [
      ['أَبْ', 'أَتْ', 'أَثْ', 'أَجْ', 'أَحْ', 'أَخْ', 'أَدْ'],
      ['أَبُ', 'أَتُ', 'أَثُ', 'أَجُ', 'أَحُ', 'أَخُ', 'أَدُ'],
      ['أَبِ', 'أَتِ', 'أَثِ', 'أَجِ', 'أَحِ', 'أَخِ', 'أَدِ'],
      ['إِبْ', 'إِتْ', 'إِثْ', 'إِجْ', 'إِحْ', 'إِخْ', 'إِدْ'],
    ],
  },
  {
    id: 10,
    title: 'مد: الف',
    titleEn: 'Madd with Alif',
    instruction: 'الف پر مد (کش) دو حرکت کے ساتھ پڑھیں۔',
    rows: [
      ['بَا', 'تَا', 'ثَا', 'جَا', 'حَا', 'خَا', 'دَا'],
      ['رَا', 'زَا', 'سَا', 'شَا', 'صَا', 'ضَا', 'طَا'],
      ['ظَا', 'عَا', 'غَا', 'فَا', 'قَا', 'كَا', 'لا'],
      ['مَا', 'نَا', 'هَا', 'وَا', 'يَا', 'ـَا', 'ـَا'],
    ],
  },
  {
    id: 11,
    title: 'مد: واؤ',
    titleEn: 'Madd with Waw',
    instruction: 'واؤ پر مد (کش) دو حرکت کے ساتھ پڑھیں۔',
    rows: [
      ['بُو', 'تُو', 'ثُو', 'جُو', 'حُو', 'خُو', 'دُو'],
      ['رُو', 'زُو', 'سُو', 'شُو', 'صُو', 'ضُو', 'طُو'],
      ['ظُو', 'عُو', 'غُو', 'فُو', 'قُو', 'كُو', 'لُو'],
      ['مُو', 'نُو', 'هُو', 'ـُو', 'ـُو', 'ـُو', 'ـُو'],
    ],
  },
  {
    id: 12,
    title: 'مد: یاء',
    titleEn: 'Madd with Yaa',
    instruction: 'یاء پر مد (کش) دو حرکت کے ساتھ پڑھیں۔',
    rows: [
      ['بِي', 'تِي', 'ثِي', 'جِي', 'حِي', 'خِي', 'دِي'],
      ['رِي', 'زِي', 'سِي', 'شِي', 'صِي', 'ضِي', 'طِي'],
      ['ظِي', 'عِي', 'غِي', 'فِي', 'قِي', 'كِي', 'لِي'],
      ['مِي', 'نِي', 'هِي', 'ـِي', 'ـِي', 'ـِي', 'ـِي'],
    ],
  },
  {
    id: 13,
    title: 'قلقلہ',
    titleEn: 'Qalqalah',
    instruction: 'قلقلہ والے حروف (ق ط ب ج د) پر باؤنڈ نما آواز۔',
    rows: [
      ['قَ', 'طَ', 'بَ', 'جَ', 'دَ', 'قْ', 'طْ'],
      ['بْ', 'جْ', 'دْ', 'قَقْ', 'طَطْ', 'بَبْ', 'جَجْ'],
      ['أَقْ', 'أَطْ', 'أَبْ', 'أَجْ', 'أَدْ', 'خَلَقْ', 'أَحَدْ'],
      ['صَدْ', 'فَجْ', 'طَبْ', 'قُلْ', 'دَقْ', 'بَطْ', 'جَدْ'],
    ],
  },
  {
    id: 14,
    title: 'نون ساکنہ',
    titleEn: 'Noon Sakinah',
    instruction: 'نون ساکنہ کے احکام: إظهار، إدغام، إقلاب، إخفاء۔',
    rows: [
      ['مِنْ', 'أَنْ', 'إِنْ', 'لَنْ', 'كَمْ', 'مَنْ', 'عَنْ'],
      ['مِنْهَ', 'مِنْهُ', 'مِنْهُمْ', 'مِنْكَ', 'مِنْكُمْ', 'مِنْكُمَا', 'مِنْهُنَّ'],
      ['مِنْ بَعْدِ', 'مِنْ رَّبِّ', 'مِنْ وَّالٍ', 'مِنْ يَّمِينٍ', 'مِنْ لَّدُنْ', 'مِنْ نُّورٍ', 'مِنْ مَّالٍ'],
      ['أَنْعَمْتَ', 'أَنْبِئْهُمْ', 'مِنْ خَلْفِ', 'مِنْ حَيْثُ', 'مِنْ عِلْمٍ', 'مِنْ غَيْرِ', 'مِنْ خَيْرٍ'],
    ],
  },
  {
    id: 15,
    title: 'میم ساکنہ',
    titleEn: 'Meem Sakinah',
    instruction: 'میم ساکنہ کے احکام: إظهار، إدغام، إخفاء۔',
    rows: [
      ['أَلَمْ', 'كَمْ', 'هُمْ', 'عَلَيْهِمْ', 'لَكُمْ', 'مِنْهُمْ', 'أَمْ'],
      ['لَكُمْ مَا', 'وَلَكُمْ مِنْهَا', 'عَلَيْهِمْ مُّحْصَنَات', 'هُمْ مَّعْ', 'كُمْ مَّا', 'أَمْ مَنْ', 'عَمَّ مَنْ'],
      ['وَهُمْ بِهِ', 'تَرْمِيهِمْ بِحِجَارَة', 'رَبُّهُمْ بِهِمْ', 'أَمْ بِهِ', 'هُمْ بِهِ', 'كَمْ بَطَشَ', 'أَمْ بَعْدَ'],
      ['أَمْ تَرَ', 'كَمْ تَرَكُوا', 'هُمْ فِيهَا', 'أَمْ لَمْ', 'عَلَيْهِمْ ثِقَلٌ', 'هُمْ دَاخِرِينَ', 'أَمْ حَسِبْتَ'],
    ],
  },
  {
    id: 16,
    title: 'مشتق کلمات',
    titleEn: 'Practice Words',
    instruction: 'ان کلمات کی مشق کریں — حرکات، سکون، شدّہ، مد سب ملے ہوئے۔',
    rows: [
      ['ضَرَبَ', 'كَتَبَ', 'فَتَحَ', 'نَصَرَ', 'حَفِظَ', 'سَجَدَ', 'ذَكَرَ'],
      ['يَضْرِبُ', 'يَكْتُبُ', 'يَفْتَحُ', 'يَنْصُرُ', 'يَحْفَظُ', 'يَسْجُدُ', 'يَذْكُرُ'],
      ['ضَرْبٌ', 'كِتَابٌ', 'فَتْحٌ', 'نَصْرٌ', 'حِفْظٌ', 'سُجُودٌ', 'ذِكْرٌ'],
      ['مَضْرُوبٌ', 'مَكْتُوبٌ', 'مَفْتُوحٌ', 'مَنْصُورٌ', 'مَحْفُوظٌ', 'مَسْجُودٌ', 'مَذْكُورٌ'],
    ],
  },
  {
    id: 17,
    title: 'قرآنی کلمات',
    titleEn: 'Quranic Words',
    instruction: 'قرآن پاک کے مخصوص کلمات — معنی کے ساتھ مشق کریں۔',
    rows: [
      ['اللَّهُ', 'رَبِّي', 'رَحْمَٰنِ', 'رَحِيمِ', 'مَالِكِ', 'نَسْتَعِينُ', 'صِرَاطَ'],
      ['أَعُوذُ', 'بِسْمِ', 'الْحَمْدُ', 'يَوْمِ', 'نَعْبُدُ', 'إِيَّاكَ', 'الْعَالَمِينَ'],
      ['ضَالِّينَ', 'غَيْرِ', 'أَنْعَمْتَ', 'مَغْضُوبِ', 'عَلَيْهِمْ', 'وَلَا', 'الْقَيُّومُ'],
      ['الصَّمَدُ', 'أَحَدٌ', 'كُفُوًا', 'أَحَدْ', 'صَدَقَ', 'فَلَمْ', 'كُلُّ'],
    ],
    meanings: [
      { arabic: 'اللَّهُ', urdu: 'اللہ', extra: 'معبودِ برحق، خالقِ کائنات، ذاتِ واجب الوجود' },
      { arabic: 'رَبِّي', urdu: 'میرا رب', extra: 'پالنے والا، مربی، مالک، پروردگار' },
      { arabic: 'رَحْمَٰنِ', urdu: 'رحممن', extra: 'بے حد رحم کرنے والا، شفیق، دنیا میں سب پر رحم' },
      { arabic: 'رَحِيمِ', urdu: 'رحیم', extra: 'رحم کرنے والا، مہربان، آخرت میں مومنوں پر رحم' },
      { arabic: 'مَالِكِ', urdu: 'مالک', extra: 'مالکِ روزِ جزا، بادشاہ، صاحبِ اقتدار' },
      { arabic: 'نَسْتَعِينُ', urdu: 'ہم مدد چاہتے ہیں', extra: 'مدد طلب کرنا، استعانت، سہارا طلب کرنا' },
      { arabic: 'صِرَاطَ', urdu: 'راستہ', extra: 'رہنما، طریقہ، دین، شریعت' },
      { arabic: 'أَعُوذُ', urdu: 'میں پناہ لیتا ہوں', extra: 'پناہ مانگنا، حفاظت طلب کرنا' },
      { arabic: 'بِسْمِ', urdu: 'اللہ کے نام سے', extra: 'نام، شان، ذِکر کے ساتھ' },
      { arabic: 'الْحَمْدُ', urdu: 'تمام تعریف', extra: 'ثناء، شکر، تعریفِ خالص' },
      { arabic: 'يَوْمِ', urdu: 'دن', extra: 'دنِ قیامت، وقت، دور، لمحہ' },
      { arabic: 'نَعْبُدُ', urdu: 'ہم عبادت کرتے ہیں', extra: 'عبادت، بندگی، خدمت، فرمانبرداری' },
      { arabic: 'إِيَّاكَ', urdu: 'تیری', extra: 'صرف تیری، خاص تیری، تنہا تیری' },
      { arabic: 'الْعَالَمِينَ', urdu: 'جہانوں', extra: 'دنیا، مخلوقات، تمام موجودات' },
      { arabic: 'ضَالِّينَ', urdu: 'گمراہوں', extra: 'بھٹکے ہوئے، گم شدہ، راست سے بھٹکے' },
      { arabic: 'غَيْرِ', urdu: 'نہ', extra: 'سوا، علاوہ، بغیر، کے سوا' },
      { arabic: 'أَنْعَمْتَ', urdu: 'تو نے نعمت دی', extra: 'نعمت، بخشش، فضل، کرم' },
      { arabic: 'مَغْضُوبِ', urdu: 'ناراض ہوئے', extra: 'غصے والے، ناراض، بدبخت' },
      { arabic: 'عَلَيْهِمْ', urdu: 'ان پر', extra: 'ان لوگوں پر، ان پر' },
      { arabic: 'وَلَا', urdu: 'اور نہ', extra: 'اور نہیں، نہ، ممنوع' },
      { arabic: 'الْقَيُّومُ', urdu: 'قائم', extra: 'قیام کرنے والا، خود بھی قائم اور دوسروں کو قائم رکھنے والا' },
      { arabic: 'الصَّمَدُ', urdu: 'صمد', extra: 'بے نیاز، سب کا محتاج اور خود بے نیاز، مقصودِ حقیقی' },
      { arabic: 'أَحَدٌ', urdu: 'ایک', extra: 'ایک، واحد، لا شریک، بے مثل' },
      { arabic: 'كُفُوًا', urdu: 'ہمثل', extra: 'برابر، مثل، ہم پلہ، ہم سر' },
      { arabic: 'أَحَدْ', urdu: 'ایک', extra: 'ایک، واحد، لا شریک' },
      { arabic: 'صَدَقَ', urdu: 'سچ بولا', extra: 'سچائی، راست بازی، تصدیق، وفا' },
      { arabic: 'فَلَمْ', urdu: 'پس نہیں', extra: 'پس نہیں، تو نہیں، نہ' },
      { arabic: 'كُلُّ', urdu: 'سب', extra: 'تمام، ہر، پورا، مکمل' },
    ],
  },
];

// ───────── lib/conceptRelations.js ─────────
// Concept relationship graph — defines how the 35 theological topics relate to each other.
// Used by ConceptRelationMap to show a radial graph of related concepts.

// Relationship labels (Urdu):
//   بنیاد  = foundation
//   نتیجہ  = result/outcome
//   متعلق  = related
//   ضد     = opposite

export const CONCEPT_RELATIONS = {
  tawheed: [
    { id: 'faith', label: 'بنیاد' },
    { id: 'piety', label: 'نتیجہ' },
    { id: 'remembrance', label: 'متعلق' },
    { id: 'fear_god', label: 'متعلق' },
    { id: 'supplication', label: 'متعلق' },
  ],
  salah: [
    { id: 'tawheed', label: 'بنیاد' },
    { id: 'remembrance', label: 'متعلق' },
    { id: 'piety', label: 'نتیجہ' },
    { id: 'supplication', label: 'متعلق' },
  ],
  zakat: [
    { id: 'good_character', label: 'متعلق' },
    { id: 'greed_contentment', label: 'ضد' },
    { id: 'justice', label: 'متعلق' },
    { id: 'piety', label: 'نتیجہ' },
  ],
  patience: [
    { id: 'repentance', label: 'متعلق' },
    { id: 'hope', label: 'متعلق' },
    { id: 'fear_god', label: 'متعلق' },
    { id: 'gratitude', label: 'متعلق' },
  ],
  mercy: [
    { id: 'good_character', label: 'متعلق' },
    { id: 'repentance', label: 'متعلق' },
    { id: 'gratitude', label: 'متعلق' },
    { id: 'justice', label: 'متعلق' },
  ],
  knowledge: [
    { id: 'faith', label: 'متعلق' },
    { id: 'piety', label: 'نتیجہ' },
    { id: 'remembrance', label: 'متعلق' },
    { id: 'tawheed', label: 'بنیاد' },
  ],
  faith: [
    { id: 'tawheed', label: 'بنیاد' },
    { id: 'piety', label: 'نتیجہ' },
    { id: 'fear_god', label: 'متعلق' },
    { id: 'hope', label: 'متعلق' },
    { id: 'knowledge', label: 'متعلق' },
  ],
  repentance: [
    { id: 'fear_god', label: 'متعلق' },
    { id: 'hope', label: 'متعلق' },
    { id: 'mercy', label: 'متعلق' },
    { id: 'faith', label: 'متعلق' },
  ],
  gratitude: [
    { id: 'mercy', label: 'متعلق' },
    { id: 'patience', label: 'متعلق' },
    { id: 'remembrance', label: 'متعلق' },
    { id: 'faith', label: 'متعلق' },
  ],
  creation: [
    { id: 'tawheed', label: 'بنیاد' },
    { id: 'knowledge', label: 'متعلق' },
    { id: 'remembrance', label: 'متعلق' },
    { id: 'signs_hour', label: 'متعلق' },
  ],
  prophethood: [
    { id: 'faith', label: 'متعلق' },
    { id: 'knowledge', label: 'متعلق' },
    { id: 'tawheed', label: 'بنیاد' },
    { id: 'prophet_stories', label: 'متعلق' },
  ],
  resurrection: [
    { id: 'jannah', label: 'نتیجہ' },
    { id: 'jahannam', label: 'نتیجہ' },
    { id: 'death', label: 'متعلق' },
    { id: 'signs_hour', label: 'متعلق' },
    { id: 'barzakh', label: 'متعلق' },
  ],
  jannah: [
    { id: 'resurrection', label: 'متعلق' },
    { id: 'jahannam', label: 'ضد' },
    { id: 'piety', label: 'بنیاد' },
    { id: 'good_character', label: 'متعلق' },
  ],
  jahannam: [
    { id: 'resurrection', label: 'متعلق' },
    { id: 'jannah', label: 'ضد' },
    { id: 'fear_god', label: 'متعلق' },
    { id: 'hypocrisy', label: 'متعلق' },
  ],
  signs_hour: [
    { id: 'resurrection', label: 'متعلق' },
    { id: 'death', label: 'متعلق' },
    { id: 'knowledge', label: 'متعلق' },
    { id: 'creation', label: 'متعلق' },
  ],
  barzakh: [
    { id: 'death', label: 'متعلق' },
    { id: 'resurrection', label: 'متعلق' },
    { id: 'signs_hour', label: 'متعلق' },
    { id: 'fear_god', label: 'متعلق' },
  ],
  modesty: [
    { id: 'good_character', label: 'متعلق' },
    { id: 'faith', label: 'متعلق' },
    { id: 'piety', label: 'متعلق' },
    { id: 'backbiting', label: 'ضد' },
    { id: 'halal_haram', label: 'متعلق' },
  ],
  backbiting: [
    { id: 'good_character', label: 'ضد' },
    { id: 'honesty', label: 'ضد' },
    { id: 'modesty', label: 'ضد' },
    { id: 'truth', label: 'ضد' },
  ],
  envy: [
    { id: 'good_character', label: 'ضد' },
    { id: 'patience', label: 'متعلق' },
    { id: 'gratitude', label: 'ضد' },
    { id: 'greed_contentment', label: 'متعلق' },
  ],
  anger: [
    { id: 'patience', label: 'ضد' },
    { id: 'good_character', label: 'متعلق' },
    { id: 'mercy', label: 'ضد' },
    { id: 'hope', label: 'متعلق' },
  ],
  good_character: [
    { id: 'mercy', label: 'متعلق' },
    { id: 'modesty', label: 'متعلق' },
    { id: 'patience', label: 'متعلق' },
    { id: 'justice', label: 'متعلق' },
    { id: 'honesty', label: 'متعلق' },
  ],
  honesty: [
    { id: 'good_character', label: 'متعلق' },
    { id: 'truth', label: 'متعلق' },
    { id: 'faith', label: 'متعلق' },
    { id: 'justice', label: 'متعلق' },
  ],
  greed_contentment: [
    { id: 'zakat', label: 'متعلق' },
    { id: 'good_character', label: 'متعلق' },
    { id: 'patience', label: 'متعلق' },
    { id: 'gratitude', label: 'متعلق' },
  ],
  prophet_stories: [
    { id: 'prophethood', label: 'متعلق' },
    { id: 'patience', label: 'متعلق' },
    { id: 'knowledge', label: 'متعلق' },
    { id: 'faith', label: 'متعلق' },
  ],
  jihad_struggle: [
    { id: 'patience', label: 'متعلق' },
    { id: 'piety', label: 'متعلق' },
    { id: 'faith', label: 'متعلق' },
    { id: 'justice', label: 'متعلق' },
  ],
  people_book: [
    { id: 'prophethood', label: 'متعلق' },
    { id: 'faith', label: 'متعلق' },
    { id: 'knowledge', label: 'متعلق' },
    { id: 'tawheed', label: 'متعلق' },
  ],
  ancient_nations: [
    { id: 'prophet_stories', label: 'متعلق' },
    { id: 'signs_hour', label: 'متعلق' },
    { id: 'resurrection', label: 'متعلق' },
    { id: 'creation', label: 'متعلق' },
  ],
  remembrance: [
    { id: 'tawheed', label: 'بنیاد' },
    { id: 'salah', label: 'متعلق' },
    { id: 'gratitude', label: 'متعلق' },
    { id: 'supplication', label: 'متعلق' },
  ],
  justice: [
    { id: 'good_character', label: 'متعلق' },
    { id: 'piety', label: 'متعلق' },
    { id: 'tawheed', label: 'بنیاد' },
    { id: 'truth', label: 'متعلق' },
  ],
  parents: [
    { id: 'good_character', label: 'متعلق' },
    { id: 'mercy', label: 'متعلق' },
    { id: 'justice', label: 'متعلق' },
    { id: 'faith', label: 'متعلق' },
  ],
  halal_haram: [
    { id: 'piety', label: 'متعلق' },
    { id: 'faith', label: 'متعلق' },
    { id: 'good_character', label: 'متعلق' },
    { id: 'justice', label: 'متعلق' },
  ],
  hypocrisy: [
    { id: 'faith', label: 'ضد' },
    { id: 'truth', label: 'ضد' },
    { id: 'piety', label: 'ضد' },
    { id: 'fear_god', label: 'ضد' },
  ],
  supplication: [
    { id: 'remembrance', label: 'متعلق' },
    { id: 'faith', label: 'متعلق' },
    { id: 'hope', label: 'متعلق' },
    { id: 'tawheed', label: 'بنیاد' },
  ],
  piety: [
    { id: 'fear_god', label: 'متعلق' },
    { id: 'faith', label: 'متعلق' },
    { id: 'patience', label: 'متعلق' },
    { id: 'tawheed', label: 'بنیاد' },
  ],
  fear_god: [
    { id: 'piety', label: 'متعلق' },
    { id: 'repentance', label: 'متعلق' },
    { id: 'knowledge', label: 'متعلق' },
    { id: 'tawheed', label: 'بنیاد' },
  ],
  hope: [
    { id: 'fear_god', label: 'متعلق' },
    { id: 'patience', label: 'متعلق' },
    { id: 'repentance', label: 'متعلق' },
    { id: 'mercy', label: 'متعلق' },
  ],
  truth: [
    { id: 'honesty', label: 'متعلق' },
    { id: 'faith', label: 'متعلق' },
    { id: 'piety', label: 'متعلق' },
    { id: 'knowledge', label: 'متعلق' },
  ],
  death: [
    { id: 'resurrection', label: 'متعلق' },
    { id: 'barzakh', label: 'متعلق' },
    { id: 'fear_god', label: 'متعلق' },
    { id: 'signs_hour', label: 'متعلق' },
  ],
};

// Legend entries for the relationship labels
export const RELATION_LABELS = [
  { id: 'بنیاد', desc: 'بنیاد' },
  { id: 'نتیجہ', desc: 'نتیجہ' },
  { id: 'متعلق', desc: 'متعلق' },
  { id: 'ضد', desc: 'ضد' },
];

// ───────── lib/translations.js ─────────
// UI string translations — Urdu (default) + English.
// Used by LanguageContext's t(key) function.

export const translations = {
  // Navigation
  nav_home:     { ur: 'ہوم',     en: 'HOME' },
  nav_qaida:    { ur: 'قاعدہ',   en: 'QAIDA' },
  nav_quran:    { ur: 'قرآن',    en: 'QURAN' },
  nav_hadith:   { ur: 'احادیث',  en: 'HADITH' },
  nav_aichat:   { ur: 'AI چیٹ',  en: 'AI CHAT' },
  nav_settings: { ur: 'سیٹنگز',  en: 'SETTINGS' },

  // Home cards
  card_read_quran:     { ur: 'قرآن پڑھیں',       en: 'Read Quran' },
  card_hadith:         { ur: 'احادیث',            en: 'Hadiths' },
  card_search:         { ur: 'تلاش کریں',         en: 'Search' },
  card_ai_chat:        { ur: 'AI سوال جواب',     en: 'AI Q&A' },
  card_settings:       { ur: 'سیٹنگز',            en: 'Settings' },
  card_duas:           { ur: 'دعائیں',            en: 'Duas' },
  card_tasbih:         { ur: 'تسبیح',             en: 'Tasbih' },
  card_namaz:          { ur: 'نماز',              en: 'Prayer Guide' },
  card_kalimas:        { ur: 'چھ کلمے',           en: 'Six Kalimas' },
  card_progress:       { ur: 'میری پیش رفت',      en: 'My Progress' },
  card_tajweed:        { ur: 'تجوید سیکھیں',      en: 'Learn Tajweed' },
  card_dictionary:     { ur: 'قرآن ڈکشنری',       en: 'Quran Dictionary' },
  card_quranic_arabic: { ur: 'قرآنی عربی',        en: 'Quranic Arabic' },
  card_connect:        { ur: 'AI اسسٹنٹ جوڑیں',   en: 'Connect AI Assistant' },
  card_notebook:       { ur: 'تحقیقی نوٹ بک',     en: 'Research Notebook' },
  card_topics:         { ur: 'موضوعات',           en: 'Topics' },
  card_tutor:          { ur: 'آواز والا استاد',     en: 'Voice Tutor' },
  card_words:          { ur: 'روزانہ قرآنی الفاظ',  en: 'Daily Words' },
  card_articles:       { ur: 'تحقیقی مضامین',       en: 'Research Articles' },

  // Home
  home_last_read: { ur: 'آخری پڑھی آیت', en: 'Last Read Verse' },
  home_verse:     { ur: 'آیت',           en: 'Verse' },
  home_tip: {
    ur: 'حفظ کا طریقہ: ایک صفحہ، ایک آیت — پوری توجہ سے یاد کریں۔ ہر سورت کی ابتدا بِسْمِ اللَّہ الرَّحْمٰنِ الرَّحِیم سے کریں۔',
    en: 'Memorization tip: One page, one verse — focus fully. Start every surah with Bismillah.',
  },

  // Settings
  settings_title:         { ur: 'سیٹنگز',            en: 'Settings' },
  settings_language:      { ur: 'زبان',              en: 'Language' },
  settings_language_desc: { ur: 'ایپ کی زبان منتخب کریں', en: 'Choose app language' },
  settings_lang_urdu:     { ur: 'اردو',              en: 'Urdu' },
  settings_lang_english:  { ur: 'انگریزی',           en: 'English' },
  settings_reciter:       { ur: 'قاری منتخب کریں',   en: 'Select Reciter' },
  settings_clear_cache:   { ur: 'کیشے صاف کریں',     en: 'Clear Cache' },
  settings_cache_cleared: { ur: 'کیشے صاف ہو گیا',   en: 'Cache cleared' },
  settings_reminder:      { ur: 'روزانہ یاد دہانی',  en: 'Daily Reminder' },
  settings_enable_reminder:{ ur: 'یاد دہانی فعال کریں', en: 'Enable Reminder' },
  settings_select_time:   { ur: 'وقت منتخب کریں',     en: 'Select Time' },
  settings_help:          { ur: 'ہیلپ اور سپورٹ',     en: 'Help & Support' },
  settings_legal:         { ur: 'قانونی',             en: 'Legal' },
  settings_privacy:       { ur: 'پرائیویسی پالیسی',   en: 'Privacy Policy' },
  settings_terms:         { ur: 'شرائط و ضوابط',      en: 'Terms & Conditions' },
  settings_about:         { ur: 'ہمارے بارے میں',     en: 'About' },
  settings_contact:       { ur: 'ہم سے رابطہ',        en: 'Contact Us' },

  // Search
  search_title:             { ur: 'تلاش', en: 'Search' },
  search_offline:           { ur: 'آف لائن', en: 'Offline' },
  search_quran:             { ur: 'قرآن', en: 'Quran' },
  search_hadith:            { ur: 'احادیث', en: 'Hadiths' },
  search_quran_ph:          { ur: 'قرآن میں تلاش کریں (عربی، اردو، انگریزی)...', en: 'Search Quran (Arabic, Urdu, English)...' },
  search_hadith_ph:         { ur: 'احادیث میں تلاش کریں (اردو)...', en: 'Search Hadiths (Urdu)...' },
  search_no_data:           { ur: 'آف لائن ڈیٹا ابھی ڈاؤن لوڈ نہیں ہوا۔ براہ کرم ہوم صفحے سے ڈاؤن لوڈ شروع کریں۔', en: 'Offline data not downloaded yet. Start download from Home page.' },
  search_no_results:        { ur: 'کوئی نتیجہ نہیں ملا۔', en: 'No results found.' },
  search_filter_surah:      { ur: 'سورت', en: 'Surah' },
  search_filter_revelation: { ur: 'نزول', en: 'Revelation' },
  search_all:               { ur: 'تمام', en: 'All' },
  search_meccan:            { ur: 'مکی', en: 'Meccan' },
  search_medinan:           { ur: 'مدنی', en: 'Medinan' },
  search_dictionary:        { ur: 'لغت', en: 'Dictionary' },
  search_dictionary_ph:     { ur: 'لفظ تلاش کریں (عربی، اردو، انگریزی)...', en: 'Search words (Arabic, Urdu, English)...' },
  search_dict_count:        { ur: 'مرتبہ', en: 'times' },

  // Topics
  topics_title:     { ur: 'موضوعات', en: 'Topics' },
  topics_subtitle:  { ur: 'قرآن اور احادیث میں موضوعات کے اعتبار سے تلاش کریں', en: 'Browse Quran and Hadiths by theological topics' },
  topics_ayahs:     { ur: 'متعلقہ آیات', en: 'Related Verses' },
  topics_hadiths:   { ur: 'متعلقہ احادیث', en: 'Related Hadiths' },
  topics_no_content:{ ur: 'کوئی مواد نہیں ملا۔', en: 'No content found.' },

  // Word Detail
  word_title:        { ur: 'لفظ کی تفصیل', en: 'Word Detail' },
  word_loading:      { ur: 'تفصیل تیار ہو رہی ہے…', en: 'Loading details…' },
  word_listen:       { ur: 'اس لفظ کی تلاوت سنیں', en: 'Listen to this word' },
  word_type:         { ur: 'قسم', en: 'Type' },
  word_root:         { ur: 'روٹ ورڈ', en: 'Root' },
  word_meaning:      { ur: 'اردو مطلب', en: 'Urdu Meaning' },
  word_meaning_en:   { ur: 'انگریزی مطلب', en: 'English Meaning' },
  word_count:        { ur: 'قرآن میں آمد', en: 'Quran Occurrence' },
  word_times:        { ur: 'بار', en: 'times' },
  word_derivatives:  { ur: 'دیگر مشتقات', en: 'Derivatives' },
  word_grammar:      { ur: 'گرامر کی قسم', en: 'Grammar Type' },
  word_subcategory:  { ur: 'ذیلی قسم', en: 'Sub-category' },
  word_translit:     { ur: 'تلفظ', en: 'Transliteration' },
  word_prev:         { ur: 'پچھلا لفظ', en: 'Previous word' },
  word_next:         { ur: 'اگلا لفظ', en: 'Next word' },
  word_back:         { ur: 'آیت پر واپس', en: 'Back to verse' },
  word_report:       { ur: 'تجزیاتی رپورٹ', en: 'Analytical Report' },
  word_word:         { ur: 'لفظ', en: 'Word' },
  word_of:           { ur: 'از', en: 'of' },

  // Language toggle
  lang_switch:       { ur: 'EN', en: 'اردو' },

  // Quran Data Status
  card_quran_data:   { ur: 'قرآن مکمل ڈیٹا', en: 'Quran Full Data' },
};
