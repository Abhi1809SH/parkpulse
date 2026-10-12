package com.parkpulse.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.DateFormat
import java.util.Date
import java.util.concurrent.Executors

class ParkPulseWidget : AppWidgetProvider() {
    companion object {
        private const val ENDPOINT = "https://qogvbexjjipuduhppaup.supabase.co/functions/v1/widget-availability"
        private const val ACTION_REFRESH = "com.parkpulse.app.WIDGET_REFRESH"
        private val executor = Executors.newSingleThreadExecutor()

        fun refreshAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, ParkPulseWidget::class.java))
            if (ids.isNotEmpty()) refresh(context, manager, ids)
        }

        private fun refresh(context: Context, manager: AppWidgetManager, ids: IntArray) {
            ids.forEach { id -> manager.updateAppWidget(id, loadingViews(context)) }
            executor.execute {
                val result = runCatching { fetchAvailability() }.getOrNull()
                ids.forEach { id ->
                    manager.updateAppWidget(id, if (result != null) dataViews(context, result) else errorViews(context))
                }
            }
        }

        private fun fetchAvailability(): Availability {
            val connection = (URL(ENDPOINT).openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 7000
                readTimeout = 7000
                setRequestProperty("Accept", "application/json")
                useCaches = false
            }
            try {
                if (connection.responseCode !in 200..299) error("Widget endpoint returned ${connection.responseCode}")
                val body = connection.inputStream.bufferedReader().use { it.readText() }
                val json = JSONObject(body)
                return Availability(
                    carFree = json.getInt("car_free"),
                    carTotal = json.getInt("car_total"),
                    bikeFree = json.getInt("bike_free"),
                    bikeTotal = json.getInt("bike_total"),
                    totalFree = json.getInt("total_free"),
                    totalSpaces = json.getInt("total_spaces")
                )
            } finally {
                connection.disconnect()
            }
        }

        private fun baseViews(context: Context): RemoteViews = RemoteViews(context.packageName, R.layout.widget_parkpulse).apply {
            setOnClickPendingIntent(R.id.widget_car, openParkingIntent(context, "car", 101))
            setOnClickPendingIntent(R.id.widget_bike, openParkingIntent(context, "bike", 102))
            setOnClickPendingIntent(R.id.widget_refresh, refreshIntent(context))
            setOnClickPendingIntent(R.id.widget_root, openAppIntent(context))
        }

        private fun dataViews(context: Context, data: Availability) = baseViews(context).apply {
            setTextViewText(R.id.widget_total, "${data.totalFree} of ${data.totalSpaces} free")
            setTextViewText(R.id.widget_car_count, "${data.carFree}/${data.carTotal}")
            setTextViewText(R.id.widget_bike_count, "${data.bikeFree}/${data.bikeTotal}")
            setTextViewText(R.id.widget_status, "Updated ${DateFormat.getTimeInstance(DateFormat.SHORT).format(Date())}")
        }

        private fun loadingViews(context: Context) = baseViews(context).apply {
            setTextViewText(R.id.widget_total, "Refreshing…")
            setTextViewText(R.id.widget_car_count, "—")
            setTextViewText(R.id.widget_bike_count, "—")
            setTextViewText(R.id.widget_status, "Checking live availability")
        }

        private fun errorViews(context: Context) = baseViews(context).apply {
            setTextViewText(R.id.widget_total, "Availability unavailable")
            setTextViewText(R.id.widget_car_count, "—")
            setTextViewText(R.id.widget_bike_count, "—")
            setTextViewText(R.id.widget_status, "Tap ↻ to retry")
        }

        private fun openParkingIntent(context: Context, type: String, requestCode: Int): PendingIntent {
            val intent = Intent(context, MainActivity::class.java).apply {
                action = Intent.ACTION_VIEW
                data = Uri.parse("parkpulse://parking/$type")
                putExtra("parking_type", type)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            return PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }

        private fun openAppIntent(context: Context): PendingIntent {
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            return PendingIntent.getActivity(context, 100, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }

        private fun refreshIntent(context: Context): PendingIntent {
            val intent = Intent(context, ParkPulseWidget::class.java).apply { action = ACTION_REFRESH }
            return PendingIntent.getBroadcast(context, 103, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        refresh(context, appWidgetManager, appWidgetIds)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_REFRESH) refreshAll(context)
    }
}

data class Availability(
    val carFree: Int,
    val carTotal: Int,
    val bikeFree: Int,
    val bikeTotal: Int,
    val totalFree: Int,
    val totalSpaces: Int
)
