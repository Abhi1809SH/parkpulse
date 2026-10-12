package com.parkpulse.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.DateFormat;
import java.util.Date;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ParkPulseWidget extends AppWidgetProvider {
    private static final String ENDPOINT = "https://qogvbexjjipuduhppaup.supabase.co/functions/v1/widget-availability";
    private static final String ACTION_REFRESH = "com.parkpulse.app.WIDGET_REFRESH";
    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        refresh(context, appWidgetManager, appWidgetIds);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_REFRESH.equals(intent.getAction())) refreshAll(context);
    }

    public static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, ParkPulseWidget.class));
        if (ids.length > 0) refresh(context, manager, ids);
    }

    private static void refresh(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) manager.updateAppWidget(id, loadingViews(context));
        EXECUTOR.execute(() -> {
            Availability availability = null;
            try {
                availability = fetchAvailability();
            } catch (Exception ignored) {
            }
            for (int id : ids) {
                manager.updateAppWidget(id, availability != null ? dataViews(context, availability) : errorViews(context));
            }
        });
    }

    private static Availability fetchAvailability() throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(ENDPOINT).openConnection();
        connection.setRequestMethod("GET");
        connection.setConnectTimeout(7000);
        connection.setReadTimeout(7000);
        connection.setRequestProperty("Accept", "application/json");
        connection.setUseCaches(false);
        try {
            int code = connection.getResponseCode();
            if (code < 200 || code > 299) throw new IllegalStateException("HTTP " + code);
            BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()));
            StringBuilder body = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) body.append(line);
            reader.close();
            JSONObject json = new JSONObject(body.toString());
            return new Availability(
                    json.getInt("car_free"),
                    json.getInt("car_total"),
                    json.getInt("bike_free"),
                    json.getInt("bike_total"),
                    json.getInt("total_free"),
                    json.getInt("total_spaces")
            );
        } finally {
            connection.disconnect();
        }
    }

    private static RemoteViews baseViews(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_parkpulse);
        views.setOnClickPendingIntent(R.id.widget_car, openParkingIntent(context, "car", 101));
        views.setOnClickPendingIntent(R.id.widget_bike, openParkingIntent(context, "bike", 102));
        views.setOnClickPendingIntent(R.id.widget_refresh, refreshIntent(context));
        views.setOnClickPendingIntent(R.id.widget_root, openAppIntent(context));
        return views;
    }

    private static RemoteViews dataViews(Context context, Availability a) {
        RemoteViews views = baseViews(context);
        views.setTextViewText(R.id.widget_total, a.totalFree + " of " + a.totalSpaces + " free");
        views.setTextViewText(R.id.widget_car_count, a.carFree + "/" + a.carTotal);
        views.setTextViewText(R.id.widget_bike_count, a.bikeFree + "/" + a.bikeTotal);
        views.setTextViewText(R.id.widget_status, "Updated " + DateFormat.getTimeInstance(DateFormat.SHORT).format(new Date()));
        return views;
    }

    private static RemoteViews loadingViews(Context context) {
        RemoteViews views = baseViews(context);
        views.setTextViewText(R.id.widget_total, "Refreshing…");
        views.setTextViewText(R.id.widget_car_count, "—");
        views.setTextViewText(R.id.widget_bike_count, "—");
        views.setTextViewText(R.id.widget_status, "Checking live availability");
        return views;
    }

    private static RemoteViews errorViews(Context context) {
        RemoteViews views = baseViews(context);
        views.setTextViewText(R.id.widget_total, "Availability unavailable");
        views.setTextViewText(R.id.widget_car_count, "—");
        views.setTextViewText(R.id.widget_bike_count, "—");
        views.setTextViewText(R.id.widget_status, "Tap ↻ to retry");
        return views;
    }

    private static PendingIntent openParkingIntent(Context context, String type, int requestCode) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(Intent.ACTION_VIEW);
        intent.setData(Uri.parse("parkpulse://parking/" + type));
        intent.putExtra("parking_type", type);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent openAppIntent(Context context) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(context, 100, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent refreshIntent(Context context) {
        Intent intent = new Intent(context, ParkPulseWidget.class);
        intent.setAction(ACTION_REFRESH);
        return PendingIntent.getBroadcast(context, 103, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static class Availability {
        final int carFree;
        final int carTotal;
        final int bikeFree;
        final int bikeTotal;
        final int totalFree;
        final int totalSpaces;

        Availability(int carFree, int carTotal, int bikeFree, int bikeTotal, int totalFree, int totalSpaces) {
            this.carFree = carFree;
            this.carTotal = carTotal;
            this.bikeFree = bikeFree;
            this.bikeTotal = bikeTotal;
            this.totalFree = totalFree;
            this.totalSpaces = totalSpaces;
        }
    }
}
