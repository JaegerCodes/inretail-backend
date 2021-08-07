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
            res.status(500)
            console.error(error)
        });

    res.json(products)
}

const loadProducts = async (req, res = response) => {
    let products = {}
    const {
        group = 0
    } = req.query;

    const fashionCat = 504
    const groupSize = 50

    await axios.get(process.env.OESCH_API_URL + "/catalog_system/pub/products/search" + "?fq=C:/" + fashionCat + "/&_from=" + group * groupSize + 1 + "&_to=" + (group + 1) * groupSize)
        .then(response => {
            products = response.data
        })
        .catch(error => {
            res.status(500)
            console.error(error)
        });

    res.json(products.map((e) => {
        return {
            product: e.productName,
            categoryId: e.categoriesIds[0]
        }
    }))
}

module.exports = {
    getProducts,
    loadProducts
}