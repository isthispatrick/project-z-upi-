package com.socialfinance.copilot.capture

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.socialfinance.copilot.R
import com.socialfinance.copilot.SnapComposerActivity
import com.socialfinance.copilot.data.IngestNotificationResponse

class NotificationPromptPublisher(private val context: Context) {
  fun publish(payload: IngestNotificationResponse) {
    createChannelIfNeeded()

    val intent = Intent(context, SnapComposerActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      putExtra(SnapComposerActivity.EXTRA_TRANSACTION_ID, payload.transaction.id)
      putExtra(SnapComposerActivity.EXTRA_PROMPT_HEADLINE, payload.prompt.headline)
      putExtra(SnapComposerActivity.EXTRA_PROMPT_SUBTEXT, payload.prompt.subtext)
    }

    val pendingIntent = PendingIntent.getActivity(
      context,
      payload.transaction.id.hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_menu_camera)
      .setContentTitle(payload.prompt.headline)
      .setContentText(payload.prompt.subtext)
      .setStyle(NotificationCompat.BigTextStyle().bigText(payload.prompt.subtext))
      .setContentIntent(pendingIntent)
      .setAutoCancel(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .build()

    NotificationManagerCompat.from(context).notify(payload.transaction.id.hashCode(), notification)
  }

  private fun createChannelIfNeeded() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    val channel = NotificationChannel(
      CHANNEL_ID,
      context.getString(R.string.prompt_channel_name),
      NotificationManager.IMPORTANCE_HIGH,
    ).apply {
      description = context.getString(R.string.prompt_channel_description)
    }

    val manager = context.getSystemService(NotificationManager::class.java)
    manager.createNotificationChannel(channel)
  }

  companion object {
    private const val CHANNEL_ID = "snap_prompts"
  }
}
