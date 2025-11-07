# CI/CD Workflows for SOS App

This directory contains GitHub Actions workflows for automated testing, building, and deployment of the SOS App.

## 📋 Workflows Overview

### 1. CI/CD Pipeline (`ci-cd.yml`)

**Main workflow for continuous integration and deployment.**

**Triggers:**
- Push to `main`, `develop`, `feature/**`, `release/**`
- Pull requests to `main`, `develop`
- Tags matching `v*.*.*`

**Jobs:**
1. **test** - Run tests and quality checks for all services
2. **build** - Build and push Docker images to ECR
3. **deploy-staging** - Deploy to staging environment (on `develop` branch)
4. **deploy-production** - Deploy to production (on version tags)
5. **security-scan** - Run security scans with Trivy and Semgrep
6. **performance-test** - Run k6 load tests on staging

**Environments:**
- **Staging**: Deployed from `develop` branch
- **Production**: Deployed from version tags (e.g., `v1.2.3`)

### 2. Terraform Infrastructure (`terraform.yml`)

**Manages infrastructure as code with Terraform.**

**Triggers:**
- Push to `main` (changes in `infrastructure/terraform/**`)
- Pull requests to `main`
- Manual workflow dispatch

**Actions:**
- `plan` - Preview infrastructure changes
- `apply` - Apply infrastructure changes
- `destroy` - Destroy infrastructure (use with caution)

**Environments:**
- `dev` - Development environment
- `staging` - Staging environment
- `prod` - Production environment

### 3. Helm Chart Linting (`helm-lint.yml`)

**Validates Helm charts.**

**Triggers:**
- Push to `main`, `develop` (changes in `infrastructure/helm/**`)
- Pull requests

**Checks:**
- Helm lint with strict mode
- Template rendering validation
- Kubernetes manifest validation

### 4. Dependency Updates (`dependency-update.yml`)

**Automatically updates dependencies.**

**Triggers:**
- Schedule: Every Monday at 9 AM UTC
- Manual workflow dispatch

**Updates:**
- Node.js dependencies (`npm`)
- Go dependencies (`go mod`)

## 🔧 Setup Instructions

### Required Secrets

Configure these secrets in your GitHub repository:

```
Settings > Secrets and variables > Actions > New repository secret
```

**AWS Credentials:**
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key

**Slack Notifications:**
- `SLACK_WEBHOOK_URL` - Slack webhook for deployment notifications

**Optional:**
- `CODECOV_TOKEN` - Codecov token for coverage reports
- `SONAR_TOKEN` - SonarQube token for code quality

### Required Environments

Create these environments in your repository:

```
Settings > Environments > New environment
```

1. **staging**
   - Reviewers: Not required
   - Deployment branch: `develop`
   - Secrets: Same as repository secrets

2. **production**
   - Reviewers: Required (DevOps team)
   - Deployment branch: `main` and tags
   - Secrets: Production-specific secrets

## 🚀 Usage

### Deploy to Staging

```bash
# Push to develop branch
git checkout develop
git pull origin develop
git merge feature/my-feature
git push origin develop

# GitHub Actions will automatically:
# 1. Run tests
# 2. Build Docker images
# 3. Deploy to staging
```

### Deploy to Production

```bash
# Create and push a version tag
git checkout main
git pull origin main
git tag -a v1.2.3 -m "Release version 1.2.3"
git push origin v1.2.3

# GitHub Actions will automatically:
# 1. Run tests
# 2. Build Docker images with version tag
# 3. Deploy to production (requires approval)
```

### Manual Terraform Deployment

```bash
# Navigate to Actions tab in GitHub
# Select "Terraform Infrastructure" workflow
# Click "Run workflow"
# Choose:
#   - Action: plan/apply/destroy
#   - Environment: dev/staging/prod
# Click "Run workflow"
```

## 📊 Workflow Outputs

### Artifacts

Workflows produce these artifacts:

