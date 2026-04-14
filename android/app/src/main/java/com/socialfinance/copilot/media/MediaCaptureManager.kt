package com.socialfinance.copilot.media

import android.content.Context
import android.net.Uri
import androidx.core.content.FileProvider
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MediaCaptureManager(private val context: Context) {
  fun createSnapCaptureUri(): Uri {
    val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
    val file = File(context.cacheDir, "snap_$timestamp.jpg").apply {
      parentFile?.mkdirs()
      createNewFile()
    }

    return FileProvider.getUriForFile(
      context,
      "${context.packageName}.fileprovider",
      file,
    )
  }
}
