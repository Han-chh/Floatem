import AppKit

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
    .appendingPathComponent("App Store Distribution/screenshots")
let sourceRoot = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
    .appendingPathComponent("App Store Distribution/source")
let rawURL = sourceRoot.appendingPathComponent("cropped-raw.png")
let raw = NSImage(contentsOf: rawURL)!
raw.size = NSSize(width: 800, height: 1424)

func makeImage(_ size: NSSize, draw: (NSGraphicsContext) -> Void) -> NSBitmapImageRep {
    let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil, pixelsWide: Int(size.width), pixelsHigh: Int(size.height),
        bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0
    )!
    let context = NSGraphicsContext(bitmapImageRep: rep)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = context
    draw(context)
    NSGraphicsContext.restoreGraphicsState()
    return rep
}

func write(_ rep: NSBitmapImageRep, _ name: String) {
    try! rep.representation(using: .png, properties: [:])!.write(to: root.appendingPathComponent(name))
}

func text(_ string: String, in rect: NSRect, size: CGFloat, color: NSColor, weight: NSFont.Weight = .regular) {
    let font = NSFont.systemFont(ofSize: size, weight: weight)
    let paragraph = NSMutableParagraphStyle()
    paragraph.lineBreakMode = .byWordWrapping
    let attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: color, .paragraphStyle: paragraph]
    NSAttributedString(string: string, attributes: attrs).draw(in: rect)
}

func rounded(_ rect: NSRect, radius: CGFloat, fill: NSColor, stroke: NSColor? = nil, width: CGFloat = 0) {
    let path = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
    fill.setFill(); path.fill()
    if let stroke { stroke.setStroke(); path.lineWidth = width; path.stroke() }
}

let appSize = NSSize(width: 800, height: 1424)
let appRep = makeImage(appSize) { _ in
    raw.draw(in: NSRect(origin: .zero, size: appSize), from: NSRect(origin: .zero, size: appSize), operation: .copy, fraction: 1)
    NSColor(calibratedRed: 0.98, green: 0.96, blue: 0.92, alpha: 1).setFill()
    NSBezierPath(rect: NSRect(x: 205, y: 1231, width: 340, height: 42)).fill()
    text("让思绪，浮在眼前。", in: NSRect(x: 214, y: 1239, width: 300, height: 28), size: 19, color: NSColor(calibratedRed: 0.46, green: 0.31, blue: 0.25, alpha: 1))
    // Source is vertically flipped during crop, so place edits using bottom-left coordinates.
    rounded(NSRect(x: 106, y: 856, width: 582, height: 78), radius: 24, fill: NSColor(calibratedRed: 1, green: 0.992, blue: 0.973, alpha: 1), stroke: NSColor(calibratedRed: 0.85, green: 0.79, blue: 0.72, alpha: 1), width: 3)
    text("灵感来了，随手记下", in: NSRect(x: 130, y: 876, width: 500, height: 38), size: 27, color: NSColor(calibratedWhite: 0.15, alpha: 1), weight: .semibold)
    rounded(NSRect(x: 106, y: 552, width: 582, height: 148), radius: 20, fill: NSColor(calibratedRed: 1, green: 0.992, blue: 0.973, alpha: 1), stroke: NSColor(calibratedRed: 0.85, green: 0.79, blue: 0.72, alpha: 1), width: 3)
    text("拖出悬浮卡片，\n让重要的事始终在眼前。", in: NSRect(x: 130, y: 584, width: 480, height: 86), size: 23, color: NSColor(calibratedRed: 0.20, green: 0.17, blue: 0.15, alpha: 1))
}
write(appRep, "floatem-cn-base.png")

let themes: [(String, NSColor, NSColor)] = [
    ("01-经典色", NSColor(calibratedRed: 0.94, green: 0.91, blue: 0.84, alpha: 1), NSColor(calibratedRed: 0.53, green: 0.33, blue: 0.23, alpha: 1)),
    ("02-浮光", NSColor(calibratedRed: 0.98, green: 0.83, blue: 0.78, alpha: 1), NSColor(calibratedRed: 0.82, green: 0.29, blue: 0.40, alpha: 1)),
    ("03-梅", NSColor(calibratedRed: 0.58, green: 0.13, blue: 0.25, alpha: 1), NSColor(calibratedRed: 1.0, green: 0.90, blue: 0.92, alpha: 1)),
    ("04-兰", NSColor(calibratedRed: 0.81, green: 0.93, blue: 0.87, alpha: 1), NSColor(calibratedRed: 0.16, green: 0.42, blue: 0.35, alpha: 1)),
    ("05-竹", NSColor(calibratedRed: 0.10, green: 0.25, blue: 0.18, alpha: 1), NSColor(calibratedRed: 0.90, green: 0.96, blue: 0.86, alpha: 1)),
    ("06-菊", NSColor(calibratedRed: 0.98, green: 0.78, blue: 0.28, alpha: 1), NSColor(calibratedRed: 0.25, green: 0.19, blue: 0.08, alpha: 1))
]

