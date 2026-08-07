import AppKit

private let fileManager = FileManager.default
private let projectRoot = URL(fileURLWithPath: fileManager.currentDirectoryPath)
private let screenshotsRoot = projectRoot.appendingPathComponent("App Store Distribution/screenshots")
private let editedRoot = screenshotsRoot.appendingPathComponent("Edited")
private let cropsRoot = editedRoot.appendingPathComponent("WindowCrops")
private let brandingRoot = editedRoot.appendingPathComponent("Branding")

private let canvasSize = NSSize(width: 2880, height: 1800)
private let windowSize = NSSize(width: 800, height: 1424)

private struct WindowSource {
    let input: String
    let output: String
    let cropX: CGFloat
    let cropYFromTop: CGFloat
}

private let windowSources = [
    WindowSource(input: "01-经典色.png", output: "01-经典色-窗口.png", cropX: 14, cropYFromTop: 16),
    WindowSource(input: "02-浮光.png", output: "02-浮光-窗口.png", cropX: 16, cropYFromTop: 16),
    WindowSource(input: "03-梅.png", output: "03-梅-窗口.png", cropX: 0, cropYFromTop: 4),
    WindowSource(input: "04-兰.png", output: "04-兰-窗口.png", cropX: 2, cropYFromTop: 6),
    WindowSource(input: "05-竹.png", output: "05-竹-窗口.png", cropX: 8, cropYFromTop: 8),
    WindowSource(input: "06-菊.png", output: "06-菊-窗口.png", cropX: 2, cropYFromTop: 0),
    WindowSource(input: "10-交互式引导.png", output: "10-交互式引导-窗口.png", cropX: 0, cropYFromTop: 2),
]

private func makeBitmap(_ size: NSSize, alpha: Bool, draw: () -> Void) -> NSBitmapImageRep {
    let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: Int(size.width),
        pixelsHigh: Int(size.height),
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    )!
    rep.size = size
    let context = NSGraphicsContext(bitmapImageRep: rep)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = context
    if alpha {
        NSColor.clear.setFill()
        NSBezierPath(rect: NSRect(origin: .zero, size: size)).fill()
    }
    draw()
    NSGraphicsContext.restoreGraphicsState()
    return rep
}

private func writePNG(_ rep: NSBitmapImageRep, to url: URL) {
    let data = rep.representation(using: .png, properties: [.compressionFactor: 1.0])!
    try! data.write(to: url)
}

private func image(_ url: URL) -> NSImage {
    guard let loaded = NSImage(contentsOf: url) else {
        fatalError("Unable to load image: \(url.path)")
    }
    if let bitmap = loaded.representations.compactMap({ $0 as? NSBitmapImageRep }).first {
        loaded.size = NSSize(width: bitmap.pixelsWide, height: bitmap.pixelsHigh)
    }
    return loaded
}

private func topRect(_ x: CGFloat, _ y: CGFloat, _ width: CGFloat, _ height: CGFloat, canvasHeight: CGFloat = canvasSize.height) -> NSRect {
    NSRect(x: x, y: canvasHeight - y - height, width: width, height: height)
}

private func roundedPath(_ rect: NSRect, radius: CGFloat) -> NSBezierPath {
    NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
}

private func fill(_ color: NSColor, _ rect: NSRect) {
    color.setFill()
    NSBezierPath(rect: rect).fill()
}

private func fillGradient(_ rect: NSRect, colors: [NSColor], angle: CGFloat) {
    NSGradient(colors: colors)!.draw(in: rect, angle: angle)
}

private func drawText(
    _ string: String,
    x: CGFloat,
    y: CGFloat,
    width: CGFloat,
    height: CGFloat,
    size: CGFloat,
    color: NSColor,
    weight: NSFont.Weight = .regular,
    alignment: NSTextAlignment = .left,
    lineSpacing: CGFloat = 0
) {
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = alignment
    paragraph.lineBreakMode = .byWordWrapping
    paragraph.lineSpacing = lineSpacing
    let attributes: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: size, weight: weight),
        .foregroundColor: color,
        .paragraphStyle: paragraph,
    ]
    NSAttributedString(string: string, attributes: attributes).draw(in: topRect(x, y, width, height))
}

private func drawPill(_ label: String, x: CGFloat, y: CGFloat, width: CGFloat, fillColor: NSColor, textColor: NSColor) {
    let rect = topRect(x, y, width, 62)
    fillColor.setFill()
    roundedPath(rect, radius: 31).fill()
    drawText(label, x: x, y: y + 14, width: width, height: 38, size: 25, color: textColor, weight: .semibold, alignment: .center)
}

