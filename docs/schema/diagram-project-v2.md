# Diagram project schema v2

BACnet Studio 1.2 stores the logical BACnet topology and an optional physical model in one JSON project. New projects use `version: 2`; v1 diagram and planner files are accepted and migrated on load.

## Compatibility policy

- Storage keys remain unchanged. Existing browser data migrates without user action.
- A migrated project receives an empty, disabled `physical` block, so its logical topology and diagnostics remain unchanged.
- Migrations are ordered and idempotent. Every future schema version must add a migration step and frozen v1/v2 fixture coverage.
- Files in `src/lib/fixtures/` are compatibility evidence and must never be regenerated in place.
- “Export legacy JSON” removes physical data, maps physical-only infrastructure kinds to `gateway` with a note, and emits `version: 1`.

## Physical block

`physical` contains `enabled`, `locations`, `patchPanels`, `links`, `mstpSegments`, and `arcnetSegments`. Links use discriminated endpoint references—device NIC, infrastructure port, or patch-panel port—so ids from unrelated namespaces cannot be confused.

Existing devices may add `locationId` and `poeClass`; NICs may add media, speed, and PoE-powered metadata. Infrastructure may add `locationId`, `model`, `poeBudgetWatts`, and typed ports. Physical data is optional in all imported v1 content.

## Serial buses

MS/TP and ARC156 are ordered chains. Members record device or repeater/router references, termination, bias, and optional fractional unit load. ARC156 is modeled separately for Automated Logic/Carrier systems at 156.25 kbps with its product-guide segment constraints.
