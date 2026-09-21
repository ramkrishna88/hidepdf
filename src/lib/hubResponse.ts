export const EXAMPLE_INSPECT_RESPONSE = {
  status: 'ok',
  message: 'Found 7 fields to review. Amounts stay visible unless you choose to hide them.',
  filename_ok: true,
  total_pages: 1,
  items_found: 7,
  source: { text_layer_chars: 412, ocr_pages: [] },
  trust: {
    hide_method: 'rasterize_and_remove_text',
    review_required: true,
    extractable_after_hide: false,
    note: 'Hide burns each page to an image and strips the text layer. Hidden values cannot be copied or extracted.'
  },
  counts: {
    email: 1,
    phone: 1,
    aadhaar: 1,
    pan: 1,
    upi: 1,
    ssn: 1,
    amount: 1
  },
  items: [
    { id: 'item_1', type: 'email', country: 'global', preview: 'a***@example.com', page: 1 },
    { id: 'item_2', type: 'phone', country: 'global', preview: '********0123', page: 1 },
    { id: 'item_3', type: 'aadhaar', country: 'IN', preview: '********0123', page: 1 },
    { id: 'item_4', type: 'pan', country: 'IN', preview: '******234F', page: 1 },
    { id: 'item_5', type: 'upi', country: 'IN', preview: 'r***@okaxis', page: 1 },
    { id: 'item_6', type: 'ssn', country: 'US', preview: '*****6789', page: 1 },
    { id: 'item_7', type: 'amount', country: 'global', preview: '***8,000', page: 1, optional: true }
  ]
};
