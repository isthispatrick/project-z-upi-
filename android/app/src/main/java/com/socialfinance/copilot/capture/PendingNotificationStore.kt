package com.socialfinance.copilot.capture

import android.content.Context
import org.json.JSONObject

data class PendingNotificationEvent(
  val id: String,
  val sourceApp: String,
  val rawText: String,
  val capturedAt: String,
)

class PendingNotificationStore(context: Context) {
  private val prefs = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  fun save(event: PendingNotificationEvent) {
    prefs.edit()
      .putString(eventKey(event.id), JSONObject().apply {
        put("id", event.id)
        put("sourceApp", event.sourceApp)
        put("rawText", event.rawText)
        put("capturedAt", event.capturedAt)
      }.toString())
      .apply()
  }

  fun get(eventId: String): PendingNotificationEvent? {
    val raw = prefs.getString(eventKey(eventId), null) ?: return null
    val json = JSONObject(raw)
    return PendingNotificationEvent(
      id = json.getString("id"),
      sourceApp = json.getString("sourceApp"),
      rawText = json.getString("rawText"),
      capturedAt = json.getString("capturedAt"),
    )
  }

  fun remove(eventId: String) {
    prefs.edit().remove(eventKey(eventId)).apply()
  }

  fun listEventIds(): List<String> {
    return prefs.all.keys
      .filter { it.startsWith(EVENT_PREFIX) }
      .map { it.removePrefix(EVENT_PREFIX) }
  }

  companion object {
    private const val PREFS_NAME = "pending_notifications"
    private const val EVENT_PREFIX = "event_"

    private fun eventKey(eventId: String): String = "$EVENT_PREFIX$eventId"
  }
}
