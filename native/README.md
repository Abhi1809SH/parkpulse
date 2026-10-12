# ParkPulse native widgets

The web PWA remains the source application. These native companions add real Home Screen widgets while using the same Supabase backend.

## Widget data

Widgets read only aggregate availability from:

`https://qogvbexjjipuduhppaup.supabase.co/functions/v1/widget-availability`

The response contains car/bike free counts, totals, total availability, and a server timestamp. It does not expose employee identities or parking-session details.

## Android

`native/android` is a small native Android wrapper plus an App Widget.

- Widget shows car and bike availability.
- Tap Car or Bike to open ParkPulse into that parking type.
- Tap refresh to request fresh availability immediately.
- Android also schedules normal widget refreshes; the OS may batch background refreshes.
- The GitHub workflow `.github/workflows/android.yml` builds a debug APK artifact automatically.

The Android app deliberately does **not** claim a parking slot from the widget. The user must choose the exact slot in ParkPulse before the backend occupancy changes.

## iOS

`native/ios` contains the SwiftUI app shell and WidgetKit extension source.

The project is generated with XcodeGen:

```bash
cd native/ios
xcodegen generate
open ParkPulse.xcodeproj
```

Then select an Apple development team/signing identity in Xcode before installing on a physical iPhone. A true iOS Home Screen widget must be part of a signed iOS application.

The WidgetKit timeline requests fresh availability approximately every 15 minutes, but iOS ultimately decides the exact background refresh time. The widget always shows the last update time and never claims a parking space directly.