private func drawWindow(_ source: NSImage, x: CGFloat, y: CGFloat, width: CGFloat, opacity: CGFloat = 1, shadow: Bool = true, radius: CGFloat = 42) {
    let height = width * windowSize.height / windowSize.width
    let rect = topRect(x, y, width, height)

    if shadow {
        NSGraphicsContext.saveGraphicsState()
        let nsShadow = NSShadow()
        nsShadow.shadowColor = NSColor(calibratedWhite: 0.08, alpha: 0.23)
        nsShadow.shadowOffset = NSSize(width: 0, height: -22)
        nsShadow.shadowBlurRadius = 42
        nsShadow.set()
        NSColor.white.setFill()
        roundedPath(rect, radius: radius).fill()
        NSGraphicsContext.restoreGraphicsState()
    }

    NSGraphicsContext.saveGraphicsState()
    roundedPath(rect, radius: radius).addClip()
    source.draw(in: rect, from: NSRect(origin: .zero, size: source.size), operation: .sourceOver, fraction: opacity, respectFlipped: false, hints: [.interpolation: NSImageInterpolation.high])
    NSGraphicsContext.restoreGraphicsState()
}

private func drawLandscapeFill(_ source: NSImage) {
    let sourceAspect = source.size.width / source.size.height
    let targetAspect = canvasSize.width / canvasSize.height
    var crop = NSRect(origin: .zero, size: source.size)
    if sourceAspect > targetAspect {
        let cropWidth = source.size.height * targetAspect
        crop.origin.x = (source.size.width - cropWidth) / 2
        crop.size.width = cropWidth
    } else {
        let cropHeight = source.size.width / targetAspect
        crop.origin.y = (source.size.height - cropHeight) / 2
        crop.size.height = cropHeight
    }
    source.draw(in: NSRect(origin: .zero, size: canvasSize), from: crop, operation: .copy, fraction: 1, respectFlipped: false, hints: [.interpolation: NSImageInterpolation.high])
}

private func drawBrandBackdrop() {
    let backdrop = image(brandingRoot.appendingPathComponent("floatem-abstract-backdrop.png"))
    drawLandscapeFill(backdrop)
    fill(NSColor(calibratedWhite: 1, alpha: 0.08), NSRect(origin: .zero, size: canvasSize))
}

private func drawHeadlineBlock(kicker: String, title: String, subtitle: String, dark: Bool = true, panel: Bool = false) {
    if panel {
        let rect = topRect(120, 110, 1240, 560)
        NSColor(calibratedWhite: dark ? 1 : 0.05, alpha: dark ? 0.90 : 0.72).setFill()
        roundedPath(rect, radius: 54).fill()
    }
    let primary = dark ? NSColor(calibratedRed: 0.12, green: 0.11, blue: 0.10, alpha: 1) : .white
    let secondary = dark ? NSColor(calibratedRed: 0.31, green: 0.28, blue: 0.26, alpha: 1) : NSColor(calibratedWhite: 1, alpha: 0.86)
    let accent = dark ? NSColor(calibratedRed: 0.80, green: 0.32, blue: 0.25, alpha: 1) : NSColor(calibratedRed: 1, green: 0.72, blue: 0.56, alpha: 1)
    drawText(kicker, x: 190, y: 175, width: 1000, height: 48, size: 28, color: accent, weight: .bold)
    drawText(title, x: 180, y: 250, width: 1180, height: 260, size: 92, color: primary, weight: .bold, lineSpacing: 10)
    drawText(subtitle, x: 190, y: 520, width: 1060, height: 100, size: 34, color: secondary, weight: .regular)
}

private func makeWindowCrops() {
    try! fileManager.createDirectory(at: cropsRoot, withIntermediateDirectories: true)
    for source in windowSources {
        let inputImage = image(screenshotsRoot.appendingPathComponent(source.input))
        let fromRect = NSRect(
            x: source.cropX,
            y: inputImage.size.height - source.cropYFromTop - windowSize.height,
            width: windowSize.width,
            height: windowSize.height
        )
        let rep = makeBitmap(windowSize, alpha: true) {
            let target = NSRect(origin: .zero, size: windowSize)
            roundedPath(target, radius: 34).addClip()
            inputImage.draw(in: target, from: fromRect, operation: .copy, fraction: 1, respectFlipped: false, hints: [.interpolation: NSImageInterpolation.high])
        }
        writePNG(rep, to: cropsRoot.appendingPathComponent(source.output))
    }
}

