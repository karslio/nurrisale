/* NurRisale — Static project data and shared constants.
   Classic script; deliberately shares the app's global lexical scope. */

/* =========================================================
   1) VERİ
   books/index.json → kitap listesi; books/<id>.json → sayfalar, içindekiler, haşiyeler
   Blok türleri: "p" paragraf, "c" ortalı satır, "ar" Arapça, "h" ara başlık.
   ========================================================= */
let LIBRARY = [];
const BOOKS = new Map();
const SHELVES = [{ id: "kulliyat", title: "Risale-i Nur Külliyatı" }, { id: "cep", title: "Cep Risaleleri" }];

/* Lugat: kelime → anlam. Anahtarlar küçük harf. */
const LUGAT = {
  "kâinat": "Bütün varlıklar, evren.", "zerre": "Çok küçük parça; atom.", "lisan": "Dil.",
  "mânâ": "Anlam.", "hikmet": "Bir şeyin gizli faydası ve sebebi; bilgelik.", "tefekkür": "Derin düşünme, ibretle bakma.",
  "intizam": "Düzen, tertip.", "izah": "Açıklama.", "sâni": "Sanatkâr; her şeyi sanatla yapan Allah.",
  "kudret": "Güç, kuvvet.", "nakış": "Süsleme, işleme.", "sanatkâr": "Sanat sahibi, usta.",
  "gaflet": "Dikkatsizlik, umursamazlık.", "zulümat": "Karanlıklar.", "rahmet": "Merhamet, şefkat ve ihsan.",
  "fâni": "Geçici, sonu olan.", "bâki": "Daimî, sonsuz kalıcı.", "sermaye": "Ana mal; burada: verilen imkân, ömür.",
  "nimet": "İyilik, verilen güzel şey.", "ubudiyet": "Kulluk.", "acz": "Güçsüzlük.", "fakr": "Muhtaçlık.",
  "zillet": "Alçaklık, hor görülme.", "izzet": "Şeref, değer.", "fıtrat": "Yaratılış, tabiat.",
  "muhafaza": "Koruma.", "sual": "Soru.", "hâdise": "Olay.", "şefkat": "Acıma ile karışık sevgi.",
  "zahmet": "Sıkıntı, eziyet.", "muhabbet": "Sevgi.", "hakiki": "Gerçek.", "kemal": "Olgunluk, mükemmellik.",
  "cemal": "Güzellik.", "tecelli": "Görünme, yansıma, belirme.", "ihlas": "Bir işi sadece Allah rızası için yapmak; samimiyet.",
  "amel": "İş, yapılan ibadet.", "hürmet": "Saygı.", "mühim": "Önemli.", "tesanüd": "Dayanışma.",
  "muallim": "Öğretmen.", "hâlık": "Yaratan; Allah.", "sıhhat": "Sağlık.", "tevbe": "Pişmanlıkla Allah'a dönüş.",
  "vesile": "Sebep, araç.", "esmâ": "İsimler; Allah'ın isimleri.", "tevhid": "Allah'ın bir olduğuna inanmak.",
  "kesret": "Çokluk.", "vahdet": "Birlik.", "bilakis": "Tam tersine.", "temsil": "Benzetme, örnekle anlatma.",
  "mevcudat": "Var olan şeyler, varlıklar.", "haşir": "Öldükten sonra dirilip toplanma.",
  "hakikat": "Gerçek, asıl.", "mahiyet": "Bir şeyin içyüzü, özü.", "isbat": "İspat, kanıtlama.",
  "nübüvvet": "Peygamberlik.", "ehemmiyet": "Önem.", "mütemadiyen": "Durmadan, sürekli.", "fevkalâde": "Olağanüstü.",
  "binaenaleyh": "Bundan dolayı.", "mahlukat": "Yaratılmışlar.", "rububiyet": "Allah'ın her şeyi terbiye ve idare etmesi.",
  "uluhiyet": "İlahlık; ibadete layık tek ilah olmak.", "ebedî": "Sonsuz.", "ezelî": "Başlangıcı olmayan.",
  "dalalet": "Doğru yoldan sapma.", "hidayet": "Doğru yola girme.", "tasdik": "Doğrulama.", "nefis": "İnsanın kötülüğe meyleden yanı.",
  "ruh": "Can, insanın manevî varlığı.", "kalb": "Gönül; manevî duygu merkezi.", "akıl": "Düşünme gücü."
};


/* Arapça ifadeler ve mealleri. Metindeki yazılışla eşleşir; harekeler yok sayılır.
   r: kaynak (ayet ise sure ve ayet numarası). Uzun ifadeler önce denenir. */
