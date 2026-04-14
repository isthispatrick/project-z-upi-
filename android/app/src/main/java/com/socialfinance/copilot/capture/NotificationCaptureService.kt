package com.socialfinance.copilot.capture

import android.content.Intent
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.work.Data
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager

class NotificationCaptureService : NotificationListenerService() {
  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    val notification = sbn?.notification ?: return
    val packageName = sbn.packageName ?: return

    if (!SupportedPackages.matches(packageName)) {
      return
    }

    val extras = notification.extras
    val title = extras.getCharSequence("android.title")?.toString().orEmpty()
    val text = extras.getCharSequence("android.text")?.toString().orEmpty()
    val rawText = listOf(title, text).filter { it.isNotBlank() }.joinToString(" ")

    if (!NotificationParser.looksLikeUpiPayment(rawText)) {
      return
    }

    val workData = Data.Builder()
      .putString(NotificationIngestWorker.KEY_SOURCE_APP, packageName)
      .putString(NotificationIngestWorker.KEY_RAW_TEXT, rawText)
      .putString(NotificationIngestWorker.KEY_CAPTURED_AT, java.time.Instant.now().toString())
      .build()

    val request = OneTimeWorkRequestBuilder<NotificationIngestWorker>()
      .setInputData(workData)
      .build()

    WorkManager.getInstance(applicationContext).enqueue(request)
  }
}
