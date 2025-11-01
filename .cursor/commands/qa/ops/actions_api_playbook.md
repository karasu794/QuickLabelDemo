# Actions API Playbook
Auto-invoked when **budget guard** triggers from `.cursor/commands/ma_orbit.md` Step 8.  
Purpose: perform quick **Health → Logs → Smoke → Report**, then hand control back to the orbit runner.

---

## Conventions
- **Artifacts root**: `artifacts/`
  - Logs: `artifacts/logs/budget_guard_<ts>.log`
  - Screenshot: `artifacts/anchor.png`
  - Report: `runbooks/failures.md` (append one line)
- **Return status** (echo to stdout & set exit code 0):
  - `budget_guard_triggered`
- Timestamp format: `yyyyMMdd-HHmmss` (local time)

> Do not mutate code here. This playbook only observes and records.

---

## 0) Prep (create folders & timestamp)

### PowerShell
```powershell
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$LOG = "artifacts/logs/budget_guard_$ts.log"
$SCR = "artifacts/anchor.png"
New-Item -ItemType Directory -Force -Path "artifacts","artifacts/logs" | Out-Null