const ARAPCA = [
  { a: "بسم الله الرحمن الرحيم", m: "Rahmân ve Rahîm olan Allah'ın adıyla." },
  { a: "باسمه سبحانه", m: "O'nun adıyla. O, her türlü noksandan münezzehtir." },
  { a: "باسمه", m: "O'nun adıyla." },
  { a: "سبحانك لا علم لنا الا ما علمتنا انك انت العليم الحكيم", m: "Seni her türlü noksandan tenzih ederiz. Senin bize öğrettiğinden başka hiçbir bilgimiz yoktur. Şüphesiz her şeyi hakkıyla bilen, hüküm ve hikmet sahibi ancak Sensin.", r: "Bakara 2:32" },
  { a: "وان من شيء الا يسبح بحمده", m: "Hiçbir şey yoktur ki O'nu hamd ile tesbih etmesin.", r: "İsrâ 17:44" },
  { a: "الباقى هو الباقى", m: "Bâkî olan ancak O'dur." },
  { a: "ربنا لا تؤاخذنا ان نسينا او اخطانا", m: "Rabbimiz! Unutur veya yanılırsak bizi sorumlu tutma.", r: "Bakara 2:286" },
  { a: "و آخر دعويهم ان الحمد لله رب العالمين", m: "Onların dualarının sonu da şudur: \"Hamd, âlemlerin Rabbi Allah'a mahsustur.\"", r: "Yûnus 10:10" },
  { a: "و به نستعين", m: "Yardımı yalnız O'ndan isteriz." },
  { a: "فانظر الى آثار رحمت الله كيف يحيى الارض بعد موتها", m: "Allah'ın rahmetinin eserlerine bak: Ölmüş toprağı nasıl diriltiyor!", r: "Rûm 30:50" },
  { a: "ان ذلك لمحيى الموتى و هو على كل شيء قدير", m: "Şüphesiz O, ölüleri de diriltecektir. O her şeye kadirdir.", r: "Rûm 30:50" },
  { a: "السلام عليكم و رحمة الله و بركاته", m: "Allah'ın selâmı, rahmeti ve bereketi üzerinize olsun." },
  { a: "ابدا دائما", m: "Ebediyen ve daima." },
  { a: "الحمد لله الذى هدينا لهذا وما كنا لنهتدى لولا ان هدينا الله", m: "Bizi buna eriştiren Allah'a hamd olsun. Allah bize hidayet etmeseydi biz doğru yolu bulamazdık.", r: "A'râf 7:43" },
  { a: "لقد جاءت رسل ربنا بالحق", m: "Andolsun, Rabbimizin peygamberleri hakkı getirdiler.", r: "A'râf 7:43" },
  { a: "ربنا لا تزغ قلوبنا بعد اذ هديتنا وهب لنا من لدنك رحمة انك انت الوهاب", m: "Rabbimiz! Bizi doğru yola ilettikten sonra kalplerimizi kaydırma. Bize katından rahmet bağışla. Şüphesiz bağışı en bol olan Sensin.", r: "Âl-i İmrân 3:8" },
  { a: "لا اله الا الله وحده لا شريك له", m: "Allah'tan başka ilah yoktur. O tektir, ortağı yoktur." },
  { a: "له الملك و له الحمد", m: "Mülk O'nundur, hamd O'na mahsustur." },
  { a: "يحيى و يميت", m: "O diriltir ve öldürür." },
  { a: "و هو على كل شيء قدير", m: "O her şeye kadirdir." },
  { a: "لا اله الا الله", m: "Allah'tan başka ilah yoktur." },
  { a: "فسبحان الله حين تمسون وحين تصبحون", m: "Akşama girdiğinizde ve sabaha çıktığınızda Allah'ı tesbih edin.", r: "Rûm 30:17" },
  { a: "وله الحمد فى السموات والارض وعشيا وحين تظهرون", m: "Göklerde ve yerde hamd O'na mahsustur. Günün sonunda ve öğleye girdiğinizde de O'nu tesbih edin.", r: "Rûm 30:18" },
  { a: "ومن آياته خلق السموات والارض واختلاف السنتكم و الوانكم", m: "Göklerin ve yerin yaratılması, dillerinizin ve renklerinizin farklı olması da O'nun ayetlerindendir.", r: "Rûm 30:22" },
  { a: "ان فى ذلك لآيات للعالمين", m: "Şüphesiz bunda bilenler için ibretler vardır.", r: "Rûm 30:22" },
  { a: "لقد جاءكم رسول من انفسكم عزيز عليه ما عنتم حريص عليكم بالمؤمنين رؤف رحيم", m: "Andolsun, size içinizden öyle bir peygamber gelmiştir ki sıkıntıya uğramanız ona çok ağır gelir. Size çok düşkündür; müminlere karşı şefkatli ve merhametlidir.", r: "Tevbe 9:128" },
  { a: "اللهم صل و سلم على من ارسلته رحمة للعالمين", m: "Allah'ım! Âlemlere rahmet olarak gönderdiğin zata salât ve selâm et." },
  { a: "و على آله و صحبه اجمعين", m: "Onun âline ve bütün ashabına da." },
  { a: "اللهم صل على سيدنا محمد", m: "Allah'ım! Efendimiz Muhammed'e salât et." },
  { a: "الحمد لله رب العالمين", m: "Hamd, âlemlerin Rabbi Allah'a mahsustur.", r: "Fâtiha 1:2" },
  { a: "و الصلاة و السلام على سيدنا محمد", m: "Salât ve selâm Efendimiz Muhammed'e olsun." },
  { a: "يا الله يا رحمن يا رحيم", m: "Ey Allah! Ey Rahmân! Ey Rahîm!" },
  { a: "يا حى يا قيوم", m: "Ey Hayy (diri olan)! Ey Kayyûm (her şeyi ayakta tutan)!" },
  { a: "صلى الله عليه وسلم", m: "Allah ona salât ve selâm etsin." },
  { a: "عليه الصلاة والسلام", m: "Ona salât ve selâm olsun." },
  { a: "لا حول ولا قوة الا بالله", m: "Güç ve kuvvet ancak Allah'tandır." },
  { a: "حسبنا الله ونعم الوكيل", m: "Allah bize yeter; O ne güzel vekildir.", r: "Âl-i İmrân 3:173" },
  { a: "انا لله وانا اليه راجعون", m: "Biz Allah'a aidiz ve O'na döneceğiz.", r: "Bakara 2:156" },
  { a: "ان الله على كل شيء قدير", m: "Şüphesiz Allah her şeye kadirdir." },
  { a: "الحمد لله", m: "Hamd Allah'a mahsustur." },
  { a: "سبحان الله", m: "Allah her türlü noksandan uzaktır." },
  { a: "الله اكبر", m: "Allah en büyüktür." },
  { a: "ما شاء الله", m: "Allah'ın dilediği olur." },
  { a: "ان شاء الله", m: "Allah dilerse." },
  { a: "بسم الله", m: "Allah'ın adıyla." },
  { a: "ان الله اشتري من المؤمنين انفسهم واموالهم بان لهم الجنه", m: "Şüphesiz Allah, müminlerden canlarını ve mallarını, kendilerine cennet verilmesi karşılığında satın almıştır.", r: "Tevbe 9:111" },
  { a: "لقد خلقنا الانسان في احسن تقويم", m: "Andolsun, biz insanı en güzel biçimde yarattık.", r: "Tîn 95:4" },
  { a: "ثم رددناه اسفل سافلين", m: "Sonra onu aşağıların aşağısına indirdik.", r: "Tîn 95:5" },
  { a: "الا الذين امنوا وعملوا الصالحات", m: "Ancak iman edip salih amel işleyenler müstesna.", r: "Tîn 95:6" },
  { a: "ان في خلق السموات والارض واختلاف اليل والنهار", m: "Göklerin ve yerin yaratılışında, gece ile gündüzün birbiri ardınca gelişinde (akıl sahipleri için ayetler vardır).", r: "Bakara 2:164" },
  { a: "لا يعلم الغيب الا الله", m: "Gaybı Allah'tan başkası bilmez." },
  { a: "قل بفضل الله وبرحمته فبذلك فليفرحوا هو خير مما يجمعون", m: "De ki: Allah'ın lütfu ve rahmetiyle; işte yalnız bununla sevinsinler. Bu, onların biriktirdiklerinden daha hayırlıdır.", r: "Yûnus 10:58" },
  { a: "الله نور السموات والارض", m: "Allah göklerin ve yerin nurudur.", r: "Nûr 24:35" },
  { a: "ما خلقكم ولا بعثكم الا كنفس واحده", m: "Sizin yaratılmanız da diriltilmeniz de ancak tek bir kişinin yaratılıp diriltilmesi gibidir.", r: "Lokmân 31:28" },
  { a: "ومن اياته ان خلق لكم من انفسكم ازواجا لتسكنوا اليها", m: "Kendileriyle huzur bulasınız diye size kendi cinsinizden eşler yaratması da O'nun ayetlerindendir.", r: "Rûm 30:21" },
  { a: "ومن اياته منامكم باليل والنهار وابتغاؤكم من فضله", m: "Gece ve gündüz uyumanız ve O'nun lütfundan rızık aramanız da O'nun ayetlerindendir.", r: "Rûm 30:23" },
  { a: "ومن اياته يريكم البرق خوفا وطمعا", m: "Size korku ve ümit veren şimşeği göstermesi de O'nun ayetlerindendir.", r: "Rûm 30:24" },
  { a: "ومن اياته ان تقوم السماء والارض بامره", m: "Göğün ve yerin O'nun emriyle ayakta durması da O'nun ayetlerindendir.", r: "Rûm 30:25" },
  { a: "وله من في السموات والارض كل له قانتون", m: "Göklerde ve yerde kim varsa O'nundur; hepsi O'na boyun eğmiştir.", r: "Rûm 30:26" },
  { a: "وهو الذي يبدؤا الخلق ثم يعيده وهو اهون عليه", m: "Yaratmayı başlatan, sonra onu tekrarlayan O'dur; bu O'na daha kolaydır.", r: "Rûm 30:27" },
  { a: "اذا الشمس كورت", m: "Güneş dürülüp karardığı zaman.", r: "Tekvîr 81:1" },
  { a: "يا ايها الناس اتقوا ربكم ان زلزله الساعه شيء عظيم", m: "Ey insanlar! Rabbinizden sakının. Çünkü kıyametin sarsıntısı çok büyük bir şeydir.", r: "Hac 22:1" },
  { a: "اذا زلزلت الارض زلزالها", m: "Yer o şiddetli sarsıntısıyla sarsıldığında.", r: "Zilzâl 99:1" },
  { a: "رب اشرح لي صدري ويسر لي امري واحلل عقده من لساني يفقهوا قولي", m: "Rabbim! Göğsümü genişlet, işimi kolaylaştır, dilimdeki düğümü çöz ki sözümü anlasınlar.", r: "Tâhâ 20:25-28" },
  { a: "وما مدحت محمدا بمقالتي", m: "Ben sözümle Muhammed'i (a.s.m.) övmedim;" },
  { a: "ولكن مدحت مقالتي بمحمد", m: "bilakis O'nu anmakla sözümü güzelleştirdim." },
  { a: "وما مدحت القران بكلماتي", m: "Ben sözlerimle Kur'an'ı övmedim;" },
  { a: "ولكن مدحت كلماتي بالقران", m: "bilakis Kur'an'la sözlerimi güzelleştirdim." },
  { a: "فان تولوا فقل حسبي الله لا اله الا هو عليه توكلت وهو رب العرش العظيم", m: "Eğer yüz çevirirlerse de ki: Allah bana yeter. O'ndan başka ilah yoktur. Ben yalnız O'na tevekkül ettim. O, büyük Arş'ın Rabbidir.", r: "Tevbe 9:129" },
  { a: "هلك الناس الا العالمون", m: "İnsanlar helâk oldu, âlimler müstesna; âlimler helâk oldu, ilmiyle amel edenler müstesna; amel edenler helâk oldu, ihlaslılar müstesna; ihlaslılar ise büyük bir tehlike karşısındadır." },
  { a: "جمله شيران جهان بستهء اين سلسله اند", m: "Dünyanın bütün aslanları bu zincire bağlıdır.", r: "Farsça beyit" },
  { a: "روبه از حيله چه سان بگسلد اين سلسله را", m: "Tilki hileyle bu zinciri nasıl koparabilir?", r: "Farsça beyit" },
  { a: "قال من يحيي العظام وهي رميم", m: "Çürümüş kemikleri kim diriltecek? dedi.", r: "Yâsîn 36:78" },
  { a: "قل يحييها الذي انشاها اول مره وهو بكل خلق عليم", m: "De ki: Onları ilk defa yaratan diriltecek. O her yaratılışı hakkıyla bilendir.", r: "Yâsîn 36:79" },
  { a: "رب اعوذ بك من همزات الشياطين", m: "Rabbim! Şeytanların vesveselerinden sana sığınırım.", r: "Mü'minûn 23:97" },
  { a: "واعوذ بك رب ان يحضرون", m: "Rabbim! Onların yanımda bulunmalarından da sana sığınırım.", r: "Mü'minûn 23:98" },
  { a: "سبحان الذي اسري بعبده ليلا من المسجد الحرام الي المسجد الاقصي", m: "Kulunu bir gece Mescid-i Haram'dan Mescid-i Aksâ'ya götüren Allah her türlü noksandan münezzehtir.", r: "İsrâ 17:1" },
  { a: "افلم ينظروا الي السماء فوقهم كيف بنيناها وزيناها", m: "Üstlerindeki göğe bakmazlar mı; onu nasıl bina ettik ve süsledik?", r: "Kâf 50:6" },
  { a: "فتبارك الله احسن الخالقين", m: "Yaratanların en güzeli olan Allah ne yücedir!", r: "Mü'minûn 23:14" },
  { a: "اللهم اهدنا الصراط المستقيم", m: "Allah'ım! Bizi doğru yola ilet." },
  { a: "اهدنا الصراط المستقيم", m: "Bizi doğru yola ilet.", r: "Fâtiha 1:6" },
  { a: "تسبح له السموات السبع والارض ومن فيهن", m: "Yedi gök, yer ve bunlarda bulunanlar O'nu tesbih eder.", r: "İsrâ 17:44" },
  { a: "ولكن لا تفقهون تسبيحهم", m: "Fakat siz onların tesbihini anlamazsınız.", r: "İsrâ 17:44" },
  { a: "وما امر الساعه الا كلمح البصر او هو اقرب", m: "Kıyametin kopması göz açıp kapama gibidir, hatta daha yakındır.", r: "Nahl 16:77" },
  { a: "والسلام علي من اتبع الهدي", m: "Selâm, hidayete uyanlara olsun.", r: "Tâhâ 20:47" },
  { a: "الذين يؤمنون بالغيب", m: "Onlar gaybe iman ederler.", r: "Bakara 2:3" },
  { a: "يا ايها الناس اعبدوا ربكم", m: "Ey insanlar! Rabbinize ibadet edin.", r: "Bakara 2:21" },
  { a: "الصلاه عماد الدين", m: "Namaz dinin direğidir.", r: "Hadis" },
  { a: "ان الله مع الذين اتقوا والذين هم محسنون", m: "Şüphesiz Allah, kendisinden sakınanlarla ve iyilik yapanlarla beraberdir.", r: "Nahl 16:128" },
  { a: "الله لا اله الا هو الحي القيوم", m: "Allah, O'ndan başka ilah yoktur; diridir, her şeyi ayakta tutandır.", r: "Bakara 2:255" },
  { a: "ان الدين عند الله الاسلام", m: "Şüphesiz Allah katında din İslâm'dır.", r: "Âl-i İmrân 3:19" },
  { a: "اللهم اجعلنا من اهل السعاده والسلامه والقران والايمان", m: "Allah'ım! Bizi saadet, selâmet, Kur'an ve iman ehlinden eyle." },
  { a: "والشمس وضحيها", m: "Andolsun güneşe ve onun parlaklığına.", r: "Şems 91:1" },
  { a: "والقمر اذا تليها", m: "Ve onu takip eden aya.", r: "Şems 91:2" },
  { a: "ومن يؤت الحكمه فقد اوتي خيرا كثيرا", m: "Kime hikmet verilmişse, ona pek çok hayır verilmiştir.", r: "Bakara 2:269" },
  { a: "من كان همته نفسه فليس من الانسان", m: "Bütün derdi kendi nefsi olan kimse insanlıktan nasip almamıştır; çünkü insan yaratılıştan medenîdir." }
];
// Her ifade için harekeyi ve harf çeşitlerini (أ إ آ, ى ي, ة ه) yok sayan bir kalıp kur
const AR_MARKS = "[\\u064B-\\u065F\\u0670\\u0640\\u06D6-\\u06ED]*";
const AR_VARIANTS = { "ا": "[اأإآٱ]", "ى": "[ىيئ]", "ي": "[يىئ]", "ة": "[ةته]", "ه": "[هة]", "و": "[وؤ]", "ت": "[تة]", "ك": "[كک]", "ء": "[ءئؤأ]?" };
const arPattern = (key) => [...key].map((ch) => ch === " " ? "\\s*" : (AR_VARIANTS[ch] || ch) + AR_MARKS + (ch === "و" ? "\\s?" : "")).join("");
const AR_ORDER = ARAPCA.map((x, i) => i).sort((a, b) => ARAPCA[b].a.length - ARAPCA[a].a.length);
const AR_RE = new RegExp(AR_ORDER.map((i) => `(${arPattern(ARAPCA[i].a)})`).join("|"), "g");
function renderArabic(text) {
  let out = "", last = 0;
  for (const m of text.matchAll(AR_RE)) {
    const g = m.slice(1).findIndex((x) => x !== undefined);
    out += escapeHtml(text.slice(last, m.index));
    out += `<span class="aw" data-a="${AR_ORDER[g]}" tabindex="0">${escapeHtml(m[0])}</span>`;
    last = m.index + m[0].length;
  }
  return out + escapeHtml(text.slice(last));
}
