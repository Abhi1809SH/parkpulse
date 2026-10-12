import WidgetKit
import SwiftUI

private let endpoint = URL(string: "https://qogvbexjjipuduhppaup.supabase.co/functions/v1/widget-availability")!

struct WidgetAvailability: Decodable {
    let carFree: Int
    let carTotal: Int
    let bikeFree: Int
    let bikeTotal: Int
    let totalFree: Int
    let totalSpaces: Int
    let fetchedAt: String

    enum CodingKeys: String, CodingKey {
        case carFree = "car_free"
        case carTotal = "car_total"
        case bikeFree = "bike_free"
        case bikeTotal = "bike_total"
        case totalFree = "total_free"
        case totalSpaces = "total_spaces"
        case fetchedAt = "fetched_at"
    }

    static let placeholder = WidgetAvailability(carFree: 5, carTotal: 5, bikeFree: 10, bikeTotal: 10, totalFree: 15, totalSpaces: 15, fetchedAt: "")
}

struct ParkPulseEntry: TimelineEntry {
    let date: Date
    let availability: WidgetAvailability?
}

struct ParkPulseProvider: TimelineProvider {
    func placeholder(in context: Context) -> ParkPulseEntry {
        ParkPulseEntry(date: .now, availability: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (ParkPulseEntry) -> Void) {
        completion(ParkPulseEntry(date: .now, availability: .placeholder))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ParkPulseEntry>) -> Void) {
        Task {
            let availability = try? await fetchAvailability()
            let entry = ParkPulseEntry(date: .now, availability: availability)
            let next = Calendar.current.date(byAdding: .minute, value: 15, to: .now) ?? .now.addingTimeInterval(900)
            completion(Timeline(entries: [entry], policy: .after(next)))
        }
    }

    private func fetchAvailability() async throws -> WidgetAvailability {
        var request = URLRequest(url: endpoint)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.timeoutInterval = 8
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(WidgetAvailability.self, from: data)
    }
}

struct ParkPulseWidgetView: View {
    let entry: ParkPulseEntry

    var body: some View {
        Group {
            if let a = entry.availability {
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Text("ParkPulse")
                            .font(.headline.bold())
                        Spacer()
                        Text("\(a.totalFree) of \(a.totalSpaces) free")
                            .font(.caption.bold())
                            .foregroundStyle(.secondary)
                    }

                    HStack(spacing: 10) {
                        Link(destination: URL(string: "parkpulse://parking/car")!) {
                            parkingTile(icon: "car.fill", title: "CAR", free: a.carFree, total: a.carTotal)
                        }
                        Link(destination: URL(string: "parkpulse://parking/bike")!) {
                            parkingTile(icon: "bicycle", title: "BIKE", free: a.bikeFree, total: a.bikeTotal)
                        }
                    }

                    Text("Updated \(entry.date, style: .time) · tap a type to choose a space")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    Text("ParkPulse").font(.headline.bold())
                    Text("Availability unavailable")
                        .font(.title3.bold())
                    Text("Open ParkPulse to refresh")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .containerBackground(for: .widget) {
            LinearGradient(colors: [Color(red: 0.12, green: 0.10, blue: 0.23), Color(red: 0.20, green: 0.17, blue: 0.38)], startPoint: .topLeading, endPoint: .bottomTrailing)
        }
        .foregroundStyle(.white)
    }

    @ViewBuilder
    private func parkingTile(icon: String, title: String, free: Int, total: Int) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Label(title, systemImage: icon)
                .font(.caption.bold())
            Text("\(free)/\(total)")
                .font(.title2.bold())
            Text("free")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(.white.opacity(0.09), in: RoundedRectangle(cornerRadius: 14))
    }
}

struct ParkPulseWidget: Widget {
    let kind = "ParkPulseWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ParkPulseProvider()) { entry in
            ParkPulseWidgetView(entry: entry)
        }
        .configurationDisplayName("ParkPulse")
        .description("See live car and bike parking availability.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
