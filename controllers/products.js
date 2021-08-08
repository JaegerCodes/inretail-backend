const {
    response
} = require('express');
let axios = require('axios').default;
const {
    Client
} = require('@elastic/elasticsearch')
const colorEnum = require("../utils/ColorEnum");
const textUtils = require("../utils/TextUtils");

const getOutfit = async (productId, productName, outfitPartData, categories) => {
    let searchQuery;
    if (categories !== "") {
        const possibleCategories = categories.split("/");
        searchQuery = [{
            match: {
                productName: {
                    query: productName,
                    fuzziness: "AUTO",
                    analyzer: "spanish_analyzer"
                }
            }
        },
            {
                match: {
                    categories: {
                        query: possibleCategories.length > 2 ? possibleCategories[1] + "/" + possibleCategories[2] : possibleCategories[1],
                    }
                }
            }
        ];
    } else {
        searchQuery = {
            match: {
                productName: {
                    query: productName,
                    fuzziness: "AUTO",
                    analyzer: "spanish_analyzer"
                }
            }
        };
    }
    const client = new Client({
        node: process.env.ELASTIC_SEARCH_URL
    })
    const result = await client.search({
        index: 'catalog',
        body: {
            from: 0,
            size: 4,
            query: {
                bool: {
                    must: searchQuery,
                    must_not: [
                        {match: {outfitPart: outfitPartData}},
                        {match: {productId: productId}}
                    ]
                }
            }
        }
    })
    const rawData = result.body.hits.hits;
    let idList = [];
    rawData.forEach(element => {
        idList.push(element._source.productId);
    });
    if (idList.length === 0) {
        return "";
    }
    return idList;
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

    let existError = false;

    const client = new Client({
        node: process.env.ELASTIC_SEARCH_URL
    })

    try {
        for (let i = 0; i <= group; i++) {
            console.log("Extracting data for group " + i + " out of " + group)
            const start = (i * groupSize + 1);
            const end = (parseInt(i) + 1) * groupSize;
            await axios.get(process.env.OESCH_API_URL + "/catalog_system/pub/products/search" + "?fq=C:/" + fashionCat + "/&_from=" + start + "&_to=" + end)
                .then(response => {
                    products = response.data
                })

            let parsedList = []
            for (const element of products) {
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
                const categories = element.categories === undefined ? "" : element.categories[0];
                const outfitPart = textUtils.removeDiacritics(textUtils.getFirstWord(element.productName));
                parsedList.push({
                    "productId": element.productId,
                    "productName": element.productName,
                    "minPurchaseAmount": minPurchase,
                    "outfitPart": outfitPart,
                    "presentations": presentations,
                    "categories": categories,
                    "outfitItems": await getOutfit(element.productId, element.productName, textUtils.removeDiacritics(textUtils.getFirstWord(element.productName)), categories)
                })
            }
            parsedList.forEach(element => {
                console.log(element.productId);
                console.log(element.outfitItems);
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
                console.log(erroredDocuments);
            }
        }

        if (existError) {
            res.status(500).json("Error requesting the information");
        } else {
            res.status(200).json({
                "status": "inserted & updated "
            });
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
