import * as s from '../services/seller.service.js';

const ok = (res, data) => res.json({ success: true, data });

export const me = async (req, res) => ok(res, { seller: await s.getMine(req.user.id) });
export const save = async (req, res) => ok(res, { seller: await s.saveProfile(req.user.id, req.body) });
export const open = async (req, res) => ok(res, { seller: await s.setOpen(req.user.id, req.body.isOpen) });

export const documents = async (req, res) => ok(res, { documents: await s.getDocuments(req.user.id) });
export const uploadDoc = async (req, res) =>
  ok(res, { documents: await s.saveDocument(req.user.id, req.params.type, req.file) });

export const gallery = async (req, res) => ok(res, { images: await s.getGallery(req.user.id) });
export const addImage = async (req, res) => ok(res, { images: await s.addGalleryImage(req.user.id, req.file) });
export const removeImage = async (req, res) =>
  ok(res, { images: await s.removeGalleryImage(req.user.id, req.params.imageId) });