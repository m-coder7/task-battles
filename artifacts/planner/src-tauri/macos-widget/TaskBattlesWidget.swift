import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), completed: 3, total: 5, rivalRate: 60)
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(date: Date(), completed: 3, total: 5, rivalRate: 60)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        var entries: [SimpleEntry] = []
        let currentDate = Date()
        for hourOffset in 0 ..< 5 {
            let entryDate = Calendar.current.date(byAdding: .hour, value: hourOffset, to: currentDate)!
            entries.append(SimpleEntry(date: entryDate, completed: 3, total: 5, rivalRate: 60))
        }
        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let completed: Int
    let total: Int
    let rivalRate: Int
}

struct TaskBattlesWidgetEntryView : View {
    var entry: Provider.Entry
    var percent: Double {
        entry.total > 0 ? Double(entry.completed) / Double(entry.total) : 0
    }

    var body: some View {
        VStack(spacing: 8) {
            Text("Task Battles")
                .font(.caption)
                .foregroundColor(.orange)
            ProgressView(value: percent)
                .progressViewStyle(CircularProgressViewStyle(tint: .orange))
            Text("\(entry.completed)/\(entry.total)")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color.black)
    }
}

@main
struct TaskBattlesWidget: Widget {
    let kind: String = "TaskBattlesWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            TaskBattlesWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Daily Progress")
        .description("Shows your daily goal completion progress.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
