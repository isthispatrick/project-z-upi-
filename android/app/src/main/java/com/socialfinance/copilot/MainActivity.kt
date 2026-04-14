package com.socialfinance.copilot

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.socialfinance.copilot.data.CopilotRepository
import com.socialfinance.copilot.databinding.ActivityMainBinding
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {
  private lateinit var binding: ActivityMainBinding
  private lateinit var repository: CopilotRepository

  private val notificationPermissionLauncher =
    registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
      binding.permissionStatus.text =
        if (granted) getString(R.string.notifications_enabled)
        else getString(R.string.notifications_disabled)
    }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    binding = ActivityMainBinding.inflate(layoutInflater)
    setContentView(binding.root)
    repository = CopilotRepository(applicationContext)

    binding.openListenerSettingsButton.setOnClickListener {
      startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
    }

    binding.openLocationSettingsButton.setOnClickListener {
      startActivity(Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS))
    }

    binding.openBackendDocsButton.setOnClickListener {
      startActivity(
        Intent(
          Intent.ACTION_VIEW,
          Uri.parse("https://developer.android.com/reference/android/service/notification/NotificationListenerService"),
        ),
      )
    }

    binding.openLedgerButton.setOnClickListener {
      startActivity(Intent(this, LedgerHistoryActivity::class.java))
    }

    lifecycleScope.launch {
      repository.registerCurrentDevice(Build.MODEL)
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
    } else {
      binding.permissionStatus.text = getString(R.string.notifications_enabled)
    }
  }
}
