package com.socialfinance.copilot.data

import android.content.Context
import android.net.Uri
import com.socialfinance.copilot.BuildConfig
import java.io.IOException
import java.net.URL
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.KSerializer
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File

class CopilotRepository(context: Context) {
  private val client = OkHttpClient()
  private val json = Json { ignoreUnknownKeys = true }
  private val appContext = context.applicationContext
  private val deviceIdentityStore = DeviceIdentityStore(appContext)

  suspend fun ingestNotification(
    sourceApp: String,
    rawText: String,
    capturedAt: String?,
  ): Result<IngestNotificationResponse> {
    val payload = IngestNotificationRequest(
      deviceId = deviceIdentityStore.getOrCreateDeviceId(),
      sourceApp = sourceApp,
      rawText = rawText,
      capturedAt = capturedAt,
    )

    return withContext(Dispatchers.IO) {
      runCatching {
        post("api/notifications/ingest", payload, IngestNotificationResponse.serializer())
      }
    }
  }

  suspend fun submitSnapDraft(
    preparedDraft: PreparedSnapDraft,
    reviewedItems: List<SnapItemPayload>,
    gps: GeoPointPayload?,
  ): Result<SnapUploadResponse> {
    return withContext(Dispatchers.IO) {
      runCatching {
        val request = SnapUploadRequest(
          deviceId = deviceIdentityStore.getOrCreateDeviceId(),
          transactionId = preparedDraft.transactionId,
          photoRef = preparedDraft.mediaRef,
          gps = gps,
          items = reviewedItems,
        )

        post("api/snaps", request, SnapUploadResponse.serializer())
      }
    }
  }

  suspend fun prepareSnapDraft(
    transactionId: String,
    merchantLabel: String,
    amountRupees: String,
    localPhotoUri: Uri,
  ): Result<PreparedSnapDraft> {
    val amountPaise = amountRupees.toDoubleOrNull()?.times(100)?.toInt() ?: 0

    return withContext(Dispatchers.IO) {
      runCatching {
        val uploadIntent = post(
          "api/media/upload-intents",
          MediaUploadIntentRequest(
            purpose = "SNAP",
            fileName = "snap-${System.currentTimeMillis()}.jpg",
            mimeType = appContext.contentResolver.getType(localPhotoUri) ?: "image/jpeg",
          ),
          MediaUploadIntentResponse.serializer(),
        )

        uploadCapturedMedia(
          uploadUrl = uploadIntent.uploadUrl,
          localPhotoUri = localPhotoUri,
          mimeType = uploadIntent.mimeType,
        )

        post(
          "api/media/confirm",
          MediaUploadConfirmRequest(uploadIntentId = uploadIntent.id),
          MediaUploadIntentResponse.serializer(),
        )

        val extracted = post(
          "api/vision/extract-snap",
          SnapExtractionRequest(
            mediaRef = uploadIntent.mediaRef,
            merchantLabel = merchantLabel.ifBlank { null },
            amountPaise = amountPaise.coerceAtLeast(0),
          ),
          SnapExtractionResponse.serializer(),
        )

        PreparedSnapDraft(
          transactionId = transactionId,
          mediaRef = uploadIntent.mediaRef,
          suggestedItems = extracted.items.ifEmpty {
            listOf(
              SnapItemPayload(
                name = merchantLabel.ifBlank { "unknown-item" },
                pricePaise = amountPaise.coerceAtLeast(0),
              ),
            )
          },
          confidence = extracted.confidence,
          notes = extracted.notes,
        )
      }
    }
  }

  suspend fun registerCurrentDevice(label: String? = null): Result<DeviceRegistrationResponse> {
    return withContext(Dispatchers.IO) {
      runCatching {
        post(
          "api/devices/register",
          DeviceRegistrationRequest(
            deviceId = deviceIdentityStore.getOrCreateDeviceId(),
            platform = "ANDROID",
            label = label,
          ),
          DeviceRegistrationResponse.serializer(),
        )
      }
    }
  }

  suspend fun fetchLedger(): Result<List<LedgerEntryPayload>> {
    return withContext(Dispatchers.IO) {
      runCatching {
        getList(
          "api/ledger?deviceId=${deviceIdentityStore.getOrCreateDeviceId()}",
          LedgerEntryPayload.serializer(),
        )
      }
    }
  }

  suspend fun signInWithGoogle(idToken: String): Result<GoogleAuthResponse> {
    return withContext(Dispatchers.IO) {
      runCatching {
        post(
          "api/auth/google",
          GoogleAuthRequest(
            deviceId = deviceIdentityStore.getOrCreateDeviceId(),
            idToken = idToken,
          ),
          GoogleAuthResponse.serializer(),
        )
      }
    }
  }

