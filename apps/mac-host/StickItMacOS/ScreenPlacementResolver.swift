import AppKit
import CoreGraphics

struct ScreenGeometry: Equatable {
    var identifier: String
    var visibleFrame: CGRect
    var isPrimary: Bool
}

enum WindowFrameClamper {
    static func clamp(_ frame: CGRect, to visibleFrame: CGRect, maximumScreenFraction: CGFloat = 0.95) -> CGRect {
        let maximumWidth = max(1, visibleFrame.width * maximumScreenFraction)
        let maximumHeight = max(1, visibleFrame.height * maximumScreenFraction)
        let size = CGSize(
            width: min(max(1, frame.width), maximumWidth),
            height: min(max(1, frame.height), maximumHeight)
        )
        let maximumX = max(visibleFrame.minX, visibleFrame.maxX - size.width)
        let maximumY = max(visibleFrame.minY, visibleFrame.maxY - size.height)
        return CGRect(
            x: min(max(frame.minX, visibleFrame.minX), maximumX),
            y: min(max(frame.minY, visibleFrame.minY), maximumY),
            width: size.width,
            height: size.height
        )
    }
}

enum ScreenPlacementResolver {
    static func resolve(_ state: FloatingCardWindowState, screens: [ScreenGeometry]) -> CGRect? {
        guard !screens.isEmpty else { return nil }
        let savedFrame = state.frame.cgRect
        let matchedByIdentifier = state.screenIdentifier.flatMap { identifier in
            screens.first(where: { $0.identifier == identifier })
        }
        let bestIntersectingScreen = screens.max(by: {
                $0.visibleFrame.intersection(savedFrame).area < $1.visibleFrame.intersection(savedFrame).area
            })
        let target = matchedByIdentifier
            ?? bestIntersectingScreen.flatMap {
                $0.visibleFrame.intersection(savedFrame).area > 0 ? $0 : nil
            }
            ?? screens.first(where: \.isPrimary)
            ?? screens[0]

        var proposedFrame = savedFrame
        if matchedByIdentifier != nil, let normalized = state.normalizedPosition {
            let availableWidth = max(0, target.visibleFrame.width - proposedFrame.width)
            let availableHeight = max(0, target.visibleFrame.height - proposedFrame.height)
            proposedFrame.origin = CGPoint(
                x: target.visibleFrame.minX + min(max(normalized.x, 0), 1) * availableWidth,
                y: target.visibleFrame.minY + min(max(normalized.y, 0), 1) * availableHeight
            )
        }
        return WindowFrameClamper.clamp(proposedFrame, to: target.visibleFrame)
    }

    @MainActor
    static func currentScreens() -> [ScreenGeometry] {
        NSScreen.screens.map { screen in
            ScreenGeometry(
                identifier: stableIdentifier(for: screen),
                visibleFrame: screen.visibleFrame,
                isPrimary: screen == NSScreen.main
            )
        }
    }

    @MainActor
    static func state(
        for reference: WidgetEntityReference,
        frame: CGRect,
        isAlwaysOnTop: Bool
    ) -> FloatingCardWindowState {
        let screens = currentScreens()
        let screen = screens.max(by: { $0.visibleFrame.intersection(frame).area < $1.visibleFrame.intersection(frame).area })
        let visibleFrame = screen?.visibleFrame
        let normalized = visibleFrame.map { visibleFrame -> CodablePoint in
            let availableWidth = max(1, visibleFrame.width - frame.width)
            let availableHeight = max(1, visibleFrame.height - frame.height)
            return CodablePoint(
                x: Double((frame.minX - visibleFrame.minX) / availableWidth),
                y: Double((frame.minY - visibleFrame.minY) / availableHeight)
            )
        }
        return FloatingCardWindowState(
            entityKind: reference.entityKind,
            entityID: reference.entityID,
            frame: CodableRect(frame),
            screenIdentifier: screen?.identifier,
            screenVisibleFrame: visibleFrame.map(CodableRect.init),
            normalizedPosition: normalized,
            isAlwaysOnTop: isAlwaysOnTop,
            updatedAt: Date()
        )
    }

    @MainActor
    static func stableIdentifier(for screen: NSScreen) -> String {
        guard let number = screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber else {
            return "screen:\(screen.frame.origin.x):\(screen.frame.origin.y)"
        }
        let displayID = CGDirectDisplayID(number.uint32Value)
        if let uuid = CGDisplayCreateUUIDFromDisplayID(displayID)?.takeRetainedValue() {
            return CFUUIDCreateString(nil, uuid) as String
        }
        return "display:\(displayID)"
    }
}

private extension CGRect {
    var area: CGFloat { isNull ? 0 : width * height }
}

private extension CodableRect {
    init(_ rect: CGRect) {
        self.init(x: rect.minX, y: rect.minY, width: rect.width, height: rect.height)
    }

    var cgRect: CGRect {
        CGRect(x: x, y: y, width: width, height: height)
    }
}
