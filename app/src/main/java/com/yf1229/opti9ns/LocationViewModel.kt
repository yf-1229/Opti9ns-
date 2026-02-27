package com.yf1229.opti9ns

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class LocationState(
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,
    val accuracy: Float = 0f,
    val isLoading: Boolean = true,
    val errorMessage: String? = null
)

class LocationViewModel : ViewModel() {

    private val _locationState = MutableStateFlow(LocationState())
    val locationState: StateFlow<LocationState> = _locationState.asStateFlow()

    private var locationCallback: LocationCallback? = null

    @SuppressLint("MissingPermission")
    fun startLocationUpdates(context: Context) {
        val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)

        val locationRequest = LocationRequest.Builder(
            Priority.PRIORITY_HIGH_ACCURACY,
            5_000L
        ).setMinUpdateIntervalMillis(2_000L).build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { location ->
                    updateLocation(location)
                }
            }
        }

        // Try to get last known location first for immediate display
        fusedLocationClient.lastLocation.addOnSuccessListener { location ->
            location?.let { updateLocation(it) }
        }

        fusedLocationClient.requestLocationUpdates(
            locationRequest,
            locationCallback!!,
            context.mainLooper
        ).addOnFailureListener { e ->
            viewModelScope.launch {
                _locationState.value = _locationState.value.copy(
                    isLoading = false,
                    errorMessage = e.message
                )
            }
        }
    }

    fun stopLocationUpdates(context: Context) {
        locationCallback?.let { callback ->
            LocationServices.getFusedLocationProviderClient(context)
                .removeLocationUpdates(callback)
        }
        locationCallback = null
    }

    private fun updateLocation(location: Location) {
        _locationState.value = LocationState(
            latitude = location.latitude,
            longitude = location.longitude,
            accuracy = location.accuracy,
            isLoading = false,
            errorMessage = null
        )
    }

    override fun onCleared() {
        super.onCleared()
        locationCallback = null
    }
}
