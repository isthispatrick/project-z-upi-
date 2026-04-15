package com.socialfinance.copilot.data

import android.content.Context
import java.util.UUID
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class PendingSnapDraftStore(context: Context) {
  private val prefs = context.applicationContext.getSharedPreferences("pending_snap_drafts", Context.MODE_PRIVATE)
  private val json = Json { ignoreUnknownKeys = true }

  fun saveDraft(draft: PreparedSnapDraft) {
    val stored = StoredPreparedSnapDraft(
      transactionId = draft.transactionId,
      mediaRef = draft.mediaRef,
      suggestedItems = draft.suggestedItems,
      confidence = draft.confidence,
      notes = draft.notes,
    )
    prefs.edit().putString(draftKey(draft.transactionId), json.encodeToString(stored)).apply()
  }

  fun getDraft(transactionId: String): PreparedSnapDraft? {
    val raw = prefs.getString(draftKey(transactionId), null) ?: return null
    return runCatching {
      val stored = json.decodeFromString<StoredPreparedSnapDraft>(raw)
      PreparedSnapDraft(
        transactionId = stored.transactionId,
        mediaRef = stored.mediaRef,
        suggestedItems = stored.suggestedItems,
        confidence = stored.confidence,
        notes = stored.notes,
      )
    }.getOrNull()
  }

  fun saveWorkId(transactionId: String, workId: UUID) {
    prefs.edit().putString(workKey(transactionId), workId.toString()).apply()
  }

  fun getWorkId(transactionId: String): UUID? {
    return prefs.getString(workKey(transactionId), null)?.let {
      runCatching { UUID.fromString(it) }.getOrNull()
    }
  }

  fun clearWorkId(transactionId: String) {
    prefs.edit().remove(workKey(transactionId)).apply()
  }

  private fun draftKey(transactionId: String) = "draft_$transactionId"

  private fun workKey(transactionId: String) = "work_$transactionId"
}
