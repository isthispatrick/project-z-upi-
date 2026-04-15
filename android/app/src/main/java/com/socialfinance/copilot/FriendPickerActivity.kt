package com.socialfinance.copilot

import android.os.Bundle
import android.widget.CheckBox
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.socialfinance.copilot.data.CopilotRepository
import com.socialfinance.copilot.data.FriendRecipientPayload
import com.socialfinance.copilot.data.SelectedRecipient
import com.socialfinance.copilot.databinding.ActivityFriendPickerBinding
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class FriendPickerActivity : AppCompatActivity() {
  private lateinit var binding: ActivityFriendPickerBinding
  private lateinit var repository: CopilotRepository
  private val json = Json { ignoreUnknownKeys = true }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    binding = ActivityFriendPickerBinding.inflate(layoutInflater)
    setContentView(binding.root)

    repository = CopilotRepository(applicationContext)

    binding.confirmRecipientsButton.setOnClickListener {
      val selected = selectedRecipients()
      setResult(
        RESULT_OK,
        android.content.Intent().putExtra(EXTRA_SELECTED_JSON, json.encodeToString(selected)),
      )
      finish()
    }

    lifecycleScope.launch {
      binding.friendPickerStatus.text = getString(R.string.loading_friends)
      repository.fetchFriends()
        .onSuccess { friends ->
          renderFriends(friends)
        }
        .onFailure {
          binding.friendPickerStatus.text = getString(R.string.friend_load_failed)
          Toast.makeText(this@FriendPickerActivity, getString(R.string.friend_load_failed), Toast.LENGTH_SHORT).show()
        }
    }
  }

  private fun renderFriends(friends: List<FriendRecipientPayload>) {
    binding.friendCheckboxContainer.removeAllViews()
    if (friends.isEmpty()) {
      binding.friendPickerStatus.text = getString(R.string.friend_picker_empty)
      return
    }

    val preselectedIds = intent.getStringArrayListExtra(EXTRA_PRESELECTED_IDS)?.toSet().orEmpty()
    binding.friendPickerStatus.text = getString(R.string.friend_picker_ready, friends.size)

    friends.forEach { friend ->
      val checkbox = CheckBox(this).apply {
        text = friend.displayName ?: friend.email ?: friend.friendUserId
        tag = SelectedRecipient(
          id = friend.friendUserId,
          label = friend.displayName ?: friend.email ?: friend.friendUserId,
        )
        isChecked = preselectedIds.contains(friend.friendUserId)
      }
      binding.friendCheckboxContainer.addView(checkbox)
    }
  }

  private fun selectedRecipients(): List<SelectedRecipient> {
    return buildList {
      for (index in 0 until binding.friendCheckboxContainer.childCount) {
        val checkbox = binding.friendCheckboxContainer.getChildAt(index) as? CheckBox ?: continue
        if (checkbox.isChecked) {
          add(checkbox.tag as SelectedRecipient)
        }
      }
    }
  }

  companion object {
    const val EXTRA_SELECTED_JSON = "selected_json"
    const val EXTRA_PRESELECTED_IDS = "preselected_ids"
  }
}
