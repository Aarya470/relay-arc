// DEPRECATED PATH — kept only so already-cached clients keep working.
//
// This used to ask llama-3.1-8b to read free-text check-in summaries and guess a
// crash risk level. That was wrong for a medical flag: non-deterministic, unable
// to cite the measurement behind its own conclusion, and useless without a
// network. It is now the deterministic Relay Risk Engine (lib/risk), a partial
// NEWS2 score plus a personal-baseline layer.
//
// New callers should use /api/risk. Nothing here involves a language model.
export { POST, dynamic } from '../../risk/route'
