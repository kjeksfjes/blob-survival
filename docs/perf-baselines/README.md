# Perf Baselines

Store local or team baseline soak snapshots here for quick regression checks.

Suggested files:

- `soak-10x-baseline.json`
- `soak-10x-current.json`

Compare with:

```bash
npm run perf:compare-soak -- --baseline docs/perf-baselines/soak-10x-baseline.json --current docs/perf-baselines/soak-10x-current.json
```
