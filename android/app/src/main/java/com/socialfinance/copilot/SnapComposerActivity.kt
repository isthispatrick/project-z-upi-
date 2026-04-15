package com.socialfinance.copilot

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.EditText
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.widget.doAfterTextChanged
import androidx.lifecycle.lifecycleScope
import androidx.work.WorkInfo
import com.socialfinance.copilot.data.CopilotRepository
import com.socialfinance.copilot.data.LocationProvider
import com.socialfinance.copilot.data.PendingSnapDraftStore
import com.socialfinance.copilot.data.PreparedSnapDraft
import com.socialfinance.copilot.data.SelectedRecipient
import com.socialfinance.copilot.data.SnapItemPayload
import com.socialfinance.copilot.media.MediaCaptureManager
import com.socialfinance.copilot.queue.SnapDraftQueueManager
import com.socialfinance.copilot.databinding.ActivitySnapComposerBinding
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json

class SnapComposerActivity : AppCompatActivity() {
  private lateinit var binding: ActivitySnapComposerBinding
  private lateinit var repository: CopilotRepository
  private lateinit var locationProvider: LocationProvider
  private lateinit var mediaCaptureManager: MediaCaptureManager
  private lateinit var pendingSnapDraftStore: PendingSnapDraftStore
  private lateinit var snapDraftQueueManager: SnapDraftQueueManager
  private var capturedPhotoUri: Uri? = null
  private var preparedDraft: PreparedSnapDraft? = null
  private var selectedRecipients: List<SelectedRecipient> = emptyList()
  private val json = Json { ignoreUnknownKeys = true }

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
        queueDraftPreparation()
      } else {
        binding.captureStatus.text = getString(R.string.photo_capture_missing)
      }
    }

  private val recipientPickerLauncher =
    registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
      val raw = result.data?.getStringExtra(FriendPickerActivity.EXTRA_SELECTED_JSON) ?: return@registerForActivityResult
      selectedRecipients = runCatching {
        json.decodeFromString<List<SelectedRecipient>>(raw)
      }.getOrDefault(emptyList())
      renderRecipientSummary()
    }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    binding = ActivitySnapComposerBinding.inflate(layoutInflater)
    setContentView(binding.root)

    repository = CopilotRepository(applicationContext)
    locationProvider = LocationProvider(applicationContext)
    mediaCaptureManager = MediaCaptureManager(applicationContext)
    pendingSnapDraftStore = PendingSnapDraftStore(applicationContext)
    snapDraftQueueManager = SnapDraftQueueManager(applicationContext)

    val transactionId = intent.getStringExtra(EXTRA_TRANSACTION_ID).orEmpty()
    val promptHeadline = intent.getStringExtra(EXTRA_PROMPT_HEADLINE).orEmpty()
    val promptSubtext = intent.getStringExtra(EXTRA_PROMPT_SUBTEXT).orEmpty()

    binding.promptHeadline.text = promptHeadline
    binding.promptSubtext.text = promptSubtext
    addReviewItemRow()
    updateReviewSummary()
    renderRecipientSummary()
    binding.addItemButton.setOnClickListener {
      addReviewItemRow()
    }
    binding.capturePhotoButton.setOnClickListener {
      cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
    }
    binding.pickRecipientsButton.setOnClickListener {
      if (repository.getCurrentUserId().isNullOrBlank()) {
        Toast.makeText(this, getString(R.string.friend_picker_sign_in_required), Toast.LENGTH_SHORT).show()
        return@setOnClickListener
      }

      recipientPickerLauncher.launch(
        Intent(this, FriendPickerActivity::class.java).apply {
          putStringArrayListExtra(
            FriendPickerActivity.EXTRA_PRESELECTED_IDS,
            ArrayList(selectedRecipients.map { it.id }),
          )
        },
      )
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

        val reviewedItems = collectReviewedItems()
        if (reviewedItems.isEmpty()) {
          Toast.makeText(
            this@SnapComposerActivity,
            getString(R.string.review_row_required),
            Toast.LENGTH_SHORT,
          ).show()
          return@launch
        }

        val gps = locationProvider.getLastKnownPoint()
        setSubmitState(isBusy = true, enableSubmit = false, hint = getString(R.string.submit_hint_submitting))
        val result = repository.submitSnapDraft(
          preparedDraft = draft,
          reviewedItems = reviewedItems,
          gps = gps,
          shareWith = selectedRecipients.map { it.id },
        )

        Toast.makeText(
          this@SnapComposerActivity,
          if (result.isSuccess) getString(R.string.snap_submit_success) else getString(R.string.snap_submit_failure),
          Toast.LENGTH_SHORT,
        ).show()

        if (result.isSuccess) {
          finish()
        } else {
          setSubmitState(isBusy = false, enableSubmit = true, hint = getString(R.string.submit_hint_ready))
        }
      }
    }

    pendingSnapDraftStore.getDraft(transactionId)?.let { draft ->
      preparedDraft = draft
      renderReviewItems(draft.suggestedItems)
      binding.extractionStatus.text = getString(
        R.string.extraction_ready,
        draft.confidence,
        draft.notes.joinToString(", "),
      )
      setSubmitState(isBusy = false, enableSubmit = true, hint = getString(R.string.submit_hint_ready))
    }

    pendingSnapDraftStore.getWorkId(transactionId)?.let { observeDraftWork(it.toString(), transactionId) }
  }

  private fun queueDraftPreparation() {
    val photoUri = capturedPhotoUri ?: return
    val transactionId = intent.getStringExtra(EXTRA_TRANSACTION_ID).orEmpty()
    val merchantLabel = intent.getStringExtra(EXTRA_MERCHANT_LABEL).orEmpty()
    val amountRupees = intent.getStringExtra(EXTRA_AMOUNT_RUPEES).orEmpty()

    val request = snapDraftQueueManager.enqueue(
      transactionId = transactionId,
      merchantLabel = merchantLabel,
      amountRupees = amountRupees,
      photoUri = photoUri,
    )
    pendingSnapDraftStore.saveWorkId(transactionId, request.id)
    binding.captureStatus.text = getString(R.string.extraction_queued)
    binding.extractionStatus.text = getString(R.string.extraction_queued)
    setSubmitState(isBusy = true, enableSubmit = false, hint = getString(R.string.submit_hint_queued))
    observeDraftWork(request.id.toString(), transactionId)
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
    updateReviewSummary()
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

    nameInput.doAfterTextChanged {
      updateReviewSummary()
    }
    priceInput.doAfterTextChanged {
      updateReviewSummary()
    }

    removeButton.setOnClickListener {
      binding.itemRowsContainer.removeView(row)
      if (binding.itemRowsContainer.childCount == 0) {
        addReviewItemRow()
      } else {
        updateReviewSummary()
      }
    }

    binding.itemRowsContainer.addView(row)
    updateReviewSummary()
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

  private fun updateReviewSummary() {
    val reviewedItems = collectReviewedItems()
    val totalPaise = reviewedItems.sumOf { it.pricePaise }

    binding.reviewItemCount.text = if (reviewedItems.isEmpty()) {
      getString(R.string.review_items_count_empty)
    } else {
      getString(R.string.review_items_count, reviewedItems.size)
    }

    binding.reviewTotalAmount.text = if (reviewedItems.isEmpty()) {
      getString(R.string.review_total_amount_empty)
    } else {
      getString(R.string.review_total_amount, totalPaise / 100.0)
    }

    binding.submitSnapButton.text = if (preparedDraft != null && reviewedItems.isNotEmpty()) {
      getString(R.string.submit_snap_with_total, totalPaise / 100.0)
    } else {
      getString(R.string.submit_snap)
    }
  }

  private fun renderRecipientSummary() {
    binding.recipientSummary.text = if (selectedRecipients.isEmpty()) {
      getString(R.string.recipient_summary_empty)
    } else {
      getString(
        R.string.recipient_summary_ready,
        selectedRecipients.joinToString(", ") { it.label },
      )
    }
  }

  private fun observeDraftWork(workId: String, transactionId: String) {
    val parsedId = runCatching { java.util.UUID.fromString(workId) }.getOrNull() ?: return
    snapDraftQueueManager.getWorkManager()
      .getWorkInfoByIdLiveData(parsedId)
      .observe(this) { info ->
        when (info?.state) {
          WorkInfo.State.ENQUEUED, WorkInfo.State.BLOCKED -> {
            binding.extractionStatus.text = getString(R.string.extraction_queued)
            setSubmitState(isBusy = true, enableSubmit = false, hint = getString(R.string.submit_hint_queued))
          }
          WorkInfo.State.RUNNING -> {
            binding.extractionStatus.text = getString(R.string.extraction_running)
            setSubmitState(isBusy = true, enableSubmit = false, hint = getString(R.string.submit_hint_loading))
          }
          WorkInfo.State.SUCCEEDED -> {
            pendingSnapDraftStore.getDraft(transactionId)?.let { draft ->
              preparedDraft = draft
              renderReviewItems(draft.suggestedItems)
              binding.extractionStatus.text = getString(
                R.string.extraction_ready,
                draft.confidence,
                draft.notes.joinToString(", "),
              )
              binding.captureStatus.text = getString(R.string.photo_captured_ready)
              setSubmitState(isBusy = false, enableSubmit = true, hint = getString(R.string.submit_hint_ready))
            }
          }
          WorkInfo.State.FAILED, WorkInfo.State.CANCELLED -> {
            pendingSnapDraftStore.clearWorkId(transactionId)
            binding.extractionStatus.text = getString(R.string.extraction_failed)
            setSubmitState(isBusy = false, enableSubmit = false, hint = getString(R.string.extract_before_submit))
          }
          null -> Unit
        }
      }
  }

  private fun setSubmitState(isBusy: Boolean, enableSubmit: Boolean, hint: String) {
    binding.capturePhotoButton.isEnabled = !isBusy
    binding.addItemButton.isEnabled = !isBusy
    binding.pickRecipientsButton.isEnabled = !isBusy
    binding.submitSnapButton.isEnabled = enableSubmit
    binding.submitHint.text = hint
  }

  companion object {
    const val EXTRA_TRANSACTION_ID = "transaction_id"
    const val EXTRA_PROMPT_HEADLINE = "prompt_headline"
    const val EXTRA_PROMPT_SUBTEXT = "prompt_subtext"
    const val EXTRA_MERCHANT_LABEL = "merchant_label"
    const val EXTRA_AMOUNT_RUPEES = "amount_rupees"
  }
}
