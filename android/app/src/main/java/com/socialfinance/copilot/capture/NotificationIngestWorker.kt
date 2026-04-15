package com.socialfinance.copilot.capture

import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.socialfinance.copilot.data.CopilotRepository

class NotificationIngestWorker(
  appContext: android.content.Context,
  params: WorkerParameters,
) : CoroutineWorker(appContext, params) {
  private val repository = CopilotRepository(appContext)
  private val pendingStore = PendingNotificationStore(appContext)

  override suspend fun doWork(): Result {
    val eventId = inputData.getString(KEY_EVENT_ID) ?: return Result.failure()
    val event = pendingStore.get(eventId) ?: return Result.success()

    val result = repository.ingestNotification(event.sourceApp, event.rawText, event.capturedAt)
    val payload = result.getOrElse { return Result.retry() }

    NotificationPromptPublisher(applicationContext).publish(payload)
    pendingStore.remove(eventId)
    return Result.success()
  }

  companion object {
    const val KEY_EVENT_ID = "event_id"
  }
}
