# SOS App

Emergency assistance platform with microservices architecture.

## 🚀 Quick Start

### For WSL2 + Minikube Users

**Perfect for WSL2 environments without Docker Desktop!**

```bash
git clone <your-repo-url>
cd sos-app
git checkout claude/review-spec-and-status-011CUevCbQXh7hLdqSuuGjt8

# Deploy to Minikube in 1 command
./deploy-minikube.sh
```

📖 **See [MINIKUBE_GUIDE.md](MINIKUBE_GUIDE.md) for complete setup instructions**

### For Docker Desktop Users

```bash
cd sos-app
docker-compose up --build
```

📖 **See [sos-app/README.md](sos-app/README.md) for detailed instructions**

---

## 📚 Documentation

- **[MINIKUBE_GUIDE.md](MINIKUBE_GUIDE.md)** - WSL2 + Minikube deployment guide
- **[sos-app/README.md](sos-app/README.md)** - Main README with all options
- **[k8s/README.md](k8s/README.md)** - Kubernetes deployment details
- **sos-app/DOCKER_GUIDE.md** - Docker deployment guide
- **sos-app/TESTING_GUIDE.md** - Complete testing guide

---

## 🎯 What's Included

- ✅ **Auth Service** - JWT authentication, MFA, OAuth
- ✅ **User Service** - User profiles & emergency contacts
- ✅ **Medical Service** - HIPAA-compliant medical records
- ✅ **Kubernetes Manifests** - Production-ready K8s deployment
- ✅ **Docker Compose** - Local development setup
- ✅ **Automated Tests** - 70%+ test coverage

**Progress**: 110/262 tasks (42%) | 12,000+ lines of code | 35+ API endpoints

---

**Branch**: `claude/review-spec-and-status-011CUevCbQXh7hLdqSuuGjt8`
