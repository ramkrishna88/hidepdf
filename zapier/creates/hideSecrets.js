module.exports = {
  key: 'hide_secrets',
  noun: 'Hidden PDF',
  display: {
    label: 'Hide Secrets in PDF',
    description: 'Burn emails, phones, IDs, and other secrets out of a PDF so they cannot be extracted.'
  },
  operation: {
    inputFields: [
        {
        key: 'file',
        label: 'PDF File URL',
        type: 'string',
        required: true,
        helpText: 'Public HTTPS URL of the PDF to hide secrets in.'
      },
      {
        key: 'hide_amounts',
        label: 'Hide amounts',
        type: 'boolean',
        required: false,
        default: 'false',
        helpText: 'Turn on to also hide money amounts (totals, salary, invoice values). Amounts stay visible by default.'
      }
    ],
    perform: async (z, bundle) => {
      const fileUrl = (value) => {
        if (typeof value === 'string') return value;
        if (Array.isArray(value)) {
          const text = value[0] && value[0].children && value[0].children[0] && value[0].children[0].text;
          if (text) return text;
        }
        if (value && typeof value === 'object' && typeof value.text === 'string') return value.text;
        return value;
      };

      const response = await z.request({
        url: 'https://hidepdfcontent.com/v1/redact',
        method: 'POST',
        headers: {
          'X-API-Key': bundle.authData.api_key,
          Accept: 'application/pdf'
        },
        body: {
          file: fileUrl(bundle.inputData.file),
          hide_amounts: bundle.inputData.hide_amounts ? 'true' : 'false'
        },
        raw: true
      });

      const buffer = await response.buffer();
      const file = await z.stashFile(buffer, buffer.length, 'hidden.pdf', 'application/pdf');

      return {
        file,
        hidden: Number(response.getHeader('x-hidepdf-hidden') || 0),
        mode: response.getHeader('x-hidepdf-mode') || 'rasterize_and_remove_text',
        text_removed: response.getHeader('x-hidepdf-text-removed') === '1',
        leftover_matches: Number(response.getHeader('x-hidepdf-extractable') || 0)
      };
    },
    outputFields: [
      { key: 'file', label: 'Hidden PDF', type: 'file' },
      { key: 'hidden', label: 'Hidden count', type: 'integer' },
      { key: 'mode', label: 'Hide mode' },
      { key: 'text_removed', label: 'Text removed', type: 'boolean' },
      { key: 'leftover_matches', label: 'Leftover matches', type: 'integer' }
    ],
    sample: {
      file: 'https://zapier-dev-files.s3.amazonaws.com/cli-platform/hidden.pdf',
      hidden: 6,
      mode: 'rasterize_and_remove_text',
      text_removed: true,
      leftover_matches: 0
    }
  }
};
