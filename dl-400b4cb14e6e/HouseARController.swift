import ARKit
import Combine
import Metal
import RealityKit
import UIKit

/// Places a 1:1 house on the ground and lets the user move it anywhere:
/// - the house appears at once, on an estimated ground, and settles when ARKit finds the real ground;
/// - one finger moves it closer/farther and around the user, at any distance;
/// - two fingers turn it around its own centre and pinch its distance;
/// - buttons nudge it in small steps relative to where the phone points.
/// The house is never scaled.
final class HouseARController: NSObject, ObservableObject, ARSessionDelegate, UIGestureRecognizerDelegate {
    @Published var loading = true
    @Published var errorText: String?
    @Published var groundFound = false
    @Published var placed = false
    @Published var locked = false
    @Published var distanceText = ""

    let arView = ARView(frame: .zero, cameraMode: .ar, automaticallyConfigureSession: false)
    let config: HouseConfig

    private let anchor = AnchorEntity(world: .zero)
    private let pivot = Entity()                 // at the centre of the footprint, on the ground
    private var depth: Float = 10                // footprint along the house's front-to-back axis
    private var groundY: Float?
    private var bestPlaneArea: Float = 0
    private var trackingSince: Date?
    private weak var panGesture: UIPanGestureRecognizer?
    private var turnStart: simd_quatf?
    private var updateSub: (any Combine.Cancellable)?
    private var textures: [String: MaterialParameters.Texture] = [:]

