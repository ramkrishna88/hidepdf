module.exports = {
  key: 'inspect_pdf',
  noun: 'Secret',
  display: {
    label: 'Find Secrets in PDF',
    description: 'Scan a PDF and list emails, phones, IDs, and other fields that can be hidden.'
  },
  operation: {
    inputFields: [
      {
        key: 'file',
        label: 'PDF File URL',
        type: 'string',
        required: true,
        helpText: 'Public HTTPS URL of the PDF to scan.'
      }
    ],
    perform: async (z, bundle) => {
      const response = await z.request({
        url: 'https://hidepdfcontent.com/v1/inspect',
        method: 'POST',
        headers: {
          'X-API-Key': bundle.authData.api_key
        },
        body: {
          file: bundle.inputData.file
        }
      });
      return response.data;
    },
    sample: {
      status: 'ok',
      message: 'Found 6 sensitive fields.',
      filename_ok: true,
      total_pages: 1,
      items_found: 6,
      counts: {
        email: 1,
        phone: 1,
        ssn: 1
      },
      items: [
        { id: 'item_1', type: 'email', country: 'global', preview: 'a***@example.com', page: 1 }
      ]
    }
  }
};
