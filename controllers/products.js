const {
    response
} = require('express');
let axios = require('axios').default;
const {
    Client
} = require('@elastic/elasticsearch')
const colorEnum = require("../utils/ColorEnum");
const textUtils = require("../utils/TextUtils");
const productsInfo = require("../utils/productsInfo")

const getOutfit = (productId) => {
    if(productsInfo && productsInfo.outfitItems){
        for (let group of productsInfo.outfitItems) {
            for (let id of group) {
                if(id===productId)
                    return group
            }
        }
    }
    return []
}


const getProducts = async (req, res = response) => {
    let products = {}
    const {
        category = 0,
            group = 0
    } = req.query;

    const groupSize = 50

    try {
        const start = (group * groupSize + 1);
        const end = (parseInt(group) + 1) * groupSize;
        await axios.get(process.env.OESCH_API_URL + "/catalog_system/pub/products/search" + "?" + "fq=C:/" + category + "/" + "&_from=" + start + "&_to=" + end)
            .then(response => {
                products = response.data
            })
    } catch (error) {
        res.status(500)
        console.error(error)
    }

    res.json(products.map(
        (e) => {
            return {
                productId: e.productId,
                productName: e.productName,
                outfitPart: textUtils.removeDiacritics(textUtils.getFirstWord(e.productName))
            }
        }
    ))
}


const loadProducts = async (req, res = response) => {
    let products = []
    const {
        group = 0
    } = req.query;

    const fashionCat = 504
    const groupSize = 50
    const eIndex = 'catalog'

    var existError = false;

    const client = new Client({
        node: process.env.ELASTIC_SEARCH_URL
    })

    try {
        for (var i = 0; i <= group; i++) {
            const start = (i * groupSize + 1);
            const end = (parseInt(i) + 1) * groupSize;
            await axios.get(process.env.OESCH_API_URL + "/catalog_system/pub/products/search" + "?fq=C:/" + fashionCat + "/&_from=" + start + "&_to=" + end)
                .then(response => {
                    products = response.data
                })

            let parsedList = []
            products.forEach(element => {
                let minPurchase = Number.MAX_SAFE_INTEGER;
                let presentations = [];
                element.items.forEach(item => {
                    const itemPrice = item.sellers[0].commertialOffer.Price;
                    if (minPurchase > itemPrice) {
                        minPurchase = itemPrice;
                    }
                    let images = []
                    item.images.forEach(image => {
                        images.push(image.imageUrl)
                    })
                    let possibleColor = null;
                    if (item.Color !== undefined && item.Color.length > 0) {
                        possibleColor = colorEnum.colors[item.Color[0]]
                    }
                    presentations.push(
                        {
                            "price": itemPrice,
                            "color": possibleColor === undefined ? colorEnum.colors.Plomo : possibleColor,
                            "size": item.Talla === undefined ? null : item.Talla[0],
                            "stock": item.sellers[0].AvailableQuantity,
                            "imageUrls": images
                        }
                    )
                })
                parsedList.push({
                    "productId": element.productId,
                    "productName": element.productName,
                    "minPurchaseAmount": minPurchase,
                    "outfitPart": textUtils.removeDiacritics(textUtils.getFirstWord(element.productName)),
                    "presentations": presentations,
                    "outfitItems": getOutfit(element.productId)
                    /*
                    "outfitItems": [
                        {
                            "productId": null,
                            "productName": null,
                            "thumbnailImage": null,
                            "price": null
                        }
                    ]*/
                })
            })
            

            const body = parsedList.flatMap(doc => [{
                index: {
                    _index: eIndex
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
                index: eIndex
            })

            if (bulkResponse.errors) {
                existError = true;
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
            }
        }

        if (existError) {
            res.status(500).json("Error requesting the information");
        } else {
            res.status(200).json({
                "status": "inserted & updated "});
        }

    } catch (err) {
        console.log("Error", err);
        res.json({
            error: err
        })
    }
    
}

module.exports = {
    getProducts,
    loadProducts
}