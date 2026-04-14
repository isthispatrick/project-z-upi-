package com.socialfinance.copilot.capture

object NotificationParser {
  private val paymentMarkers = listOf(
    "paid to",
    "debited",
    "upi",
    "sent to",
    "credited",
  )

  fun looksLikeUpiPayment(rawText: String): Boolean {
    val normalized = rawText.lowercase()
    return paymentMarkers.count { marker -> normalized.contains(marker) } >= 2
  }
}
