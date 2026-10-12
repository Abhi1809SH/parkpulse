import SwiftUI
import WebKit

struct ParkPulseWebView: UIViewRepresentable {
    let deepLink: URL?

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        context.coordinator.webView = webView
        webView.load(URLRequest(url: URL(string: "https://abhi1809sh.github.io/parkpulse/")!))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        guard let deepLink else { return }
        context.coordinator.pendingDeepLink = deepLink
        context.coordinator.tryOpenDeepLink()
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        weak var webView: WKWebView?
        var pendingDeepLink: URL?

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            tryOpenDeepLink()
        }

        func tryOpenDeepLink() {
            guard let webView, let url = pendingDeepLink else { return }
            guard url.scheme == "parkpulse" else { return }
            let type = url.pathComponents.last == "bike" ? "bike" : "car"
            let id = type == "bike" ? "bikeTab" : "carTab"
            let script = "(() => { const b=document.getElementById('\(id)'); if(b){ b.click(); return true; } return false; })()"
            webView.evaluateJavaScript(script) { result, _ in
                if (result as? Bool) == true { self.pendingDeepLink = nil }
            }
        }
    }
}
