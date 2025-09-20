# 🌐 Standard Instruction & Methodology for Widget Development

## 1. Core Principle
Widgets = thin UI. No DB. No backend. Always connect via BFF.

## 2. System Path
Widgets → BFF → Services → Orchestrator (SAGA) → DB

## 3. Widget Rules
- Only consume BFF APIs.
- Reuse existing endpoints.
- Event-driven, RBAC-aware, metadata-driven.
- Never local DB / JSON / parallel backend.

## 4. Development Steps
1. Define purpose.
2. Check existing services.
3. Draft API contract.
4. Extend BFF if required.
5. Update Saga if multi-service.
6. Build UI widget.
7. Test end-to-end.

## 5. Naming Convention
- \`widgets/{name}/\`
- \`src/services/{service_name}\`
- \`src/bff/routes/{widget_or_service}.js\`
- \`src/orchestrator/{flow_name}.js\`
- \`db/migrations/{date}_{table}.sql\`

## 6. DRY Rules
- Rates → RateService
- Trips → DispatchService
- Tracking → TrackingService
- Billing → BillingService
- New data? → add to central schema via migration.

## 7. Enforcement
Whenever generating code:
- Never new DB
- Always use BFF
- Update Saga for cross-service
- Keep UI separate from backend
- Follow naming conventions
