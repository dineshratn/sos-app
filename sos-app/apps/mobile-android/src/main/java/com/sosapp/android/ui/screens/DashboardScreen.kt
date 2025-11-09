package com.sosapp.android.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    onNavigateToContacts: () -> Unit,
    onNavigateToMedical: () -> Unit,
    onNavigateToHistory: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onTriggerEmergency: () -> Unit
) {
    var showCountdown by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("SOS App") },
                actions = {
                    IconButton(onClick = onNavigateToSettings) {
                        Icon(Icons.Default.Settings, "Settings")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Stats Cards
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                StatsCard(
                    title = "Contacts",
                    value = "3",
                    icon = Icons.Default.Person,
                    color = MaterialTheme.colorScheme.primary
                )
                StatsCard(
                    title = "Emergencies",
                    value = "2",
                    icon = Icons.Default.Warning,
                    color = MaterialTheme.colorScheme.error
                )
            }

            Spacer(modifier = Modifier.height(40.dp))

            // SOS Button
            SOSButton(onClick = { showCountdown = true })

            Spacer(modifier = Modifier.height(40.dp))

            // Quick Actions
            QuickActionButtons(
                onContactsClick = onNavigateToContacts,
                onMedicalClick = onNavigateToMedical,
                onHistoryClick = onNavigateToHistory
            )
        }

        if (showCountdown) {
            CountdownModal(
                onDismiss = { showCountdown = false },
                onComplete = {
                    showCountdown = false
                    onTriggerEmergency()
                }
            )
        }
    }
}

@Composable
fun SOSButton(onClick: () -> Unit) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val scale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )

    Button(
        onClick = onClick,
        modifier = Modifier
            .size(200.dp)
            .scale(scale),
        shape = CircleShape,
        colors = ButtonDefaults.buttonColors(
            containerColor = Color.Red
        )
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "SOS",
                fontSize = 48.sp,
                fontWeight = FontWeight.Black,
                color = Color.White
            )
            Text(
                text = "Emergency",
                fontSize = 16.sp,
                color = Color.White
            )
        }
    }
}

@Composable
fun StatsCard(
    title: String,
    value: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    color: Color
) {
    Card(
        modifier = Modifier
            .width(150.dp)
            .height(100.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = color,
                modifier = Modifier.size(32.dp)
            )
            Column {
                Text(
                    text = value,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = title,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
fun QuickActionButtons(
    onContactsClick: () -> Unit,
    onMedicalClick: () -> Unit,
    onHistoryClick: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        QuickActionButton(
            text = "Emergency Contacts",
            icon = Icons.Default.Person,
            onClick = onContactsClick
        )
        QuickActionButton(
            text = "Medical Profile",
            icon = Icons.Default.Favorite,
            onClick = onMedicalClick
        )
        QuickActionButton(
            text = "Emergency History",
            icon = Icons.Default.List,
            onClick = onHistoryClick
        )
    }
}

@Composable
fun QuickActionButton(
    text: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit
) {
    OutlinedButton(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = text,
            modifier = Modifier.padding(end = 8.dp)
        )
        Text(text = text)
    }
}

@Composable
fun CountdownModal(
    onDismiss: () -> Unit,
    onComplete: () -> Unit
) {
    var timeRemaining by remember { mutableStateOf(10) }

    LaunchedEffect(timeRemaining) {
        if (timeRemaining > 0) {
            kotlinx.coroutines.delay(1000)
            timeRemaining--
        } else {
            onComplete()
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            Button(
                onClick = onDismiss,
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                Text("Cancel Emergency")
            }
        },
        title = {
            Text(
                text = timeRemaining.toString(),
                fontSize = 72.sp,
                fontWeight = FontWeight.Bold,
                color = Color.Red,
                modifier = Modifier.fillMaxWidth()
            )
        },
        text = {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Emergency Alert Activating",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Your emergency contacts will be notified in $timeRemaining seconds",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(16.dp))
                LinearProgressIndicator(
                    progress = (10 - timeRemaining) / 10f,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    )
}
