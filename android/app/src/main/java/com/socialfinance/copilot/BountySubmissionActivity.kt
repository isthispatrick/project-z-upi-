package com.socialfinance.copilot

import android.Manifest
import android.net.Uri
import android.os.Bundle
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.socialfinance.copilot.data.CopilotRepository
import com.socialfinance.copilot.data.LocationProvider
import com.socialfinance.copilot.media.MediaCaptureManager
import com.socialfinance.copilot.databinding.ActivityBountySubmissionBinding
import kotlinx.coroutines.launch

class BountySubmissionActivity : AppCompatActivity() {
  private lateinit var binding: ActivityBountySubmissionBinding
  private lateinit var repository: CopilotRepository
  private lateinit var locationProvider: LocationProvider
  private lateinit var mediaCaptureManager: MediaCaptureManager
  private var capturedPhotoUri: Uri? = null

  private val cameraPermissionLauncher =
    registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
      if (granted) {
        launchCameraCapture()
      } else {
        Toast.makeText(this, getString(R.string.camera_permission_required), Toast.LENGTH_SHORT).show()
      }
    }

  private val takePictureLauncher =
    registerForActivityResult(ActivityResultContracts.TakePicture()) { success ->
      binding.bountyCaptureStatus.text =
        if (success) getString(R.string.photo_captured_ready) else getString(R.string.photo_capture_missing)
    }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    binding = ActivityBountySubmissionBinding.inflate(layoutInflater)
    setContentView(binding.root)

    repository = CopilotRepository(applicationContext)
    locationProvider = LocationProvider(applicationContext)
    mediaCaptureManager = MediaCaptureManager(applicationContext)

    binding.bountyTypeDropdown.setAdapter(
      ArrayAdapter(
        this,
        android.R.layout.simple_dropdown_item_1line,
        listOf("MENU", "QR_STAND"),
      ),
    )
    binding.bountyTypeDropdown.setText("MENU", false)

    binding.captureBountyPhotoButton.setOnClickListener {
      cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
    }

    binding.submitBountyButton.setOnClickListener {
      lifecycleScope.launch {
        val photoUri = capturedPhotoUri
        if (photoUri == null) {
          Toast.makeText(this@BountySubmissionActivity, getString(R.string.photo_capture_missing), Toast.LENGTH_SHORT).show()
          return@launch
        }

        val merchantVpa = binding.merchantVpaInput.text?.toString().orEmpty().trim().lowercase()
        if (merchantVpa.isBlank()) {
          Toast.makeText(this@BountySubmissionActivity, getString(R.string.merchant_vpa_required), Toast.LENGTH_SHORT).show()
          return@launch
        }

        val gps = locationProvider.getLastKnownPoint()
        if (gps == null) {
          Toast.makeText(this@BountySubmissionActivity, getString(R.string.location_required), Toast.LENGTH_SHORT).show()
          return@launch
        }

        binding.bountyCaptureStatus.text = getString(R.string.submitting_bounty)
        val result = repository.submitBountyDraft(
          merchantVpa = merchantVpa,
          type = binding.bountyTypeDropdown.text?.toString().orEmpty(),
          localPhotoUri = photoUri,
          gps = gps,
        )

        result.onSuccess { response ->
          val payout = "Rs.${"%.2f".format(response.submission.payoutPaise / 100.0)}"
          binding.bountyCaptureStatus.text =
            getString(R.string.bounty_submit_success, response.submission.status, payout)
          Toast.makeText(this@BountySubmissionActivity, getString(R.string.bounty_sent), Toast.LENGTH_SHORT).show()
        }.onFailure {
          binding.bountyCaptureStatus.text = getString(R.string.bounty_submit_failed)
        }
      }
    }
  }

  private fun launchCameraCapture() {
    val target = mediaCaptureManager.createSnapCaptureUri()
    capturedPhotoUri = target
    takePictureLauncher.launch(target)
  }
}
