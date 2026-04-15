package com.socialfinance.copilot.data

import android.content.Context

class UserSessionStore(context: Context) {
  private val prefs = context.applicationContext.getSharedPreferences("copilot_user_session", Context.MODE_PRIVATE)

  fun saveUser(user: AuthenticatedUserPayload) {
    prefs.edit()
      .putString(KEY_USER_ID, user.id)
      .putString(KEY_EMAIL, user.email)
      .putString(KEY_DISPLAY_NAME, user.displayName)
      .putString(KEY_PHOTO_URL, user.photoUrl)
      .apply()
  }

  fun getUserId(): String? = prefs.getString(KEY_USER_ID, null)

  fun getDisplayName(): String? = prefs.getString(KEY_DISPLAY_NAME, null)

  companion object {
    private const val KEY_USER_ID = "user_id"
    private const val KEY_EMAIL = "email"
    private const val KEY_DISPLAY_NAME = "display_name"
    private const val KEY_PHOTO_URL = "photo_url"
  }
}
