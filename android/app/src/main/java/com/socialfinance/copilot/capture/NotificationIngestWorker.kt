package com.socialfinance.copilot.capture

import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.socialfinance.copilot.data.CopilotRepository

class NotificationIngestWorker(
  appContext: android.content.Context,
  params: WorkerParameters,
) : CoroutineWorker(appContext, params) {
  private val repository = CopilotRepository(appContext)

  override suspend fun doWork(): Result {
    val sourceApp = inputData.getString(KEY_SOURCE_APP) ?: return Result.failure()
    val rawText = inputData.getString(KEY_RAW_TEXT) ?: return Result.failure()
    val capturedAt = inputData.getString(KEY_CAPTURED_AT)

    val result = repository.ingestNotification(sourceApp, rawText, capturedAt)
    val payload = result.getOrElse { return Result.retry() }

    NotificationPromptPublisher(applicationContext).publish(payload)
    return Result.success()
  }

  companion object {
    const val KEY_SOURCE_APP = "source_app"
    const val KEY_RAW_TEXT = "raw_text"
    const val KEY_CAPTURED_AT = "captured_at"
  }
}
