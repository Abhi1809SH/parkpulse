import SwiftUI

@main
struct ParkPulseApp: App {
    @State private var deepLink: URL?

    var body: some Scene {
        WindowGroup {
            ParkPulseWebView(deepLink: deepLink)
                .onOpenURL { url in
                    deepLink = url
                }
        }
    }
}
