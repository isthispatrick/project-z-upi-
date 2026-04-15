package com.socialfinance.copilot.queue

import android.content.Context
import android.net.Uri
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.socialfinance.copilot.data.CopilotRepository
import com.socialfinance.copilot.data.PendingSnapDraftStore

class SnapDraftPreparationWorker(
  appContext: Context,
  params: WorkerParameters,
) : CoroutineWorker(appContext, params) {
  private val repository = CopilotRepository(appContext)
  private val pendingStore = PendingSnapDraftStore(appContext)

  override suspend fun doWork(): Result {
    val transactionId = inputData.getString(KEY_TRANSACTION_ID) ?: return Result.failure()
    val merchantLabel = inputData.getString(KEY_MERCHANT_LABEL).orEmpty()
    val amountRupees = inputData.getString(KEY_AMOUNT_RUPEES).orEmpty()
    val photoUri = inputData.getString(KEY_PHOTO_URI)?.let(Uri::parse) ?: return Result.failure()

    val result = repository.prepareSnapDraft(
      transactionId = transactionId,
      merchantLabel = merchantLabel,
      amountRupees = amountRupees,
      localPhotoUri = photoUri,
    )

    return result.fold(
      onSuccess = { draft ->
        pendingStore.saveDraft(draft)
        pendingStore.clearWorkId(transactionId)
        Result.success()
      },
      onFailure = {
        if (runAttemptCount >= MAX_RETRY_COUNT) {
          pendingStore.clearWorkId(transactionId)
          Result.failure()
        } else {
          Result.retry()
        }
      },
    )
  }

  companion object {
    const val KEY_TRANSACTION_ID = "transaction_id"
    const val KEY_MERCHANT_LABEL = "merchant_label"
    const val KEY_AMOUNT_RUPEES = "amount_rupees"
    const val KEY_PHOTO_URI = "photo_uri"
    private const val MAX_RETRY_COUNT = 6
  }
}
