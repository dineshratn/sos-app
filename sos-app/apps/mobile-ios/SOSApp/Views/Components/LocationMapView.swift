import SwiftUI
import MapKit

struct LocationMapView: View {
    let currentLocation: LocationPoint?
    let locationTrail: [LocationPoint]
    @Binding var region: MKCoordinateRegion

    var body: some View {
        Map(coordinateRegion: $region, annotationItems: annotations) { annotation in
            MapAnnotation(coordinate: annotation.coordinate) {
                if annotation.isCurrent {
                    // Current location marker
                    ZStack {
                        Circle()
                            .fill(Color.red.opacity(0.3))
                            .frame(width: 40, height: 40)

                        Circle()
                            .fill(Color.red)
                            .frame(width: 20, height: 20)

                        Circle()
                            .fill(Color.white)
                            .frame(width: 8, height: 8)
                    }
                } else {
                    // Trail marker
                    Circle()
                        .fill(Color.blue.opacity(0.5))
                        .frame(width: 8, height: 8)
                }
            }
        }
        .overlay(
            // Map controls
            VStack {
                HStack {
                    Spacer()

                    VStack(spacing: 10) {
                        // Zoom in button
                        Button(action: {
                            zoomIn()
                        }) {
                            Image(systemName: "plus")
                                .font(.title3)
                                .foregroundColor(.primary)
                                .frame(width: 44, height: 44)
                                .background(Color(.systemBackground))
                                .cornerRadius(8)
                                .shadow(radius: 2)
                        }

                        // Zoom out button
                        Button(action: {
                            zoomOut()
                        }) {
                            Image(systemName: "minus")
                                .font(.title3)
                                .foregroundColor(.primary)
                                .frame(width: 44, height: 44)
                                .background(Color(.systemBackground))
                                .cornerRadius(8)
                                .shadow(radius: 2)
                        }

                        // Center on location button
                        Button(action: {
                            centerOnCurrentLocation()
                        }) {
                            Image(systemName: "location.fill")
                                .font(.title3)
                                .foregroundColor(.blue)
                                .frame(width: 44, height: 44)
                                .background(Color(.systemBackground))
                                .cornerRadius(8)
                                .shadow(radius: 2)
                        }
                    }
                    .padding()
                }

                Spacer()
            }
        )
    }

    private var annotations: [MapAnnotation] {
        var items: [MapAnnotation] = []

        // Add trail points (excluding the last 5 to avoid clutter)
        if locationTrail.count > 5 {
            for i in stride(from: 0, to: locationTrail.count - 5, by: 5) {
                let point = locationTrail[i]
                items.append(MapAnnotation(
                    coordinate: CLLocationCoordinate2D(
                        latitude: point.latitude,
                        longitude: point.longitude
                    ),
                    isCurrent: false
                ))
            }
        }

        // Add current location
        if let current = currentLocation {
            items.append(MapAnnotation(
                coordinate: CLLocationCoordinate2D(
                    latitude: current.latitude,
                    longitude: current.longitude
                ),
                isCurrent: true
            ))
        }

        return items
    }

    private func zoomIn() {
        region.span.latitudeDelta /= 2
        region.span.longitudeDelta /= 2
    }

    private func zoomOut() {
        region.span.latitudeDelta *= 2
        region.span.longitudeDelta *= 2
    }

    private func centerOnCurrentLocation() {
        if let current = currentLocation {
            region.center = CLLocationCoordinate2D(
                latitude: current.latitude,
                longitude: current.longitude
            )
        }
    }
}

struct MapAnnotation: Identifiable {
    let id = UUID()
    let coordinate: CLLocationCoordinate2D
    let isCurrent: Bool
}

#Preview {
    LocationMapView(
        currentLocation: LocationPoint(
            latitude: 37.7749,
            longitude: -122.4194,
            accuracy: 10.0,
            timestamp: Date()
        ),
        locationTrail: [
            LocationPoint(latitude: 37.7749, longitude: -122.4194, accuracy: 10.0, timestamp: Date()),
            LocationPoint(latitude: 37.7750, longitude: -122.4195, accuracy: 10.0, timestamp: Date()),
            LocationPoint(latitude: 37.7751, longitude: -122.4196, accuracy: 10.0, timestamp: Date())
        ],
        region: .constant(MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
            span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
        ))
    )
}
