let admin = (req, res, next) => {
  if (req.user.role === 0) {
    return res.json({"message": "Invalid Request"});
  }
  next();
};

module.exports = { admin };