for (name, background, foreground) in themes {
    let rep = makeImage(NSSize(width: 2880, height: 1800)) { _ in
        background.setFill(); NSBezierPath(rect: NSRect(x: 0, y: 0, width: 2880, height: 1800)).fill()
        let glow = NSColor(calibratedWhite: 1, alpha: 0.12)
        glow.setFill(); NSBezierPath(ovalIn: NSRect(x: -180, y: 1050, width: 1600, height: 780)).fill()
        text("六种主题，随心切换", in: NSRect(x: 210, y: 1090, width: 1200, height: 130), size: 88, color: foreground, weight: .bold)
        text(name.replacingOccurrences(of: "0", with: "").replacingOccurrences(of: "1", with: "").replacingOccurrences(of: "2", with: "").replacingOccurrences(of: "3", with: "").replacingOccurrences(of: "4", with: "").replacingOccurrences(of: "5", with: "").replacingOccurrences(of: "6", with: "").replacingOccurrences(of: "-", with: ""), in: NSRect(x: 216, y: 980, width: 700, height: 70), size: 40, color: foreground)
        appRep.draw(in: NSRect(x: 1670, y: 120, width: 1012, height: 1680), from: NSRect(origin: .zero, size: appSize), operation: .sourceOver, fraction: 1, respectFlipped: false, hints: nil)
    }
    write(rep, "\(name).png")
}

func loadBackground(_ name: String) -> NSImage {
    let image = NSImage(contentsOf: sourceRoot.appendingPathComponent(name))!
    image.size = NSSize(width: 2880, height: 1800)
    return image
}

let videoBackground = loadBackground("background-video.png")
let codeBackground = loadBackground("background-code.png")
let desktopBackground = loadBackground("background-desktop.png")

func screenshotScene(_ name: String, background: NSImage, title: String, subtitle: String, drawContent: @escaping () -> Void) {
    let rep = makeImage(NSSize(width: 2880, height: 1800)) { _ in
        background.draw(in: NSRect(x: 0, y: 0, width: 2880, height: 1800), from: NSRect(x: 0, y: 0, width: 2880, height: 1800), operation: .copy, fraction: 1)
        let veil = NSColor(calibratedWhite: 0, alpha: 0.18)
        veil.setFill(); NSBezierPath(rect: NSRect(x: 0, y: 0, width: 2880, height: 1800)).fill()
        rounded(NSRect(x: 120, y: 1330, width: 1160, height: 290), radius: 42, fill: NSColor(calibratedWhite: 1, alpha: 0.91))
        text(title, in: NSRect(x: 190, y: 1482, width: 1000, height: 88), size: 74, color: NSColor(calibratedRed: 0.13, green: 0.15, blue: 0.20, alpha: 1), weight: .bold)
        text(subtitle, in: NSRect(x: 194, y: 1390, width: 980, height: 70), size: 34, color: NSColor(calibratedRed: 0.26, green: 0.29, blue: 0.34, alpha: 1))
        drawContent()
    }
    write(rep, name)
}

screenshotScene("07-悬浮主窗口-视频工作.png", background: videoBackground, title: "专注不停，灵感不丢", subtitle: "播放视频时，也能随时记录重要想法。") {
    appRep.draw(in: NSRect(x: 300, y: 80, width: 900, height: 1601), from: NSRect(origin: .zero, size: appSize), operation: .sourceOver, fraction: 1, respectFlipped: false, hints: nil)
}

screenshotScene("08-多卡片悬浮-代码工作.png", background: codeBackground, title: "多张卡片，同时悬浮", subtitle: "在工作流中保留上下文，不必来回切换。") {
    appRep.draw(in: NSRect(x: 210, y: 220, width: 600, height: 1068), from: NSRect(origin: .zero, size: appSize), operation: .sourceOver, fraction: 1, respectFlipped: false, hints: nil)
    appRep.draw(in: NSRect(x: 910, y: 390, width: 500, height: 890), from: NSRect(origin: .zero, size: appSize), operation: .sourceOver, fraction: 0.98, respectFlipped: false, hints: nil)
    appRep.draw(in: NSRect(x: 1510, y: 185, width: 470, height: 836), from: NSRect(origin: .zero, size: appSize), operation: .sourceOver, fraction: 0.96, respectFlipped: false, hints: nil)
}

screenshotScene("09-桌面固定-彩色便签.png", background: desktopBackground, title: "固定在桌面，重要事项一目了然", subtitle: "不同颜色的笔记与待办，陪你完成每一天。") {
    let cards: [(NSRect, NSColor, String)] = [
        (NSRect(x: 690, y: 950, width: 500, height: 300), NSColor(calibratedRed: 1, green: 0.83, blue: 0.77, alpha: 1), "上午 10:00\n整理发布清单"),
        (NSRect(x: 1320, y: 780, width: 500, height: 300), NSColor(calibratedRed: 0.84, green: 0.76, blue: 0.98, alpha: 1), "今天\n完成待办事项"),
        (NSRect(x: 980, y: 400, width: 500, height: 300), NSColor(calibratedRed: 0.78, green: 0.92, blue: 0.81, alpha: 1), "别忘了\n给自己留一点时间"),
    ]
    for (rect, color, label) in cards {
        rounded(rect, radius: 36, fill: color, stroke: NSColor(calibratedWhite: 1, alpha: 0.75), width: 3)
        text(label, in: rect.insetBy(dx: 38, dy: 48), size: 38, color: NSColor(calibratedRed: 0.18, green: 0.16, blue: 0.18, alpha: 1), weight: .medium)
    }
}

