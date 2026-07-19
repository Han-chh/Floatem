import AppIntents
import SwiftUI
import WidgetKit

private enum WidgetStore {
    static func load() -> SharedDataStore? { SharedDataStore() }
}

struct NoteWidgetEntity: AppEntity, Identifiable, Hashable {
    static let typeDisplayRepresentation = TypeDisplayRepresentation(name: "Note")
    static let defaultQuery = NoteWidgetEntityQuery()

    let id: String
    let title: String
    let summary: String
    let colorHex: String
    let updatedAt: Date

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(title)", subtitle: "\(summary)")
    }

    init(snapshot: NoteWidgetSnapshot) {
        id = snapshot.entityID
        title = snapshot.title
        summary = snapshot.summary
        colorHex = snapshot.colorHex
        updatedAt = snapshot.updatedAt
    }
}

struct TodoWidgetEntity: AppEntity, Identifiable, Hashable {
    static let typeDisplayRepresentation = TypeDisplayRepresentation(name: "Todo")
    static let defaultQuery = TodoWidgetEntityQuery()

    let id: String
    let title: String
    let isCompleted: Bool
    let dueDateKey: String?
    let reminderAt: Date?

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(title)", subtitle: isCompleted ? "Completed" : "Open")
    }

    init(snapshot: TodoWidgetSnapshot) {
        id = snapshot.entityID
        title = snapshot.title
        isCompleted = snapshot.isCompleted
        dueDateKey = snapshot.dueDateKey
        reminderAt = snapshot.reminderAt
    }
}

struct NoteWidgetEntityQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [NoteWidgetEntity] {
        try (WidgetStore.load()?.noteSnapshots() ?? [])
            .filter { identifiers.contains($0.entityID) }
            .map(NoteWidgetEntity.init)
    }

    func suggestedEntities() async throws -> [NoteWidgetEntity] {
        guard let store = WidgetStore.load() else { return [] }
        var snapshots = try store.noteSnapshots()
        if let preferredID = try store.latestRequestedEntity(kind: .note)?.entityID,
           let index = snapshots.firstIndex(where: { $0.entityID == preferredID }) {
            snapshots.insert(snapshots.remove(at: index), at: 0)
        }
        return snapshots.map(NoteWidgetEntity.init)
    }

    func defaultResult() async -> NoteWidgetEntity? {
        try? await suggestedEntities().first
    }
}

struct TodoWidgetEntityQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [TodoWidgetEntity] {
        try (WidgetStore.load()?.todoSnapshots() ?? [])
            .filter { identifiers.contains($0.entityID) }
            .map(TodoWidgetEntity.init)
    }

    func suggestedEntities() async throws -> [TodoWidgetEntity] {
        guard let store = WidgetStore.load() else { return [] }
        var snapshots = try store.todoSnapshots()
        if let preferredID = try store.latestRequestedEntity(kind: .todo)?.entityID,
           let index = snapshots.firstIndex(where: { $0.entityID == preferredID }) {
            snapshots.insert(snapshots.remove(at: index), at: 0)
        }
        return snapshots.map(TodoWidgetEntity.init)
    }

    func defaultResult() async -> TodoWidgetEntity? {
        try? await suggestedEntities().first
    }
}

struct NoteWidgetConfigurationIntent: WidgetConfigurationIntent {
    static let title: LocalizedStringResource = "Choose Note"
    static let description = IntentDescription("Select the note shown by this Widget.")

    @Parameter(title: "Note") var note: NoteWidgetEntity?
}

struct TodoWidgetConfigurationIntent: WidgetConfigurationIntent {
    static let title: LocalizedStringResource = "Choose Todo"
    static let description = IntentDescription("Select the todo shown by this Widget.")

    @Parameter(title: "Todo") var todo: TodoWidgetEntity?
}

struct ToggleTodoWidgetIntent: AppIntent {
    static let title: LocalizedStringResource = "Toggle Todo"
    static let openAppWhenRun = false

    @Parameter(title: "Todo ID") var todoID: String

    init() {}

    init(todoID: String) {
        self.todoID = todoID
    }

    func perform() async throws -> some IntentResult {
        guard let store = WidgetStore.load(), var root = try store.readJSONObject(filename: SharedDataStore.todosFilename) else {
            return .result()
        }

        if var document = root as? [String: Any], var items = document["items"] as? [[String: Any]] {
            guard let index = items.firstIndex(where: { $0["id"] as? String == todoID }) else { return .result() }
            items[index]["done"] = !(items[index]["done"] as? Bool ?? false)
            document["items"] = items
            root = document
        } else if var items = root as? [[String: Any]] {
            guard let index = items.firstIndex(where: { $0["id"] as? String == todoID }) else { return .result() }
            items[index]["done"] = !(items[index]["done"] as? Bool ?? false)
            root = items
        } else {
            return .result()
        }

        try store.writeJSONObject(root, filename: SharedDataStore.todosFilename)
        WidgetCenter.shared.reloadTimelines(ofKind: "StickItTodoWidget")
        return .result()
    }
}

struct NoteWidgetEntry: TimelineEntry {
    let date: Date
    let note: NoteWidgetSnapshot?
    let requestedID: String?
}

struct TodoWidgetEntry: TimelineEntry {
    let date: Date
    let todo: TodoWidgetSnapshot?
    let requestedID: String?
}

