package com.taskbattles.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.taskbattles.R

class TaskWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        appWidgetIds.forEach { appWidgetId ->
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }
}

internal fun updateAppWidget(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int
) {
    val views = RemoteViews(context.packageName, R.layout.widget_tasks)
    
    // Try to read shared preferences written by the main app
    // NOTE: Full data sharing requires a native module to bridge React Native AsyncStorage
    // with Android SharedPreferences. For now, this shows placeholder data.
    val prefs = context.getSharedPreferences("taskbattles_widget", Context.MODE_PRIVATE)
    val title = prefs.getString("widget_title", "Today's Tasks") ?: "Today's Tasks"
    val progress = prefs.getString("widget_progress", "0/0") ?: "0/0"
    val progressInt = prefs.getInt("widget_progress_int", 0)
    
    views.setTextViewText(R.id.widget_title, title)
    views.setTextViewText(R.id.widget_progress, progress)
    views.setProgressBar(R.id.widget_ring, 100, progressInt, false)
    
    appWidgetManager.updateAppWidget(appWidgetId, views)
}