- **Test coverage reports** - Uploaded to Codecov
- **Docker image tags** - Stored in ECR
- **Terraform outputs** - Available as workflow artifacts
- **Security scan results** - Uploaded to GitHub Security

### Status Badges

Add these badges to your README:

```markdown
![CI/CD](https://github.com/your-org/sos-app/workflows/CI%2FCD%20Pipeline/badge.svg)
![Terraform](https://github.com/your-org/sos-app/workflows/Terraform%20Infrastructure/badge.svg)
![Helm Lint](https://github.com/your-org/sos-app/workflows/Helm%20Chart%20Linting/badge.svg)
```

## 🔍 Monitoring Workflows

### View Workflow Runs

```
Repository > Actions tab
```

- See all workflow runs
- Filter by workflow, branch, or status
- View logs for each job
- Download artifacts

### Workflow Notifications

- **Slack**: Production deployment notifications
- **GitHub**: Status checks on pull requests
- **Email**: Workflow failure notifications

## 🐛 Troubleshooting

### Common Issues

#### 1. Build Failures

**Symptom**: Docker build fails

**Solution**:
```bash
# Check Dockerfile syntax
docker build -f sos-app/infrastructure/docker/Dockerfile.node .

# Verify base images are accessible
docker pull node:20-alpine
```

#### 2. Test Failures

**Symptom**: Tests fail in CI but pass locally

**Solution**:
- Check environment variables
- Verify test database connectivity
- Review test logs in GitHub Actions

#### 3. Deployment Failures

**Symptom**: Helm deployment fails

**Solution**:
```bash
# Manually test Helm chart
helm lint ./sos-app/infrastructure/helm/sos-app
helm template test ./sos-app/infrastructure/helm/sos-app

# Check Kubernetes cluster access
kubectl cluster-info
kubectl get nodes
```

#### 4. Permission Issues

**Symptom**: AWS authentication fails

**Solution**:
- Verify AWS credentials are correct
- Check IAM permissions for:
  - ECR: push/pull images
  - EKS: update kubeconfig
  - S3: terraform state
  - DynamoDB: terraform locks

### Debug Mode

Enable debug logging:

```yaml
# Add to workflow step:
- name: Debug step
  run: |
    set -x
    # Your commands here
  env:
    ACTIONS_STEP_DEBUG: true
    ACTIONS_RUNNER_DEBUG: true
```

## 🔐 Security Best Practices

1. **Never commit secrets** to the repository
2. **Use environment protection rules** for production
3. **Require approvals** for production deployments
4. **Enable branch protection** on `main` and `develop`
5. **Use least privilege** for AWS IAM roles
6. **Scan images** for vulnerabilities before deployment
7. **Rotate secrets** regularly
8. **Audit workflow runs** periodically

## 📝 Customization

### Adding a New Service

1. Add service to CI/CD matrix in `ci-cd.yml`:
```yaml
strategy:
  matrix:
    service:
      - your-new-service
```

2. Create Helm chart:
```bash
cd sos-app/infrastructure/helm
./create-service-chart.sh your-new-service 8080
```

3. Add to umbrella chart dependencies in `sos-app/Chart.yaml`

### Modifying Deployment Strategy

Edit `ci-cd.yml`:

```yaml
# Blue-green deployment
- name: Deploy green
  run: |
    helm install sos-app-green ./sos-app \
      --set image.tag=${{ github.sha }}

# Canary deployment
- name: Deploy canary
  run: |
    kubectl patch deployment sos-app \
      --patch '{"spec": {"strategy": {"type": "Canary"}}}'
```

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Helm Documentation](https://helm.sh/docs/)
- [Terraform CI/CD](https://www.terraform.io/docs/cloud/run/index.html)
- [AWS ECR Documentation](https://docs.aws.amazon.com/ecr/)

## 🆘 Support

For issues or questions:
- Check workflow logs in GitHub Actions
- Review this documentation
- Contact DevOps team
- Open issue in repository

---

**Last Updated**: 2025-11-07
**Maintainer**: DevOps Team