private func makePoster(_ filename: String, draw: () -> Void) {
    let rep = makeBitmap(canvasSize, alpha: false, draw: draw)
    writePNG(rep, to: editedRoot.appendingPathComponent(filename))
}

try! fileManager.createDirectory(at: editedRoot, withIntermediateDirectories: true)
makeWindowCrops()

let classic = image(cropsRoot.appendingPathComponent("01-经典色-窗口.png"))
let afterglow = image(cropsRoot.appendingPathComponent("02-浮光-窗口.png"))
let plum = image(cropsRoot.appendingPathComponent("03-梅-窗口.png"))
let orchid = image(cropsRoot.appendingPathComponent("04-兰-窗口.png"))
let bamboo = image(cropsRoot.appendingPathComponent("05-竹-窗口.png"))
let chrysanthemum = image(cropsRoot.appendingPathComponent("06-菊-窗口.png"))
let guide = image(cropsRoot.appendingPathComponent("10-交互式引导-窗口.png"))

makePoster("01-让灵感始终在眼前.png") {
    drawBrandBackdrop()
    fill(NSColor(calibratedWhite: 1, alpha: 0.18), topRect(0, 0, 1500, 1800))
    drawHeadlineBlock(
        kicker: "FLOATEM · 悬浮笔记与待办",
        title: "让灵感，\n始终在眼前",
        subtitle: "随时唤起、快速记录、轻轻拖出，不打断当下。"
    )
    drawPill("本地保存", x: 190, y: 710, width: 220, fillColor: NSColor(calibratedRed: 0.95, green: 0.86, blue: 0.82, alpha: 0.92), textColor: NSColor(calibratedRed: 0.48, green: 0.23, blue: 0.18, alpha: 1))
    drawPill("全局快捷键", x: 440, y: 710, width: 250, fillColor: NSColor(calibratedRed: 0.88, green: 0.91, blue: 0.86, alpha: 0.92), textColor: NSColor(calibratedRed: 0.19, green: 0.34, blue: 0.25, alpha: 1))
    drawWindow(afterglow, x: 1850, y: 170, width: 820, opacity: 0.72, shadow: true)
    drawWindow(classic, x: 1500, y: 70, width: 930, opacity: 1, shadow: true)
}

makePoster("02-六种主题随心切换.png") {
    fillGradient(NSRect(origin: .zero, size: canvasSize), colors: [
        NSColor(calibratedRed: 0.97, green: 0.94, blue: 0.90, alpha: 1),
        NSColor(calibratedRed: 0.92, green: 0.94, blue: 0.90, alpha: 1),
    ], angle: 18)
    drawText("六种主题，随心切换", x: 160, y: 105, width: 1800, height: 130, size: 86, color: NSColor(calibratedRed: 0.14, green: 0.13, blue: 0.12, alpha: 1), weight: .bold)
    drawText("经典色 · 浮光 · 梅 · 兰 · 竹 · 菊", x: 168, y: 245, width: 1600, height: 60, size: 33, color: NSColor(calibratedWhite: 0.30, alpha: 1))

    let themeImages = [classic, afterglow, plum, orchid, bamboo, chrysanthemum]
    let themeNames = ["经典色", "浮光", "梅", "兰", "竹", "菊"]
    for index in 0..<themeImages.count {
        let x = 145 + CGFloat(index) * 440
        drawWindow(themeImages[index], x: x, y: 385, width: 385, shadow: true, radius: 28)
        drawPill(themeNames[index], x: x + 82, y: 1570, width: 220, fillColor: NSColor(calibratedWhite: 1, alpha: 0.88), textColor: NSColor(calibratedWhite: 0.18, alpha: 1))
    }
}