    init(config: HouseConfig) {
        self.config = config
        super.init()
        arView.session.delegate = self
        arView.renderOptions.insert(.disableMotionBlur)
        arView.scene.addAnchor(anchor)
        anchor.addChild(pivot)
        pivot.isEnabled = false

        let pan = UIPanGestureRecognizer(target: self, action: #selector(onPan(_:)))
        pan.maximumNumberOfTouches = 1
        let pinch = UIPinchGestureRecognizer(target: self, action: #selector(onPinch(_:)))
        let turn = UIRotationGestureRecognizer(target: self, action: #selector(onTurn(_:)))
        for g in [pan, pinch, turn] as [UIGestureRecognizer] {
            g.delegate = self
            arView.addGestureRecognizer(g)
        }
        panGesture = pan

        updateSub = arView.scene.subscribe(to: SceneEvents.Update.self) { [weak self] _ in self?.tick() }
        Task { await load() }
    }

    func start() {
        let cfg = ARWorldTrackingConfiguration()
        cfg.planeDetection = [.horizontal]
        cfg.environmentTexturing = .automatic
        arView.session.run(cfg, options: [.resetTracking, .removeExistingAnchors])
    }

    func stop() { arView.session.pause() }

    // MARK: - Loading

    private func download(_ url: URL, ext: String) async throws -> URL {
        let (tmp, response) = try await URLSession.shared.download(from: url)
        if let http = response as? HTTPURLResponse, http.statusCode != 200 {
            throw URLError(.badServerResponse)
        }
        let dest = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString).appendingPathExtension(ext)
        try FileManager.default.moveItem(at: tmp, to: dest)
        return dest
    }

    private func loadTexture(_ name: String, normal: Bool) async -> MaterialParameters.Texture? {
        if let t = textures[name] { return t }
        guard let file = try? await download(config.textureBase.appendingPathComponent(name + ".png"), ext: "png") else { return nil }
        let options = TextureResource.CreateOptions(semantic: normal ? .normal : .color)
        guard let res = try? TextureResource.load(contentsOf: file, withName: name, options: options) else { return nil }
        var tex = MaterialParameters.Texture(res)
        let d = MTLSamplerDescriptor()
        d.sAddressMode = .repeat; d.tAddressMode = .repeat
        d.minFilter = .linear; d.magFilter = .linear; d.mipFilter = .linear
        d.maxAnisotropy = 8
        tex.sampler = MaterialParameters.Texture.Sampler(d)
        textures[name] = tex
        return tex
    }

    @MainActor
    private func load() async {
        do {
            let file = try await download(config.modelURL, ext: "usdz")
            for style in config.styles.values {
                if let t = style.texture {
                    _ = await loadTexture(t, normal: false)
                    _ = await loadTexture(t + "_n", normal: true)
                }
            }
            let house = try Entity.load(contentsOf: file)
            restyle(house)
            if #available(iOS 18.0, *) { addShadows(house) }

            // put the pivot at the centre of the footprint, house resting on the ground
            let b = house.visualBounds(relativeTo: nil)
            house.position = SIMD3<Float>(-b.center.x, -b.min.y, -b.center.z)
            depth = b.extents.z
            pivot.addChild(house)
            loading = false
        } catch {
            loading = false
            errorText = "Maja laadimine ebaõnnestus. Kontrolli internetiühendust ja proovi uuesti."
        }
    }

    // MARK: - Materials from the link

    private func partName(_ e: Entity) -> String? {
        var node: Entity? = e
        for _ in 0..<3 {
            if let n = node?.name, HouseConfig.parts.contains(n) { return n }
            node = node?.parent
        }
        return nil
    }

    private func restyle(_ e: Entity) {
        if let part = partName(e), let style = config.styles[part], var model = e.components[ModelComponent.self] {
            model.materials = model.materials.map { material(from: $0, style: style) }
            e.components.set(model)
        }
        for child in e.children { restyle(child) }
    }

    private func material(from original: RealityKit.Material, style: SurfaceStyle) -> RealityKit.Material {
        var m = (original as? PhysicallyBasedMaterial) ?? PhysicallyBasedMaterial()
        if let name = style.texture, let tex = textures[name] {
            m.baseColor = PhysicallyBasedMaterial.BaseColor(tint: style.color, texture: tex)
            if let n = textures[name + "_n"] { m.normal = PhysicallyBasedMaterial.Normal(texture: n) }
        } else {
            m.baseColor = PhysicallyBasedMaterial.BaseColor(tint: style.color, texture: m.baseColor.texture)
        }
        if let r = style.roughness { m.roughness = PhysicallyBasedMaterial.Roughness(floatLiteral: r) }
        if let mt = style.metallic { m.metallic = PhysicallyBasedMaterial.Metallic(floatLiteral: mt) }
        return m
    }

    @available(iOS 18.0, *)
    private func addShadows(_ e: Entity) {
        if e.components.has(ModelComponent.self) {
            e.components.set(GroundingShadowComponent(castsShadow: true))
        }
        for child in e.children { addShadows(child) }
    }

    // MARK: - Ground

    func session(_ session: ARSession, didAdd anchors: [ARAnchor]) { updateGround(anchors) }
    func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) { updateGround(anchors) }

    private func updateGround(_ anchors: [ARAnchor]) {
        guard let camY = arView.session.currentFrame?.camera.transform.columns.3.y else { return }
        for case let plane as ARPlaneAnchor in anchors where plane.alignment == .horizontal {
            let y = plane.transform.columns.3.y
            let area = plane.planeExtent.width * plane.planeExtent.height
            // the ground is well below the phone; take the biggest such surface
            guard y < camY - 0.6, area > bestPlaneArea else { continue }
            bestPlaneArea = area
            groundY = y
            if !groundFound { groundFound = true }
            if placed { pivot.position.y = y }
        }
    }

    // MARK: - Per frame

    private func tick() {
        guard let frame = arView.session.currentFrame else { return }
        if case .normal = frame.camera.trackingState {
            if trackingSince == nil { trackingSince = Date() }
        }
        if !placed, !loading, errorText == nil, let since = trackingSince {
            if groundY == nil, let hit = arView.raycast(from: CGPoint(x: arView.bounds.midX, y: arView.bounds.midY), allowing: .estimatedPlane, alignment: .horizontal).first {
                let y = hit.worldTransform.columns.3.y
                if y < frame.camera.transform.columns.3.y - 0.6 { groundY = y }
            }
            // no surface yet: assume the ground about 1.45 m below the phone, refine later
            if groundY == nil, Date().timeIntervalSince(since) > 1.2 {
                groundY = frame.camera.transform.columns.3.y - 1.45
            }
            if groundY != nil { placeInFront(distance: config.frontDistance) }
        }
        if placed { updateDistance() }
    }

    private func flatForward() -> (pos: SIMD3<Float>, fwd: SIMD3<Float>, right: SIMD3<Float>) {
        let m = arView.cameraTransform.matrix
        let pos = SIMD3<Float>(m.columns.3.x, m.columns.3.y, m.columns.3.z)
        var fwd = -SIMD3<Float>(m.columns.2.x, 0, m.columns.2.z)
        if simd_length(fwd) < 1e-3 { fwd = SIMD3<Float>(0, 0, -1) }
        fwd = simd_normalize(fwd)
        let right = SIMD3<Float>(-fwd.z, 0, fwd.x)
        return (pos, fwd, right)
    }

    /// Front edge `distance` metres in front of the phone, front facing the phone.
    func placeInFront(distance: Float) {
        guard let gy = groundY else { return }
        let (pos, fwd, _) = flatForward()
        let c = pos + fwd * (distance + depth / 2)
        pivot.position = SIMD3<Float>(c.x, gy, c.z)
        pivot.orientation = simd_quatf(angle: atan2(-fwd.x, -fwd.z), axis: SIMD3<Float>(0, 1, 0))
        pivot.isEnabled = true
        placed = true
    }

    private func updateDistance() {
        let (pos, _, _) = flatForward()
        let front = pivot.position + pivot.orientation.act(SIMD3<Float>(0, 0, depth / 2))
        let d = simd_length(SIMD2<Float>(front.x - pos.x, front.z - pos.z))
        let text = String(format: "%.1f m", d).replacingOccurrences(of: ".", with: ",")
        if text != distanceText { distanceText = text }
    }

    // MARK: - Gestures and buttons
    //
    // The house moves around the phone in polar terms, so it works the same at 5 m and at 50 m,
    // wherever the finger is on the screen:
    // - one finger up/down: farther/closer; left/right: around you, following the finger;
    // - two fingers: twist to turn, pinch to bring it closer (spread) or push it away (pinch in).

    private struct MoveStart {
        var r: Float, phi: Float
        var cam: SIMD3<Float>, fwd: SIMD3<Float>, right: SIMD3<Float>
    }
    private var panStart: MoveStart?
    private var pinchStart: MoveStart?
    private var radPerPoint: Float = 0.0012

    private func moveStart() -> MoveStart {
        let (cam, fwd, right) = flatForward()
        let v = pivot.position - cam
        let flat = SIMD3<Float>(v.x, 0, v.z)
        let a = simd_dot(flat, fwd), b = simd_dot(flat, right)
        return MoveStart(r: max((a * a + b * b).squareRoot(), 0.5), phi: atan2(b, a), cam: cam, fwd: fwd, right: right)
    }

    private func move(_ s: MoveStart, r: Float, phi: Float) {
        let r = min(max(r, depth / 2 + 0.5), 600)
        let p = s.cam + s.fwd * (r * cos(phi)) + s.right * (r * sin(phi))
        pivot.position = SIMD3<Float>(p.x, pivot.position.y, p.z)
    }

    private func measureRadPerPoint() {
        let c = CGPoint(x: arView.bounds.midX, y: arView.bounds.midY)
        guard let a = arView.ray(through: c)?.direction,
              let b = arView.ray(through: CGPoint(x: c.x + 100, y: c.y))?.direction else { return }
        let ang = acos(min(1, simd_dot(simd_normalize(a), simd_normalize(b))))
        if ang > 0 { radPerPoint = ang / 100 }
    }

    /// Ends a one-finger drag when a second finger lands.
    private func cancelPan() {
        panGesture?.isEnabled = false
        panGesture?.isEnabled = true
        panStart = nil
    }

    @objc private func onPan(_ g: UIPanGestureRecognizer) {
        guard placed, !locked else { return }
        switch g.state {
        case .began:
            measureRadPerPoint()
            panStart = moveStart()
            UISelectionFeedbackGenerator().selectionChanged()
        case .changed:
            guard let s = panStart else { return }
            let t = g.translation(in: arView)
            move(s, r: s.r * exp(Float(-t.y) / 220), phi: s.phi + Float(t.x) * radPerPoint)
        default:
            panStart = nil
        }
    }

    @objc private func onPinch(_ g: UIPinchGestureRecognizer) {
        guard placed, !locked else { return }
        switch g.state {
        case .began:
            cancelPan()
            pinchStart = moveStart()
        case .changed:
            guard let s = pinchStart, g.scale > 0.05 else { return }
            move(s, r: s.r / Float(g.scale), phi: s.phi)
        default:
            pinchStart = nil
        }
    }

    @objc private func onTurn(_ g: UIRotationGestureRecognizer) {
        guard placed, !locked else { return }
        switch g.state {
        case .began:
            cancelPan()
            turnStart = pivot.orientation
            UISelectionFeedbackGenerator().selectionChanged()
        case .changed:
            if let s = turnStart {
                pivot.orientation = simd_quatf(angle: -Float(g.rotation), axis: SIMD3<Float>(0, 1, 0)) * s
            }
        default:
            turnStart = nil
        }
    }

    func gestureRecognizer(_ g: UIGestureRecognizer,
                           shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool { true }

    /// Move along the ground relative to the phone: forward = away from the user.
    func nudge(forward: Float, right: Float) {
        guard placed, !locked else { return }
        let (_, fwd, r) = flatForward()
        pivot.position += fwd * forward + r * right
    }

    func turn(degrees: Float) {
        guard placed, !locked else { return }
        pivot.orientation = simd_quatf(angle: degrees * .pi / 180, axis: SIMD3<Float>(0, 1, 0)) * pivot.orientation
    }

    func bringBack() {
        guard !locked else { return }
        placeInFront(distance: config.frontDistance)
    }
}
