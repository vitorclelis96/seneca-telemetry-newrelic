/* Copyright © 2021 Seneca Project Contributors, MIT License. */


const docs = {

  get_info: {
    desc: 'Get information about the card.',
  },

  load_card: {
    desc: 'Load Trello card data into an entity.',
  },

  save_repo: {
    desc: 'Update Trello card data from an entity.',
  },

}

export default docs

if ('undefined' !== typeof (module)) {
  module.exports = docs
}
