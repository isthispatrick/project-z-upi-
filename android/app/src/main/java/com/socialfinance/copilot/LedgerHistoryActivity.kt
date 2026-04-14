package com.socialfinance.copilot

import android.os.Bundle
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.socialfinance.copilot.data.CopilotRepository
import com.socialfinance.copilot.databinding.ActivityLedgerHistoryBinding
import kotlinx.coroutines.launch

class LedgerHistoryActivity : AppCompatActivity() {
  private lateinit var binding: ActivityLedgerHistoryBinding
  private lateinit var repository: CopilotRepository

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    binding = ActivityLedgerHistoryBinding.inflate(layoutInflater)
    setContentView(binding.root)

    repository = CopilotRepository(applicationContext)

    lifecycleScope.launch {
      val result = repository.fetchLedger()
      val entries = result.getOrElse {
        Toast.makeText(this@LedgerHistoryActivity, getString(R.string.ledger_load_failed), Toast.LENGTH_SHORT).show()
        emptyList()
      }

      val items = entries.map { entry ->
        val amount = entry.totalAmountPaise?.let { paise -> "Rs.${"%.2f".format(paise / 100.0)}" } ?: "Unknown"
        "${entry.merchantLabel} • $amount • ${entry.category}"
      }

      binding.ledgerList.adapter = ArrayAdapter(
        this@LedgerHistoryActivity,
        android.R.layout.simple_list_item_1,
        items.ifEmpty { listOf(getString(R.string.ledger_empty_state)) },
      )
    }
  }
}
