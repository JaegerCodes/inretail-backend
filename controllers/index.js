const healthyCheck = async(req, res = response ) => {
    var healthyMessage = {status: "Service is healthy"};
    res.status(200).json(healthyMessage);
}

module.exports = {
    healthyCheck
}