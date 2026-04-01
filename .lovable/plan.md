

# Fix PDF Item Extraction — Items Appear AFTER Client Name

## Problem
The parser extracts items from the text block BEFORE each client's "Contato:" line. But the actual PDF layout shows items AFTER the client name:

```text
GUSTAVO BIZZOTO              Contato: 99270.7420
699  REFIL HF ELX PE12 PURE  1,00  37,50  90,00  52,50  139,99
                              1,00  37,50  90,00  52,50  139,99
```

So GUSTAVO is incorrectly getting the item from the PREVIOUS client (GEORGIA MUNDIN's VELA ESTERILAQUA) instead of his own REFIL HF ELX PE12 PURE.

## Fix

### `src/lib/pdf-parser.ts` — Reverse item block direction

Change the item extraction loop to look for items in the text block AFTER each client's "Contato:" position (between current entry's position and the NEXT entry's position), instead of before.

```ts
// CURRENT (wrong): items between previous entry and current entry
const startPos = i > 0 ? entries[i-1].position ... : 0;
const endPos = entry.position;

// FIX: items between current entry and next entry
const startPos = entry.position;
const endPos = i < entries.length - 1 ? entries[i+1].position : fullText.length;
```

Also broaden the item regex to catch `VELA TRADICIONAL`, `VELA DECLORANTE`, and other product names that may not start with the current prefixes. Add `VELA\s\w+` as a broader match pattern.

### Files modified
- `src/lib/pdf-parser.ts` — reverse block direction for item extraction

