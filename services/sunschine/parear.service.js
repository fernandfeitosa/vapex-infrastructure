const axios = require('axios');
const https = require('https');

module.exports = {
  parear: async (pcname, pin) => {
    try {
      const response = await axios.post(
        'https://192.168.30.103:47990/api/pin',
        {
          pin,
          name: pcname,
        },
        {
          auth: {
            username: 'vapex',
            password: 'Fernando&2026',
          },
          headers: {
            'Content-Type': 'application/json',
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false,
          }),
        }
      );

      return response.data;
    } catch (err) {
      return {
        success: false,
        error: err.message,
        data: err.response?.data || null,
        status: err.response?.status || null,
      };
    }
  },
};