import Foundation

struct FloatemDeepLink: Equatable, Sendable {
    enum Destination: Equatable, Sendable {
        case mainWindow
        case floatingCard(WidgetEntityReference)
    }

    let destination: Destination

    init?(url: URL) {
        guard
            url.scheme?.lowercased() == "floatem",
            url.host?.lowercased() == "open",
            let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        else { return nil }

        let values = Dictionary(
            components.queryItems?.compactMap { item in
                item.value.map { (item.name, $0) }
            } ?? [],
            uniquingKeysWith: { first, _ in first }
        )
        if values.isEmpty {
            destination = .mainWindow
            return
        }
        guard
            values["mode"] == nil || values["mode"] == "floating",
            let kindValue = values["kind"],
            let kind = FloatemEntityKind(rawValue: kindValue),
            let id = values["id"]?.trimmingCharacters(in: .whitespacesAndNewlines),
            !id.isEmpty,
            id.count <= 256,
            id.unicodeScalars.allSatisfy({ !CharacterSet.controlCharacters.contains($0) })
        else { return nil }

        destination = .floatingCard(WidgetEntityReference(entityKind: kind, entityID: id))
    }

    static func url(for reference: WidgetEntityReference) -> URL? {
        var components = URLComponents()
        components.scheme = "floatem"
        components.host = "open"
        components.queryItems = [
            URLQueryItem(name: "kind", value: reference.entityKind.rawValue),
            URLQueryItem(name: "id", value: reference.entityID),
            URLQueryItem(name: "mode", value: "floating"),
        ]
        return components.url
    }
}
