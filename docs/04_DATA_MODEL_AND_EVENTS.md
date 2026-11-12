# 04 — Data model, event contracts, accounting semantics

## 1. Data design principles

- Postgres is the canonical system-of-record, with explicit foreign keys and transaction boundaries.
- All tenant business tables carry `store_id`, and requests are always scoped to verified merchant membership. All exposed tables have reviewed RLS policies.
- Use UUID identifiers, `created_at`, `updated_at`, `created_by`, `source_type` and a trace/correlation identifier where useful.
- Store raw imported data separately from normalized records; never overwrite originals to "make reconciliation pass."
- Store finite enumerated states, validated schema versions, deterministic money math (Decimal or paise), ISO currency and quantity units.
- Jobs, proposals and AI extractions are not authoritative until confirmed by a user or deterministic validator.

## 2. Canonical table inventory

| Table | Key fields | Invariants / indexes |
|---|---|---|
| `profiles` | `id(auth user)`, locale, display_name | Minimize PII |
| `stores` | id, legal_name, display_name, city, timezone, currency | owner membership required |
| `store_memberships` | id, store_id, user_id, role, status | unique(store_id,user_id), role enum |
| `merchant_consents` | id, store_id, subject_ref?, purpose, granted_at, revoked_at | versioned purpose; enforce revocation |
| `products` | id, store_id, name, sku, unit, category, buy_price, sell_price, tax_mode | unique nullable sku per store; no negative prices |
| `product_aliases` | id, product_id, language, alias, verified_by | normalized alias index |
| `inventory_locations` | id, store_id, name | unique by store |
| `inventory_lots` | id, store_id, product_id, expiry_date, quantity_received, batch_ref | expiry nullable, no negative receipts |
| `stock_movements` | id, store_id, product_id, lot_id?, qty_delta, kind, reference_type/id, idempotency_key | append-only, stock cannot be double-booked |
| `missed_requests` | id, store_id, raw_text, language, captured_at, confirmed_at, source_type, state, actor_id | confirmation mandatory for action scoring |
| `request_items` | id, request_id, product_id?, normalized_name, count, unit, reason, confidence | count positive; missing unit requires clarification |
| `voice_assets` | id, store_id, storage_key, duration, mime, checksum, retention_until | signed access only; deletion lifecycle |
| `extraction_attempts` | id, source_id, model, schema_version, output_json, confidence, status, cost | immutable provenance; no raw secrets |
| `payment_imports` | id, store_id, filename_hash, source, period_start/end, status | uniqueness on import fingerprint |
| `payment_records` | id, store_id, source_ref, amount_paise, currency, timestamp, status, raw_import_id | do not assume SKU identity |
| `supplier_profiles` | id, store_id, supplier_name, lead_days, contact_consent | cost/lead time editable + audited |
| `supplier_quotes` | id, store_id, supplier_id, product_id, min_order, unit_cost, shipping, taxes, valid_until | quoted currency and unit match |
| `purchase_order_drafts` | id, store_id, approval_id?, supplier_id, status, total_cost | draft first; no autonomous payment |
| `purchase_order_lines` | id, po_id, product_id, qty, unit_cost | positive quantity, decimals |
| `opportunities` | id, store_id, type, score, confidence, title, evidence_snapshot, expires_at | derived not financial source-of-truth |
| `opportunity_evidence` | id, opportunity_id, entity_type, entity_id, weight | traceability for explanations |
| `recommendation_snapshots` | id, opportunity_id, version, assumptions_json, math_version, projected_range | immutable snapshot on approval |
| `approval_requests` | id, store_id, action_type, action_id, state, requested_by, approved_by, approved_at | requester/approver role check |
| `business_actions` | id, store_id, action_kind, state, params_snapshot, idempotency_key | external effects only after approval |
| `trials` | id, store_id, opportunity_id, action_id, start/end, quantity, status, outcome_version | trial state machine |
| `trial_outcomes` | id, trial_id, realized_sales, returned_qty, wasted_qty, revenue, recognized_cost, closing_stock_value | accounting semantics explicit |
| `sales` | id, store_id, timestamp, source_type, source_ref, total, status | may be manual, POS or payment-linked |
| `sale_lines` | id, sale_id, product_id, quantity, unit_price, unit_cost_snapshot | snapshot costs on sale |
| `returns` | id, sale_id, quantity, reason, restock_status | linked to sale, negative margin adjustment |
| `expenses` | id, store_id, category, amount, incurred_at, reviewed, source_ref | no invented categories finalized |
| `campaigns` | id, store_id, offer_json, margin_floor, state, approved_by | drafts cannot send on their own |
| `customer_contacts` | id, store_id, encrypted_contact, purpose, consent_status, opted_out_at | privacy limited; encrypted at rest |
| `campaign_deliveries` | id, campaign_id, contact_id, provider_id, state | idempotent, opt-out enforced |
| `settlement_imports` | id, store_id, file_checksum, source, imported_at, status | immutable source evidence |
| `settlement_records` | id, import_id, amount_paise, transfer_ref, date, fee, taxes | duplicates detected, source preserved |
| `reconciliation_cases` | id, store_id, payment_ref?, settlement_ref?, discrepancy, reason, state | do not auto-modify money |
| `forecast_runs` | id, store_id, model, training_window, horizon, backtest_metric, produced_at | model and uncertainty metadata |
| `forecast_points` | id, run_id, product_id, date, estimate, lower, upper | bounds constraints |
| `neighborhood_optins` | id, store_id, consent_version, active | reversible, opted-out by default |
| `aggregate_signals` | id, area_bucket, product_class, week_bucket, participants, count_noisy | min aggregation + privacy guard |
| `notification_preferences` | store_id, user_id, channel, topic, enabled | default opt-in policy appropriate |
| `notification_jobs` | id, store_id, user_id, type, payload, status, retry_count | no sensitive payload in logs |
| `audit_events` | id, store_id, actor_id, action, target_type/id, timestamp, change_summary | append-only, filtered exports |
| `outbox_events` | id, store_id, event_type, schema_version, payload, published_at, attempts | immutable + retry-safe |
| `idempotency_records` | store_id, action_key, request_hash, response_ref, expires_at | unique per tenant+key |
| `integration_connections` | id, store_id, provider, scopes, secret_ref, status, last_sync | secret stored in vault, not table |
| `import_column_mappings` | id, store_id, provider, mapping_json, schema_version | explicit merchant acceptance |
| `feature_flags` | scope, feature, enabled, updated_by | safe rollout |

