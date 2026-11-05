import SwiftUI
import WidgetKit

// Ruhsat ana ekran widget'ı: seçili aracın sıradaki hatırlatması, son tüketimi ve bu ayki masrafı.
// Veri uygulamanın App Group'a yazdığı JSON'dur (src/features/widget/payload.ts); metinler orada uygulamanın dilinde
// hazırlanır. "Kaç gün kaldı" burada, son tarihten her gece yarısı yeniden hesaplanır: uygulama açılmasa da güncel kalır.

private let appGroup = "group.com.miracdeprem.ruhsat"
private let storageKey = "widget.summary"
private let isTurkish = Locale.current.language.languageCode?.identifier == "tr"

struct SummaryPayload: Decodable {
    struct Reminder: Decodable {
        let title: String
        let icon: String
        let dueDate: Double?
        let kmText: String?
    }

    struct Consumption: Decodable {
        let value: String
        let unit: String
    }

    struct Labels: Decodable {
        let next: String
        let consumption: String
        let month: String
        let days: String
        let overdue: String
        let today: String
        let noReminder: String
        let noVehicle: String
        let noConsumption: String
    }

    let vehicle: String?
    let reminder: Reminder?
    let consumption: Consumption?
    let month: String
    let labels: Labels

    static func load() -> SummaryPayload? {
        guard let text = UserDefaults(suiteName: appGroup)?.string(forKey: storageKey),
              let data = text.data(using: .utf8)
        else { return nil }
        return try? JSONDecoder().decode(SummaryPayload.self, from: data)
    }

    /// Widget galerisinde görünen örnek (gerçek veri yokken).
    static var sample: SummaryPayload {
        let due = Date().addingTimeInterval(23 * 86_400).timeIntervalSince1970 * 1000
        return SummaryPayload(
            vehicle: isTurkish ? "Clio" : "Clio",
            reminder: Reminder(title: isTurkish ? "Muayene" : "Inspection", icon: "checkmark.seal.fill", dueDate: due, kmText: nil),
            consumption: Consumption(value: isTurkish ? "6,4" : "6.4", unit: "L/100 km"),
            month: isTurkish ? "2.840 ₺" : "2,840 ₺",
            labels: Labels(
                next: isTurkish ? "SIRADAKİ" : "NEXT UP",
                consumption: isTurkish ? "SON TÜKETİM" : "LAST CONSUMPTION",
                month: isTurkish ? "BU AY" : "THIS MONTH",
                days: isTurkish ? "%d gün" : "%d days",
                overdue: isTurkish ? "%d gün geçti" : "%d days late",
                today: isTurkish ? "Bugün" : "Today",
                noReminder: isTurkish ? "Yaklaşan hatırlatma yok" : "Nothing due soon",
                noVehicle: isTurkish ? "Aracını ekle, özeti burada gör." : "Add your car to see a summary here.",
                noConsumption: isTurkish ? "İki tam dolumdan sonra" : "After two full fill-ups"
            )
        )
    }
}

struct SummaryEntry: TimelineEntry {
    let date: Date
    let payload: SummaryPayload?
}

struct SummaryProvider: TimelineProvider {
    func placeholder(in context: Context) -> SummaryEntry {
        SummaryEntry(date: Date(), payload: .sample)
    }

    func getSnapshot(in context: Context, completion: @escaping (SummaryEntry) -> Void) {
        completion(SummaryEntry(date: Date(), payload: context.isPreview ? .sample : (SummaryPayload.load() ?? .sample)))
    }