makePoster("03-富文本记录随手整理.png") {
    fillGradient(NSRect(origin: .zero, size: canvasSize), colors: [
        NSColor(calibratedRed: 0.99, green: 0.94, blue: 0.95, alpha: 1),
        NSColor(calibratedRed: 0.93, green: 0.80, blue: 0.84, alpha: 1),
    ], angle: 0)
    fill(NSColor(calibratedRed: 0.50, green: 0.12, blue: 0.23, alpha: 0.06), topRect(0, 0, 2880, 1800))
    drawHeadlineBlock(
        kicker: "笔记 · 编辑与整理",
        title: "富文本记录，\n随手整理",
        subtitle: "格式、颜色、分组与排序，让每个想法更清晰。"
    )
    drawPill("格式工具", x: 190, y: 710, width: 220, fillColor: NSColor(calibratedWhite: 1, alpha: 0.74), textColor: NSColor(calibratedRed: 0.44, green: 0.16, blue: 0.23, alpha: 1))
    drawPill("卡片排序", x: 440, y: 710, width: 220, fillColor: NSColor(calibratedWhite: 1, alpha: 0.74), textColor: NSColor(calibratedRed: 0.44, green: 0.16, blue: 0.23, alpha: 1))
    drawWindow(plum, x: 1710, y: 62, width: 960, shadow: true)
}

makePoster("04-看视频也不错过灵光.png") {
    let scene = image(screenshotsRoot.appendingPathComponent("07-视频工作-悬浮记录.png"))
    drawLandscapeFill(scene)
    fillGradient(topRect(0, 0, 1600, 1800), colors: [NSColor(calibratedWhite: 0.03, alpha: 0.86), NSColor(calibratedWhite: 0.03, alpha: 0.05)], angle: 0)
    drawHeadlineBlock(
        kicker: "悬浮工作流",
        title: "看视频，\n也不错过灵光",
        subtitle: "卡片停在内容旁，边看边记。",
        dark: false
    )
}

makePoster("05-编码时保留上下文.png") {
    let scene = image(screenshotsRoot.appendingPathComponent("08-代码工作-多卡片悬浮.png"))
    drawLandscapeFill(scene)
    fillGradient(topRect(0, 0, 1740, 1800), colors: [NSColor(calibratedRed: 0.03, green: 0.04, blue: 0.06, alpha: 0.92), NSColor(calibratedRed: 0.03, green: 0.04, blue: 0.06, alpha: 0.04)], angle: 0)
    drawHeadlineBlock(
        kicker: "多卡片 · 同时悬浮",
        title: "编码时，\n上下文不掉线",
        subtitle: "重要线索各就各位，不必来回切换。",
        dark: false
    )
}

makePoster("06-固定到桌面一眼看到重点.png") {
    let scene = image(screenshotsRoot.appendingPathComponent("09-桌面固定-彩色卡片.png"))
    drawLandscapeFill(scene)
    fillGradient(topRect(0, 0, 1680, 1800), colors: [NSColor(calibratedWhite: 0.03, alpha: 0.80), NSColor(calibratedWhite: 0.03, alpha: 0.02)], angle: 0)
    drawHeadlineBlock(
        kicker: "桌面固定 · 彩色卡片",
        title: "固定到桌面，\n一眼看到重点",
        subtitle: "不同颜色的笔记与待办，陪你推进每一天。",
        dark: false
    )
}

makePoster("07-跟着引导快速上手.png") {
    drawBrandBackdrop()
    fillGradient(topRect(0, 0, 2880, 1800), colors: [NSColor(calibratedWhite: 1, alpha: 0.12), NSColor(calibratedRed: 0.93, green: 0.58, blue: 0.48, alpha: 0.18)], angle: 10)
    drawHeadlineBlock(
        kicker: "交互式引导",
        title: "跟着引导，\n快速上手",
        subtitle: "七个真实工作流，带你认识每个关键动作。"
    )
    drawWindow(afterglow, x: 1900, y: 145, width: 760, opacity: 0.58, shadow: true)
    drawWindow(guide, x: 1470, y: 50, width: 960, opacity: 1, shadow: true)
}

let posterNames = [
    "01-让灵感始终在眼前.png",
    "02-六种主题随心切换.png",
    "03-富文本记录随手整理.png",
    "04-看视频也不错过灵光.png",
    "05-编码时保留上下文.png",
    "06-固定到桌面一眼看到重点.png",
    "07-跟着引导快速上手.png",
]

// App Store Connect rejects PNG files with an alpha channel. The render pass uses
// an RGBA context for reliable AppKit drawing, then strips alpha from final posters.
let magick = Process()
magick.executableURL = URL(fileURLWithPath: "/opt/homebrew/bin/magick")
magick.arguments = ["mogrify", "-alpha", "off"] + posterNames.map { editedRoot.appendingPathComponent($0).path }
try! magick.run()
magick.waitUntilExit()
guard magick.terminationStatus == 0 else {
    fatalError("ImageMagick failed to strip alpha from the final posters")
}

print("Rendered 7 App Store screenshots to \(editedRoot.path)")
