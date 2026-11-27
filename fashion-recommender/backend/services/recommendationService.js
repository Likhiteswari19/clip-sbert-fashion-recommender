const axios = require("axios");
const config = require("../config/db");

let _aiGet = null;
let _aiPost = null;

function getClient() {
  if (!_aiGet) {
    _aiGet = async (path, params) => {
      const r = await axios.get(`${config.aiServiceUrl}${path}`, { params, timeout: 30000 });
      return r.data;
    };
    _aiPost = async (path, body) => {
      const r = await axios.post(`${config.aiServiceUrl}${path}`, body, { timeout: 30000 });
      return r.data;
    };
  }
  return { aiGet: _aiGet, aiPost: _aiPost };
}

module.exports = getClient();