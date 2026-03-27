`new Date()` inside a reducer breaks INV-003 purity. Timestamps must be injected via the event payload by the RPC layer. All future `StateEvent` variants needing timestamps must include a `ts` field.