screenshotScene("10-待办与提醒.png", background: desktopBackground, title: "待办和提醒，按自己的节奏完成", subtitle: "日期、分组与提醒，让计划真正落地。") {
    rounded(NSRect(x: 1480, y: 320, width: 990, height: 820), radius: 44, fill: NSColor(calibratedRed: 1, green: 0.98, blue: 0.94, alpha: 0.97))
    text("今日待办", in: NSRect(x: 1560, y: 980, width: 500, height: 80), size: 56, color: NSColor(calibratedRed: 0.19, green: 0.17, blue: 0.15, alpha: 1), weight: .bold)
    let items = ["完成项目复盘", "安排明天的优先事项", "发送会议纪要"]
    for (index, item) in items.enumerated() {
        let y = 850 - CGFloat(index) * 170
        rounded(NSRect(x: 1560, y: y, width: 780, height: 110), radius: 28, fill: index == 0 ? NSColor(calibratedRed: 0.92, green: 0.98, blue: 0.91, alpha: 1) : NSColor.white)
        text(index == 0 ? "✓" : "○", in: NSRect(x: 1600, y: y + 34, width: 44, height: 44), size: 38, color: NSColor(calibratedRed: 0.27, green: 0.56, blue: 0.34, alpha: 1), weight: .bold)
        text(item, in: NSRect(x: 1670, y: y + 36, width: 560, height: 40), size: 32, color: NSColor(calibratedRed: 0.20, green: 0.18, blue: 0.16, alpha: 1))
    }
}

func previewFrame(_ name: String, title: String, subtitle: String, accent: NSColor, steps: [String]) {
    let rep = makeImage(NSSize(width: 1920, height: 1080)) { _ in
        NSColor(calibratedRed: 0.97, green: 0.94, blue: 0.89, alpha: 1).setFill()
        NSBezierPath(rect: NSRect(x: 0, y: 0, width: 1920, height: 1080)).fill()
        accent.withAlphaComponent(0.16).setFill(); NSBezierPath(ovalIn: NSRect(x: -200, y: 610, width: 1280, height: 750)).fill()
        text(title, in: NSRect(x: 130, y: 740, width: 760, height: 110), size: 66, color: NSColor(calibratedRed: 0.18, green: 0.15, blue: 0.13, alpha: 1), weight: .bold)
        text(subtitle, in: NSRect(x: 136, y: 650, width: 720, height: 70), size: 30, color: NSColor(calibratedRed: 0.33, green: 0.28, blue: 0.24, alpha: 1))
        for (index, step) in steps.enumerated() {
            let y = 555 - CGFloat(index) * 118
            rounded(NSRect(x: 136, y: y, width: 660, height: 82), radius: 24, fill: NSColor.white)
            rounded(NSRect(x: 160, y: y + 18, width: 46, height: 46), radius: 23, fill: accent)
            text("\(index + 1)", in: NSRect(x: 174, y: y + 27, width: 30, height: 30), size: 21, color: .white, weight: .bold)
            text(step, in: NSRect(x: 232, y: y + 24, width: 520, height: 34), size: 25, color: NSColor(calibratedRed: 0.20, green: 0.18, blue: 0.16, alpha: 1))
        }
        appRep.draw(in: NSRect(x: 1180, y: 45, width: 510, height: 907), from: NSRect(origin: .zero, size: appSize), operation: .sourceOver, fraction: 1, respectFlipped: false, hints: nil)
    }
    write(rep, "../preview/\(name)")
}

previewFrame("01-创建笔记与使用.png", title: "记录灵感，从这一刻开始", subtitle: "创建笔记、编辑内容，再拖出一张悬浮卡片。", accent: NSColor(calibratedRed: 0.78, green: 0.36, blue: 0.30, alpha: 1), steps: ["点击新建笔记", "写下当下想法", "拖出卡片继续编辑"])
previewFrame("02-创建待办与使用.png", title: "每件要做的事，都有着落", subtitle: "建立待办、设置日期与提醒，然后一步步完成。", accent: NSColor(calibratedRed: 0.26, green: 0.55, blue: 0.40, alpha: 1), steps: ["创建新的待办", "添加日期与提醒", "完成后轻松勾选"])
previewFrame("03-引导式教程.png", title: "跟着引导，快速上手", subtitle: "七个真实工作流，带你认识 Floatem 的每个关键动作。", accent: NSColor(calibratedRed: 0.43, green: 0.34, blue: 0.74, alpha: 1), steps: ["打开交互式引导", "在真实界面中练习", "完成后恢复原有数据"])
