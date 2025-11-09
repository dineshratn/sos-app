import Foundation
import CoreBluetooth

class BluetoothService: NSObject, ObservableObject {
    @Published var isScanning = false
    @Published var discoveredDevices: [CBPeripheral] = []
    @Published var connectedDevice: CBPeripheral?

    private var centralManager: CBCentralManager!
    private var emergencyCharacteristic: CBCharacteristic?

    // Service and Characteristic UUIDs for SOS wearable devices
    private let sosServiceUUID = CBUUID(string: "0000FFF0-0000-1000-8000-00805F9B34FB")
    private let emergencyTriggerCharacteristicUUID = CBUUID(string: "0000FFF1-0000-1000-8000-00805F9B34FB")

    override init() {
        super.init()
        centralManager = CBCentralManager(delegate: self, queue: nil)
    }

    func startScanning() {
        guard centralManager.state == .poweredOn else {
            print("Bluetooth not powered on")
            return
        }

        discoveredDevices.removeAll()
        centralManager.scanForPeripherals(withServices: [sosServiceUUID], options: nil)
        isScanning = true
    }

    func stopScanning() {
        centralManager.stopScan()
        isScanning = false
    }

    func connect(to peripheral: CBPeripheral) {
        centralManager.connect(peripheral, options: nil)
    }

    func disconnect() {
        if let device = connectedDevice {
            centralManager.cancelPeripheralConnection(device)
        }
    }
}

extension BluetoothService: CBCentralManagerDelegate {
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .poweredOn:
            print("Bluetooth powered on")
        case .poweredOff:
            print("Bluetooth powered off")
        case .unauthorized:
            print("Bluetooth unauthorized")
        case .unsupported:
            print("Bluetooth not supported")
        default:
            break
        }
    }

    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber) {
        if !discoveredDevices.contains(where: { $0.identifier == peripheral.identifier }) {
            discoveredDevices.append(peripheral)
            print("Discovered device: \(peripheral.name ?? "Unknown")")
        }
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        print("Connected to device: \(peripheral.name ?? "Unknown")")
        connectedDevice = peripheral
        peripheral.delegate = self
        peripheral.discoverServices([sosServiceUUID])
        stopScanning()
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        print("Disconnected from device")
        connectedDevice = nil

        if let error = error {
            print("Disconnection error: \(error.localizedDescription)")
        }
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        print("Failed to connect: \(error?.localizedDescription ?? "Unknown error")")
    }
}

extension BluetoothService: CBPeripheralDelegate {
    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        guard let services = peripheral.services else { return }

        for service in services {
            if service.uuid == sosServiceUUID {
                peripheral.discoverCharacteristics([emergencyTriggerCharacteristicUUID], for: service)
            }
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        guard let characteristics = service.characteristics else { return }

        for characteristic in characteristics {
            if characteristic.uuid == emergencyTriggerCharacteristicUUID {
                emergencyCharacteristic = characteristic
                peripheral.setNotifyValue(true, for: characteristic)
                print("Subscribed to emergency trigger characteristic")
            }
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        if characteristic.uuid == emergencyTriggerCharacteristicUUID {
            // Emergency triggered from wearable device
            print("Emergency triggered from wearable device!")

            // Trigger emergency in the app
            NotificationCenter.default.post(name: NSNotification.Name("TriggerEmergency"), object: nil)
        }
    }
}
