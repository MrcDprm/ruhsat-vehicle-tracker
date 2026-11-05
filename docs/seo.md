# SEO

Amaç: bu işi arayan biri uygulamayı bulsun. Ruhsat'ın kendi sitesi yok; aramada görünen yerler App Store sayfası,
portfolyodaki proje sayfası (`/projects/ruhsat`) ve GitHub reposu.

## Anahtar kelimeler

### Türkçe

| Tür | İfadeler |
|---|---|
| Genel | araç bakım takibi, yakıt takip uygulaması, araç masraf takibi, araba uygulaması |
| Uzun | benzin tüketimi hesaplama, 100 km yakıt tüketimi hesaplama, LPG tüketimi hesaplama, muayene hatırlatma uygulaması, trafik sigortası bitiş tarihi hatırlatma, kasko yenileme hatırlatma, MTV ödeme hatırlatma, yağ değişimi hatırlatma, araç defteri uygulaması, iPhone yakıt takip |

### English

| Tür | İfadeler |
|---|---|
| General | car maintenance tracker, fuel log app, car expense tracker, vehicle tracker |
| Long-tail | fuel consumption calculator, litres per 100 km, mileage tracker for iPhone, vehicle inspection reminder, car insurance renewal reminder, road tax reminder, oil change reminder app, LPG fuel consumption, full tank fuel economy |

## Nerede kullanıldı

- **App Store:** ad ve alt başlık, anahtar kelime alanı, açıklama, tanıtım metni ([store.md](store.md)). Ad ve alt
  başlıktaki kelimeler anahtar kelime alanında tekrar edilmez.
- **GitHub:** repo açıklaması, topics ve README'nin ilk paragrafı (iki dilde).
- **Portfolyo `/projects/ruhsat`:** başlık "Ruhsat: Yakıt ve Bakım Takibi (Muayene, Sigorta ve MTV Hatırlatma)",
  açıklama kart metninden; JSON-LD `MobileApplication` (iOS, `UtilitiesApplication`, ücretsiz) ve `SoftwareSourceCode`.
  İngilizce sayfa `/en/projects/ruhsat`, hreflang ve sitemap portfolyoda hazır.
- **GitHub Release:** v1.0.0 başlığı ve notları aynı kelimelerle (App Store onayından sonra).

## Kontrol

- Google Search Console: `/projects/ruhsat` ve `/en/projects/ruhsat` için URL denetimi → "Dizine eklenmeyi iste".
- App Store onayından sonra: README'deki "Yakında App Store'da" yerine mağaza bağlantısı, repo Website alanına
  mağaza bağlantısı, portfolyo kartında `liveUrl` mağaza bağlantısı (JSON-LD `url` o zaman mağaza sayfası olur).

Kelime doldurma yok: metinler insan için yazıldı, her ifade bir kez ve doğal cümle içinde geçer.
