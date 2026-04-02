# Skii

## System Overview
A hardware-integrated telemetry and analytics dashboard engineered for deployment on 32-bit ARM architectures (specifically Raspberry Pi OS `arm/v7`). The system interfaces directly with host Bluetooth hardware via BlueZ/DBus to aggregate sensor data, processes it utilizing an accelerated NumPy pipeline, and serves a real-time React-based user interface.

## System Architecture

### Backend (Data Acquisition & Processing)
* **Runtime:** Python 3.11
* **Hardware Interfacing:** Utilizes `bleak` for asynchronous Bluetooth Low Energy (BLE) communication, bridged to the host's `bluetoothd` via DBus socket mounting.
* **Data Processing:** Native array manipulation via `numpy`, accelerated by `libopenblas0` to bypass standard QEMU/ARM emulation performance bottlenecks.
* **OS Compliance:** Compiled against `libglib2.0-0t64` to ensure Y2038 compliance on 32-bit Linux distributions.

### Frontend (User Interface)
* **Framework:** React
* **Delivery:** Statically compiled and served via a lightweight Nginx web server on port 80.

## Infrastructure & Build Pipeline
The project utilizes a highly optimized, multi-stage Docker build pipeline designed to separate heavy compilation dependencies from the final production runtime.

* **Target Architecture:** `linux/arm/v7`
* **Dependency Resolution:** Leverages `piwheels` during the build stage to fetch pre-compiled ARM binaries, drastically reducing compilation overhead for heavy C-extensions.
* **Artifact Generation:** Images are packaged into a self-contained tarball (`.tar.gz`) to facilitate air-gapped or localized deployments without relying on a cloud-based container registry.

## Deployment Protocol
Deployment requires moving the self-contained bundle to the target hardware, followed by an automated unpacking and execution script.

**1. Transfer the Artifact:**
Transfer the `skii-deployment.tar.gz` archive from the build machine to the target Raspberry Pi utilizing any preferred file transfer method or physical storage medium.

**2. Execute Deployment (On Target Hardware):**
```bash
# Extract the deployment bundle
tar -xzvf skii-deployment.tar.gz

# Navigate to the extracted configuration directory
cd pi-deploy

# Initialize the stack (loads images into the local registry and provisions containers)
bash start.sh
```

## Service Configuration (`docker-compose.yml` specs)
* **Backend Privilege:** Executes in `network_mode: "host"` with `privileged: true` to permit hardware-level BLE scanning.
* **Volume Mapping:** Requires `- /var/run/dbus:/var/run/dbus` to maintain the DBus bridge. 
* **Lifecycle:** Both services operate under a `restart: unless-stopped` policy to ensure high availability following system reboots or fatal runtime exceptions.