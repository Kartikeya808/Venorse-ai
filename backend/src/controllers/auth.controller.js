const {
  signupUser,
  signinUser,
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
} = require("../services/auth.service");

const signup = async (req, res) => {
  try {
    const result = await signupUser(req.body);
    res.status(201).json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

const signin = async (req, res) => {
  try {
    const result = await signinUser(req.body);
    res.json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

const me = async (req, res) => {
  try {
    const user = await getProfile(req.user.userId);
    res.json(user);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

const updateMe = async (req, res) => {
  try {
    const user = await updateProfile(req.user.userId, req.body);
    res.json(user);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

const updateMyPassword = async (req, res) => {
  try {
    const result = await changePassword(req.user.userId, req.body);
    res.json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

const deleteMe = async (req, res) => {
  try {
    const result = await deleteAccount(req.user.userId);
    res.json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

module.exports = { signup, signin, me, updateMe, updateMyPassword, deleteMe };
