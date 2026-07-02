const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../models/User");
const config = require("../config");

const signupUser = async ({ username, email, password }) => {
  if (!username || !email || !password) {
    const err = new Error("Username, email, and password are required");
    err.statusCode = 400;
    throw err;
  }

  const existing = await userModel.findOne({
    $or: [{ email }, { username }],
  });
  if (existing) {
    const err = new Error("Username or email already in use");
    err.statusCode = 409;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await userModel.create({ username, email, password: hashedPassword });

  const token = jwt.sign(
    { userId: user._id, username: user.username, email: user.email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  return {
    token,
    user: { id: user._id, username: user.username, email: user.email },
  };
};

const signinUser = async ({ username, password }) => {
  if (!username || !password) {
    const err = new Error("Username and password are required");
    err.statusCode = 400;
    throw err;
  }

  const user = await userModel.findOne({ username });
  if (!user) {
    const err = new Error("Invalid username or password");
    err.statusCode = 401;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    const err = new Error("Invalid username or password");
    err.statusCode = 401;
    throw err;
  }

  const token = jwt.sign(
    { userId: user._id, username: user.username, email: user.email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  return {
    token,
    user: { id: user._id, username: user.username, email: user.email },
  };
};

const getProfile = async (userId) => {
  const user = await userModel.findById(userId).select("-password");
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  return user;
};

const updateProfile = async (userId, updates) => {
  const allowed = ["username", "email"];
  const filtered = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) filtered[key] = updates[key];
  }

  if (filtered.username || filtered.email) {
    const existing = await userModel.findOne({
      _id: { $ne: userId },
      $or: [
        ...(filtered.username ? [{ username: filtered.username }] : []),
        ...(filtered.email ? [{ email: filtered.email }] : []),
      ],
    });
    if (existing) {
      const err = new Error("Username or email already in use");
      err.statusCode = 409;
      throw err;
    }
  }

  const user = await userModel
    .findByIdAndUpdate(userId, { $set: filtered }, { new: true, runValidators: true })
    .select("-password");
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  return user;
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  if (!currentPassword || !newPassword) {
    const err = new Error("Current password and new password are required");
    err.statusCode = 400;
    throw err;
  }

  const user = await userModel.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    const err = new Error("Current password is incorrect");
    err.statusCode = 401;
    throw err;
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  return { message: "Password updated successfully" };
};

const deleteAccount = async (userId) => {
  const user = await userModel.findByIdAndDelete(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  return { message: "Account deleted successfully" };
};

module.exports = { signupUser, signinUser, getProfile, updateProfile, changePassword, deleteAccount };
