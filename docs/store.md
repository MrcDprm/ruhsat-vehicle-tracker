# App Store kaydı

App Store Connect'e girilecek metinler ve cevaplar. Karakter sınırları ölçüldü (anahtar kelimeler bayt olarak: Türkçe harfler 2 bayt sayılır).

## Genel

| Alan | Değer |
|---|---|
| Bundle ID | `com.miracdeprem.ruhsat` |
| SKU | `ruhsat-ios` |
| Birincil kategori | Utilities (Araçlar) |
| İkincil kategori | Productivity (Verimlilik) |
| Fiyat | Ücretsiz |
| Uygulama içi satın alma | `com.miracdeprem.ruhsat.removeads` (Reklamları kaldır, tek seferlik) |
| Telif | 2026 Miraç Deprem |
| Destek URL'si | https://www.miracdeprem.com/projects/ruhsat |
| Gizlilik URL'si (TR) | https://www.miracdeprem.com/projects/ruhsat/privacy |
| Gizlilik URL'si (EN) | https://www.miracdeprem.com/en/projects/ruhsat/privacy |
| Yaş sınırı | 4+ (anketteki her soruya "Yok/Hayır"; reklam sorusuna "Evet") |
| Şifreleme | `ITSAppUsesNonExemptEncryption = false` (yalnız HTTPS); soru sorulmaz |

## Türkçe (birincil dil)

| Alan | Metin | Uzunluk |
|---|---|---|
| Ad | Ruhsat: Yakıt ve Bakım Takibi | 29/30 |
| Alt başlık | Muayene, sigorta ve MTV takibi | 30/30 |
| Anahtar kelimeler | `araç,araba,oto,benzin,dizel,lpg,tüketim,masraf,gider,kasko,servis,yağ,lastik,hatırlatma,defter` | 98/100 bayt |
| Tanıtım metni | Yakıtı, bakımı ve masrafı tek yerde tut. Muayene, sigorta, kasko ve MTV zamanı yaklaşınca haber verir. Hesapsız çalışır, hiçbir özelliği kilitli değil. | 151/170 |

Ad ve alt başlıktaki kelimeler (ruhsat, yakıt, bakım, takibi, muayene, sigorta, MTV) anahtar kelimelerde tekrar edilmez; Apple onları zaten arar.

### Açıklama

```
Ruhsat, aracının yakıt, bakım ve masraf defteri. Muayene, trafik sigortası, kasko, MTV ve bakım zamanlarını takip eder; günü yaklaşınca bildirim gönderir.

HESAP ŞART DEĞİL
Uygulamayı açar açmaz kullanırsın, kayıtların telefonunda durur. İstersen e-postanla giriş yaparsın: şifre yok, e-postana gelen 6 haneli kodla girersin. Giriş yapınca kayıtların yedeklenir ve telefonların arasında eşitlenir; telefon değiştirsen de hiçbir şey kaybolmaz. İnternet yokken de çalışır, bağlantı gelince eşitler.

YAKIT VE TÜKETİM
• Litre, tutar ve birim fiyattan ikisini yaz, üçüncüsü hesaplansın.
• Tüketim tam depodan tam depoya hesaplanır; kısmi dolumlar ortalamayı bozmaz.
• LPG'li araçlarda benzin ve LPG tüketimi ayrı gösterilir.
• 100 km'de litre, km başına maliyet ve aylık yakıt gideri.

BAKIM VE MASRAF
• Bakım, muayene, trafik sigortası, kasko, MTV, ceza, otopark ve otoyol, yıkama.
• Bakımda yapılanları işaretle: yağ, filtre, lastik, fren, akü.
• Girdiğin kilometre aracın göstergesini kendiliğinden günceller.

HATIRLATMALAR
• Muayene, trafik sigortası, kasko, MTV ve bakım için bildirim.
• Bakım hem tarihe hem kilometreye göre: kullanımına bakarak o kilometreye ne zaman geleceğini tahmin eder.
• İlgili masrafı girince sıradaki tarih kendiliğinden ilerler.

İSTATİSTİK VE DIŞA AKTARMA
• Aylık masraf ve tüketim grafikleri.
• Yakıt ve masraf kayıtlarını CSV olarak dışa aktar; Excel'de Türkçe karakterler bozulmadan açılır.

DAHA FAZLASI
• Birden fazla araç; marka ve model serbest yazılır.
• Ana ekran widget'ı: sıradaki hatırlatma, son tüketim, bu ayki masraf.
• Açık ve koyu tema, Türkçe ve İngilizce.

Hiçbir özellik kilitli değil. Uygulamada yalnızca İstatistik ve Geçmiş ekranlarında tek bir reklam var; tek seferlik bir satın almayla kaldırabilirsin.
```

