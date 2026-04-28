module.exports = async (sock, msg, from, text, args) => {
    require("./animeAction")(sock, msg, from, text, "kick");
};
