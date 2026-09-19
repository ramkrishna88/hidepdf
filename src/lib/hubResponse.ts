export const EXAMPLE_INSPECT_RESPONSE = {
  status: 'ok',
  message: 'Found 6 sensitive fields.',
  filename_ok: true,
  total_pages: 1,
  items_found: 6,
  counts: {
    email: 1,
    phone: 1,
    aadhaar: 1,
    pan: 1,
    upi: 1,
    ssn: 1
  },
  items: [
    { id: 'item_1', type: 'email', country: 'global', preview: 'a***@example.com', page: 1 },
    { id: 'item_2', type: 'phone', country: 'global', preview: '********0123', page: 1 },
    { id: 'item_3', type: 'aadhaar', country: 'IN', preview: '********0123', page: 1 },
    { id: 'item_4', type: 'pan', country: 'IN', preview: '******234F', page: 1 },
    { id: 'item_5', type: 'upi', country: 'IN', preview: 'r***@okaxis', page: 1 },
    { id: 'item_6', type: 'ssn', country: 'US', preview: '*****6789', page: 1 }
  ]
};
