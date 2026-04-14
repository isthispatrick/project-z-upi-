package com.socialfinance.copilot.data

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

class LocationProvider(context: Context) {
  private val appContext = context.applicationContext
  private val fusedClient = LocationServices.getFusedLocationProviderClient(appContext)

  @SuppressLint("MissingPermission")
  suspend fun getLastKnownPoint(): GeoPointPayload? {
    val hasFinePermission =
      ContextCompat.checkSelfPermission(appContext, Manifest.permission.ACCESS_FINE_LOCATION) ==
        PackageManager.PERMISSION_GRANTED
    val hasCoarsePermission =
      ContextCompat.checkSelfPermission(appContext, Manifest.permission.ACCESS_COARSE_LOCATION) ==
        PackageManager.PERMISSION_GRANTED

    if (!hasFinePermission && !hasCoarsePermission) {
      return null
    }

    return suspendCoroutine { continuation ->
      fusedClient.lastLocation
        .addOnSuccessListener { location ->
          continuation.resume(
            location?.let {
              GeoPointPayload(
                lat = it.latitude,
                lng = it.longitude,
                accuracyMeters = it.accuracy.toDouble(),
              )
            },
          )
        }
        .addOnFailureListener {
          continuation.resume(null)
        }
    }
  }
}