  suspend fun submitBountyDraft(
    merchantVpa: String,
    type: String,
    localPhotoUri: Uri,
    gps: GeoPointPayload,
  ): Result<BountySubmissionResponse> {
    return withContext(Dispatchers.IO) {
      runCatching {
        val uploadIntent = post(
          "api/media/upload-intents",
          MediaUploadIntentRequest(
            purpose = "BOUNTY",
            fileName = "bounty-${System.currentTimeMillis()}.jpg",
            mimeType = appContext.contentResolver.getType(localPhotoUri) ?: "image/jpeg",
          ),
          MediaUploadIntentResponse.serializer(),
        )

        uploadCapturedMedia(
          uploadUrl = uploadIntent.uploadUrl,
          localPhotoUri = localPhotoUri,
          mimeType = uploadIntent.mimeType,
        )

        post(
          "api/media/confirm",
          MediaUploadConfirmRequest(uploadIntentId = uploadIntent.id),
          MediaUploadIntentResponse.serializer(),
        )

        post(
          "api/bounties/submissions",
          BountySubmissionRequest(
            merchantVpa = merchantVpa,
            type = type,
            photoRef = uploadIntent.mediaRef,
            gps = gps,
            aiSignals = BountyAiSignalsPayload(
              qualityScore = 0.82,
              duplicateLikely = false,
              detectedTargets = if (type == "MENU") listOf("menu board", "pricing text") else listOf("merchant qr stand"),
              textCoverage = if (type == "MENU") 0.55 else 0.28,
            ),
          ),
          BountySubmissionResponse.serializer(),
        )
      }
    }
  }

  private fun uploadCapturedMedia(
    uploadUrl: String,
    localPhotoUri: Uri,
    mimeType: String,
  ) {
    val targetUrl =
      if (uploadUrl.startsWith("http://") || uploadUrl.startsWith("https://")) {
        uploadUrl
      } else {
        URL(URL(BuildConfig.API_BASE_URL), uploadUrl).toString()
      }

    val tempFile = File.createTempFile("snap-upload", ".bin", appContext.cacheDir)
    try {
      appContext.contentResolver.openInputStream(localPhotoUri)?.use { input ->
        tempFile.outputStream().use { output -> input.copyTo(output) }
      } ?: throw IOException("Unable to read captured media")

      val request = Request.Builder()
        .url(targetUrl)
        .put(tempFile.asRequestBody(mimeType.toMediaType()))
        .build()

      client.newCall(request).execute().use { response ->
        if (!response.isSuccessful) {
          throw IOException("Upload failed with HTTP ${response.code}")
        }
      }
    } finally {
      tempFile.delete()
    }
  }

  private fun <T> post(
    path: String,
    payload: Any,
    serializer: KSerializer<T>,
  ): T {
    val body = when (payload) {
      is IngestNotificationRequest -> json.encodeToString(IngestNotificationRequest.serializer(), payload)
      is GoogleAuthRequest -> json.encodeToString(GoogleAuthRequest.serializer(), payload)
      is DeviceRegistrationRequest -> json.encodeToString(DeviceRegistrationRequest.serializer(), payload)
      is MediaUploadIntentRequest -> json.encodeToString(MediaUploadIntentRequest.serializer(), payload)
      is MediaUploadConfirmRequest -> json.encodeToString(MediaUploadConfirmRequest.serializer(), payload)
      is BountySubmissionRequest -> json.encodeToString(BountySubmissionRequest.serializer(), payload)
      is SnapExtractionRequest -> json.encodeToString(SnapExtractionRequest.serializer(), payload)
      is SnapUploadRequest -> json.encodeToString(SnapUploadRequest.serializer(), payload)
      else -> throw IOException("Unsupported payload: ${payload::class.java.simpleName}")
    }

    val request = Request.Builder()
      .url("${BuildConfig.API_BASE_URL}$path")
      .post(body.toRequestBody("application/json".toMediaType()))
      .build()

    client.newCall(request).execute().use { response ->
      if (!response.isSuccessful) {
        throw IOException("HTTP ${response.code}")
      }

      val raw = response.body?.string().orEmpty()
      return json.decodeFromString(serializer, raw)
    }
  }

  private fun <T> getList(
    path: String,
    serializer: KSerializer<T>,
  ): List<T> {
    val request = Request.Builder()
      .url("${BuildConfig.API_BASE_URL}$path")
      .get()
      .build()

    client.newCall(request).execute().use { response ->
      if (!response.isSuccessful) {
        throw IOException("HTTP ${response.code}")
      }

      val raw = response.body?.string().orEmpty()
      return json.decodeFromString(kotlinx.serialization.builtins.ListSerializer(serializer), raw)
    }
  }
}