struct NoteWidgetProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> NoteWidgetEntry {
        NoteWidgetEntry(date: Date(), note: NoteWidgetSnapshot(entityID: "preview", title: "StickIt Note", summary: "Your note appears here.", colorHex: "#FF7A59", updatedAt: Date()), requestedID: "preview")
    }

    func snapshot(for configuration: NoteWidgetConfigurationIntent, in context: Context) async -> NoteWidgetEntry {
        entry(for: configuration)
    }

    func timeline(for configuration: NoteWidgetConfigurationIntent, in context: Context) async -> Timeline<NoteWidgetEntry> {
        Timeline(entries: [entry(for: configuration)], policy: .after(Date().addingTimeInterval(15 * 60)))
    }

    private func entry(for configuration: NoteWidgetConfigurationIntent) -> NoteWidgetEntry {
        let id = configuration.note?.id
        let snapshot = try? WidgetStore.load()?.noteSnapshots().first(where: { $0.entityID == id })
        return NoteWidgetEntry(date: Date(), note: snapshot ?? nil, requestedID: id)
    }
}

struct TodoWidgetProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> TodoWidgetEntry {
        TodoWidgetEntry(date: Date(), todo: TodoWidgetSnapshot(entityID: "preview", title: "Finish a task", isCompleted: false, dueDateKey: nil, reminderAt: nil, updatedAt: Date()), requestedID: "preview")
    }

    func snapshot(for configuration: TodoWidgetConfigurationIntent, in context: Context) async -> TodoWidgetEntry {
        entry(for: configuration)
    }

    func timeline(for configuration: TodoWidgetConfigurationIntent, in context: Context) async -> Timeline<TodoWidgetEntry> {
        Timeline(entries: [entry(for: configuration)], policy: .after(Date().addingTimeInterval(15 * 60)))
    }

    private func entry(for configuration: TodoWidgetConfigurationIntent) -> TodoWidgetEntry {
        let id = configuration.todo?.id
        let snapshot = try? WidgetStore.load()?.todoSnapshots().first(where: { $0.entityID == id })
        return TodoWidgetEntry(date: Date(), todo: snapshot ?? nil, requestedID: id)
    }
}

private struct MissingWidgetContent: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: "questionmark.square.dashed")
                .font(.title2)
            Text("Content unavailable")
                .font(.headline)
            Text("Open StickIt to choose another item.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

private struct NoteWidgetView: View {
    let entry: NoteWidgetEntry

    var body: some View {
        Group {
            if let note = entry.note {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Circle().fill(Color(hex: note.colorHex)).frame(width: 10, height: 10)
                        Text(note.title).font(.headline).lineLimit(2)
                    }
                    Text(note.summary.isEmpty ? "No text" : note.summary)
                        .font(.body)
                        .foregroundStyle(.secondary)
                        .lineLimit(5)
                    Spacer(minLength: 0)
                    Text(note.updatedAt, style: .relative)
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
                .widgetURL(StickItDeepLink.url(for: WidgetEntityReference(entityKind: .note, entityID: note.entityID)))
            } else {
                MissingWidgetContent().widgetURL(URL(string: "stickit://open"))
            }
        }
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

private struct TodoWidgetView: View {
    let entry: TodoWidgetEntry

    var body: some View {
        Group {
            if let todo = entry.todo {
                VStack(alignment: .leading, spacing: 10) {
                    HStack(alignment: .top) {
                        Button(intent: ToggleTodoWidgetIntent(todoID: todo.entityID)) {
                            Image(systemName: todo.isCompleted ? "checkmark.circle.fill" : "circle")
                        }
                        .buttonStyle(.plain)
                        Text(todo.title)
                            .font(.headline)
                            .strikethrough(todo.isCompleted)
                            .lineLimit(4)
                    }
                    Spacer(minLength: 0)
                    if let reminderAt = todo.reminderAt {
                        Label {
                            Text(reminderAt, style: .relative)
                        } icon: {
                            Image(systemName: "bell")
                        }
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    } else if let dueDateKey = todo.dueDateKey {
                        Label(dueDateKey, systemImage: "calendar")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .widgetURL(StickItDeepLink.url(for: WidgetEntityReference(entityKind: .todo, entityID: todo.entityID)))
            } else {
                MissingWidgetContent().widgetURL(URL(string: "stickit://open"))
            }
        }
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

struct StickItNoteWidget: Widget {
    static let kind = "StickItNoteWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: Self.kind, intent: NoteWidgetConfigurationIntent.self, provider: NoteWidgetProvider()) { entry in
            NoteWidgetView(entry: entry)
        }
        .configurationDisplayName("StickIt Note")
        .description("Show a note and open it in a floating editor.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct StickItTodoWidget: Widget {
    static let kind = "StickItTodoWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: Self.kind, intent: TodoWidgetConfigurationIntent.self, provider: TodoWidgetProvider()) { entry in
            TodoWidgetView(entry: entry)
        }
        .configurationDisplayName("StickIt Todo")
        .description("Track and complete a todo from the desktop.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

private extension Color {
    init(hex: String) {
        let value = UInt64(hex.trimmingCharacters(in: CharacterSet(charactersIn: "#")), radix: 16) ?? 0xFF7A59
        self.init(
            red: Double((value >> 16) & 0xFF) / 255,
            green: Double((value >> 8) & 0xFF) / 255,
            blue: Double(value & 0xFF) / 255
        )
    }
}

@main
struct StickItWidgetBundle: WidgetBundle {
    var body: some Widget {
        StickItNoteWidget()
        StickItTodoWidget()
    }
}
