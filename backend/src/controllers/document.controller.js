const {
  uploadDocument,
  listDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
} = require("../services/document.service");

const upload = async (req, res) => {
  try {
    const result = await uploadDocument(req.user.userId, req.file);
    res.status(201).json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

const list = async (req, res) => {
  try {
    const result = await listDocuments(req.user.userId, req.query);
    res.json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const doc = await getDocumentById(req.user.userId, req.params.id);
    res.json(doc);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const doc = await updateDocument(req.user.userId, req.params.id, req.body);
    res.json(doc);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const result = await deleteDocument(req.user.userId, req.params.id);
    res.json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

module.exports = { upload, list, getById, update, remove };
