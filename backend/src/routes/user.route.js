import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import validateProfile from "../middleware/validateProfile.js";
import { getProfileController, updateProfileController, getUsersController } from "../controllers/user.controller.js";
import uploadPhoto from "../middleware/uploadPhoto.js";
import { uploadProfilePhotoController } from "../controllers/photo.controller.js";

const router = Router();

router.get("/profile", requireAuth, getProfileController);
router.patch("/profile", requireAuth, validateProfile, updateProfileController);
router.post("/profile/photo",requireAuth,uploadPhoto,uploadProfilePhotoController);
router.get("/", requireAuth, getUsersController);

export default router;