# Ruhsat: Yakıt ve Bakım Takibi (plan)

iPhone için araç defteri: yakıt, bakım ve masraf kayıtları, Türkiye'ye göre hatırlatmalar. Hesap e-posta koduyla (şifre yok) ya da hesapsız; kayıtlar önce telefonda tutulur, hesap varsa buluta eşitlenir.

Karar tarihi: 2026-11-04. Rakip ve yorum araştırması: `PROJELER/fikirler/arac-takip-arastirma.md` (repoda yok).

## Neden bu uygulama

Türkiye'de kişisel araç takibinde baskın bir uygulama yok (en büyüğü 489 puan). Rakiplerin düşük puanlı yorumlarındaki sorunlar:
1. Zorunlu hesap ve bozuk giriş ("hesap açılmıyor", "SMS kodu gelmiyor").
2. Veri kaybı (telefon değişince kayıtlar gidiyor; bir güncelleme bütün tarihleri 01.01.1900 yaptı).
3. Ücret duvarı (dışa aktarma ücretli, "pro'ya geç yoksa göstermem").
4. Sabit araç listesi ("modelim yok"), LPG yok, kısmi dolumda ortalama yok, karmaşık yakıt girişi.

Ruhsat'ın cevabı: hesapsız da çalışır, hesapla veri kaybolmaz, hiçbir özellik kilitli değil, araç serbest yazılır, LPG ve kısmi dolum doğru hesaplanır, yakıt girişi tek ekran.

## Kapsam ve kabul kriterleri

Her madde bir issue. Hepsi v1.0.0'da; "sonra eklenecek" yok.

### 1. İskelet, görsel kimlik, yerel veritabanı ve araçlar
- Expo SDK 58 + TypeScript + Expo Router; development build (EAS) iPhone'da açılıyor.
- Görsel kimlik: renk, yazı tipi, ikon taslağı; açık ve koyu tema; TR/EN (cihaz diline göre, ayarlardan değişir).
- SQLite (expo-sqlite) + Drizzle şeması ve göçleri; göç testleri (eski şemadaki örnek veri yeni şemaya bozulmadan taşınır).
- Araç ekle/düzenle/sil: ad (ör. "Babamın arabası"), marka ve model serbest metin (öneri listesi var, zorunlu değil), yıl, plaka, yakıt türleri (benzin, dizel, LPG, elektrik; çoklu seçim), depo hacmi (isteğe bağlı), güncel km. Araç sınırı yok; birden fazla araçta üstte araç seçici.
- Boş durum, hatalı girdi (negatif km, gelecekteki tarih) ve çok uzun metin için doğrulama.

### 2. Yakıt kayıtları ve tüketim
- Tek ekranda giriş: tarih (varsayılan bugün), km, litre, tutar, birim fiyat (ikisini girince üçüncüsü hesaplanır), yakıt türü, "depo tam doldu" işareti, istasyon/not (isteğe bağlı).
- Tüketim "tam depodan tam depoya" yöntemiyle: iki tam dolum arasındaki bütün litreler / aradaki km. Kısmi dolumlar sonraki tam dolumda hesaba girer; araya kayıt unutulduysa (km geriye gittiyse ya da boşluk varsa) o aralık hesaba katılmaz ve işaretlenir.
- LPG'li araçta tüketim yakıt türü başına ayrı (L/100 km), maliyet toplamda (TL/km).
- Km bir önceki kayıttan küçükse uyarı (hatalı giriş); kayıt düzenleme ve silme.
- Saf TypeScript hesap modülü, kenar durumlarıyla birim testli.

### 3. Bakım, masraf ve hatırlatmalar
- Kayıt türleri: bakım (yağ, filtre, lastik, fren, akü, diğer), muayene, trafik sigortası, kasko, MTV, ceza, otopark/köprü-otoyol, yıkama, diğer. Tarih, km, tutar, not.
- Hatırlatmalar (tarih ve/veya km):
  - Muayene: son muayene tarihinden hesap (özel otomobil: ilk 3 yıl, sonra 2 yılda bir; ticari: yılda bir); kullanıcı tarihi elle de girebilir.
  - Trafik sigortası ve kasko: bitiş tarihi, 30/7/1 gün önce bildirim.
  - MTV: her yıl Ocak ve Temmuz, ay sonuna kadar; ay başında ve son haftada bildirim.
  - Yağ ve diğer bakımlar: "her X km ya da Y ayda bir"; km tarihi, yakıt kayıtlarındaki günlük ortalama km'den tahmin edilir.
