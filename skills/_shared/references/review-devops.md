# DevOps & Infrastructure Review Criteria

Domain-specific evaluation criteria for the DevOps reviewer. Evaluates infrastructure and deployment design: containerization, infrastructure-as-code, deployment strategies, secrets management, monitoring, and scaling. Does NOT evaluate application code quality (language reviewers handle that) or general plan structure (the holistic reviewer handles that).

## Codebase Exploration Focus

Before evaluating, use Grep, Glob, and Read tools to explore the codebase. Focus on:
- `Dockerfile`, `docker-compose.yml` — container configuration, multi-stage builds
- Infrastructure-as-code — Terraform, Pulumi, CloudFormation, CDK files
- CI/CD pipeline configuration — `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`
- Environment configuration — `.env.example`, config files, environment variable documentation
- Monitoring setup — Prometheus, Grafana, Datadog, alerting rules
- Secrets management — vault integration, sealed secrets, environment variable handling
- Deployment scripts — Kubernetes manifests, Helm charts, deployment automation

## Evaluation Criteria

1. **Containerization**: Are containers well-designed?
   - Multi-stage builds to minimize image size
   - Non-root user in production containers
   - Health checks defined in container configuration
   - Layer ordering optimized for cache efficiency
   - No secrets baked into images
   - Base images pinned to specific versions (not `latest`)

2. **Infrastructure-as-code**: Is infrastructure reproducible?
   - All infrastructure defined in code (no manual console changes)
   - State management configured (remote state, locking)
   - Modules/stacks organized by responsibility
   - Variables and outputs well-documented
   - Drift detection and reconciliation planned

3. **Deployment strategy**: Are deployments safe and reversible?
   - Rolling, blue-green, or canary deployment strategy documented
   - Rollback procedure defined and tested
   - Database migration sequencing relative to application deployment
   - Feature flags for risky changes
   - Deployment health checks gate traffic cutover

4. **Secrets management**: Are secrets handled securely?
   - Secrets never in source control (not even encrypted at rest in repo)
   - Secret rotation strategy documented
   - Least-privilege access to secret stores
   - Secrets injected at runtime (not build time)
   - Audit logging for secret access

5. **Monitoring and alerting**: Is observability configured?
   - Application metrics exported (latency, error rate, throughput)
   - Infrastructure metrics collected (CPU, memory, disk, network)
   - Alerts have clear ownership, severity, and runbook links
   - Log aggregation with structured logging
   - Dashboards for key service health indicators

6. **Scaling and resilience**: Can the system handle load?
   - Horizontal scaling configured (auto-scaling groups, HPA)
   - Resource limits and requests set for containers
   - Circuit breakers for external dependency calls
   - Graceful degradation strategies documented
   - Disaster recovery plan with RTO/RPO targets

## Scoring Guidelines

- Score 9-10: Fully reproducible infrastructure, safe deployments, excellent observability, proper secrets management
- Score 7-8: Good IaC coverage, safe deployment strategy, minor observability gaps
- Score 5-6: Partial IaC, some deployment risk, limited monitoring
- Score 3-4: Manual infrastructure, risky deployments, no monitoring
- Score 1-2: No IaC, secrets in source control, no deployment strategy
