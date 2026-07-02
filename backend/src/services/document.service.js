const documentModel = require("../models/Document");
const researchJobModel = require("../models/ResearchJob");
const agentService = require("./agent.service");

const uploadDocument = async (userId, file) => {
  if (!userId || !file) {
    const err = new Error("User ID and file are required");
    err.statusCode = 400;
    throw err;
  }

  const fileType = file.mimetype === "application/pdf" ? "pdf" : file.mimetype;

  const doc = await documentModel.create({
    userId,
    originalName: file.originalname,
    storedPath: file.path,
    fileType,
    fileSize: file.size,
    status: "uploaded",
  });

  const job = await researchJobModel.create({
    userId,
    documentId: doc._id,
    type: "document_summary",
    status: "pending",
  });

  const { processDocument } = require("./http-client.service");
  agentService.attachAgentToJob(job._id, processDocument, doc._id, file.path);

  return { document: doc, job };
};

const listDocuments = async (userId, query = {}) => {
  const { status, fileType, page = 1, limit = 20, sort = "-createdAt" } = query;
  const filter = { userId };
  if (status) filter.status = status;
  if (fileType) filter.fileType = fileType;

  const docs = await documentModel
    .find(filter)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .populate("companyId", "name ticker");

  const total = await documentModel.countDocuments(filter);

  return { documents: docs, total, page: Number(page), limit: Number(limit) };
};

const getDocumentById = async (userId, documentId) => {
  const doc = await documentModel
    .findOne({ _id: documentId, userId })
    .populate("companyId", "name ticker");
  if (!doc) {
    const err = new Error("Document not found");
    err.statusCode = 404;
    throw err;
  }
  return doc;
};

const updateDocument = async (userId, documentId, updates) => {
  const allowed = ["companyId", "status"];
  const filtered = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) filtered[key] = updates[key];
  }

  const doc = await documentModel
    .findOneAndUpdate({ _id: documentId, userId }, { $set: filtered }, { new: true, runValidators: true })
    .populate("companyId", "name ticker");

  if (!doc) {
    const err = new Error("Document not found");
    err.statusCode = 404;
    throw err;
  }
  return doc;
};

const deleteDocument = async (userId, documentId) => {
  const fs = require("fs");
  const doc = await documentModel.findOneAndDelete({ _id: documentId, userId });
  if (!doc) {
    const err = new Error("Document not found");
    err.statusCode = 404;
    throw err;
  }

  try {
    fs.unlinkSync(doc.storedPath);
  } catch {
    // file may already be gone
  }

  return { message: "Document deleted successfully" };
};

module.exports = { uploadDocument, listDocuments, getDocumentById, updateDocument, deleteDocument };
