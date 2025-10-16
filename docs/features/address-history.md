## Address History Picker (FQL-RECOVER-01)

### API
- GET `/api/history/addresses?role=shipper|recipient&limit=20`
- Auth: Supabase cookie-based auth required (tests can bypass with `X-Test-Bypass-Auth: 1`)
- Response shape:

```json
{
  "items": [
    {
      "name": "...",
      "company": "...",
      "phone": "...",
      "email": "...",
      "country": "JP",
      "zip": "100-0001",
      "state": "Tokyo",
      "city": "Chiyoda",
      "address1": "...",
      "address2": "..."
    }
  ]
}
```

### Data source
- Primary: `user_address_history`
  - Fields → DTO mapping
    - name→name, company→company, phone→phone, email→email
    - country→country, postal→zip, state→state, city→city, address1→address1, address2→address2
  - Ordering: `last_used_at` DESC, then `updated_at` DESC
  - Dedup: fingerprint があれば fingerprint、無ければ `(name|postal|address1)`
- Fallback (primary 0件のときのみ):
  - `open_shipments.shipper_info/recipient_info` JSONB
  - `shipments` flat columns (shipper_*/recipient_*)
  - Latest first, dedup by `(name, zip, address1)` then `limit`

### UI
- Component: `src/components/address/AddressHistoryPicker.tsx`
- Props: `role`, `onSelect(addr)`, `onClose()`
- Selectors:
  - Button: `data-test="btn-history-picker"`
  - Modal: `data-test="modal-history-picker"`

### Integration
- Shipper: `src/app/shipping/new/shipper/page.tsx`
- Recipient: `src/app/shipping/new/recipient/page.tsx`
- On select: set store values via `useShipperInfo` / `useRecipientInfo` and run built-in validations on submit (existing zod未使用のため即時 `trigger()` 代替は不要)

### Tests
- Contract: `tests/contracts/features.address_history.contract.test.ts`
- E2E: `tests/e2e/address_history_picker.spec.ts`
  - 空状態: `data-test="empty-history"` を確認


