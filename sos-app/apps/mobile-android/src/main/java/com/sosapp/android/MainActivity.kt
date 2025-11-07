package com.sosapp.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.sosapp.android.ui.screens.DashboardScreen
import com.sosapp.android.ui.screens.LoginScreen
import com.sosapp.android.ui.theme.SOSAppTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            SOSAppTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    SOSAppNavigation()
                }
            }
        }
    }
}

@Composable
fun SOSAppNavigation() {
    val navController = rememberNavController()
    var isAuthenticated by remember { mutableStateOf(false) }

    NavHost(
        navController = navController,
        startDestination = if (isAuthenticated) "dashboard" else "login"
    ) {
        composable("login") {
            LoginScreen(
                onLoginSuccess = {
                    isAuthenticated = true
                    navController.navigate("dashboard") {
                        popUpTo("login") { inclusive = true }
                    }
                },
                onNavigateToRegister = {
                    navController.navigate("register")
                }
            )
        }

        composable("register") {
            // RegisterScreen would go here
        }

        composable("dashboard") {
            DashboardScreen(
                onNavigateToContacts = {
                    navController.navigate("contacts")
                },
                onNavigateToMedical = {
                    navController.navigate("medical")
                },
                onNavigateToHistory = {
                    navController.navigate("history")
                },
                onNavigateToSettings = {
                    navController.navigate("settings")
                },
                onTriggerEmergency = {
                    navController.navigate("active_emergency")
                }
            )
        }

        composable("contacts") {
            // ContactsScreen would go here
        }

        composable("medical") {
            // MedicalProfileScreen would go here
        }

        composable("history") {
            // HistoryScreen would go here
        }

        composable("active_emergency") {
            // ActiveEmergencyScreen would go here
        }

        composable("settings") {
            // SettingsScreen would go here
        }
    }
}
