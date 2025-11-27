const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool(config);

module.exports = {
  query: (text, params) => {
    return pool.query(text, params)
      .catch(err => {
        console.error('Error executing query', { text, params, err });
        throw err;
      });
  },
};