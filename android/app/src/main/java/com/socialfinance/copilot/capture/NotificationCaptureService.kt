package com.socialfinance.copilot.capture

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import java.time.Instant
import java.util.UUID

class NotificationCaptureService : NotificationListenerService() {
  override fun onListenerConnected() {
    super.onListenerConnected()
    NotificationWorkScheduler.replayPending(applicationContext)
  }

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

    val notificationFingerprint = listOf(
      packageName,
      sbn.postTime.toString(),
      sbn.id.toString(),
      rawText,
    ).joinToString("|")
    val eventId = UUID.nameUUIDFromBytes(notificationFingerprint.toByteArray()).toString()
    PendingNotificationStore(applicationContext).save(
      PendingNotificationEvent(
        id = eventId,
        sourceApp = packageName,
        rawText = rawText,
        capturedAt = Instant.now().toString(),
      ),
    )
    NotificationWorkScheduler.enqueue(applicationContext, eventId)
  }
}
