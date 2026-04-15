package com.socialfinance.copilot.queue

import android.content.Context
import android.net.Uri
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

class SnapDraftQueueManager(context: Context) {
  private val appContext = context.applicationContext
  private val workManager = WorkManager.getInstance(appContext)

  fun enqueue(
    transactionId: String,
    merchantLabel: String,
    amountRupees: String,
    photoUri: Uri,
  ) = OneTimeWorkRequestBuilder<SnapDraftPreparationWorker>()
    .setInputData(
      Data.Builder()
        .putString(SnapDraftPreparationWorker.KEY_TRANSACTION_ID, transactionId)
        .putString(SnapDraftPreparationWorker.KEY_MERCHANT_LABEL, merchantLabel)
        .putString(SnapDraftPreparationWorker.KEY_AMOUNT_RUPEES, amountRupees)
        .putString(SnapDraftPreparationWorker.KEY_PHOTO_URI, photoUri.toString())
        .build(),
    )
    .setConstraints(
      Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .build(),
    )
    .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.SECONDS)
    .build()
    .also { request ->
      workManager.enqueueUniqueWork(
        uniqueWorkName(transactionId),
        ExistingWorkPolicy.REPLACE,
        request,
      )
    }

  fun getWorkManager(): WorkManager = workManager

  fun uniqueWorkName(transactionId: String) = "snap_draft_$transactionId"
}
