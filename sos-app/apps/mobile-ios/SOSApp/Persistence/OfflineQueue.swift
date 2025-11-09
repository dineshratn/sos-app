import Foundation
import CoreData

class OfflineQueue {
    static let shared = OfflineQueue()

    private let persistentContainer: NSPersistentContainer

    private init() {
        persistentContainer = NSPersistentContainer(name: "SOSApp")
        persistentContainer.loadPersistentStores { description, error in
            if let error = error {
                fatalError("Unable to load persistent stores: \(error)")
            }
        }
    }

    var context: NSManagedObjectContext {
        return persistentContainer.viewContext
    }

    // MARK: - Queue Operations

    func queueEmergencyTrigger(type: EmergencyType, location: LocationPoint?, notes: String?) {
        let context = persistentContainer.viewContext

        let queueItem = QueuedEmergency(context: context)
        queueItem.id = UUID().uuidString
        queueItem.type = type.rawValue
        queueItem.latitude = location?.latitude ?? 0
        queueItem.longitude = location?.longitude ?? 0
        queueItem.accuracy = location?.accuracy ?? 0
        queueItem.notes = notes
        queueItem.timestamp = Date()
        queueItem.retryCount = 0

        saveContext()
        print("Queued emergency trigger")
    }

    func queueLocationUpdate(emergencyId: String, location: LocationPoint) {
        let context = persistentContainer.viewContext

        let queueItem = QueuedLocation(context: context)
        queueItem.id = UUID().uuidString
        queueItem.emergencyId = emergencyId
        queueItem.latitude = location.latitude
        queueItem.longitude = location.longitude
        queueItem.accuracy = location.accuracy
        queueItem.timestamp = location.timestamp
        queueItem.retryCount = 0

        saveContext()
        print("Queued location update")
    }

    func queueChatMessage(emergencyId: String, text: String) {
        let context = persistentContainer.viewContext

        let queueItem = QueuedMessage(context: context)
        queueItem.id = UUID().uuidString
        queueItem.emergencyId = emergencyId
        queueItem.text = text
        queueItem.timestamp = Date()
        queueItem.retryCount = 0

        saveContext()
        print("Queued chat message")
    }

    // MARK: - Sync Operations

    func syncQueuedItems() {
        syncEmergencies()
        syncLocations()
        syncMessages()
    }

    private func syncEmergencies() {
        let fetchRequest: NSFetchRequest<QueuedEmergency> = QueuedEmergency.fetchRequest()

        do {
            let queuedEmergencies = try context.fetch(fetchRequest)

            for item in queuedEmergencies {
                if item.retryCount < Config.syncRetryAttempts {
                    syncEmergencyTrigger(item) { success in
                        if success {
                            self.context.delete(item)
                            self.saveContext()
                        } else {
                            item.retryCount += 1
                            self.saveContext()
                        }
                    }
                } else {
                    // Max retries reached, delete item
                    context.delete(item)
                    saveContext()
                }
            }
        } catch {
            print("Error fetching queued emergencies: \(error)")
        }
    }

    private func syncLocations() {
        let fetchRequest: NSFetchRequest<QueuedLocation> = QueuedLocation.fetchRequest()

        do {
            let queuedLocations = try context.fetch(fetchRequest)

            for item in queuedLocations {
                if item.retryCount < Config.syncRetryAttempts {
                    syncLocationUpdate(item) { success in
                        if success {
                            self.context.delete(item)
                            self.saveContext()
                        } else {
                            item.retryCount += 1
                            self.saveContext()
                        }
                    }
                } else {
                    context.delete(item)
                    saveContext()
                }
            }
        } catch {
            print("Error fetching queued locations: \(error)")
        }
    }

    private func syncMessages() {
        let fetchRequest: NSFetchRequest<QueuedMessage> = QueuedMessage.fetchRequest()

        do {
            let queuedMessages = try context.fetch(fetchRequest)

            for item in queuedMessages {
                if item.retryCount < Config.syncRetryAttempts {
                    syncChatMessage(item) { success in
                        if success {
                            self.context.delete(item)
                            self.saveContext()
                        } else {
                            item.retryCount += 1
                            self.saveContext()
                        }
                    }
                } else {
                    context.delete(item)
                    saveContext()
                }
            }
        } catch {
            print("Error fetching queued messages: \(error)")
        }
    }

    // MARK: - API Sync Methods

    private func syncEmergencyTrigger(_ item: QueuedEmergency, completion: @escaping (Bool) -> Void) {
        guard let typeString = item.type, let type = EmergencyType(rawValue: typeString) else {
            completion(false)
            return
        }

        let location: LocationPoint? = item.latitude != 0 && item.longitude != 0 ?
            LocationPoint(latitude: item.latitude, longitude: item.longitude, accuracy: item.accuracy, timestamp: item.timestamp ?? Date()) : nil

        // API call to trigger emergency
        // Replace with actual API call
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            completion(true)
        }
    }

    private func syncLocationUpdate(_ item: QueuedLocation, completion: @escaping (Bool) -> Void) {
        // API call to update location
        // Replace with actual API call
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            completion(true)
        }
    }

    private func syncChatMessage(_ item: QueuedMessage, completion: @escaping (Bool) -> Void) {
        // API call to send message
        // Replace with actual API call
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            completion(true)
        }
    }

    // MARK: - Helper Methods

    private func saveContext() {
        if context.hasChanges {
            do {
                try context.save()
            } catch {
                print("Error saving context: \(error)")
            }
        }
    }

    func clearQueue() {
        let emergencyFetch: NSFetchRequest<QueuedEmergency> = QueuedEmergency.fetchRequest()
        let locationFetch: NSFetchRequest<QueuedLocation> = QueuedLocation.fetchRequest()
        let messageFetch: NSFetchRequest<QueuedMessage> = QueuedMessage.fetchRequest()

        do {
            let emergencies = try context.fetch(emergencyFetch)
            let locations = try context.fetch(locationFetch)
            let messages = try context.fetch(messageFetch)

            emergencies.forEach { context.delete($0) }
            locations.forEach { context.delete($0) }
            messages.forEach { context.delete($0) }

            saveContext()
        } catch {
            print("Error clearing queue: \(error)")
        }
    }
}

// Note: Core Data entities (QueuedEmergency, QueuedLocation, QueuedMessage)
// would be defined in the .xcdatamodeld file in a full implementation
