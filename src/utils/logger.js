const moment = require('moment');

const logger = {
  log: (msg) => {
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    console.log(`[${timestamp}] [LOG]: ${msg}`);
  },
  
  info: (msg) => {
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    console.log(`[${timestamp}] [INFO]: ${msg}`);
  },
  
  error: (msg, error = null) => {
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    console.error(`[${timestamp}] [ERROR]: ${msg}`);
    if (error) {
      console.error(`[${timestamp}] [ERROR DETAILS]:`, error);
    }
  },
  
  websocket: (msg) => {
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    console.log(`[${timestamp}] [WEBSOCKET]: ${msg}`);
  },
  
  yeastar: (msg) => {
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    console.log(`[${timestamp}] [YEASTAR]: ${msg}`);
  }
};

module.exports = logger;
