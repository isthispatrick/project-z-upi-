package com.socialfinance.copilot.capture

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

object NotificationWorkScheduler {
  fun enqueue(context: Context, eventId: String) {
    val workData = Data.Builder()
      .putString(NotificationIngestWorker.KEY_EVENT_ID, eventId)
      .build()

    val request = OneTimeWorkRequestBuilder<NotificationIngestWorker>()
      .setInputData(workData)
      .setConstraints(
        Constraints.Builder()
          .setRequiredNetworkType(NetworkType.CONNECTED)
          .build(),
      )
      .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.SECONDS)
      .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
      .build()

    WorkManager.getInstance(context).enqueueUniqueWork(
      uniqueWorkName(eventId),
      ExistingWorkPolicy.KEEP,
      request,
    )
  }

  fun replayPending(context: Context) {
    val store = PendingNotificationStore(context)
    store.listEventIds().forEach { eventId ->
      enqueue(context, eventId)
    }
  }

  private fun uniqueWorkName(eventId: String): String = "notification-ingest-$eventId"
}
