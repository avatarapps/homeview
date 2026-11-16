import RealityKit
import SwiftUI

struct ARContainer: UIViewRepresentable {
    let controller: HouseARController
    func makeUIView(context: Context) -> ARView { controller.arView }
    func updateUIView(_ uiView: ARView, context: Context) {}
}

/// Root view shared by the app and the App Clip: waits briefly for the link, otherwise shows the demo house.
struct RootView: View {
    @Binding var config: HouseConfig?

    var body: some View {
        Group {
            if let config {
                HouseExperienceView(config: config).id(config.sourceURL)
            } else {
                ZStack {
                    Color.black.ignoresSafeArea()
                    ProgressView().tint(.white)
                }
            }
        }
        .task {
            try? await Task.sleep(nanoseconds: 1_200_000_000)
            if config == nil { config = .demo }
        }
    }
}

struct HouseExperienceView: View {
    @StateObject private var ar: HouseARController

    init(config: HouseConfig) {
        _ar = StateObject(wrappedValue: HouseARController(config: config))
    }

    var body: some View {
        ZStack {
            ARContainer(controller: ar).ignoresSafeArea()

            VStack(spacing: 10) {
                topBar
                if let hint { hintView(hint) }
                Spacer()
                if ar.placed { controls }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
        }
        .onAppear { ar.start() }
        .onDisappear { ar.stop() }
    }

    private var hint: String? {
        if let e = ar.errorText { return e }
        if ar.loading { return "Laen maja…" }
        if !ar.groundFound { return "Suuna telefon maapinnale enda ees ja liiguta seda aeglaselt" }
        return nil
    }

    private var topBar: some View {
        HStack {
            Text(ar.config.title).font(.headline)
            Spacer()
            if ar.placed {
                Label(ar.distanceText, systemImage: "ruler")
                    .font(.subheadline.monospacedDigit())
            }
        }
        .padding(.horizontal, 14).padding(.vertical, 10)
        .background(.ultraThinMaterial, in: Capsule())
    }

    private func hintView(_ text: String) -> some View {
        Text(text)
            .font(.subheadline)
            .multilineTextAlignment(.center)
            .padding(.horizontal, 14).padding(.vertical, 9)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14))
    }

    private var controls: some View {
        VStack(spacing: 10) {
            if !ar.locked {
                Text("Lohista sõrmega · kahe sõrmega keera ja muuda kaugust")
                    .font(.caption).foregroundStyle(.secondary)
            }
            HStack(alignment: .center, spacing: 14) {
                VStack(spacing: 8) {
                    pad("arrow.counterclockwise") { ar.turn(degrees: 5) }
                    pad("arrow.clockwise") { ar.turn(degrees: -5) }
                }
                VStack(spacing: 6) {
                    pad("chevron.up") { ar.nudge(forward: 0.25, right: 0) }
                    HStack(spacing: 6) {
                        pad("chevron.left") { ar.nudge(forward: 0, right: -0.25) }
                        pad("scope") { ar.bringBack() }
                        pad("chevron.right") { ar.nudge(forward: 0, right: 0.25) }
                    }
                    pad("chevron.down") { ar.nudge(forward: -0.25, right: 0) }
                }
                Button {
                    ar.locked.toggle()
                    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: ar.locked ? "lock.fill" : "lock.open")
                            .font(.title3)
                        Text(ar.locked ? "Lukus" : "Lukusta").font(.caption2)
                    }
                    .frame(width: 64, height: 64)
                    .background(ar.locked ? AnyShapeStyle(Color.white) : AnyShapeStyle(Material.ultraThinMaterial),
                                in: RoundedRectangle(cornerRadius: 18))
                    .foregroundStyle(ar.locked ? Color.black : Color.primary)
                }
            }
        }
        .padding(12)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24))
    }

    private func pad(_ symbol: String, action: @escaping () -> Void) -> some View {
        Button {
            action()
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        } label: {
            Image(systemName: symbol)
                .font(.system(size: 17, weight: .semibold))
                .frame(width: 44, height: 44)
                .background(.thinMaterial, in: Circle())
        }
        .buttonStyle(.plain)
        .disabled(ar.locked)
        .opacity(ar.locked ? 0.35 : 1)
    }
}
