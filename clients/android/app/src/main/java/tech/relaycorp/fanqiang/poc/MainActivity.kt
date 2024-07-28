package tech.relaycorp.fanqiang.poc

import android.content.Intent
import android.net.VpnService
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import tech.relaycorp.fanqiang.poc.ui.theme.FanQiangTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            FanQiangTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    FanQiangContent()
                }
            }
        }
    }

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    fun FanQiangContent() {
        var serverUrl by remember { mutableStateOf("wss://gateway2.chores.fans") }
        var isVpnRunning by remember { mutableStateOf(false) }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            OutlinedTextField(
                value = serverUrl,
                onValueChange = { serverUrl = it },
                label = { Text("Server URL") },
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = {
                    if (isVpnRunning) {
                        stopVpn()
                    } else {
                        prepareStartVpn()
                    }
                    isVpnRunning = !isVpnRunning
                }
            ) {
                Text(if (isVpnRunning) "Stop VPN" else "Start VPN")
            }
        }
    }

    private fun prepareStartVpn() {
        val vpnIntent = VpnService.prepare(this)
        if (vpnIntent != null) {
            startActivityForResult(vpnIntent, REQUEST_VPN_PERMISSION)
        } else {
            onActivityResult(REQUEST_VPN_PERMISSION, RESULT_OK, null)
        }
    }

    private fun startVpn() {
        val intent = Intent(this, FanQiangVpnService::class.java).apply {
            action = "START"
            putExtra("SERVER_URL", "wss://gateway2.chores.fans")
        }
        startService(intent)
    }

    private fun stopVpn() {
        val intent = Intent(this, FanQiangVpnService::class.java).apply {
            action = "STOP"
        }
        startService(intent)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_VPN_PERMISSION && resultCode == RESULT_OK) {
            startVpn()
        } else {
            // Show an error message using Compose
        }
    }

    companion object {
        private const val REQUEST_VPN_PERMISSION = 1
    }
}