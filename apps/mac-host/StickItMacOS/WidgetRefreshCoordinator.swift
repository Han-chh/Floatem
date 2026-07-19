import Foundation
import WidgetKit

@MainActor
final class WidgetRefreshCoordinator {
    private var pendingWorkItem: DispatchWorkItem?

    func requestReload(after delay: TimeInterval = 0.8) {
        pendingWorkItem?.cancel()
        let workItem = DispatchWorkItem {
            WidgetCenter.shared.reloadAllTimelines()
        }
        pendingWorkItem = workItem
        DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: workItem)
    }

    func reloadImmediately() {
        pendingWorkItem?.cancel()
        pendingWorkItem = nil
        WidgetCenter.shared.reloadAllTimelines()
    }
}

