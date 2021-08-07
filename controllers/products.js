const {
    response
} = require('express');
var axios = require('axios').default;

const getProducts = async (req, res = response) => {
    let products = {}
    await axios.get(process.env.OESCH_API_URL + "/catalog_system/pub/products/search")
        .then(response => {
            products = response.data
        })
        .catch(error => {
            console.error(error)
        });

    res.json(products)
}

module.exports = {
    getProducts
}