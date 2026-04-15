package com.socialfinance.copilot.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class IngestNotificationRequest(
  val deviceId: String,
  val sourceApp: String,
  val rawText: String,
  val capturedAt: String? = null,
)

@Serializable
data class PromptCard(
  val headline: String,
  val subtext: String,
)

@Serializable
data class TransactionPayload(
  val id: String,
  val category: String,
  val merchantLabel: String? = null,
  val amountPaise: Int? = null,
)

@Serializable
data class MerchantPayload(
  val vpa: String,
  val displayName: String,
  val categoryHint: String,
  val locationName: String? = null,
  val city: String? = null,
)

@Serializable
data class IngestNotificationResponse(
  val prompt: PromptCard,
  val transaction: TransactionPayload,
  val merchant: MerchantPayload? = null,
)

@Serializable
data class GeoPointPayload(
  val lat: Double,
  val lng: Double,
  val accuracyMeters: Double? = null,
)

@Serializable
data class SnapItemPayload(
  val name: String,
  val pricePaise: Int,
)

@Serializable
data class SnapUploadRequest(
  val deviceId: String,
  val transactionId: String,
  val photoRef: String,
  val gps: GeoPointPayload? = null,
  val locationName: String? = null,
  val city: String? = null,
  val items: List<SnapItemPayload> = emptyList(),
  val shareWith: List<String> = emptyList(),
  val ttlSeconds: Int? = null,
)

@Serializable
data class MediaUploadIntentRequest(
  val purpose: String,
  val fileName: String,
  val mimeType: String,
)

@Serializable
data class MediaUploadIntentResponse(
  val id: String,
  val uploadUrl: String,
  val mediaRef: String,
  val mimeType: String,
  val status: String,
)

@Serializable
data class MediaUploadConfirmRequest(
  val uploadIntentId: String,
)

@Serializable
data class SnapExtractionRequest(
  val mediaRef: String,
  val merchantLabel: String? = null,
  val amountPaise: Int? = null,
)

@Serializable
data class SnapExtractionResponse(
  val items: List<SnapItemPayload>,
  val confidence: Double,
  val notes: List<String>,
)

@Serializable
data class LedgerEntryPayload(
  val id: String,
  val merchantLabel: String,
  val category: String,
  val totalAmountPaise: Int? = null,
)

@Serializable
data class SnapUploadResponse(
  @SerialName("ledgerEntry") val ledgerEntry: LedgerEntryPayload,
  val shareId: String? = null,
)

@Serializable
data class DeviceRegistrationRequest(
  val deviceId: String,
  val platform: String,
  val label: String? = null,
)

@Serializable
data class DeviceRegistrationResponse(
  val id: String,
  val platform: String,
  val label: String? = null,
)

@Serializable
data class GoogleAuthRequest(
  val deviceId: String,
  val idToken: String,
)

@Serializable
data class AuthenticatedUserPayload(
  val id: String,
  val email: String,
  val displayName: String? = null,
  val photoUrl: String? = null,
)

@Serializable
data class GoogleAuthResponse(
  val user: AuthenticatedUserPayload,
)

@Serializable
data class FriendRecipientPayload(
  val id: String,
  val userId: String,
  val friendUserId: String,
  val displayName: String? = null,
  val email: String? = null,
  val photoUrl: String? = null,
)

@Serializable
data class FriendLinkRequest(
  val userId: String,
  val friendUserId: String,
)

@Serializable
data class StoredPreparedSnapDraft(
  val transactionId: String,
  val mediaRef: String,
  val suggestedItems: List<SnapItemPayload>,
  val confidence: Double,
  val notes: List<String>,
)

@Serializable
data class SelectedRecipient(
  val id: String,
  val label: String,
)

@Serializable
data class PreparedSnapDraft(
  val transactionId: String,
  val mediaRef: String,
  val suggestedItems: List<SnapItemPayload>,
  val confidence: Double,
  val notes: List<String>,
)

@Serializable
data class BountyAiSignalsPayload(
  val qualityScore: Double,
  val duplicateLikely: Boolean,
  val detectedTargets: List<String>,
  val textCoverage: Double,
  val fraudSignals: List<String> = emptyList(),
)

@Serializable
data class BountySubmissionRequest(
  val merchantVpa: String,
  val type: String,
  val photoRef: String,
  val gps: GeoPointPayload,
  val locationName: String? = null,
  val city: String? = null,
  val aiSignals: BountyAiSignalsPayload,
)

@Serializable
data class BountySubmissionPayload(
  val id: String,
  val merchantVpa: String,
  val type: String,
  val payoutPaise: Int,
  val status: String,
  val reasons: List<String>,
)

@Serializable
data class BountySubmissionResponse(
  val submission: BountySubmissionPayload,
)