    /// Şimdi ve sonraki 7 gece yarısı için birer kayıt: gün sayısı her gece kendiliğinden azalır.
    /// Uygulamadaki her değişiklik widget'ı ayrıca hemen yeniletir.
    func getTimeline(in context: Context, completion: @escaping (Timeline<SummaryEntry>) -> Void) {
        let payload = SummaryPayload.load()
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        var entries = [SummaryEntry(date: Date(), payload: payload)]
        for day in 1...7 {
            if let date = calendar.date(byAdding: .day, value: day, to: today) {
                entries.append(SummaryEntry(date: date, payload: payload))
            }
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

/// Son tarihe kalan gün metni ve rengi: geçtiyse pas, bugün ya da 30 gün içindeyse amber, değilse mürekkep.
struct DueLabel {
    let text: String
    let color: Color

    init(reminder: SummaryPayload.Reminder, labels: SummaryPayload.Labels, now: Date) {
        guard let dueMs = reminder.dueDate else {
            text = reminder.kmText ?? ""
            color = Color("amber")
            return
        }
        let calendar = Calendar.current
        let due = Date(timeIntervalSince1970: dueMs / 1000)
        let days = calendar.dateComponents([.day], from: calendar.startOfDay(for: now), to: calendar.startOfDay(for: due)).day ?? 0
        if days < 0 {
            text = String(format: labels.overdue, -days)
            color = Color("rust")
        } else if days == 0 {
            text = labels.today
            color = Color("amber")
        } else {
            text = String(format: labels.days, days)
            color = days <= 30 ? Color("amber") : Color("ink")
        }
    }
}

struct ReminderBlock: View {
    let payload: SummaryPayload
    let now: Date
    let size: CGFloat

    var body: some View {
        if let reminder = payload.reminder {
            let due = DueLabel(reminder: reminder, labels: payload.labels, now: now)
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Image(systemName: reminder.icon)
                        .font(.caption)
                    Text(reminder.title)
                        .font(.caption.weight(.semibold))
                        .lineLimit(1)
                }
                .foregroundStyle(Color("ink"))
                Text(due.text)
                    .font(.system(size: size, weight: .bold, design: .monospaced))
                    .foregroundStyle(due.color)
                    .lineLimit(1)
                    .minimumScaleFactor(0.5)
                    .widgetAccentable()
            }
        } else {
            Text(payload.labels.noReminder)
                .font(.footnote.weight(.medium))
                .foregroundStyle(Color("muted"))
        }
    }
}

struct StatRow: View {
    let label: String
    let value: String
    let unit: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            // Etiket uygulamadan dilin kuralıyla büyük harf gelir (Türkçede i → İ).
            Text(label)
                .font(.system(size: 10, weight: .semibold))
                .tracking(0.8)
                .foregroundStyle(Color("muted"))
            HStack(alignment: .firstTextBaseline, spacing: 3) {
                Text(value)
                    .font(.system(size: 17, weight: .semibold, design: .monospaced))
                    .foregroundStyle(Color("ink"))
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                if let unit {
                    Text(unit)
                        .font(.caption2)
                        .foregroundStyle(Color("muted"))
                        .lineLimit(1)
                }
            }
        }
    }
}

struct NoVehicleView: View {
    let text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: "gauge.with.dots.needle.67percent")
                .font(.title2)
                .foregroundStyle(Color("amber"))
            Text(text)
                .font(.footnote.weight(.medium))
                .foregroundStyle(Color("ink"))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

struct SmallSummaryView: View {
    let entry: SummaryEntry

    var body: some View {
        let payload = entry.payload ?? .sample
        if let vehicle = payload.vehicle {
            VStack(alignment: .leading, spacing: 4) {
                Text(vehicle)
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(Color("muted"))
                    .lineLimit(1)
                Spacer(minLength: 0)
                ReminderBlock(payload: payload, now: entry.date, size: 28)
                Spacer(minLength: 0)
                if let consumption = payload.consumption {
                    StatRow(label: payload.labels.consumption, value: consumption.value, unit: consumption.unit)
                } else {
                    StatRow(label: payload.labels.month, value: payload.month, unit: nil)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        } else {
            NoVehicleView(text: payload.labels.noVehicle)
        }
    }
}

struct MediumSummaryView: View {
    let entry: SummaryEntry

    var body: some View {
        let payload = entry.payload ?? .sample
        if let vehicle = payload.vehicle {
            HStack(alignment: .top, spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(vehicle)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Color("muted"))
                        .lineLimit(1)
                    Text(payload.labels.next)
                        .font(.system(size: 10, weight: .semibold))
                        .tracking(0.8)
                        .foregroundStyle(Color("muted"))
                    Spacer(minLength: 0)
                    ReminderBlock(payload: payload, now: entry.date, size: 34)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)

                Rectangle()
                    .fill(Color("line"))
                    .frame(width: 1)

                VStack(alignment: .leading, spacing: 10) {
                    StatRow(
                        label: payload.labels.consumption,
                        value: payload.consumption?.value ?? "—",
                        unit: payload.consumption?.unit
                    )
                    StatRow(label: payload.labels.month, value: payload.month, unit: nil)
                    Spacer(minLength: 0)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            }
        } else {
            NoVehicleView(text: payload.labels.noVehicle)
        }
    }
}

struct SummaryWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SummaryEntry

    var body: some View {
        Group {
            switch family {
            case .systemMedium:
                MediumSummaryView(entry: entry)
            default:
                SmallSummaryView(entry: entry)
            }
        }
        .containerBackground(Color("paper"), for: .widget)
    }
}

struct SummaryWidget: Widget {
    let kind = "RuhsatSummary"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SummaryProvider()) { entry in
            SummaryWidgetView(entry: entry)
        }
        .configurationDisplayName(isTurkish ? "Araç özeti" : "Car summary")
        .description(isTurkish
            ? "Sıradaki hatırlatma, son tüketim ve bu ayki masraf."
            : "Next reminder, last consumption and this month's spend.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct RuhsatWidgetBundle: WidgetBundle {
    var body: some Widget {
        SummaryWidget()
    }
}
