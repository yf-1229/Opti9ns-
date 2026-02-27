package com.yf1229.opti9ns

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.MultiplePermissionsState
import com.google.accompanist.permissions.rememberMultiplePermissionsState
import com.yf1229.opti9ns.ui.theme.Opti9nsTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            Opti9nsTheme {
                LocationPermissionScreen()
            }
        }
    }
}

@OptIn(ExperimentalPermissionsApi::class, ExperimentalMaterial3Api::class)
@Composable
fun LocationPermissionScreen() {
    val locationPermissionsState = rememberMultiplePermissionsState(
        permissions = listOf(
            android.Manifest.permission.ACCESS_FINE_LOCATION,
            android.Manifest.permission.ACCESS_COARSE_LOCATION
        )
    )

    Scaffold(
        topBar = {
            TopAppBar(title = { Text(stringResource(R.string.app_name)) })
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                locationPermissionsState.allPermissionsGranted -> {
                    MapScreen()
                }
                locationPermissionsState.shouldShowRationale -> {
                    LocationRationaleDialog(
                        permissionsState = locationPermissionsState
                    )
                }
                else -> {
                    // Request permissions on first launch
                    androidx.compose.runtime.LaunchedEffect(Unit) {
                        locationPermissionsState.launchMultiplePermissionRequest()
                    }
                    PermissionDeniedContent(permissionsState = locationPermissionsState)
                }
            }
        }
    }
}

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun LocationRationaleDialog(permissionsState: MultiplePermissionsState) {
    AlertDialog(
        onDismissRequest = {},
        title = { Text(stringResource(R.string.permission_rationale_title)) },
        text = { Text(stringResource(R.string.permission_rationale_message)) },
        confirmButton = {
            TextButton(onClick = { permissionsState.launchMultiplePermissionRequest() }) {
                Text(stringResource(R.string.permission_grant))
            }
        }
    )
}

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun PermissionDeniedContent(permissionsState: MultiplePermissionsState) {
    if (!permissionsState.allPermissionsGranted) {
        AlertDialog(
            onDismissRequest = {},
            title = { Text(stringResource(R.string.permission_denied_title)) },
            text = { Text(stringResource(R.string.permission_denied_message)) },
            confirmButton = {
                TextButton(onClick = { permissionsState.launchMultiplePermissionRequest() }) {
                    Text(stringResource(R.string.permission_grant))
                }
            }
        )
    }
}
