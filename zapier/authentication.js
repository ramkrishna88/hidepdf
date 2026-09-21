module.exports = {
  type: 'custom',
  fields: [
    {
      key: 'api_key',
      label: 'API Key',
      required: true,
      type: 'password',
      helpText:
        'Your HidePDF Content API key. Send as X-API-Key. Get a key at https://hidepdfcontent.com'
    }
  ],
  connectionLabel: '{{service}}',
  test: {
    url: 'https://hidepdfcontent.com/v1/health',
    method: 'GET'
  }
};