## English

| Alan | Metin | Uzunluk |
|---|---|---|
| Name | Ruhsat: Car Maintenance & Fuel | 30/30 |
| Subtitle | Fuel log and service reminders | 30/30 |
| Keywords | `vehicle,auto,mileage,mpg,gas,petrol,diesel,lpg,expense,tracker,cost,insurance,inspection,odometer` | 97/100 bayt |
| Promotional text | Keep fuel, service and expenses in one place. Get reminded before inspection, insurance and road tax are due. Works without an account, no locked features. | 155/170 |

### Description

```
Ruhsat is a fuel, service and expense log for your car. It keeps track of inspection, insurance, road tax and service dates and sends a notification when one is coming up.

NO ACCOUNT NEEDED
Start using it right away; your entries stay on your phone. If you want, sign in with your email: there is no password, just a 6-digit code sent to your inbox. Once you sign in, your entries are backed up and synced between your phones, so nothing is lost when you switch phones. It works offline and syncs when you are back online.

FUEL AND CONSUMPTION
• Enter two of litres, total and unit price; the third is calculated.
• Consumption is measured from full tank to full tank, so partial fill-ups don't skew the average.
• For LPG cars, petrol and LPG consumption are shown separately.
• Litres per 100 km, cost per km and monthly fuel spending.

SERVICE AND EXPENSES
• Service, inspection, insurance, road tax, fines, parking and tolls, car wash.
• Tick what was done at a service: oil, filter, tyres, brakes, battery.
• The odometer you enter updates the car's reading automatically.

REMINDERS
• Notifications for inspection, insurance, road tax and service.
• Service by date and by distance: it estimates when you will reach that mileage from how much you drive.
• Adding the related expense moves the next due date forward automatically.

STATS AND EXPORT
• Monthly expense and consumption charts.
• Export fuel and expense entries as CSV.

AND MORE
• Multiple cars; make and model are free text.
• Home screen widget: next reminder, latest consumption, this month's spending.
• Light and dark mode, English and Turkish.

No features are locked. The app shows a single ad, only on the Stats and History screens; you can remove it with a one-time purchase.
```

## App Privacy (gizlilik etiketleri)

"Do you or your third-party partners collect data from this app?" → **Yes**. Hiçbir veri türü **izleme (tracking)** için kullanılmaz; ATT penceresi yok.

