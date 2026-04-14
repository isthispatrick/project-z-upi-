package com.socialfinance.copilot.capture

object SupportedPackages {
  private val allowed = setOf(
    "com.google.android.apps.nbu.paisa.user",
    "com.phonepe.app",
    "net.one97.paytm",
    "in.org.npci.upiapp",
    "com.sbi.upi",
  )

  fun matches(packageName: String): Boolean = packageName in allowed
}
