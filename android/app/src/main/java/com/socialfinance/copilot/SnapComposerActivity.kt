package com.socialfinance.copilot

import android.Manifest
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.EditText
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.socialfinance.copilot.data.CopilotRepository
import com.socialfinance.copilot.data.LocationProvider
import com.socialfinance.copilot.data.PreparedSnapDraft
import com.socialfinance.copilot.data.SnapItemPayload
import com.socialfinance.copilot.media.MediaCaptureManager
import com.socialfinance.copilot.databinding.ActivitySnapComposerBinding
import kotlinx.coroutines.launch

class SnapComposerActivity : AppCompatActivity() {
  private lateinit var binding: ActivitySnapComposerBinding
  private lateinit var repository: CopilotRepository
  private lateinit var locationProvider: LocationProvider
  private lateinit var mediaCaptureManager: MediaCaptureManager
  private var capturedPhotoUri: Uri? = null
  private var preparedDraft: PreparedSnapDraft? = null

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
      if (success) {
        binding.captureStatus.text = getString(R.string.photo_captured_ready)
        prepareDraftFromCapture()
      } else {
        binding.captureStatus.text = getString(R.string.photo_capture_missing)
      }
    }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    binding = ActivitySnapComposerBinding.inflate(layoutInflater)
    setContentView(binding.root)

    repository = CopilotRepository(applicationContext)
    locationProvider = LocationProvider(applicationContext)
    mediaCaptureManager = MediaCaptureManager(applicationContext)

    val transactionId = intent.getStringExtra(EXTRA_TRANSACTION_ID).orEmpty()
    val promptHeadline = intent.getStringExtra(EXTRA_PROMPT_HEADLINE).orEmpty()
    val promptSubtext = intent.getStringExtra(EXTRA_PROMPT_SUBTEXT).orEmpty()

    binding.promptHeadline.text = promptHeadline
    binding.promptSubtext.text = promptSubtext
    addReviewItemRow()
    binding.addItemButton.setOnClickListener {
      addReviewItemRow()
    }
    binding.capturePhotoButton.setOnClickListener {
      cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
    }

    binding.submitSnapButton.setOnClickListener {
      lifecycleScope.launch {
        val draft = preparedDraft
        if (draft == null) {
          Toast.makeText(
            this@SnapComposerActivity,
            getString(R.string.extract_before_submit),
            Toast.LENGTH_SHORT,
          ).show()
          return@launch
        }

        val gps = locationProvider.getLastKnownPoint()
        val reviewedItems = collectReviewedItems().ifEmpty {
          draft.suggestedItems.ifEmpty {
            listOf(SnapItemPayload(name = "Scanned purchase", pricePaise = 0))
          }
        }
        val result = repository.submitSnapDraft(
          preparedDraft = draft,
          reviewedItems = reviewedItems,
          gps = gps,
        )

        Toast.makeText(
          this@SnapComposerActivity,
          if (result.isSuccess) getString(R.string.snap_submit_success) else getString(R.string.snap_submit_failure),
          Toast.LENGTH_SHORT,
        ).show()

        if (result.isSuccess) {
          finish()
        }
      }
    }
  }

  private fun prepareDraftFromCapture() {
    val photoUri = capturedPhotoUri ?: return
    binding.captureStatus.text = getString(R.string.preparing_draft)
    binding.submitSnapButton.isEnabled = false

    lifecycleScope.launch {
      val result = repository.prepareSnapDraft(
        transactionId = intent.getStringExtra(EXTRA_TRANSACTION_ID).orEmpty(),
        merchantLabel = collectReviewedItems().firstOrNull()?.name.orEmpty(),
        amountRupees = collectReviewedItems().firstOrNull()?.let { (it.pricePaise / 100.0).toString() }.orEmpty(),
        localPhotoUri = photoUri,
      )

      result.onSuccess { draft ->
        preparedDraft = draft
        renderReviewItems(draft.suggestedItems)
        binding.extractionStatus.text = getString(
          R.string.extraction_ready,
          draft.confidence,
          draft.notes.joinToString(", "),
        )
        binding.captureStatus.text = getString(R.string.photo_captured_ready)
        binding.submitSnapButton.isEnabled = true
      }.onFailure {
        binding.extractionStatus.text = getString(R.string.extraction_failed)
        binding.submitSnapButton.isEnabled = false
      }
    }
  }

  private fun launchCameraCapture() {
    val target = mediaCaptureManager.createSnapCaptureUri()
    capturedPhotoUri = target
    takePictureLauncher.launch(target)
  }

  private fun renderReviewItems(items: List<SnapItemPayload>) {
    binding.itemRowsContainer.removeAllViews()
    val source = items.ifEmpty { listOf(SnapItemPayload("Scanned purchase", 0)) }
    source.forEach { item -> addReviewItemRow(item) }
  }

  private fun addReviewItemRow(item: SnapItemPayload? = null) {
    val row = LayoutInflater.from(this).inflate(R.layout.item_snap_review_row, binding.itemRowsContainer, false)
    val nameInput = row.findViewById<EditText>(R.id.reviewItemName)
    val priceInput = row.findViewById<EditText>(R.id.reviewItemPrice)
    val removeButton = row.findViewById<View>(R.id.removeItemButton)

    nameInput.setText(item?.name.orEmpty())
    val initialPricePaise = item?.pricePaise ?: 0
    if (initialPricePaise > 0) {
      priceInput.setText(String.format("%.2f", initialPricePaise / 100.0))
    }

    removeButton.setOnClickListener {
      binding.itemRowsContainer.removeView(row)
      if (binding.itemRowsContainer.childCount == 0) {
        addReviewItemRow()
      }
    }

    binding.itemRowsContainer.addView(row)
  }

  private fun collectReviewedItems(): List<SnapItemPayload> {
    return buildList {
      for (index in 0 until binding.itemRowsContainer.childCount) {
        val row = binding.itemRowsContainer.getChildAt(index)
        val name = row.findViewById<EditText>(R.id.reviewItemName).text?.toString().orEmpty().trim()
        val pricePaise = ((row.findViewById<EditText>(R.id.reviewItemPrice).text?.toString().orEmpty().toDoubleOrNull()
          ?: 0.0) * 100).toInt()

        if (name.isNotBlank()) {
          add(
            SnapItemPayload(
              name = name,
              pricePaise = pricePaise.coerceAtLeast(0),
            ),
          )
        }
      }
    }
  }

  companion object {
    const val EXTRA_TRANSACTION_ID = "transaction_id"
    const val EXTRA_PROMPT_HEADLINE = "prompt_headline"
    const val EXTRA_PROMPT_SUBTEXT = "prompt_subtext"
  }
}
