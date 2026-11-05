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
- **Notes (İngilizce):**

```
Ruhsat works fully without an account: on the welcome screen tap "Continue without an account" ("Hesapsız devam et").

Signing in is optional and only used for backup and sync between devices. It uses a 6-digit code sent by email (no password), so you can sign in with any email address you can read. A screen recording of the sign-in flow is attached.

Account deletion: Settings > Account > Delete account.
In-app purchase "Remove Ads" (com.miracdeprem.ruhsat.removeads): Settings > Ads > Remove ads. "Restore purchases" is on the same screen. The banner ad appears only on the Stats and History tabs.

Ads are non-personalized; the app does not request tracking permission.
```

- **Ek:** giriş akışının kısa ekran kaydı (e-posta → kod → kayıtlar eşitlendi).
- Sürüm sayfasında **In-App Purchases** bölümünden "Remove Ads" bu sürüme eklenir (ilk IAP, uygulamanın ilk sürümüyle birlikte gönderilmek zorunda).

## Ekran görüntüleri

6.9" iPhone için 1206×2622 (Apple küçük boyutları bundan üretir). TR ve EN ayrı set, 5 ekran: Ana ekran (yakıt kartı + sıradaki hatırlatma), yakıt ekleme, istatistik, hatırlatmalar, widget. Production derlemesinden, gerçek görünümlü örnek verilerle alınır.
