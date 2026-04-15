package com.socialfinance.copilot.auth

import android.content.Context
import android.content.Intent
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.socialfinance.copilot.BuildConfig

class GoogleSignInManager(context: Context) {
  private val appContext = context.applicationContext
  private val client: GoogleSignInClient by lazy {
    val optionsBuilder = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
      .requestEmail()

    if (BuildConfig.GOOGLE_WEB_CLIENT_ID.isNotBlank()) {
      optionsBuilder.requestIdToken(BuildConfig.GOOGLE_WEB_CLIENT_ID)
    }

    GoogleSignIn.getClient(appContext, optionsBuilder.build())
  }

  fun isConfigured(): Boolean = BuildConfig.GOOGLE_WEB_CLIENT_ID.isNotBlank()

  fun signInIntent(): Intent = client.signInIntent

  fun getSignedInAccountFromIntent(data: Intent?): Result<GoogleSignInAccount> {
    return runCatching {
      GoogleSignIn.getSignedInAccountFromIntent(data).getResult(ApiException::class.java)
    }
  }
}