- Yerel bildirimler (expo-notifications); izin ilk hatırlatma kurulurken istenir, reddedilirse uygulama içinde rozet.
- Ana ekran: aracın özeti (sıradaki hatırlatmalar, son tüketim, bu ayki masraf).

### 4. İstatistikler, dışa aktarma ve ayarlar
- Aylık masraf (türe göre), tüketim grafiği, km başına maliyet, yıllık toplam; tarih aralığı seçimi.
- CSV dışa aktarma (yakıt, masraf; Excel'de Türkçe karakterler doğru), paylaş menüsüyle; ücretsiz.
- Ayarlar: dil, tema, para birimi biçimi, bildirimler, Hakkında (sürüm, gizlilik, iletişim), verileri sil.

### 5. Hesap ve eşitleme
- İlk açılış: "E-postayla devam et" / "Hesapsız devam et". Hesapsızda uyarı: "Telefonunu değiştirir ya da uygulamayı silersen kayıtların kaybolur"; kabul edilirse devam.
- Giriş: e-posta → 6 haneli kod → içeride. Şifre yok. Kod tekrar gönderme sayaçlı; hatalı kodda anlamlı mesaj.
- Hesapsız başlayan sonradan giriş yaparsa telefondaki kayıtlar hesaba yüklenir; hesapta zaten kayıt varsa ikisi birleştirilir.
- Çevrimdışı öncelikli eşitleme (aşağıda tasarım); internet gelince, uygulama öne gelince ve kayıttan sonra çalışır; hata kullanıcıyı durdurmaz.
- Çıkış yap (telefondaki kopyayı silme seçeneğiyle), hesap silme (Apple şartı; sunucudaki bütün kayıtlar silinir).
- RLS testleri: bir kullanıcının token'ı başkasının kaydını okuyamaz/yazamaz; kural bilerek bozulup testin düştüğü görülür.

### 6. Reklam ve "Reklamları kaldır"
- Tek banner, sadece İstatistikler ve Geçmiş ekranlarının altında. Giriş ekranlarında, açılışta ve tam ekran reklam yok.
- Sadece kişiselleştirilmemiş reklam: takip izni penceresi (ATT) yok. AB kullanıcıları için Google'ın onay penceresi (UMP).
- "Reklamları kaldır": tek seferlik uygulama içi satın alma (non-consumable), "Satın alımları geri yükle" düğmesi; satın alma hesaba değil Apple kimliğine bağlı (Apple'ın geri yükleme kuralı).
- Sandbox'ta satın alma ve geri yükleme denenir.

### 7. Ana ekran widget'ı
- Küçük ve orta boy: seçili aracın sıradaki hatırlatması ("Muayeneye 23 gün"), son tüketim, bu ayki masraf.
- Uygulama veriyi App Group'a yazar, widget okur; veri değişince widget yenilenir. Swift/SwiftUI, `@bacons/apple-targets` ile; Mac olmadığı için EAS'ta derlenir.

### 8. Son tarama, mağaza ve yayın
- Son tarama (hatalar, kenar durumları, güvenlik kuralları, bağımlılık denetimi).
- İkon, mağaza görselleri (TR/EN), mağaza metni ve anahtar kelimeler, gizlilik sayfası (portfolyoda), app-ads.txt (miracdeprem.com), App Store'a gönderim.
- SEO (portfolyo proje sayfası, repo açıklaması/topics, mağaza metni), README TR/EN + ekran görüntüleri, sonra v1.0.0 + Release.

## Sürüm 1.1 (karar: 2026-11-05)

1.0 incelemeye gönderilir; inceleme ve AdMob onayı beklenirken aşağıdakiler yapılır ve 1.1 olarak çıkar. Hepsi ücretsiz, sunucu ya da API anahtarı gerektirmez. Her madde tek parça.

### 9. Fişten yakıt girişi
- Yakıt ekleme ekranında "Fişi tara": kamera ya da galeri. Yazı tanıma telefonda yapılır (iOS Vision ya da ML Kit; Türkçe karakter desteğine göre seçilir); fiş hiçbir yere gönderilmez.
- Yazar kasa fişinden tarih, istasyon, yakıt türü, litre, birim fiyat ve toplam ayıklanır; bulunanlar forma dolar, kullanıcı kontrol edip kaydeder. Bulunamayan alan boş kalır, uydurulmaz.
- Ayıklayıcı saf TypeScript; gerçek fiş metinleriyle (farklı dağıtıcılar, LPG, okunamayan satırlar) test edilir.

### 10. Belge cüzdanı
- Araç başına belgeler: ruhsat, trafik sigortası poliçesi, kasko poliçesi, muayene raporu, diğer. Kameradan ya da galeriden fotoğraf; tam ekran görüntüleme.
- Dosyalar telefonda uygulamanın klasöründe. Hesap varsa Supabase Storage'a yedeklenir: kullanıcının kendi klasörü, Storage RLS kuralları, dosya türü ve boyut sınırı, kullanıcı başına kota; RLS testleri bozularak doğrulanır.
- Sigorta/kasko/muayene hatırlatması ilerleyince "Yeni belgeyi ekle" önerisi. Gizlilik metni güncellenir.

### 11. Akıllı bildirimler
- Ay başında geçen ayın özeti (toplam masraf, bir önceki aya göre fark).
- Son dolumlarda tüketim belirgin artarsa uyarı (lastik basıncı, bakım). Kurallar saf TypeScript, testli; eşikler gürültü üretmeyecek şekilde.
- İkisi de Ayarlar'dan ayrı ayrı kapatılabilir; yerel bildirim, sunucu yok.

### 12. Servis geçmişi PDF'i, kilit ekranı widget'ı ve hızlı ekleme
- Seçili aracın bakım, masraf ve yakıt özetinden PDF (araç bilgisi, kilometre, tarihli bakım listesi); paylaşım sayfasıyla gönderilir. Kullanıcı verisi kaçışlanır.
- Kilit ekranı widget'ı (dikdörtgen ve satır): sıradaki hatırlatma.
- Widget'a dokununca uygulama ilgili ekranda açılır; "Yakıt ekle" bağlantısı fiş tarayıcıya da gider.

### 13. 1.1 yayını
- Telefonda deneme listesi, mağaza metni ve ekran görüntüleri güncellemesi, gizlilik metni (belge yedeği), App Store'a 1.1 gönderimi, README güncellemesi, v1.1.0 + Release.

## Teknoloji ve gerekçeler

| Ne | Seçim | Neden |
|---|---|---|
| Uygulama | React Native + Expo SDK 58, TypeScript, Expo Router | Koyun & Kurt'taki deneyim; dosya tabanlı yönlendirme; EAS ile Mac'siz iOS derlemesi |
| Yerel veri | expo-sqlite + Drizzle ORM (göçler `drizzle-kit`) | İlişkisel veri (araç → kayıtlar), tipli sorgular, sürümlü göçler; çevrimdışı öncelik için asıl kaynak telefon |
| Sunucu | Supabase (Auth + PostgreSQL + RLS), ücretsiz katman | E-posta kodlu giriş hazır; yetki veritabanında (RLS); bir haftalık süreye uygun. Kendi API'miz daha uzun sürerdi |
| E-posta | Resend SMTP (Supabase'e bağlanır), ücretsiz: günde 100, ayda 3.000 | Supabase'in kendi e-postası saatte birkaç gönderimle sınırlı; alan adlı gönderim spam'e düşmez |
| Bildirim | expo-notifications (yerel) | Sunucu gerekmez; hatırlatmalar telefonda zamanlanır |
| Grafik | Kendi SVG bileşenlerim (react-native-svg) | İki basit grafik (yığılmış çubuk, çizgi) için kütüphane gereksizdi; görünüm tam kontrolde, Skia gerektirmez |
| Reklam | react-native-google-mobile-ads (AdMob) | Ücretsiz; kişiselleştirilmemiş istekle ATT gerekmez |
| Satın alma | expo-iap (StoreKit 2) | Expo modülü, development build ile çalışır; sunucusuz doğrulama yeterli (tek ürün, kilitli içerik yok) |
| Widget | @bacons/apple-targets + SwiftUI + App Group | Expo projesine yerel hedef ekler; EAS derler |
| Test | Jest (hesaplar, göçler, eşitleme mantığı), Supabase RLS testleri (gerçek bir test projesine karşı ya da yerel) | Kurallar telefonsuz denenir |

Not: Supabase ücretsiz projesi bir hafta hiç istek almazsa duraklatılır. Kullanıcı varken sorun değil; yayından sonra izlenir.

## Veri modeli (yerel ve sunucuda aynı)

Her tabloda: `id` (istemcide üretilen UUID), `user_id` (hesapsızda boş), `created_at`, `updated_at` (istemci saati, çakışmada karar), `deleted_at` (silme işareti; kayıt silinmez, eşitlenir), sunucuda ayrıca `server_updated_at` (tetikleyiciyle, çekme imleci).

- `vehicles`: name, make, model, year, plate, fuel_types (JSON), tank_liters, odometer_km
- `fuel_entries`: vehicle_id, date, odometer_km, liters, total_price, unit_price, fuel_type, is_full, station, note
- `expenses`: vehicle_id, date, odometer_km, category, subtype, amount, note
- `reminders`: vehicle_id, kind (inspection, traffic_insurance, casco, road_tax, service, custom), title, due_date, due_km, interval_months, interval_km, last_done_date, last_done_km, notify (JSON: kaç gün önce)

Yerelde ek: son çekme imleci anahtar-değer deposunda (`kv-store`), satırlarda `dirty` bayrağı.

## Eşitleme tasarımı

1. **Gönder:** `dirty` satırlar toplu olarak sunucuya upsert edilir. Sunucudaki satırın `updated_at`'i daha yeniyse istemcininki yazılmaz (son yazan kazanır, satır bazında). Başarılı satırların `dirty` bayrağı kalkar.
2. **Çek:** `server_updated_at > imleç` olan satırlar alınır, yerelde aynı kuralla birleştirilir, imleç ilerler.
3. **Silme:** `deleted_at` dolu satır her iki tarafta da gizlenir; 30 günden eski silinmişler temizlenir.
4. **Hesapsızdan hesaba:** girişte yerel satırlara `user_id` yazılır, hepsi `dirty` yapılır, gönder + çek.
5. **Güvenlik:** RLS; select/insert/update sadece `user_id = auth.uid()`; `user_id` istemciden gelse de sunucuda politikayla doğrulanır. Fiziksel silme sadece hesap silmede: `security definer` bir SQL fonksiyonu yalnızca çağıranın kendi kullanıcısını (`auth.uid()`) siler, tablolar `on delete cascade` ile temizlenir; servis anahtarı hiçbir yerde kullanılmaz.

## Güvenlik ve gizlilik

- Supabase "anon" anahtarı uygulamada durur (herkese açık olacak şekilde tasarlanmış); bütün yetki RLS'te. Servis anahtarı uygulamaya ve repoya girmez.
- Oturum token'ı iOS Anahtar Zinciri'nde (expo-secure-store), AsyncStorage'da değil.
- Kod girişinde Supabase'in hız sınırı; e-posta kodu 6 hane, kısa ömürlü.
- Kişisel veri: e-posta ve araç kayıtları. Plaka isteğe bağlı. Gizlilik metni: ne tutulur, nerede (Supabase, AB bölgesi), reklam SDK'sının ne topladığı, hesap silme.
- CSV dışa aktarmada formül enjeksiyonu önlemi (`=`, `+`, `-`, `@` ile başlayan metinlere önek).

## Görsel kimlik (1. issue'da kesinleşir)

Önce türdeki uygulamaların ekran görüntüleri incelenir; önceki projelerin renk ve yazı tipleri tekrarlanmaz. Yön önerisi: ruhsat belgesi ve gösterge paneli; sakin, kâğıt tonlu zemin, tek koyu ana renk, ölçü ibresi hissi veren tek vurgu rengi; rakamlar için okunaklı bir sayı yazı tipi.

## Yayın

- Sadece iOS, iPhone. Bundle id `com.miracdeprem.ruhsat`.
- EAS Build (ücretsiz kuyruk), EAS Submit; TestFlight'ta deneme, sonra inceleme.
- Mağaza adı "Ruhsat: Yakıt ve Bakım Takibi" (30 karakter sınırı); İngilizce yerelleştirmede "Ruhsat: Car Maintenance & Fuel". Bütün mağaza metinleri ve gizlilik etiketleri: `docs/store.md`.
