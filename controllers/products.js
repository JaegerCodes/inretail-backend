const {
    response
} = require('express');
var axios = require('axios').default;
const {
    Client
} = require('@elastic/elasticsearch')

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
    let products = []
    const {
        group = 0
    } = req.query;

    const fashionCat = 504
    const groupSize = 50
    const eindex = 'catalog'

    const client = new Client({
        node: process.env.ELASTIC_URL
    })

    try {
        await axios.get(process.env.OESCH_API_URL + "/catalog_system/pub/products/search" + "?fq=C:/" + fashionCat + "/&_from=" + group * groupSize + 1 + "&_to=" + (group + 1) * groupSize)
            .then(response => {
                products = response.data
            })

        const body = products.flatMap(doc => [{
            index: {
                _index: eindex
            }
        }, doc])

        const {
            body: bulkResponse
        } = await client.bulk({
            refresh: true,
            body
        })

        const {
            body: count
        } = await client.count({
            index: eindex
        })

        if (bulkResponse.errors) {
            const erroredDocuments = []
            bulkResponse.items.forEach((action, i) => {
                const operation = Object.keys(action)[0]
                if (action[operation].error) {
                    erroredDocuments.push({
                        status: action[operation].status,
                        error: action[operation].error,
                        operation: body[i * 2],
                        document: body[i * 2 + 1]
                    })
                }
            })
            res.status(500).json(erroredDocuments)
        } else {
            res.status(200).json({
                "status": "inserted & updated " + products.length + " entities. ",
                bulkResponse
            })
        }

        console.log(count)

    } catch (err) {
        res.json({
            error: err
        })
    }
    /*
        res.json(products.map((e) => {
            return {
                product: e.productName,
                categoryId: e.categoriesIds[0]
            }
        }))*/
}

module.exports = {
    getProducts,
    loadProducts
}