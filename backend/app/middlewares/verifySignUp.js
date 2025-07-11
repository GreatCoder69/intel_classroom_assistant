const db = require("../models");
const User = db.user;

const checkDuplicateUsernameOrEmail = async (req, res, next) => {
  try {


    const existingName = await User.findOne({ name: req.body.name });
    if (existingName) {
      return res.status(400).send({ message: "Failed! Name is already in use!" });
    }

    const existingEmail = await User.findOne({ email: req.body.email });
    if (existingEmail) {
      return res.status(400).send({ message: "Failed! Email is already in use!" });
    }


    next();
  } catch (err) {
    console.error("❌ Error in checkDuplicateUsernameOrEmail:", err);
    res.status(500).send({ message: "Internal server error." });
  }
};

module.exports = { checkDuplicateUsernameOrEmail };