| Veri türü | Kim | Amaç | Kullanıcıya bağlı mı | İzleme |
|---|---|---|---|---|
| Contact Info → Email Address | Biz (Supabase, Resend) | App Functionality | Evet | Hayır |
| User Content → Other User Content (araç, yakıt, masraf, hatırlatma kayıtları) | Biz (Supabase) | App Functionality | Evet | Hayır |
| Identifiers → User ID (hesap kimliği) | Biz (Supabase) | App Functionality | Evet | Hayır |
| Identifiers → Device ID | Google AdMob | Third-Party Advertising, Analytics | Hayır | Hayır |
| Location → Coarse Location (IP'den) | Google AdMob | Third-Party Advertising, Analytics | Hayır | Hayır |
| Usage Data → Product Interaction | Google AdMob | Third-Party Advertising, Analytics | Hayır | Hayır |
| Usage Data → Advertising Data | Google AdMob | Third-Party Advertising, Analytics | Hayır | Hayır |
| Diagnostics → Crash Data, Performance Data | Google AdMob | Third-Party Advertising, Analytics | Hayır | Hayır |

- Hesapsız kullanımda bizim tarafımızda hiçbir veri toplanmaz; ama etiket uygulamanın tamamı için doldurulur, hesaplı kullanım dahil.
- Satın alma Apple'da kalır; geliştiriciye ödeme bilgisi gelmez, "Purchases" işaretlenmez.
- AdMob satırları Google'ın açıklamasına göredir: https://developers.google.com/admob/ios/privacy/data-disclosure. Girerken bu sayfayla son kez karşılaştır.

## App Review bilgileri

- **Sign-in required:** Hayır. Uygulamanın tamamı hesapsız kullanılabilir; hesap yalnızca yedekleme ve eşitleme içindir.
- **Notes (İngilizce).** Koyun & Kurt'ün ilk incelemesi "2.1 Information Needed" ile döndü: Apple fiziksel iPhone'da,
  açılıştan başlayan ekran kaydı ve aşağıdaki başlıkları istedi. Bu yüzden ilk gönderimde hepsi var.

2026-11-09 reddinden sonra not yazım kurallarına göre yeniden yazıldı ve satın almanın bu gönderimde olduğu eklendi.

```
WHAT THE APP IS
Ruhsat is a car log for drivers in Turkey: fuel fill-ups and consumption, service and other expenses, and reminders for the periodic vehicle inspection, compulsory traffic insurance, comprehensive insurance and the motor vehicle tax, MTV. Audience: individual car owners. The app is in Turkish and English.

HOW TO REVIEW
1. On the welcome screen tap Continue without an account. The whole app works without an account.
2. Tap Add a car, enter a name and the odometer, save. The reminder setup opens; set the dates and save.
3. Use the + button to add a fuel entry or an expense. Summary, History and Stats update.
4. Optional account: Settings > Account > Sign in with email. A 6-digit code is sent to the email address and there is no password, so any address you can read works. Signing in only backs up and syncs entries between devices.
A screen recording on a physical iPhone, starting from app launch, is attached.

ACCOUNT DELETION
Settings > Account > Delete account. It removes the account and all its entries from our server.

IN-APP PURCHASE
Remove Ads, product ID com.miracdeprem.ruhsat.removeads, non-consumable. It is included in this submission together with version 1.0. Settings > Ads > Remove ads shows the App Store price; after the purchase the banner disappears at once. Restore purchases is on the same screen. No feature is locked.

ADS
One Google AdMob banner, only on the Stats and History tabs. Ads are non-personalized; the app does not track users and does not show the App Tracking Transparency prompt. Users in the EEA and UK see Google's consent form.

EXTERNAL SERVICES
Supabase: database and authentication for the optional account, every row is protected by row level security. Resend: sends the sign-in code email. Google AdMob: ads. Apple StoreKit: the purchase. Entries are stored on the device; nothing is sent to our server unless the user signs in.

REGIONAL DIFFERENCES
Features are the same in every region. Reminder rules such as inspection intervals and the MTV payment months, January and July, follow Turkish regulations, and amounts are in Turkish lira.

REGULATED OR THIRD-PARTY CONTENT
None. The app does not provide legal, financial or insurance services; it only stores dates and amounts the user enters.
```

- **Ek:** fiziksel iPhone'da, açılıştan başlayan ekran kaydı (İngilizce arayüz): hesapsız başla → araç ekle →
  hatırlatmalar → yakıt ve masraf → Geçmiş ve İstatistik → e-postayla giriş ve eşitleme → Reklamlar → hesabı sil.
- Remove Ads satın alması sürümle aynı gönderimde olmak zorunda; nasıl ekleneceği bir sonraki bölümde.

## Uygulama içi satın alma

Monetization > In-App Purchases > Remove Ads. Bütün alanlar doluyken durum Prepare for Submission görünür ve
Add for Review açıktır; bir alan eksikse Missing Metadata görünür. Apple özellikle inceleme ekran görüntüsünü ister.
2026-11-10'da App Store Connect'teki değerler:

| Alan | Değer |
|---|---|
| Tür | Non-Consumable, tek seferlik |
| Reference Name | Remove Ads, yalnız App Store Connect'te görünür |
| Product ID | `com.miracdeprem.ruhsat.removeads`, koddaki `REMOVE_ADS_SKU` ile aynı |
| Family Sharing | Açık, bir kez açılınca kapatılamaz; kod aile üyesinin hakkını da tanır |
| Availability | All countries or regions |
| Price Schedule | Temel ülke Türkiye, TRY; 175 ülke, Apple kendisi ayarlar. Uygulama fiyatı App Store'dan okur |
| Offer Codes, Image | Boş; yalnız teklif kodu ya da App Store'da tanıtım için gerekir |
| Tax Category | App Store software |
| Review Information > Screenshot | Ayarlar ekranının Reklamlar bölümü: Reklamları kaldır ve Satın alımları geri yükle satırları |
| Review Information > Notes | Aşağıdaki kısa not; uygulamanın uzun notu buraya yapıştırılmaz |

| Dil | Display Name | Description |
|---|---|---|
| Turkish | Reklamları kaldır, 17 | İstatistik ve Geçmiş ekranlarındaki reklamı kaldırır., 53 |
| English (U.K.) | Remove Ads, 10 | Removes the ad on the Stats and History screens., 48 |
| English (U.S.) | Remove Ads, 10 | Removes the ad on the Stats and History screens., 48 |

Apple'ın ürün sayfası rehberi ad için 35, açıklama için 55 karakter sınırı veriyor; form 53 karakteri kabul etti.
English (U.S.) incelemenin yapıldığı ABD mağazası için eklenir; yoksa ödeme penceresinde Türkçe ad çıkabilir.

```
Settings > Ads > Remove ads. One-time purchase that removes the single banner ad shown on the Stats and History screens. Restore purchases is on the same screen. All features stay free.
```

### Gönderim

Bir uygulamanın ilk satın alması tek başına gönderilemez, uygulamanın bir sürümüyle aynı gönderimde incelenir. Sürüm
ve satın alma aynı taslak gönderimde toplanır:

1. Remove Ads sayfasında Add for Review. Taslak yoksa Create New Submission, platform iOS. Taslakta sürüm eklenmesini
   isteyen uyarı çıkar; sürüm eklenince kalkar.
2. Sürüm sayfasında Add for Review, listeden aynı taslak seçilir.
3. Taslakta iki öğe olmalı: 1.0 for iOS ve Remove Ads. Submit for Review ancak ikisi birlikteyken açılır.
4. Apple'ın gönderim e-postasında Number of items submitted: 2 yazar. 1 yazıyorsa satın alma pakette yoktur.

### Ret sonrası

1.0 derleme 8, 2026-11-09'da Guideline 2.1(b) ile döndü: gönderimde yalnız sürüm vardı, e-postada Number of items
submitted: 1 yazıyordu. Reddedilen gönderimin durumu Unresolved Issues olur ve içine öğe eklenemez. Oradaki Resubmit to
App Review yalnız içindeki öğeleri yeniden yollar, yani aynı ret tekrar gelir. Önceki gönderimde satın alma ayrı bir
taslakta tek başına kalmıştı; o taslak sürüm istediği için gönderilemiyordu.

2026-11-10'da işe yarayan sıra:

1. Satın almanın tek başına durduğu eski taslak silinir; satın alma Prepare for Submission durumuna döner.
2. Sürüm reddedilen gönderimden çıkarılır. Sürüm 1.0 Developer Rejected olur; onaylanmamış sürüm için bu bir kilit
   değildir, yeniden gönderime girebilir.
3. Remove Ads sayfasında Add for Review. Platform iOS ve sürüm 1.0, derleme 8 seçilir. Sürüm ve satın alma aynı yeni
   taslağa girer: taslakta will be reviewed together with iOS version 1.0 ve Items Ready to Submit (2) yazar, Submit for
   Review açılır. Satın almanın durumu Ready for Review olur.
4. Sürüm sayfasında inceleme notu, ek ve derleme kontrol edilip kaydedilir, sonra Submit for Review.

Yeni derleme gerekmedi: taslak mevcut derleme 8 ile oluştu. Taslak sürüm olmadan açılırsa sürüm
seçilemez, Unable to Submit for Review uyarısı çıkar; o zaman o taslak silinip 3. adım sürüm seçilerek yeniden yapılır.

Kaçınılacak: onaylanmış bir sürümü elle Developer Rejected yapmak. Forumda bu, satın almanın sürüme bir daha
bağlanamadığı bir kilide yol açmış.

## Ekran görüntüleri

6.5" iPhone yuvası için 1242×2688: telefondan alınan 828×1792 görüntü üstte başlıkla bu boyuta yerleştirilir
(828×1792'yi App Store Connect hiçbir yuvada kabul etmiyor). TR ve EN ayrı set, 6 ekran: Özet, Geçmiş, İstatistik,
yakıt ekleme, hatırlatma ayarları, widget. Açık tema, örnek verilerle: geliştirme derlemesinde Ayarlar > Geliştirme >
"Örnek verilerle doldur" (src/features/demo; mağaza derlemesine girmez). Widget görüntüsü TestFlight sürümünden.