## 3. Suggested constraints and indexes

- `store_memberships` unique `(store_id, user_id)`; only active members access tenant records.
- Every business index begins with `store_id` when filtering by tenant; e.g. `(store_id, captured_at DESC)`, `(store_id, product_id, created_at DESC)`.
- `stock_movements` quantity unit matches catalog unit; conversions require configured multiplier.
- Reject negative product unit costs; `sale_lines` must retain historical cost snapshot after catalog prices change.
- `payment_records`: unique `(store_id, provider, source_ref)` only when source keys actually unique; fallback hashed compound key.
- `merchant_consents`: allow granular revoke and comply with deletion retention caveats.
- `audit_events`: restrict update/delete privileges; segregate PII from general event payload.

## 4. RLS strategy

- Enable RLS for all user-exposed tables before granting select/write.
- Policy checks store membership via server-verified auth subject and active membership.
- `profiles`: only self and narrowly scoped support role.
- `stores`: active members select; owner/manager update permitted fields.
- `stock_movements`: staff may create inventory adjustment subject to role, but cannot change/delete ledger.
- `approval_requests`: owner/manager read & decide; staff may request but not approve spending.
- Do not rely on user-editable JWT metadata for roles. Use authoritative membership table or vetted immutable claims.
- Service keys bypassing RLS must remain backend-only and exceptionally scoped; normal queries should run in an authenticated store context.
- Test negative access via direct API requests and database policy tests; a UI filter is not security.

## 5. Monetary semantics: crucial example

Suppose a merchant purchases 16 drinks at ₹22 each and sells 14 at ₹35 each:

- Purchase cash outlay = `16 × 22 = ₹352`.
- Revenue received on 14 sold units = `14 × 35 = ₹490`.
- Net cash after inventory purchase = `₹490 − ₹352 = ₹138` before overhead, fees, taxes and other cash flows.
- Cost of goods sold (COGS) for 14 sold units = `14 × 22 = ₹308`.
- Gross profit on sold units = `₹490 − ₹308 = ₹182` before other costs.
- Remaining inventory: 2 units × ₹22 = ₹44 of inventory value if usable; if spoiled, recognize appropriate write-off.

**Never label ₹138 as gross accounting profit.** Keep cash movement, gross margin, inventory asset and net realized profit separate. For true incremental profitability, subtract additional transport, markdown, messaging, staff time and write-offs if measured.

## 6. Canonical domain event envelope

```json
{
  "id": "uuid",
  "schema_version": 1,
  "type": "demand.request_confirmed.v1",
  "store_id": "uuid",
  "occurred_at": "2026-11-12T13:10:00Z",
  "actor": {"type": "merchant_user", "id": "uuid"},
  "source": "merchant_manual",
  "trace_id": "uuid",
  "idempotency_key": "opaque-client-generated-id",
  "data": {"request_id": "uuid", "item_count": 1}
}
```

Do not embed customer contact or raw audio into event payloads. Reference authorization-protected records instead.

## 7. Event taxonomy

- `merchant.store_created.v1`, `merchant.member_invited.v1`, `merchant.consent_revoked.v1`.
- `catalog.product_created.v1`, `inventory.movement_recorded.v1`, `inventory.lot_expiring.v1`.
- `demand.request_submitted.v1`, `demand.transcription_completed.v1`, `demand.request_confirmed.v1`, `demand.request_corrected.v1`.
- `opportunity.created.v1`, `opportunity.rescored.v1`, `opportunity.insufficient_data.v1`.
- `action.proposed.v1`, `action.approved.v1`, `action.rejected.v1`, `action.completed.v1`.
- `trial.started.v1`, `trial.sale_recorded.v1`, `trial.waste_recorded.v1`, `trial.completed.v1`.
- `connector.import_started.v1`, `connector.import_completed.v1`, `reconciliation.exception_opened.v1`.

## 8. Event and record lifecycle

- A request can be corrected. Store original text and correction history, not overwrite provenance.
- A recommendation is a snapshot: source data may change, so version the assumptions at approval.
- An action may be cancelled: cancellation is another event and compensating stock movement when needed.
- Deleting a customer identifier triggers downstream erasure from search, embeddings and derived caches subject to legal retention obligations.
- A failed import should report errors without partial silent commit: staged validation then atomic batch or explicit partial import report.

## 9. Migration discipline

1. Write Alembic migration and down migration where safe.
2. Add column nullable first when rolling deployments require backwards compatibility.
3. Backfill with idempotent job, verify counts and row sampling.
4. Deploy app reads supporting old/new schema, then make stricter constraints later.
5. Keep production rollback strategy (database snapshot plus compatible app). Never reverse migrations blindly if data would be lost.
